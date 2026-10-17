/* lib/chat/project-inspect.js — split from api/chat.js (mechanical move, no behavior change). */
import { attachmentRootName, textFromAttachment } from './attachments.js';
import { extractPublicUrl, isSafePublicUrl, isWebsiteSecurityRequest, shouldVerifyTask } from './search.js';
import { executionEnvironmentContext } from './task.js';
import { activity } from './utils.js';
import { extractCodeBlocks, probeRequestedUrls, staticVerifyText } from './verify.js';

function uploadedProjectGroups(files=[]){
  const groups=new Map();
  for(const f of (Array.isArray(files)?files:[])){
    const root=attachmentRootName(f);
    if(!/\.(?:zip|apk|aab|jar|aar)$/i.test(root))continue;
    if(!groups.has(root))groups.set(root,[]);
    groups.get(root).push(f);
  }
  return groups;
}

function archiveEntryBody(file={}){
  const text=textFromAttachment(file);
  return text.replace(/^Archive entry:\s*[^\n]+\n/i,'');
}

function firstRegexValue(text='',patterns=[]){
  for(const rx of patterns){
    const m=String(text||'').match(rx);
    if(m?.[1])return String(m[1]).trim();
  }
  return '';
}

function androidProjectConsistencyEvidence(sourceEntries=[]){
  const entries=sourceEntries.map(file=>({
    file,
    name:String(file?.name||'').replace(/\\/g,'/'),
    body:archiveEntryBody(file)
  }));
  const gradle=entries.filter(e=>/(?:^|\/)(?:build\.gradle(?:\.kts)?|settings\.gradle(?:\.kts)?|gradle\.properties|libs\.versions\.toml)$/i.test(e.name));
  const manifests=entries.filter(e=>/(?:^|\/)AndroidManifest\.xml$/i.test(e.name));
  const code=entries.filter(e=>/\.(?:java|kt|kts)$/i.test(e.name));

  const gradleText=gradle.map(e=>e.body).join('\n');
  const namespace=firstRegexValue(gradleText,[
    /\bnamespace\s*(?:=\s*)?["']([^"']+)["']/i
  ]);
  const applicationId=firstRegexValue(gradleText,[
    /\bapplicationId\s*(?:=\s*)?["']([^"']+)["']/i
  ]);
  const compileSdk=firstRegexValue(gradleText,[
    /\bcompileSdk(?:Version)?\s*(?:=\s*)?["']?([0-9]{2,3})/i
  ]);
  const targetSdk=firstRegexValue(gradleText,[
    /\btargetSdk(?:Version)?\s*(?:=\s*)?["']?([0-9]{2,3})/i
  ]);
  const minSdk=firstRegexValue(gradleText,[
    /\bminSdk(?:Version)?\s*(?:=\s*)?["']?([0-9]{1,3})/i
  ]);

  const sourceClasses=new Set();
  const packagePathMismatches=[];
  for(const e of code){
    const pkg=firstRegexValue(e.body,[/^\s*package\s+([A-Za-z_][\w.]*)\s*;?/m]);
    const base=e.name.split('/').pop()?.replace(/\.(?:java|kt|kts)$/i,'')||'';
    if(pkg&&base)sourceClasses.add(`${pkg}.${base}`);
    const marker=e.name.match(/\/(?:java|kotlin)\/(.+)\/[^/]+\.(?:java|kt|kts)$/i);
    if(pkg&&marker?.[1]){
      const pathPkg=marker[1].replace(/\//g,'.');
      if(pathPkg!==pkg)packagePathMismatches.push({name:e.name,declared:pkg,pathPackage:pathPkg});
    }
  }

  const manifestComponents=[];
  let manifestPackage='';
  for(const e of manifests){
    if(!manifestPackage)manifestPackage=firstRegexValue(e.body,[
      /<manifest\b[^>]*\bpackage\s*=\s*["']([^"']+)["']/i
    ]);
    for(const m of e.body.matchAll(/<(activity|activity-alias|service|receiver|provider)\b[^>]*\bandroid:name\s*=\s*["']([^"']+)["']/gi)){
      manifestComponents.push({type:m[1].toLowerCase(),name:m[2]});
    }
  }
  const basePackage=manifestPackage||namespace||applicationId;
  const unresolvedComponents=[];
  for(const c of manifestComponents){
    if(!c.name||/^(?:android|androidx|com\.google)\./i.test(c.name))continue;
    const fqcn=c.name.startsWith('.')&&basePackage
      ? basePackage+c.name
      : (!c.name.includes('.')&&basePackage?basePackage+'.'+c.name:c.name);
    if(fqcn&&sourceClasses.size&&!sourceClasses.has(fqcn)){
      unresolvedComponents.push({...c,fqcn});
    }
  }

  const dependencyLines=gradleText.split('\n')
    .map(x=>x.trim())
    .filter(x=>/^(?:implementation|api|compileOnly|runtimeOnly|kapt|ksp|annotationProcessor|testImplementation|androidTestImplementation)\b/.test(x));
  const duplicateDependencies=[...new Set(dependencyLines.filter((line,i,a)=>a.indexOf(line)!==i))];

  return {
    namespace,applicationId,manifestPackage,compileSdk,targetSdk,minSdk,
    sourceClassCount:sourceClasses.size,
    manifestComponentCount:manifestComponents.length,
    packagePathMismatches,
    unresolvedComponents,
    duplicateDependencies
  };
}

function inspectUploadedProject(files=[], emit){
  const groups=uploadedProjectGroups(files);
  if(!groups.size)return '';

  let context='\n\n[UPLOADED PROJECT INSPECTION]\n';
  let groupIndex=0;
  for(const [root,parts] of groups){
    const sourceEntries=parts.filter(p=>String(p?.kind||'')==='archive-entry' && textFromAttachment(p));
    const rootMeta=parts.find(p=>attachmentRootName(p)===root && String(p?.name||'')===root) || parts[0];
    const manifestText=String(rootMeta?.extractedText||'');
    const indexedCount=Math.max(0,Number(rootMeta?.archiveFileCount)||0);
    const readableCount=Math.max(0,Number(rootMeta?.archiveReadableCount)||0);
    const names=[
      ...new Set([
        ...sourceEntries.map(p=>String(p?.name||'')),
        ...manifestText.split('\n').filter(line=>/[/.]/.test(line)&&line.length<240)
      ].filter(Boolean))
    ];
    const idBase=`project-${groupIndex++}`;
    const coverage=readableCount?Math.min(100,Math.round((sourceEntries.length/readableCount)*100)):100;
    activity(emit,`${idBase}-archive`,`Inspecting uploaded project archive: ${root}`,'running','file');
    activity(emit,`${idBase}-archive`,
      `Indexed project archive: ${root} • ${indexedCount||names.length} files • loaded ${sourceEntries.length}${readableCount?`/${readableCount}`:''} readable source/config files`,
      sourceEntries.length?'completed':'warning','file',
      readableCount&&sourceEntries.length<readableCount
        ?`Task-ranked source coverage: ${coverage}% by file count; build/manifest/app sources and request-matching paths are prioritized.`
        :'Readable project sources available for inspection.');

    const gradle=sourceEntries.filter(p=>/(?:^|\/)(?:build\.gradle(?:\.kts)?|settings\.gradle(?:\.kts)?|gradle\.properties|libs\.versions\.toml)$/i.test(String(p.name||'')));
    const manifests=sourceEntries.filter(p=>/(?:^|\/)AndroidManifest\.xml$/i.test(String(p.name||'')));
    const java=sourceEntries.filter(p=>/\.(?:java|kt|kts)$/i.test(String(p.name||'')));
    const resources=sourceEntries.filter(p=>/(?:^|\/)res\//i.test(String(p.name||'')) || /\.(?:xml)$/i.test(String(p.name||'')));
    const nativeNames=names.filter(name=>/\.(?:so|jar|aar)$/i.test(name));

    if(gradle.length){
      activity(emit,`${idBase}-gradle`,'Inspecting Gradle configuration and dependencies','running','build',root);
      activity(emit,`${idBase}-gradle`,
        `Reviewed Gradle configuration and dependencies • ${gradle.length} build/config file${gradle.length===1?'':'s'}`,
        'completed','build');
    }
    if(manifests.length){
      activity(emit,`${idBase}-manifest`,'Inspecting Android manifest and component declarations','running','file',root);
      activity(emit,`${idBase}-manifest`,
        `Reviewed Android manifest and component declarations • ${manifests.length} manifest${manifests.length===1?'':'s'}`,
        'completed','file');
    }
    if(java.length){
      activity(emit,`${idBase}-source`,'Inspecting Java/Kotlin project sources','running','file',root);
      activity(emit,`${idBase}-source`,
        `Inspected Java/Kotlin project sources • ${java.length} file${java.length===1?'':'s'}`,
        'completed','file');
    }
    if(resources.length){
      activity(emit,`${idBase}-resources`,'Inspecting Android resources and configuration','running','file',root);
      activity(emit,`${idBase}-resources`,
        `Inspected Android resources/configuration • ${resources.length} readable file${resources.length===1?'':'s'}`,
        'completed','file');
    }
    if(nativeNames.length){
      activity(emit,`${idBase}-bundled-libs`,
        `Located bundled library/native artifacts • ${nativeNames.length} file${nativeNames.length===1?'':'s'}`,
        'completed','file',
        'Binary contents are preserved locally; this status does not claim binary decompilation.');
    }

    const verificationTargets=[...gradle,...manifests,...java,...resources]
      .filter((p,i,a)=>a.indexOf(p)===i)
      .slice(0,28);
    if(verificationTargets.length){
      activity(emit,`${idBase}-static`,`Running static checks on ${verificationTargets.length} project file${verificationTargets.length===1?'':'s'}`,'running','test',root);
    }
    const reports=verificationTargets.map(p=>staticVerifyText(String(p.name||'Archive entry'),archiveEntryBody(p),String(p.name||'')));
    const failed=reports.filter(r=>r.status==='failed').length;
    const warnings=reports.filter(r=>r.status==='warning').length;
    if(reports.length){
      activity(emit,`${idBase}-static`,
        failed
          ? `Project static checks found ${failed} issue${failed===1?'':'s'} across ${reports.length} inspected file${reports.length===1?'':'s'}`
          : warnings
            ? `Project static checks completed with ${warnings} warning${warnings===1?'':'s'} across ${reports.length} file${reports.length===1?'':'s'}`
            : `Project static checks passed • ${reports.length} inspected file${reports.length===1?'':'s'}`,
        failed?'warning':'completed','test');
    }

    const androidEvidence=(gradle.length||manifests.length||java.length)
      ?androidProjectConsistencyEvidence(sourceEntries):null;
    if(androidEvidence){
      const facts=[];
      if(androidEvidence.namespace)facts.push(`namespace ${androidEvidence.namespace}`);
      if(androidEvidence.applicationId)facts.push(`applicationId ${androidEvidence.applicationId}`);
      if(androidEvidence.targetSdk)facts.push(`targetSdk ${androidEvidence.targetSdk}`);
      if(androidEvidence.packagePathMismatches.length)facts.push(`${androidEvidence.packagePathMismatches.length} package/path mismatch${androidEvidence.packagePathMismatches.length===1?'':'es'}`);
      if(androidEvidence.duplicateDependencies.length)facts.push(`${androidEvidence.duplicateDependencies.length} duplicate dependency declaration${androidEvidence.duplicateDependencies.length===1?'':'s'}`);
      activity(emit,`${idBase}-android-consistency`,
        facts.length?`Cross-checked Android project consistency • ${facts.join(' • ')}`:'Cross-checked Android package/component consistency',
        (androidEvidence.packagePathMismatches.length||androidEvidence.duplicateDependencies.length)?'warning':'completed',
        'test',
        androidEvidence.unresolvedComponents.length
          ?`${androidEvidence.unresolvedComponents.length} manifest component name(s) were not found in the supplied source pack; omitted project files may account for them.`
          :`Checked ${androidEvidence.manifestComponentCount} manifest component declaration${androidEvidence.manifestComponentCount===1?'':'s'} against ${androidEvidence.sourceClassCount} supplied source class path${androidEvidence.sourceClassCount===1?'':'s'}.`);
    }

    context+=`Project archive: ${root}\n`;
    context+=`Archive files indexed: ${indexedCount||names.length}\n`;
    context+=`Readable source/config files in archive: ${readableCount||sourceEntries.length}\n`;
    context+=`Task-ranked readable files supplied to this request: ${sourceEntries.length}\n`;
    if(readableCount&&sourceEntries.length<readableCount){
      context+=`Coverage note: not every readable file body fits one model request. Selection is task-ranked; do not say the whole project body was read. Do not infer defects from uninspected files.\n`;
    }
    if(gradle.length)context+=`Gradle/build files inspected: ${gradle.map(p=>p.name).join(', ')}\n`;
    if(manifests.length)context+=`Android manifests inspected: ${manifests.map(p=>p.name).join(', ')}\n`;
    if(java.length)context+=`Java/Kotlin files inspected: ${java.map(p=>p.name).slice(0,60).join(', ')}\n`;
    if(resources.length)context+=`Resources/config files inspected: ${resources.map(p=>p.name).slice(0,60).join(', ')}\n`;
    if(nativeNames.length)context+=`Bundled binary/library paths indexed: ${nativeNames.slice(0,60).join(', ')}\n`;
    if(androidEvidence){
      context+='Android consistency evidence:\n';
      if(androidEvidence.namespace)context+=`- namespace: ${androidEvidence.namespace}\n`;
      if(androidEvidence.applicationId)context+=`- applicationId: ${androidEvidence.applicationId}\n`;
      if(androidEvidence.manifestPackage)context+=`- manifest package: ${androidEvidence.manifestPackage}\n`;
      if(androidEvidence.compileSdk)context+=`- compileSdk: ${androidEvidence.compileSdk}\n`;
      if(androidEvidence.minSdk)context+=`- minSdk: ${androidEvidence.minSdk}\n`;
      if(androidEvidence.targetSdk)context+=`- targetSdk: ${androidEvidence.targetSdk}\n`;
      context+=`- supplied source classes indexed: ${androidEvidence.sourceClassCount}\n`;
      context+=`- manifest components parsed: ${androidEvidence.manifestComponentCount}\n`;
      if(androidEvidence.packagePathMismatches.length){
        for(const x of androidEvidence.packagePathMismatches.slice(0,12)){
          context+=`- SOURCE PACKAGE/PATH MISMATCH: ${x.name} declares ${x.declared}, path implies ${x.pathPackage}\n`;
        }
      }else context+='- no Java/Kotlin package-vs-source-path mismatch detected in supplied source files\n';
      if(androidEvidence.duplicateDependencies.length){
        context+=`- duplicate Gradle dependency declarations: ${androidEvidence.duplicateDependencies.join(' | ')}\n`;
      }
      if(androidEvidence.unresolvedComponents.length){
        context+=`- manifest component names not found in supplied source pack (not necessarily missing from full project): ${androidEvidence.unresolvedComponents.slice(0,12).map(x=>x.fqcn).join(', ')}\n`;
      }
    }
    if(reports.length){
      context+='Static inspection results:\n';
      for(const r of reports)context+=`- ${r.name}: ${r.status.toUpperCase()} — ${r.findings.join(' ')}\n`;
    }
    context+=
      'Grounding rule: only claim file bodies listed above were inspected. Binary .so/.jar/.aar contents were not decompiled on the server. ' +
      'Do not claim a Gradle build, APK install, emulator run, runtime test, or whole-project inspection unless separate execution/full-coverage evidence exists. ' +
      'When proposing changes, preserve unrelated working project files and use exact archive-relative paths in FILE blocks.\n';
  }
  return context+'[/UPLOADED PROJECT INSPECTION]\n';
}

async function performVerification(message='', files=[], emit){
  if(!shouldVerifyTask(message,files))return '';
  const reports=[];

  const promptBlocks=extractCodeBlocks(message);
  promptBlocks.forEach((b,i)=>reports.push(staticVerifyText(`Prompt code block ${i+1}`,b.code,b.lang)));

  if(Array.isArray(files)){
    for(let i=0;i<files.length && reports.length<16;i++){
      if(['zip','archive'].includes(String(files[i]?.kind||'')))continue;
      const txt=textFromAttachment(files[i]);
      if(!txt)continue;
      const name=files[i]?.name||files[i]?.filename||`Attachment ${i+1}`;
      reports.push(staticVerifyText(name,txt,name));
    }
  }

  const explicitUrls=extractPublicUrl(message).filter(isSafePublicUrl);
  // Do not show a "verification" step when there is no source/code to check.
  // URLs are probed by the existing real URL-checking function below.
  if(!reports.length && !explicitUrls.length)return executionEnvironmentContext(message);
  if(reports.length)activity(emit,'verification',`Checking ${reports.length} supplied code item${reports.length===1?'':'s'}`,'running','test');

  // A website-safety request already receives a targeted HTTP inspection above.
  // Avoid the duplicate generic GET probe and its misleading second status row.
  const urlResults=isWebsiteSecurityRequest(message)?[]:await probeRequestedUrls(message,emit);

  const env=executionEnvironmentContext(message);
  let context=env;

  if(reports.length){
    const failed=reports.filter(r=>r.status==='failed').length;
    const warnings=reports.filter(r=>r.status==='warning').length;
    activity(emit,'verification',`Static verification complete • ${reports.length} item${reports.length===1?'':'s'}${failed?` • ${failed} issue${failed===1?'':'s'}`:''}${warnings?` • ${warnings} warning${warnings===1?'':'s'}`:''}`,failed?'warning':'completed','test');
    context+=`\n\n[SAFE STATIC VERIFICATION]\n`;
    for(const r of reports)context+=`${r.name}: ${r.status.toUpperCase()} — ${r.findings.join(' ')}\n`;
    context+=`These are static checks, not proof that the program executed successfully.`;
  }

  if(urlResults.length){
    context+=`\n\n[REAL PUBLIC URL TEST RESULTS]\n`;
    for(const r of urlResults){
      context+=r.ok
        ? `${r.url} — HTTP ${r.status}, ${r.elapsedMs} ms, ${r.contentType||'unknown content type'}\n`
        : `${r.url} — FAILED: ${r.error||`HTTP ${r.status}`}\n`;
    }
    context+=`These URL checks were actually performed during this request.`;
  }

  return context;
}

export { uploadedProjectGroups, archiveEntryBody, firstRegexValue, androidProjectConsistencyEvidence, inspectUploadedProject, performVerification };
