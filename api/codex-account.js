import { json } from './_github_oauth.js';
export const config = { runtime: 'edge' };

// ChatGPT identity sign-in by itself is not Codex account authorization.
// Until each user's isolated Codex App Server supports account/read,
// account/login/start, token refresh and logout, this endpoint fails closed.
// The browser must never infer "connected" from GitHub OAuth, a query
// parameter, localStorage, or the site operator's OPENAI_API_KEY.
export default async function handler(request) {
  if (request.method === 'GET') {
    return json({
      available: false,
      connected: false,
      codexEnabled: false,
      runnerReady: false,
      authMode: null,
      planType: null
    });
  }
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  if (request.headers.get('sec-fetch-site') === 'cross-site') return json({ error: 'Cross-site request blocked.' }, 403);
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return json({ error: 'Origin not allowed.' }, 403);
  return json({
    error: 'Per-user ChatGPT Codex authentication is not configured. Other AI models remain available.'
  }, 503);
}
