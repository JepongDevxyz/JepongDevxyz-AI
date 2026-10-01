/* ============================================================
   JepongDevxyz AI — Connectors: shared provider definitions (v3).
   One OAuth app per provider; several connector cards can share
   it (e.g. all Google cards share the google app). Each connector
   may override the scopes requested at connect time.

   kinds:
     oauth         - generic OAuth 2.0 popup flow
     github        - dedicated GitHub flow (github-auth.js)
     apikey        - paste key/fields, server verifies (store.js)
     device        - phone-only (shown disabled, "From this device")
     builtin       - already inside the app (e.g. Browser/web search)
     customsuggest - no public OAuth; opens the Custom Connector
                     form prefilled with a hint
   ============================================================ */

export const OAUTH_PROVIDERS = {
  google: {
    label: 'Google',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    tokenFormat: 'form', tokenAuth: 'body',
    userInfo: { url: 'https://www.googleapis.com/oauth2/v3/userinfo', pick: (d) => (d && d.email) || '' },
    scopes: ['openid', 'email', 'profile'],
    authParams: { access_type: 'offline', prompt: 'consent' },
  },
  spotify: {
    label: 'Spotify',
    authUrl: 'https://accounts.spotify.com/authorize',
    tokenUrl: 'https://accounts.spotify.com/api/token',
    tokenFormat: 'form', tokenAuth: 'body',
    userInfo: { url: 'https://api.spotify.com/v1/me', pick: (d) => (d && (d.display_name || d.email)) || '' },
    scopes: ['playlist-read-private', 'user-top-read'],
  },
  meta: {
    label: 'Meta',
    authUrl: 'https://www.facebook.com/v21.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v21.0/oauth/access_token',
    tokenFormat: 'form', tokenAuth: 'body',
    userInfo: { url: 'https://graph.facebook.com/me?fields=name', pick: (d) => (d && d.name) || '' },
    scopes: ['public_profile', 'email'],
  },
  microsoft: {
    label: 'Microsoft',
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    tokenFormat: 'form', tokenAuth: 'body',
    userInfo: { url: 'https://graph.microsoft.com/v1.0/me', pick: (d) => (d && (d.mail || d.userPrincipalName)) || '' },
    scopes: ['User.Read', 'offline_access'],
  },
  dropbox: {
    label: 'Dropbox',
    authUrl: 'https://www.dropbox.com/oauth2/authorize',
    tokenUrl: 'https://api.dropboxapi.com/oauth2/token',
    tokenFormat: 'form', tokenAuth: 'body',
    userInfo: { method: 'POST', url: 'https://api.dropboxapi.com/2/users/get_current_account', pick: (d) => (d && d.email) || '' },
    scopes: [],
    authParams: { token_access_type: 'offline' },
  },
  box: {
    label: 'Box',
    authUrl: 'https://account.box.com/api/oauth2/authorize',
    tokenUrl: 'https://api.box.com/oauth2/token',
    tokenFormat: 'form', tokenAuth: 'body',
    userInfo: { url: 'https://api.box.com/2.0/users/me', pick: (d) => (d && (d.login || d.name)) || '' },
    scopes: [],
  },
  notion: {
    label: 'Notion',
    authUrl: 'https://api.notion.com/v1/oauth/authorize',
    tokenUrl: 'https://api.notion.com/v1/oauth/token',
    tokenFormat: 'json', tokenAuth: 'basic',
    userInfo: { url: 'https://api.notion.com/v1/users/me', headers: { 'Notion-Version': '2022-06-28' }, pick: (d) => (d && d.name) || '' },
    scopes: [],
    authParams: { owner: 'user' },
  },
  slack: {
    label: 'Slack',
    authUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    tokenFormat: 'form', tokenAuth: 'body',
    userInfo: { url: 'https://slack.com/api/auth.test', pick: (d) => (d && d.user) || '' },
    scopes: ['users:read', 'channels:read'],
  },
  figma: {
    label: 'Figma',
    authUrl: 'https://www.figma.com/oauth',
    tokenUrl: 'https://api.figma.com/v1/oauth/token',
    tokenFormat: 'form', tokenAuth: 'body',
    userInfo: { url: 'https://api.figma.com/v1/me', pick: (d) => (d && (d.handle || d.email)) || '' },
    scopes: ['file_read'],
  },
  zoom: {
    label: 'Zoom',
    authUrl: 'https://zoom.us/oauth/authorize',
    tokenUrl: 'https://zoom.us/oauth/token',
    tokenFormat: 'form', tokenAuth: 'basic',
    userInfo: { url: 'https://api.zoom.us/v2/users/me', pick: (d) => (d && (d.email || d.first_name)) || '' },
    scopes: [],
  },
  linear: {
    label: 'Linear',
    authUrl: 'https://linear.app/oauth/authorize',
    tokenUrl: 'https://api.linear.app/oauth/token',
    tokenFormat: 'form', tokenAuth: 'body',
    userInfo: {
      method: 'POST', url: 'https://api.linear.app/graphql',
      body: { query: '{ viewer { displayName email } }' },
      pick: (d) => (d && d.data && d.data.viewer && (d.data.viewer.displayName || d.data.viewer.email)) || '',
    },
    scopes: ['read'],
  },
  todoist: {
    label: 'Todoist',
    authUrl: 'https://todoist.com/oauth/authorize',
    tokenUrl: 'https://todoist.com/oauth/access_token',
    tokenFormat: 'form', tokenAuth: 'body',
    userInfo: { url: 'https://api.todoist.com/api/v1/user', pick: (d) => (d && d.email) || '' },
    scopes: ['data:read'],
  },
  asana: {
    label: 'Asana',
    authUrl: 'https://app.asana.com/-/oauth_authorize',
    tokenUrl: 'https://app.asana.com/-/oauth_token',
    tokenFormat: 'form', tokenAuth: 'body',
    userInfo: { url: 'https://app.asana.com/api/1.0/users/me', pick: (d) => (d && d.data && (d.data.name || d.data.email)) || '' },
    scopes: ['default'],
  },
  canva: {
    label: 'Canva',
    authUrl: 'https://www.canva.com/api/oauth/authorize',
    tokenUrl: 'https://api.canva.com/rest/v1/oauth/token',
    tokenFormat: 'form', tokenAuth: 'body',
    userInfo: { url: 'https://api.canva.com/rest/v1/users/me', pick: (d) => (d && d.display_name) || '' },
    scopes: [],
  },
  quickbooks: {
    label: 'QuickBooks',
    authUrl: 'https://appcenter.intuit.com/connect/oauth2',
    tokenUrl: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
    tokenFormat: 'form', tokenAuth: 'basic',
    userInfo: { url: 'https://accounts.platform.intuit.com/v1/openid_connect/userinfo', pick: (d) => (d && d.email) || '' },
    scopes: ['com.intuit.quickbooks.accounting', 'openid', 'email'],
  },
  withings: {
    label: 'Withings',
    authUrl: 'https://account.withings.com/oauth2_user/authorizev2',
    tokenUrl: 'https://wbsapi.withings.net/v2/oauth2',
    tokenFormat: 'form', tokenAuth: 'body',
    tokenExtra: { action: 'requesttoken' },
    userInfo: null,
    scopes: ['user.metrics'],
  },
  vercel: {
    label: 'Vercel',
    authUrl: 'https://vercel.com/oauth/authorize',
    tokenUrl: 'https://api.vercel.com/v2/oauth/access_token',
    tokenFormat: 'form', tokenAuth: 'body',
    userInfo: { url: 'https://api.vercel.com/v2/user', pick: (d) => (d && d.user && (d.user.email || d.user.name)) || '' },
    scopes: [],
  },
};

