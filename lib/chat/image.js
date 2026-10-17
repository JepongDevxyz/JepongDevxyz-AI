/* lib/chat/image.js — split from api/chat.js (mechanical move, no behavior change). */
import { API_GUARD } from './config.js';
import { getCloudflareAccounts, rotateProviderKeys } from './keys.js';
import { safeJsonResponse } from './search.js';
import { json, parseKeys, shuffle } from './utils.js';

const PET_IMAGE_MODEL='@cf/black-forest-labs/flux-1-schnell';
const WEBSITE_PET_STYLE_GUIDE = 'Use the same overall mascot design language as the website pets like Luna and Mochi: a cute polished companion character, rounded silhouette, large expressive eyes, soft 3D/cartoon rendering, clean edges, appealing studio lighting, friendly face, and a charming app-mascot presentation.';
const WEBSITE_PET_REFERENCE_GUIDES = {
  Luna:'Cat-inspired mascot with a gentle, curious, supportive vibe and soft plush-like proportions.',
  Kiro:'Dog-inspired mascot with a loyal, upbeat, playful vibe and friendly rounded proportions.',
  Mochi:'Rabbit-inspired mascot with a calm, gentle, cozy vibe and soft rounded ears and plush proportions.',
  Pixel:'Robot-inspired mascot with a cheerful smart vibe, cute tech details, and rounded futuristic shapes.',
  Nova:'Black cat-inspired mascot with a cool mysterious vibe and elegant rounded proportions.',
  Sunny:'Chick-inspired mascot with bright happy energy and a cute compact silhouette.',
  Kumo:'Panda-inspired mascot with a chill relaxed vibe and cozy rounded proportions.',
  Ace:'Fox-inspired mascot with a brave confident vibe and cute alert features.'
};

function buildPetImagePrompt(options={}){
  const petName=String(options.name||'My Pet').trim().slice(0,60) || 'My Pet';
  const userIdea=String(options.description||'a cute friendly companion pet').trim().slice(0,1000) || 'a cute friendly companion pet';
  const matchSiteStyle = options.matchSiteStyle !== false;
  const referencePet = String(options.referencePet||'').trim();
  const parts = [
    `Create one polished companion pet mascot. The pet name is ${petName}, but DO NOT render the name or any text in the image.`,
    `USER VISUAL REQUEST — follow this as the source of truth: "${userIdea}".`,
    'Treat the USER VISUAL REQUEST as mandatory. Preserve every explicitly requested species/creature, primary and secondary color, marking, eye color, horn, wing, ear, tail, fin, crystal, clothing, accessory, pose, expression, and personality cue. Never silently substitute, omit, or invent a conflicting visible trait.',
    'When the user gives multiple colors, apply all of them to visible pet features in a natural way rather than dropping one. When a trait is ambiguous, prefer the most literal interpretation that is compatible with the requested species.',
    'Interpret only obvious minor spelling typos when context is clear; otherwise preserve the user wording instead of guessing.'
  ];
  if(matchSiteStyle){
    parts.push(WEBSITE_PET_STYLE_GUIDE);
    if(referencePet && WEBSITE_PET_REFERENCE_GUIDES[referencePet]){
      parts.push(`STYLE REFERENCE ONLY — use ${referencePet} only as a style anchor: ${WEBSITE_PET_REFERENCE_GUIDES[referencePet]} This influences rendering language and mascot proportions only. It must NOT override the species, colors, or visible traits requested by the user unless the user explicitly asks for them.`);
    }
  } else {
    parts.push('If the user explicitly requests an art style, that style wins. Otherwise use a cute high-quality 3D animated app-mascot style that fits a friendly AI companion.');
  }
  parts.push('Single full-body pet, centered, clearly visible, square composition, isolated subject on a fully transparent background (alpha channel), no floor, no backdrop, no scenery, no frame, no extra characters, no UI, no letters, no logo, no watermark. Keep the complete body inside the canvas with comfortable transparent padding around it so it matches the built-in floating pets.');
  return parts.join(' ').slice(0,2600);
}

