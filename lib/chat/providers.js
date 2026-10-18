// JEPONGDEVXYZ AI — Providers, key rotation, credentials
// Extracted from api/chat.js (lines 51-144)

import { buildInlineMapDataUrl } from './shared.js';

export function inlineMapPageUrl(html){
  try{return buildInlineMapDataUrl(html);}catch(_){return '';}
}

export const PROVIDERS = {
  gemini: {
    label: 'Gemini',
    models: ['gemini-flash-latest','gemini-3.8-flash','gemini-3.7-flash','gemini-3.6-flash','gemini-3.5-flash-lite'],
    defaultModel: 'gemini-flash-latest'
  },
  cloudflare: {
    label: 'Cloudflare',
    models: ['@cf/zai-org/glm-4.7-flash','@cf/nvidia/nemotron-3-120b-a12b','@cf/openai/gpt-oss-120b','@cf/qwen/qwen3.8-27b'],
    defaultModel: '@cf/openai/gpt-oss-120b'
  },
  groq: {
    label: 'Groq',
    models: ['openai/gpt-oss-120b','openai/gpt-oss-20b','qwen/qwen3.8-27b'],
    defaultModel: 'openai/gpt-oss-120b'
  },
  openrouter: {
    label: 'OpenRouter',
    models: ['nvidia/nemotron-3-ultra-550b-a55b:free','poolside/laguna-s-2.1:free','nvidia/nemotron-3-super-120b-a12b:free'],
    defaultModel: 'nvidia/nemotron-3-ultra-550b-a55b:free'
  },
  mistral: {
    label: 'Mistral',
    models: ['mistral-small-latest','codestral-latest'],
    defaultModel: 'mistral-small-latest'
  },
  cohere: {
    label: 'Cohere',
    models: ['command-a-plus-05-2026','command-a-reasoning-08-2025'],
    defaultModel: 'command-a-plus-05-2026'
  },
  aihorde: {
    label: 'AI Horde',
    models: ['auto'],
    defaultModel: 'auto'
  },
  unorouter: {
    label: 'UnoRouter',
    models: ['auto'],
    defaultModel: 'auto'
  },
  nvidia: {
    label: 'NVIDIA',
    models: ['nvidia/nemotron-3-ultra-550b-a55b','nvidia/nemotron-3-super-120b-a12b'],
    defaultModel: 'nvidia/nemotron-3-ultra-550b-a55b'
  },
  codecraft: {
    label: 'CodeCraft API',
    // Explicit CodeCraft catalog requested for JepongDevxyz AI. The live
    // /v1/models sync can still refresh/replace this bootstrap list when the
    // provider catalog is reachable.
    models: ["deepseek-v4-pro-max","deepseek-v4-flash-0731","deepseek-v4-pro-0813","gemma-2-2b","qwen3.8-max","qwen3.8-27b","qwen3.7-max","glm-5.3","glm-5.2","muse-spark-1.1","seed-2.1-pro","seed-2.1-turbo","gemini-3.6-flash","gemini-3.7-flash","gemini-3.1-pro","grok-4.5","grok-4.6","kimi-k3","kimi-k2.6","gpt-5.5","gpt-5.5-pro","gpt-5.6-luna","gpt-5.6-terra","gpt-5.6-sol","claude-mythos-preview","claude-opus-4.6","claude-opus-5.5","claude-fable-5.1"],
    defaultModel: 'gpt-5.6-sol'
  },
  agentrouter: {
    label: 'AgentRouter',
    models: ['deepseek-v4-pro','deepseek-v4-flash'],
    defaultModel: 'deepseek-v4-pro'
  },
  hcnsec: {
    label: 'HCNSEC',
    models: ['DeepSeek-V4-Flash','glm-5.3-flash','MiMo-V2.6-Flash','Qwen3.8-Flash-Next','sensenova-6.8-flash-lite','spark-x2.5'],
    defaultModel: 'DeepSeek-V4-Flash'
  },
  bailucode: {
    label: 'Bailucode',
    models: ['bailu-apex'],
    defaultModel: 'bailu-apex'
  },
  seekai: {
    label: 'SEEKAI',
    models: ['deepseek-v4.1-flash','glm-5.3-flash','mimo-v2.6-flash','deepseek-ai/DeepSeek-V4-Flash-0731','qwen3.8-flash','deepseek-v4-flash'],
    defaultModel: 'deepseek-v4-flash'
  }
};

// Registered AI Horde and then public AI Horde are emergency-only, never picker providers.
export const RETRYABLE = new Set([401,402,403,408,409,425,429,500,502,503,504]);

// Central chat-model timeout policy. New/future model IDs inherit this automatically
// because timeout selection is provider/route based, never tied to a hard-coded model list.
export const CHAT_UPSTREAM_TIMEOUT_MS=Math.max(30_000,Number(process.env.CHAT_UPSTREAM_TIMEOUT_MS||270_000));
export const CHAT_FAST_UPSTREAM_TIMEOUT_MS=Math.max(30_000,Number(process.env.CHAT_FAST_UPSTREAM_TIMEOUT_MS||270_000));
export function chatUpstreamTimeoutMs(provider=''){
  return String(provider||'').toLowerCase()==='codecraft'
    ? CHAT_FAST_UPSTREAM_TIMEOUT_MS
    : CHAT_UPSTREAM_TIMEOUT_MS;
}


