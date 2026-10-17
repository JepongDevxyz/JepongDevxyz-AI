/* lib/chat/effort.js — split from api/chat.js (mechanical move, no behavior change). */
import { normalizeIntentText } from './prompts.js';

function wantsCompleteCode(message='') {
  const text=String(message||'').toLowerCase().replace(/\s+/g,' ').trim();
  return [
    /paki\s*(?:bigay|ibigay)(?:\s+mo)?(?:\s+sa\s*akin|\s+sakin)?\s+(?:ang\s+)?buong\s+code/i,
    /bigay(?:\s+mo)?(?:\s+sa\s*akin|\s+sakin)?\s+(?:ang\s+)?buong\s+code/i,
    /ibigay(?:\s+mo)?(?:\s+sa\s*akin|\s+sakin)?\s+(?:ang\s+)?buong\s+code/i,
    /\bbuong\s+code\b/i,
    /\bfull\s+(?:source\s+)?code\b/i,
    /\bcomplete\s+(?:source\s+)?code\b/i,
    /\bwhole\s+(?:source\s+)?code\b/i,
    /\bentire\s+(?:source\s+)?code\b/i,
    /\bupdated\s+(?:source\s+)?code\b/i,
    /\bupdate(?:d)?\s+code\b/i,
    /\bfixed\s+(?:source\s+)?code\b/i,
    /\bworking\s+(?:source\s+)?code\b/i,
    /\bready[- ]to[- ](?:import|build)\b/i,
    /\bdo\s+not\s+(?:split|truncate)\b/i,
    /\b(?:don't|dont)\s+(?:split|truncate)\b/i
  ].some(rx=>rx.test(text));
}

const RESPONSE_EFFORT_LEVELS=['Instant','Low','Medium','High','Extra','Max'];
const RESPONSE_EFFORT_RANK=Object.fromEntries(RESPONSE_EFFORT_LEVELS.map((name,index)=>[name,index]));

function normalizeResponseEffort(value='Instant', fastAnswers=false) {
  if(fastAnswers===true)return 'Instant';
  const raw=String(value||'Instant').trim().toLowerCase();
  if(raw==='max'||raw==='maximum')return 'Max';
  if(raw==='extra'||raw==='xhigh'||raw==='extra-high')return 'Extra';
  if(raw==='high'||raw==='deep')return 'High';
  if(raw==='medium'||raw==='balanced')return 'Medium';
  if(raw==='low'||raw==='light')return 'Low';
  return 'Instant';
}

function responseEffortRank(value='Instant'){
  return RESPONSE_EFFORT_RANK[normalizeResponseEffort(value)] ?? 0;
}

function responseEffortPolicy(value='Instant'){
  const level=normalizeResponseEffort(value);
  const rank=responseEffortRank(level);
  const reasoningTokens=[0,384,768,1536,3072,5120][rank]||0;
  return {
    level,
    rank,
    reasoningTokens,
    // Keep the selected level's latency policy shared across providers. Instant
    // answers avoid auxiliary model calls; later levels progressively add them.
    activityPlanner:rank>=1,
    qualityPreflight:rank>=2,
    activityEvidence:rank>=3,
    // OpenRouter supports a six-step reasoning scale, so preserve all six UI levels.
    openRouter:['none','minimal','low','medium','high','xhigh'][rank]||'none',
    // Providers with a three-step native control still retain six distinct app
    // levels through the shared system instruction, token budget and Extra/Max preflight.
    standard:rank<=1?'low':rank===2?'medium':'high',
    gemini:['MINIMAL','LOW','MEDIUM','HIGH','HIGH','HIGH'][rank]||'MINIMAL'
  };
}

function effortOutputBudgetFor(message='',effort='Instant'){
  const base=outputBudgetFor(message);
  const policy=responseEffortPolicy(effort);
  return Math.min(16384,base+policy.reasoningTokens);
}

function nativeEffortFields(provider,model,effort='Instant'){
  const policy=responseEffortPolicy(effort);
  const target=String(model||'').toLowerCase();

  if(provider==='openrouter'){
    return {reasoning:{effort:policy.openRouter,exclude:true}};
  }

  if(provider==='groq'){
    if(target==='qwen/qwen3.8-27b'){
      return {
        reasoning_effort:policy.rank===0?'none':policy.standard,
        include_reasoning:false
      };
    }
    if(/^openai\/gpt-oss-(20b|120b)$/.test(target)){
      return {
        reasoning_effort:policy.standard,
        include_reasoning:false
      };
    }
  }

  if(provider==='mistral' && target==='mistral-small-latest'){
    return {reasoning_effort:policy.rank>=3?'high':'none'};
  }

  if(provider==='nvidia' && target.includes('nemotron')){
    if(policy.rank===0)return {chat_template_kwargs:{enable_thinking:false}};
    return {
      chat_template_kwargs:{enable_thinking:true},
      thinking_token_budget:Math.max(384,policy.reasoningTokens)
    };
  }

  return {};
}

function geminiThinkingConfig(model,effort='Instant'){
  const target=String(model||'').toLowerCase();
  // The configured Gemini family is 3.x/current-latest; Gemini 3+ exposes
  // thinkingLevel. Do not request thought text.
  if(target==='gemini-flash-latest'||/^gemini-3\./.test(target)){
    return {includeThoughts:false,thinkingLevel:responseEffortPolicy(effort).gemini};
  }
  return null;
}

function outputBudgetFor(message='') {
  // Dynamic response budget: short requests stay efficient, while complex
  // coding/research/troubleshooting tasks have more room to finish properly.
  if(wantsCompleteCode(message)) return 16384;
  const t=normalizeIntentText(message);
  const complex=/\b(code|coding|debug|error|build|architecture|full|complete|detailed|breakdown|analyze|analysis|research|compare|review|verify|step by step|troubleshoot|production|website|app|api)\b/i.test(t);
  return complex ? 8192 : 4096;
}

function responseQualityInstruction(message='') {
  const full=wantsCompleteCode(message);
  let text =
    ' Before sending the final answer, silently proofread it for spelling, grammar, punctuation, naming consistency, syntax mistakes, missing brackets, and accidental omissions. ' +
    'Do not claim absolute perfection; prioritize correctness and clear natural language.';

  if(full){
    text +=
      ' The user explicitly requested the complete code. Return the entire requested code in this single response whenever the provider output limit permits. ' +
      'Do not intentionally split it into Part 1/Part 2, do not omit unchanged sections, do not use placeholders such as "rest of code here", and do not tell the user to press Continue. ' +
      'Use one complete fenced code block per requested file and preserve all required imports, functions, styles, markup, configuration, and closing syntax.';
  }else{
    text +=
      ' If the answer would be unusually long, you may stop only at a clean logical boundary rather than forcing everything into one response. ' +
      'Do not cut a code block, function, HTML tag structure, JSON object, or sentence in the middle. This allows the interface Continue button to request the next portion.';
  }
  return text;
}

export { wantsCompleteCode, RESPONSE_EFFORT_LEVELS, RESPONSE_EFFORT_RANK, normalizeResponseEffort, responseEffortRank, responseEffortPolicy, effortOutputBudgetFor, nativeEffortFields, geminiThinkingConfig, outputBudgetFor, responseQualityInstruction };