function extractCloudflareImageBase64(payload){
  if(!payload)return '';
  const candidates=[
    payload?.result?.image,
    payload?.image,
    payload?.result?.data?.[0]?.b64_json,
    payload?.data?.[0]?.b64_json
  ];
  for(const value of [...candidates,payload?.result]){
    if(typeof value==='string'&&value.length>100)return value.replace(/^data:image\/[^;]+;base64,/i,'');
  }
  return '';
}

async function generateImage(body={},requestSignal=null){
  const prompt=String(body.prompt||body.message||'').trim().slice(0,2200);
  if(!prompt)return json({error:'Image prompt is required.'},400);
  const preference=String(body.model||'auto').toLowerCase();
  const seed=Math.floor(Math.random()*2147483000)+1;
  const errors=[];
  const accounts=shuffle(getCloudflareAccounts());

  if(preference!=='pollinations'){
    for(const account of accounts){
      try{
        const url=`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account.accountId)}/ai/run/${PET_IMAGE_MODEL}`;
        const res=await fetch(url,{method:'POST',headers:{'Authorization':`Bearer ${account.apiToken}`,'Content-Type':'application/json','Accept':'application/json,image/jpeg,image/png,*/*'},body:JSON.stringify({prompt,seed,steps:8}),signal:requestSignal||AbortSignal.timeout(65000)});
        if(res.ok){
          const contentType=(res.headers.get('content-type')||'').toLowerCase();
          if(contentType.startsWith('image/')){
            const bytes=new Uint8Array(await res.arrayBuffer());
            if(bytes.length)return json({ok:true,imageDataUrl:`data:${contentType.split(';')[0]};base64,${bytesToBase64(bytes)}`,provider:'Cloudflare Workers AI',model:PET_IMAGE_MODEL});
          }else{
            const payload=await safeJsonResponse(res);
            const image=extractCloudflareImageBase64(payload);
            if(image)return json({ok:true,imageDataUrl:`data:image/jpeg;base64,${image}`,provider:'Cloudflare Workers AI',model:PET_IMAGE_MODEL});
          }
          errors.push('Cloudflare returned no usable image data.');
        }else errors.push(`Cloudflare HTTP ${res.status}: ${(await res.text().catch(()=>'' )).slice(0,220)}`);
      }catch(e){
        if(requestSignal?.aborted)return json({error:'Image generation cancelled.',code:'cancelled'},499);
        errors.push(`Cloudflare: ${String(e?.message||e).slice(0,220)}`);
      }
    }
  }

  const pollinationsKey=String(process.env.POLLINATIONS_API_KEY||'').trim();
  if(pollinationsKey){
    try{
      const url=`https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?model=flux&width=1024&height=1024&seed=${seed}`;
      const res=await fetch(url,{headers:{'Authorization':`Bearer ${pollinationsKey}`,'Accept':'image/*'},signal:requestSignal||AbortSignal.timeout(65000)});
      if(res.ok){
        const contentType=(res.headers.get('content-type')||'image/jpeg').split(';')[0];
        const bytes=new Uint8Array(await res.arrayBuffer());
        if(bytes.length)return json({ok:true,imageDataUrl:`data:${contentType};base64,${bytesToBase64(bytes)}`,provider:'Pollinations',model:'flux'});
      }else errors.push(`Pollinations HTTP ${res.status}: ${(await res.text().catch(()=>'' )).slice(0,220)}`);
    }catch(e){
      if(requestSignal?.aborted)return json({error:'Image generation cancelled.',code:'cancelled'},499);
      errors.push(`Pollinations: ${String(e?.message||e).slice(0,220)}`);
    }
  }

  if(!accounts.length&&!pollinationsKey)return json({error:'No image generator is configured.',detail:'Configure Cloudflare Workers AI credentials or POLLINATIONS_API_KEY.'},503);
  return json({error:'Image generation is temporarily unavailable.',detail:sanitizeUpstreamText(errors.slice(0,3).join(' | ')).slice(0,700)},502);
}

