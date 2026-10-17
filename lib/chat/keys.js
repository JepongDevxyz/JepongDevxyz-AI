/* lib/chat/keys.js — split from api/chat.js (mechanical move, no behavior change). */
import { API_GUARD, PROVIDERS } from './config.js';
import { parseKeys } from './utils.js';

const providerKeyCursor = new Map();
function rotateProviderKeys(provider, keys) {
  if (!Array.isArray(keys) || keys.length < 2) return keys || [];
  const start = providerKeyCursor.get(provider) || 0;
  providerKeyCursor.set(provider, (start + 1) % keys.length);
  return keys.map((_, i) => keys[(start + i) % keys.length]);
}

function sanitizeCustomProviderKeys(body,provider){
  const raw=body?.customApiKeys?.[provider];
  if(typeof raw!=='string'&& !Array.isArray(raw))return [];
  const text=Array.isArray(raw)?raw.join(','):raw;
  return String(text).split(/[\n,]+/).map(x=>x.trim()).filter(x=>x.length>=8).slice(0,API_GUARD.maxProviderCredentialsPerRequest);
}

// Configured keys belong to the SAME selected provider. Exhaust each key
// before switching models/providers; the emergency fallback switch controls
// cross-provider/anonymous routing, not key rotation.
function providerCredentials(keys,autoFallback=false){
  const list=Array.isArray(keys)?keys:[];
  // Cloudflare supplies account objects; preserve those alongside string keys.
  return [...new Set(list.filter(item=>item&&(typeof item!=='string'||item.trim())))]
    .slice(0,API_GUARD.maxProviderCredentialsPerRequest);
}

function getProviderKeys(provider,rotate=true) {
  const envNames={
    gemini:['GEMINI_API_KEYS','GEMINI_API_KEY'],
    groq:['GROQ_API_KEYS','GROQ_API_KEY'],
    openrouter:['OPENROUTER_API_KEYS','OPENROUTER_API_KEY'],
    mistral:['MISTRAL_API_KEYS','MISTRAL_API_KEY'],
    cohere:['COHERE_API_KEYS','COHERE_API_KEY'],
    aihorde:['AIHORDE_API_KEYS','AIHORDE_API_KEY'],
    unorouter:['UNOROUTER_API_KEYS','UNOROUTER_API_KEY'],
    nvidia:['NVIDIA_API_KEYS','NVIDIA_API_KEY'],
    codecraft:['CODECRAFT_API_KEYS','CODECRAFT_API_KEY'],
    agentrouter:['AGENTROUTER_API_KEYS','AGENTROUTER_API_KEY'],
    hcnsec:['HCNSEC_API_KEYS','HCNSEC_API_KEY'],
    bailucode:['BAILUCODE_API_KEYS','BAILUCODE_API_KEY'],
    seekai:['SEEKAI_API_KEYS','SEEKAI_API_KEY']
  }[provider];
  if(!envNames)return [];
  const keys=parseKeys(envNames[0],envNames[1]);
  return (rotate?rotateProviderKeys(provider,keys):keys).slice(0,API_GUARD.maxProviderCredentialsPerRequest);
}

function getCloudflareAccounts() {
  const accounts = [];
  const raw = process.env.CLOUDFLARE_ACCOUNTS || '';
  for (const entry of raw.split(/[\n,]+/).map(x => x.trim()).filter(Boolean)) {
    const separator = entry.indexOf(':');
    if (separator < 1) continue;
    const accountId = entry.slice(0, separator).trim();
    const apiToken = entry.slice(separator + 1).trim();
    if (accountId && apiToken) accounts.push({ accountId, apiToken });
  }

  const accountId = (process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();
  const apiToken = (process.env.CLOUDFLARE_API_TOKEN || '').trim();
  if (accountId && apiToken && !accounts.some(x => x.accountId === accountId && x.apiToken === apiToken)) {
    accounts.push({ accountId, apiToken });
  }
  return accounts.slice(0,API_GUARD.maxProviderCredentialsPerRequest);
}

function getBailuAnthropicKeys(rotate=true){
  const dedicated=parseKeys('BAILUCODE_ANTHROPIC_API_KEYS','BAILUCODE_ANTHROPIC_API_KEY');
  const keys=dedicated.length?dedicated:parseKeys('BAILUCODE_API_KEYS','BAILUCODE_API_KEY');
  return (rotate?rotateProviderKeys('bailucode-anthropic',keys):keys).slice(0,API_GUARD.maxProviderCredentialsPerRequest);
}

function credentialCount(provider) {
  if(provider==='cloudflare')return getCloudflareAccounts().length;
  if(provider==='bailucode')return getProviderKeys(provider).length+getBailuAnthropicKeys().length;
  return getProviderKeys(provider).length;
}

function configured(provider) {
  return credentialCount(provider) > 0;
}

function providerLabel(provider) {
  if(provider==='aihorde-public') return 'AI Horde Anonymous';
  return PROVIDERS[provider]?.label || provider;
}

function modelLabel(model = '') {
  return String(model)
    .replace(/^@cf\//,'')
    .replace(/^openai\//,'')
    .replace(/^google\//,'')
    .replace(/^deepseek\//,'')
    .replace(/^groq\//,'')
    .replace(/[-_]/g,' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

export { providerKeyCursor, rotateProviderKeys, sanitizeCustomProviderKeys, providerCredentials, getProviderKeys, getCloudflareAccounts, getBailuAnthropicKeys, credentialCount, configured, providerLabel, modelLabel };