/* GitHub OAuth (dedicated flow, reuses the app's GITHUB_OAUTH_* env). */
export const GITHUB_OAUTH = {
  authUrl: 'https://github.com/login/oauth/authorize',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  userUrl: 'https://api.github.com/user',
  scopes: ['repo'],
};

export function githubOAuthConfig() {
  const clientId = String(process.env.GITHUB_OAUTH_CLIENT_ID || '').trim();
  const clientSecret = String(process.env.GITHUB_OAUTH_CLIENT_SECRET || '').trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

/* ---------------- connector cards ----------------
   apikey connectors also declare `fields` for the panel form;
   server verification lives in store.js KEY_DEFS. */

export const CONNECTORS = [
  // Google (9)
  { id: 'gmail', provider: 'google', kind: 'oauth', name: 'Gmail', icon: 'mail', desc: 'Read and search your emails', scopes: ['https://www.googleapis.com/auth/gmail.readonly'] },
  { id: 'gcalendar', provider: 'google', kind: 'oauth', name: 'Google Calendar', icon: 'calendar-days', desc: 'See your upcoming schedule', scopes: ['https://www.googleapis.com/auth/calendar.readonly'] },
  { id: 'gcontacts', provider: 'google', kind: 'oauth', name: 'Google Contacts', icon: 'contact', desc: 'Your contacts and people', scopes: ['https://www.googleapis.com/auth/contacts.readonly'] },
  { id: 'gdrive', provider: 'google', kind: 'oauth', name: 'Google Drive', icon: 'folder', desc: 'Files and folders', scopes: ['https://www.googleapis.com/auth/drive.readonly'] },
  { id: 'gdocs', provider: 'google', kind: 'oauth', name: 'Google Docs', icon: 'file-text', desc: 'Documents', scopes: ['https://www.googleapis.com/auth/documents.readonly', 'https://www.googleapis.com/auth/drive.readonly'] },
  { id: 'gsheets', provider: 'google', kind: 'oauth', name: 'Google Sheets', icon: 'table', desc: 'Spreadsheets', scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly', 'https://www.googleapis.com/auth/drive.readonly'] },
  { id: 'gslides', provider: 'google', kind: 'oauth', name: 'Google Slides', icon: 'presentation', desc: 'Presentations', scopes: ['https://www.googleapis.com/auth/presentations.readonly', 'https://www.googleapis.com/auth/drive.readonly'] },
  { id: 'gforms', provider: 'google', kind: 'oauth', name: 'Google Forms', icon: 'clipboard-list', desc: 'Forms and responses', scopes: ['https://www.googleapis.com/auth/forms.body.readonly', 'https://www.googleapis.com/auth/drive.readonly'] },
  { id: 'gtasks', provider: 'google', kind: 'oauth', name: 'Google Tasks', icon: 'list-todo', desc: 'Task lists', scopes: ['https://www.googleapis.com/auth/tasks.readonly'] },
  // Spotify
  { id: 'spotify', provider: 'spotify', kind: 'oauth', name: 'Spotify', icon: 'music', desc: 'Your playlists and top tracks' },
  // GitHub
  { id: 'github', provider: 'github', kind: 'github', name: 'GitHub', icon: 'github', desc: 'Repos, PR reviews, issues, commit & push' },
  // Meta (8)
  { id: 'facebook', provider: 'meta', kind: 'oauth', name: 'Facebook', icon: 'facebook', desc: 'Profile and pages' },
  { id: 'instagram', provider: 'meta', kind: 'oauth', name: 'Instagram', icon: 'instagram', desc: 'Profile and media' },
  { id: 'instagram_msgs', provider: 'meta', kind: 'oauth', name: 'Instagram Messages', icon: 'send', desc: 'Instagram direct messages', scopes: ['public_profile', 'email', 'instagram_manage_messages'] },
  { id: 'messenger', provider: 'meta', kind: 'oauth', name: 'Messenger', icon: 'message-circle', desc: 'Conversations' },
  { id: 'threads', provider: 'meta', kind: 'oauth', name: 'Threads', icon: 'at-sign', desc: 'Profile and posts' },
  { id: 'threads_msgs', provider: 'meta', kind: 'oauth', name: 'Threads Messages', icon: 'at-sign', desc: 'Threads direct messages', scopes: ['public_profile', 'email'] },
  { id: 'meta_biz', provider: 'meta', kind: 'oauth', name: 'Meta Business Manager', icon: 'briefcase', desc: 'Business assets and pages', scopes: ['public_profile', 'email', 'business_management'] },
  { id: 'meta_ads', provider: 'meta', kind: 'oauth', name: 'Meta Ads', icon: 'megaphone', desc: 'Ad accounts and campaigns', scopes: ['public_profile', 'email', 'ads_read'] },
  // Microsoft (3)
  { id: 'outlook_mail', provider: 'microsoft', kind: 'oauth', name: 'Outlook Mail', icon: 'inbox', desc: 'Outlook emails', scopes: ['Mail.Read'] },
  { id: 'outlook_calendar', provider: 'microsoft', kind: 'oauth', name: 'Outlook Calendar', icon: 'calendar-days', desc: 'Outlook calendar events', scopes: ['Calendars.Read'] },
  { id: 'outlook_contacts', provider: 'microsoft', kind: 'oauth', name: 'Outlook Contacts', icon: 'contact', desc: 'Outlook people', scopes: ['Contacts.Read'] },
  // More OAuth, one card each
  { id: 'dropbox', provider: 'dropbox', kind: 'oauth', name: 'Dropbox', icon: 'cloud', desc: 'Files and folders' },
  { id: 'box', provider: 'box', kind: 'oauth', name: 'Box', icon: 'box', desc: 'Files and folders' },
  { id: 'notion', provider: 'notion', kind: 'oauth', name: 'Notion', icon: 'notebook', desc: 'Pages and databases' },
  { id: 'slack', provider: 'slack', kind: 'oauth', name: 'Slack', icon: 'slack', desc: 'Channels and messages' },
  { id: 'figma', provider: 'figma', kind: 'oauth', name: 'Figma', icon: 'figma', desc: 'Design files' },
  { id: 'zoom', provider: 'zoom', kind: 'oauth', name: 'Zoom', icon: 'video', desc: 'Meetings' },
  { id: 'linear', provider: 'linear', kind: 'oauth', name: 'Linear', icon: 'activity', desc: 'Issues and projects' },
  { id: 'todoist', provider: 'todoist', kind: 'oauth', name: 'Todoist', icon: 'list-checks', desc: 'Tasks' },
  { id: 'asana', provider: 'asana', kind: 'oauth', name: 'Asana', icon: 'target', desc: 'Tasks and projects' },
  { id: 'canva', provider: 'canva', kind: 'oauth', name: 'Canva', icon: 'palette', desc: 'Designs' },
  { id: 'quickbooks', provider: 'quickbooks', kind: 'oauth', name: 'QuickBooks', icon: 'calculator', desc: 'Accounting and invoices' },
  { id: 'withings', provider: 'withings', kind: 'oauth', name: 'Withings', icon: 'watch', desc: 'Health metrics and devices' },
  { id: 'vercel', provider: 'vercel', kind: 'oauth', name: 'Vercel', icon: 'triangle', desc: 'Projects and deployments' },
  // API-key style
  { id: 'plaid', provider: null, kind: 'apikey', name: 'Finances (Plaid)', icon: 'landmark', desc: 'Bank accounts and balances', fields: [
    { key: 'client_id', label: 'Client ID', secret: false }, { key: 'secret', label: 'Secret', secret: true },
    { key: 'access_token', label: 'Access token', secret: true },
    { key: 'env', label: 'Environment', options: ['production', 'sandbox'] } ] },
  { id: 'stripe', provider: null, kind: 'apikey', name: 'Stripe', icon: 'credit-card', desc: 'Payments and balances', fields: [
    { key: 'secret_key', label: 'Secret key (sk_...)', secret: true } ] },
  { id: 'shopify', provider: null, kind: 'apikey', name: 'Shopify', icon: 'shopping-bag', desc: 'Store products and orders', fields: [
    { key: 'shop', label: 'Shop domain (mystore.myshopify.com)', secret: false },
    { key: 'access_token', label: 'Admin API access token', secret: true } ] },
  { id: 'calendly', provider: null, kind: 'apikey', name: 'Calendly', icon: 'calendar-clock', desc: 'Events and scheduling', fields: [
    { key: 'api_token', label: 'Personal access token', secret: true } ] },
  { id: 'klaviyo', provider: null, kind: 'apikey', name: 'Klaviyo', icon: 'send', desc: 'Email lists and campaigns', fields: [
    { key: 'api_key', label: 'Private API key', secret: true } ] },
  { id: 'highlevel', provider: null, kind: 'apikey', name: 'HighLevel', icon: 'trending-up', desc: 'Contacts and pipelines', fields: [
    { key: 'api_key', label: 'API key', secret: true } ] },
  { id: 'tessie', provider: null, kind: 'apikey', name: 'Tessie', icon: 'car', desc: 'Tesla fleet telemetry', fields: [
    { key: 'api_token', label: 'API token', secret: true } ] },
  { id: 'tailscale', provider: null, kind: 'apikey', name: 'Tailscale', icon: 'network', desc: 'Devices and tailnet', fields: [
    { key: 'api_key', label: 'API access token', secret: true } ] },
  { id: 'printify', provider: null, kind: 'apikey', name: 'Printify', icon: 'printer', desc: 'Shops and products', fields: [
    { key: 'api_token', label: 'Personal access token', secret: true } ] },
  { id: 'flightaware', provider: null, kind: 'apikey', name: 'FlightAware', icon: 'plane', desc: 'Live flight status and tracking', fields: [
    { key: 'api_key', label: 'AeroAPI key', secret: true } ] },
  // Built-in
  { id: 'browser', provider: null, kind: 'builtin', name: 'Browser', icon: 'globe', desc: 'Web search and page reading, built into the app' },
  // Device-only
  { id: 'device_calendar', provider: null, kind: 'device', name: 'Calendar', icon: 'calendar-days', desc: 'From this device' },
  { id: 'call_log', provider: null, kind: 'device', name: 'Call Log', icon: 'phone-call', desc: 'From this device' },
  { id: 'device_contacts', provider: null, kind: 'device', name: 'Contacts', icon: 'contact', desc: 'From this device' },
  { id: 'health_connect', provider: null, kind: 'device', name: 'Health Connect', icon: 'heart-pulse', desc: 'From this device' },
  { id: 'device_messages', provider: null, kind: 'device', name: 'Messages', icon: 'message-square', desc: 'From this device' },
  { id: 'notifications', provider: null, kind: 'device', name: 'Notifications', icon: 'bell', desc: 'From this device' },
  { id: 'phone_dialer', provider: null, kind: 'device', name: 'Phone dialer', icon: 'phone', desc: 'From this device' },
  // No public OAuth — route to Custom Connector with a hint
  { id: 'cs_granola', provider: null, kind: 'customsuggest', name: 'Granola', icon: 'notebook-pen', desc: 'AI notepad — via Custom Connector', hint: 'Granola has no public API yet; use a Custom Connector if they publish one.' },
  { id: 'cs_function_health', provider: null, kind: 'customsuggest', name: 'Function Health', icon: 'heart-pulse', desc: 'Lab results — via Custom Connector', hint: 'Function Health has no public API; use a Custom Connector if they publish one.' },
  { id: 'cs_healthex', provider: null, kind: 'customsuggest', name: 'HealthEx', icon: 'stethoscope', desc: 'Health data — via Custom Connector', hint: 'Use a Custom Connector with the HealthEx API base URL and your key.' },
  { id: 'cs_lovable', provider: null, kind: 'customsuggest', name: 'Lovable', icon: 'heart', desc: 'App builder — via Custom Connector', hint: 'Lovable has no public API; use a Custom Connector if they publish one.' },
  { id: 'cs_replit', provider: null, kind: 'customsuggest', name: 'Replit', icon: 'terminal', desc: 'Repls — via Custom Connector', hint: 'Replit has no public personal API; use a Custom Connector if they publish one.' },
  { id: 'cs_opentable', provider: null, kind: 'customsuggest', name: 'OpenTable', icon: 'utensils', desc: 'Reservations — via Custom Connector', hint: 'OpenTable has no public API; use a Custom Connector if they publish one.' },
  { id: 'cs_peloton', provider: null, kind: 'customsuggest', name: 'Peloton', icon: 'bike', desc: 'Workouts — via Custom Connector', hint: 'Peloton has no official public API; a Custom Connector can target a community API.' },
  { id: 'cs_hue', provider: null, kind: 'customsuggest', name: 'Philips Hue', icon: 'lightbulb', desc: 'Smart lights — via Custom Connector', hint: 'Hue lives on your local network; point a Custom Connector at your bridge IP with an API username.' },
  { id: 'cs_zapier', provider: null, kind: 'customsuggest', name: 'Zapier', icon: 'zap', desc: 'Automations — via Custom Connector', hint: 'Create a Zap with a Webhook trigger, then add its URL as a Custom Connector.' },
  { id: 'cs_evernote', provider: null, kind: 'customsuggest', name: 'Evernote', icon: 'notebook', desc: 'Notes — via Custom Connector', hint: 'Evernote new OAuth is closed; use a developer token via a Custom Connector.' },
];

export const PROVIDER_IDS = Object.keys(OAUTH_PROVIDERS);