async function removePetImageBackground(imageBytes,contentType,requestSignal=null){
  if(!imageBytes?.length)return null;
  // Background removal is an optional post-process. Try every configured
  // Cloudflare account instead of assuming the first Workers AI token also
  // has Cloudflare Images segmentation permission.
  for(const account of shuffle(getCloudflareAccounts())){
    try{
      const form=new FormData();
      const blob=new Blob([imageBytes],{type:contentType||'image/jpeg'});
      form.append('image',blob,'pet-input.jpg');
      const url=`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account.accountId)}/images/v1/segment`;
      const res=await fetch(url,{
        method:'POST',
        headers:{'Authorization':`Bearer ${account.apiToken}`,'Accept':'image/png'},
        body:form,
        signal:requestSignal || AbortSignal.timeout(8000)
      });
      if(!res.ok)continue;
      const bytes=new Uint8Array(await res.arrayBuffer());
      const isPng=bytes.length>=8 &&
        bytes[0]===0x89 && bytes[1]===0x50 && bytes[2]===0x4e && bytes[3]===0x47 &&
        bytes[4]===0x0d && bytes[5]===0x0a && bytes[6]===0x1a && bytes[7]===0x0a;
      if(isPng)return {bytes,contentType:'image/png'};
    }catch(_){ }
  }
  return null;
}

async function finalizePetImage(imageBytes,contentType,requestSignal=null){
  const segmented=await removePetImageBackground(imageBytes,contentType,requestSignal);
  if(segmented)return {
    imageDataUrl:`data:image/png;base64,${bytesToBase64(segmented.bytes)}`,
    backgroundRemoved:true,
    transparentPng:true
  };
  // Do not make the whole pet generator fail just because the optional Images
  // segmentation product is unavailable for the current Cloudflare token/account.
  // The generation prompt already requests an isolated no-background pet.
  const normalizedType=String(contentType||'image/jpeg').split(';')[0].toLowerCase();
  return {
    imageDataUrl:`data:${normalizedType};base64,${bytesToBase64(imageBytes)}`,
    backgroundRemoved:false,
    transparentPng:normalizedType==='image/png'
  };
}

async function generatePetImage(body={},requestSignal=null){
  const name=String(body.name||'').trim().slice(0,60) || 'My Pet';
  const description=String(body.description||body.prompt||'').trim().slice(0,900);
  if(!description)return json({error:'Describe the pet you want to generate.',code:'pet_prompt_required'},400);
  const matchSiteStyle = body.matchSiteStyle !== false;
  const referencePet = String(body.referencePet||'').trim();
  const prompt=buildPetImagePrompt({name,description,matchSiteStyle,referencePet});
  const seed=Math.floor(Math.random()*2147483000)+1;
  const errors=[];

  const accounts=shuffle(getCloudflareAccounts());
  for(const account of accounts){
    try{
      const url=`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account.accountId)}/ai/run/${PET_IMAGE_MODEL}`;
      const signal=requestSignal || AbortSignal.timeout(35000);
      const res=await fetch(url,{
        method:'POST',
        headers:{
          'Authorization':`Bearer ${account.apiToken}`,
          'Content-Type':'application/json',
          'Accept':'application/json,image/jpeg,image/png,*/*'
        },
        body:JSON.stringify({prompt,seed,steps:8}),
        signal
      });
      if(res.ok){
        const contentType=(res.headers.get('content-type')||'').toLowerCase();
        if(contentType.startsWith('image/')){
          const bytes=new Uint8Array(await res.arrayBuffer());
          if(bytes.length){
            // Return the generated pet immediately. Background removal is a best-effort
            // enhancement and must never hold the serverless request open long enough
            // to turn a successful generation into a Vercel 504.
            const finalImage=await finalizePetImage(bytes,contentType.split(';')[0],requestSignal);
            return json({
              ok:true,name,description,
              imageDataUrl:finalImage.imageDataUrl,
              backgroundRemoved:finalImage.backgroundRemoved,
              transparentPng:finalImage.transparentPng,
              provider:'Cloudflare Workers AI',model:PET_IMAGE_MODEL,referencePet,matchSiteStyle
            });
          }
        }else{
          const payload=await safeJsonResponse(res);
          const image=extractCloudflareImageBase64(payload);
          if(image){
            const finalImage=await finalizePetImage(Uint8Array.from(atob(image),ch=>ch.charCodeAt(0)),'image/jpeg',requestSignal);
            return json({
              ok:true,
              name,
              description,
              imageDataUrl:finalImage.imageDataUrl,
              backgroundRemoved:finalImage.backgroundRemoved,
              transparentPng:finalImage.transparentPng,
              provider:'Cloudflare Workers AI',
              model:PET_IMAGE_MODEL,
              referencePet,
              matchSiteStyle
            });
          }
        }
        errors.push('Cloudflare returned no usable image data.');
      }else{
        errors.push(`Cloudflare HTTP ${res.status}: ${(await res.text().catch(()=>'' )).slice(0,220)}`);
      }
    }catch(e){
      if(requestSignal?.aborted)return json({error:'Pet generation cancelled.',code:'cancelled'},499);
      errors.push(`Cloudflare: ${String(e?.message||e).slice(0,220)}`);
    }
  }

  // Pollinations supports key rotation too. Configure POLLINATIONS_API_KEYS as
  // comma/newline-separated server-side keys; POLLINATIONS_API_KEY remains compatible.
  const pollinationsKeys=rotateProviderKeys('pollinations',parseKeys('POLLINATIONS_API_KEYS','POLLINATIONS_API_KEY'))
    .slice(0,API_GUARD.maxProviderCredentialsPerRequest);
  for(const pollinationsKey of pollinationsKeys){
    try{
      const url=`https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?model=flux&width=512&height=512&seed=${seed}`;
      const res=await fetch(url,{
        headers:{'Authorization':`Bearer ${pollinationsKey}`,'Accept':'image/*'},
        signal:requestSignal || AbortSignal.timeout(35000)
      });
      if(res.ok){
        const contentType=(res.headers.get('content-type')||'image/jpeg').split(';')[0];
        const bytes=new Uint8Array(await res.arrayBuffer());
        if(bytes.length){
          const finalImage=await finalizePetImage(bytes,contentType,requestSignal);
          return json({
            ok:true,
            name,
            description,
            imageDataUrl:finalImage.imageDataUrl,
            backgroundRemoved:finalImage.backgroundRemoved,
            transparentPng:finalImage.transparentPng,
            provider:'Pollinations',
            model:'flux',
            referencePet,
            matchSiteStyle
          });
        }
        errors.push('Pollinations returned no usable image data.');
      }else{
        errors.push(`Pollinations HTTP ${res.status}: ${(await res.text().catch(()=>'' )).slice(0,220)}`);
      }
    }catch(e){
      if(requestSignal?.aborted)return json({error:'Pet generation cancelled.',code:'cancelled'},499);
      errors.push(`Pollinations: ${String(e?.message||e).slice(0,220)}`);
    }
  }

  if(!accounts.length&&!pollinationsKeys.length){
    return json({
      error:'No pet image generator is configured.',
      detail:'Configure Cloudflare Workers AI credentials (CLOUDFLARE_ACCOUNTS or CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN) or POLLINATIONS_API_KEYS/POLLINATIONS_API_KEY in server environment variables.'
    },503);
  }

  return json({
    error:'Pet image generation is temporarily unavailable. Please try again.',
    code:'pet_generation_failed',
    detail:errors.slice(0,4).join(' | ').slice(0,900)
  },502);
}

/* ============================================================
   P0/A2 FIX — server-side credit coupling.
   A direct POST to /api/chat used to get free generation on the
   operator's provider keys (the credit system was trust-based:
   client-initiated spend only). Now:
   - BEFORE generation: billable requests (chat=10, image=50 — same
     costs and classification as the credits.js client gate) verify
     identity (Supabase Bearer -> signed-in user, else guest
     IP-hash quota) and that the balance covers the cost.
     401/402 otherwise.
   - AFTER a successful generation: the cost is deducted
     idempotently via the request's idempotency_key. The client's
     post-success spend uses the SAME key, so it becomes a no-op:
     exactly one spend, no double charge, and the balance UI
     still refreshes from the spend response.
   - On generation failure: nothing is deducted (parity with the
     old "spend after success" client behavior — no refund path
     needed).
   ============================================================ */

export { PET_IMAGE_MODEL, WEBSITE_PET_STYLE_GUIDE, WEBSITE_PET_REFERENCE_GUIDES, buildPetImagePrompt, extractCloudflareImageBase64, generateImage, removePetImageBackground, finalizePetImage, generatePetImage };
