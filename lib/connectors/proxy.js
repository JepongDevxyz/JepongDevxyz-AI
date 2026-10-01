/* ============================================================
   JepongDevxyz AI — Connectors proxy (v3)
   POST /api/connectors/proxy  { connector: "github", op: "repos" }

   Makes provider API calls with the user's stored credential,
   server side — tokens never reach the browser. Refreshes OAuth
   tokens when expired. Only the whitelisted ops below run.

   GitHub write ops (review, comment, create-issue, commit) enforce
   the user's connector repo selection: a repo outside an
   "Only select repositories" list is rejected, never written to.

   Each op is an async run(ctx) where ctx = { userId, body,
   token (fresh OAuth access token or null), fields (verified
   API-key fields or null), meta, get }.
   ============================================================ */


import { getUserId } from '../paymongo/create.js';
import { json, getConnectorCreds, refreshIfNeeded, sbGet } from './_db.js';
import { CONNECTORS } from './_providers.js';

function b64(s) { return Buffer.from(s, 'utf8').toString('base64'); }

/* Write-capable JSON call (POST/PUT/PATCH/DELETE) for connector ops that
   change provider state. Same timeout + error contract as getJson. */
async function callJson(method, url, { token, body } = {}) {
  const r = await fetch(url, {
    method,
    signal: AbortSignal.timeout(20000),
    headers: {
      ...bearer(token),
      Accept: 'application/vnd.github+json',
      'User-Agent': 'JepongDevxyz-AI-Connectors',
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!r.ok) {
    const msg = (data && data.message) ? 'GitHub: ' + data.message : 'Provider error ' + r.status;
    const e = new Error(msg);
    e.statusCode = r.status;
    throw e;
  }
  return data;
}

/* ---------------- GitHub input validation + repo allowlist ----------------
   Write ops must prove the target repo is inside the user's connector
   repo selection (mode "all", or "selected" with an explicit list).
   This mirrors the read-side filtering in 'github:repos' but REJECTS
   instead of filtering, so a disallowed repo can never be written to. */
function validRepo(s) {
  const r = String(s || '');
  if (!/^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/.test(r)) return false;
  const [owner, name] = r.split('/');
  return owner !== '.' && owner !== '..' && name !== '.' && name !== '..';
}
function validPath(s) {
  const p = String(s || '');
  return p.length > 0 && p.length <= 260 && !p.startsWith('/') && !p.includes('\\') &&
    !p.split('/').some((seg) => !seg || seg === '.' || seg === '..') &&
    /^[A-Za-z0-9_@+.,\/ -]+$/.test(p);
}
function validBranch(s) {
  const b = String(s || '');
  return b.length > 0 && b.length <= 100 && /^[A-Za-z0-9_.\/-]+$/.test(b) && !b.includes('..');
}
function failOp(statusCode, message) {
  const e = new Error(message);
  e.statusCode = statusCode;
  throw e;
}
function requireRepo(body, meta) {
  const repo = String((body && body.repo) || '').trim();
  if (!validRepo(repo)) failOp(400, 'Invalid repo. Use owner/name format.');
  const sel = meta || {};
  if (sel.mode === 'selected' && Array.isArray(sel.repos) && !sel.repos.includes(repo)) {
    failOp(403, 'Repository is not in your selected GitHub access list.');
  }
  return repo;
}
const ghHeaders = (token) => ({
  ...bearer(token),
  Accept: 'application/vnd.github+json',
  'User-Agent': 'JepongDevxyz-AI-Connectors',
});

async function getJson(url, opts = {}) {
  const r = await fetch(url, { signal: AbortSignal.timeout(20000), ...opts });
  const text = await r.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!r.ok) {
    const e = new Error('Provider error ' + r.status);
    e.statusCode = r.status;
    throw e;
  }
  return data;
}
const bearer = (t, extra) => ({ Authorization: 'Bearer ' + t, ...(extra || {}) });

/* ---------------- op implementations ---------------- */

const OPS = {
  /* --- Google --- */
  'gmail:unread': async ({ token, get }) => {
    const d = await get('https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is%3Aunread&maxResults=5', { headers: bearer(token) });
    const msgs = Array.isArray(d && d.messages) ? d.messages : [];
    const out = [];
    for (const m of msgs.slice(0, 5)) {
      const one = await get(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages/' + m.id + '?format=metadata&metadataHeaders=From%2CSubject%2CDate',
        { headers: bearer(token) }
      ).catch(() => null);
      if (!one || !one.payload) continue;
      const headers = {};
      for (const h of ((one.payload && one.payload.headers) || [])) headers[h.name] = h.value;
      out.push({ from: headers.From || '', subject: headers.Subject || '', date: headers.Date || '' });
    }
    return out;
  },
  'gcalendar:upcoming': async ({ token, get }) => {
    const url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=' +
      encodeURIComponent(new Date().toISOString()) + '&maxResults=5&singleEvents=true&orderBy=startTime';
    const d = await get(url, { headers: bearer(token) });
    return (Array.isArray(d && d.items) ? d.items : []).map((e) => ({
      summary: e.summary || '(no title)',
      start: (e.start && (e.start.dateTime || e.start.date)) || '',
    }));
  },
  'gcontacts:list': async ({ token, get }) => {
    const d = await get('https://people.googleapis.com/v1/people/me/connections?pageSize=10&personFields=names,emailAddresses', { headers: bearer(token) });
    return (Array.isArray(d && d.connections) ? d.connections : []).map((p) => ({
      name: p.names && p.names[0] ? p.names[0].displayName : '',
      email: p.emailAddresses && p.emailAddresses[0] ? p.emailAddresses[0].value : '',
    }));
  },
  'gdrive:recent': async ({ token, get }) => {
    const d = await get('https://www.googleapis.com/drive/v3/files?pageSize=10&orderBy=modifiedTime%20desc&fields=files(id,name,mimeType,modifiedTime)', { headers: bearer(token) });
    return (Array.isArray(d && d.files) ? d.files : []).map((f) => ({ name: f.name, type: f.mimeType, modified: f.modifiedTime }));
  },
  'gdocs:list': async ({ token, get }) => driveByType(get, token, 'application/vnd.google-apps.document'),
  'gsheets:list': async ({ token, get }) => driveByType(get, token, 'application/vnd.google-apps.spreadsheet'),
  'gslides:list': async ({ token, get }) => driveByType(get, token, 'application/vnd.google-apps.presentation'),
  'gforms:list': async ({ token, get }) => driveByType(get, token, 'application/vnd.google-apps.form'),
  'gtasks:tasks': async ({ token, get }) => {
    const lists = await get('https://tasks.googleapis.com/tasks/v1/users/@me/lists?maxResults=1', { headers: bearer(token) });
    const listId = lists && lists.items && lists.items[0] ? lists.items[0].id : null;
    if (!listId) return [];
    const d = await get('https://tasks.googleapis.com/tasks/v1/lists/' + encodeURIComponent(listId) + '/tasks?maxResults=10&showCompleted=false', { headers: bearer(token) });
    return (Array.isArray(d && d.items) ? d.items : []).map((t) => ({ title: t.title || '', due: t.due || '', status: t.status || '' }));
  },

  /* --- Spotify / GitHub --- */
  'spotify:playlists': async ({ token, get }) => {
    const d = await get('https://api.spotify.com/v1/me/playlists?limit=10', { headers: bearer(token) });
    return (Array.isArray(d && d.items) ? d.items : []).map((p) => ({
      name: p.name, tracks: p.tracks ? p.tracks.total : 0, url: p.external_urls && p.external_urls.spotify,
    }));
  },
  'github:repos': async ({ token, get, meta }) => {
    const d = await get('https://api.github.com/user/repos?per_page=30&sort=updated', {
      headers: { ...bearer(token), Accept: 'application/vnd.github+json', 'User-Agent': 'JepongDevxyz-AI-Connectors' },
    });
    let repos = (Array.isArray(d) ? d : []).map((r) => ({
      name: r.full_name || r.name, url: r.html_url, lang: r.language || '', updated: r.updated_at || '',
    }));
    const sel = meta || {};
    if (sel.mode === 'selected' && Array.isArray(sel.repos)) {
      const allow = new Set(sel.repos);
      repos = repos.filter((r) => allow.has(r.name));
    }
    return repos;
  },
  /* --- GitHub: review (PRs, issues, reviews, comments) --- */
  'github:prs': async ({ token, get, body, meta }) => {
    const repo = requireRepo(body, meta);
    const state = ['open', 'closed', 'all'].includes(body.state) ? body.state : 'open';
    const d = await get(`https://api.github.com/repos/${repo}/pulls?state=${state}&per_page=20&sort=updated&direction=desc`, { headers: ghHeaders(token) });
    return (Array.isArray(d) ? d : []).map((p) => ({
      number: p.number, title: p.title || '', state: p.state || '',
      author: (p.user && p.user.login) || '', branch: (p.head && p.head.ref) || '',
      url: p.html_url || '',
    }));
  },
  'github:pr-files': async ({ token, get, body, meta }) => {
    const repo = requireRepo(body, meta);
    const n = parseInt(body.number, 10);
    if (!Number.isFinite(n) || n <= 0) failOp(400, 'Invalid PR number.');
    const d = await get(`https://api.github.com/repos/${repo}/pulls/${n}/files?per_page=30`, { headers: ghHeaders(token) });
    return (Array.isArray(d) ? d : []).map((f) => ({
      path: f.filename || '', status: f.status || '', additions: f.additions || 0, deletions: f.deletions || 0,
    }));
  },
  'github:issues': async ({ token, get, body, meta }) => {
    const repo = requireRepo(body, meta);
    const state = ['open', 'closed', 'all'].includes(body.state) ? body.state : 'open';
    const d = await get(`https://api.github.com/repos/${repo}/issues?state=${state}&per_page=20&sort=updated&direction=desc`, { headers: ghHeaders(token) });
    return (Array.isArray(d) ? d : []).filter((i) => !i.pull_request).map((i) => ({
      number: i.number, title: i.title || '', state: i.state || '',
      author: (i.user && i.user.login) || '', url: i.html_url || '',
    }));
  },
  'github:review': async ({ token, body, meta }) => {
    const repo = requireRepo(body, meta);
    const n = parseInt(body.number, 10);
    if (!Number.isFinite(n) || n <= 0) failOp(400, 'Invalid PR number.');
    const event = String(body.event || 'COMMENT').toUpperCase();
    if (!['APPROVE', 'REQUEST_CHANGES', 'COMMENT'].includes(event)) failOp(400, 'Invalid review event. Use APPROVE, REQUEST_CHANGES, or COMMENT.');
    const reviewBody = String(body.body || '').slice(0, 12000);
    const d = await callJson('POST', `https://api.github.com/repos/${repo}/pulls/${n}/reviews`, {
      token, body: { event, body: reviewBody || undefined },
    });
    return { id: d.id, state: d.state || event, url: d.html_url || '' };
  },
  'github:comment': async ({ token, body, meta }) => {
    const repo = requireRepo(body, meta);
    const n = parseInt(body.number, 10);
    if (!Number.isFinite(n) || n <= 0) failOp(400, 'Invalid issue/PR number.');
    const text = String(body.body || '').trim().slice(0, 12000);
    if (!text) failOp(400, 'Comment body is required.');
    const d = await callJson('POST', `https://api.github.com/repos/${repo}/issues/${n}/comments`, { token, body: { body: text } });
    return { id: d.id, url: d.html_url || '' };
  },
  'github:create-issue': async ({ token, body, meta }) => {
    const repo = requireRepo(body, meta);
    const title = String(body.title || '').trim().slice(0, 250);
    if (!title) failOp(400, 'Issue title is required.');
    const issueBody = String(body.body || '').slice(0, 12000);
    const d = await callJson('POST', `https://api.github.com/repos/${repo}/issues`, {
      token, body: { title, body: issueBody || undefined },
    });
    return { number: d.number, url: d.html_url || '' };
  },
  'github:create-pr': async ({ token, body, meta }) => {
    const repo = requireRepo(body, meta);
    const title = String(body.title || '').trim().slice(0, 250);
    if (!title) failOp(400, 'PR title is required.');
    const head = String(body.head || '');
    const base = String(body.base || '');
    if (!validBranch(head) || !validBranch(base)) failOp(400, 'Valid head and base branches are required.');
    if (head === base) failOp(400, 'Head and base branches must differ.');
    const prBody = String(body.body || '').slice(0, 12000);
    const d = await callJson('POST', `https://api.github.com/repos/${repo}/pulls`, {
      token, body: { title, head, base, body: prBody || undefined },
    });
    return { number: d.number, url: d.html_url || '' };
  },
  'github:merge': async ({ token, body, meta }) => {
    const repo = requireRepo(body, meta);
    const n = parseInt(body.number, 10);
    if (!Number.isFinite(n) || n <= 0) failOp(400, 'Invalid PR number.');
    const method = String(body.method || 'merge').toLowerCase();
    if (!['merge', 'squash', 'rebase'].includes(method)) failOp(400, 'Invalid merge method. Use merge, squash, or rebase.');
    const d = await callJson('PUT', `https://api.github.com/repos/${repo}/pulls/${n}/merge`, {
      token, body: { merge_method: method },
    });
    return { merged: !!d.merged, sha: d.sha || '', message: d.message || '' };
  },
  /* --- GitHub: commit & push (file create/update on a branch) --- */
  'github:branches': async ({ token, get, body, meta }) => {
    const repo = requireRepo(body, meta);
    const d = await get(`https://api.github.com/repos/${repo}/branches?per_page=30`, { headers: ghHeaders(token) });
    return (Array.isArray(d) ? d : []).map((b) => ({ name: b.name || '', protected: !!(b.protected) }));
  },
  'github:file': async ({ token, get, body, meta }) => {
    const repo = requireRepo(body, meta);
    const path = String(body.path || '');
    if (!validPath(path)) failOp(400, 'Invalid file path.');
    const ref = validBranch(body.ref) ? `?ref=${encodeURIComponent(body.ref)}` : '';
    const d = await get(`https://api.github.com/repos/${repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}${ref}`, { headers: ghHeaders(token) });
    if (!d || d.type !== 'file' || typeof d.content !== 'string') failOp(400, 'Not a file.');
    const content = Buffer.from(d.content.replace(/\n/g, ''), 'base64').toString('utf8');
    if (content.length > 110000) failOp(400, 'File is too large.');
    return { path: d.path, sha: d.sha, content };
  },
  'github:commit': async ({ token, body, meta }) => {
    const repo = requireRepo(body, meta);
    const path = String(body.path || '');
    if (!validPath(path)) failOp(400, 'Invalid file path.');
    const branch = validBranch(body.branch) ? body.branch : null;
    if (!branch) failOp(400, 'A target branch is required.');
    const message = String(body.message || '').trim().slice(0, 500);
    if (!message) failOp(400, 'A commit message is required.');
    const content = String(body.content || '');
    if (!content || content.length > 100000) failOp(400, 'File content is required (max 100KB).');
    const url = `https://api.github.com/repos/${repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}`;
    // Fetch current sha when updating an existing file; absent file = create.
    let sha = null;
    try {
      const cur = await callJson('GET', url + `?ref=${encodeURIComponent(branch)}`, { token });
      if (cur && cur.type === 'file' && cur.sha) sha = cur.sha;
    } catch (e) { if (e.statusCode !== 404) throw e; }
    const payload = { message, content: b64(content), branch };
    if (sha) payload.sha = sha;
    const d = await callJson('PUT', url, { token, body: payload });
    return {
      path: (d.content && d.content.path) || path,
      sha: (d.content && d.content.sha) || '',
      commit: (d.commit && d.commit.sha) || '',
      url: (d.content && d.content.html_url) || '',
    };
  },

  /* --- Meta --- */
  'facebook:profile': async ({ token, get }) => {
    const d = await get('https://graph.facebook.com/me?fields=name,email', { headers: bearer(token) });
    return { name: (d && d.name) || '', email: (d && d.email) || '' };
  },
  'instagram:profile': async ({ token, get }) => {
    const d = await get('https://graph.facebook.com/me?fields=name', { headers: bearer(token) });
    return { name: (d && d.name) || '' };
  },
  'instagram_msgs:profile': async ({ token, get }) => {
    const d = await get('https://graph.facebook.com/me?fields=name', { headers: bearer(token) });
    return { name: (d && d.name) || '' };
  },
  'messenger:profile': async ({ token, get }) => {
    const d = await get('https://graph.facebook.com/me?fields=name', { headers: bearer(token) });
    return { name: (d && d.name) || '' };
  },
  'threads:profile': async ({ token, get }) => {
    const d = await get('https://graph.facebook.com/me?fields=name', { headers: bearer(token) });
    return { name: (d && d.name) || '' };
  },
  'threads_msgs:profile': async ({ token, get }) => {
    const d = await get('https://graph.facebook.com/me?fields=name', { headers: bearer(token) });
    return { name: (d && d.name) || '' };
  },
  'meta_biz:businesses': async ({ token, get }) => {
    const d = await get('https://graph.facebook.com/v21.0/me/businesses?fields=name&limit=25', { headers: bearer(token) });
    return (Array.isArray(d && d.data) ? d.data : []).map((b) => ({ name: b.name, id: b.id }));
  },
  'meta_ads:accounts': async ({ token, get }) => {
    const d = await get('https://graph.facebook.com/v21.0/me/adaccounts?fields=name,account_status,balance,currency&limit=25', { headers: bearer(token) });
    return (Array.isArray(d && d.data) ? d.data : []).map((a) => ({
      name: a.name, id: a.id, status: a.account_status, balance: a.balance, currency: a.currency,
    }));
  },

  /* --- Microsoft --- */
  'outlook_mail:unread': async ({ token, get }) => {
    const d = await get('https://graph.microsoft.com/v1.0/me/messages?$filter=isRead%20eq%20false&$top=5&$select=from,subject,receivedDateTime', { headers: bearer(token) });
    return (Array.isArray(d && d.value) ? d.value : []).map((m) => ({
      from: m.from && m.from.emailAddress ? m.from.emailAddress.address : '',
      subject: m.subject || '', date: m.receivedDateTime || '',
    }));
  },
  'outlook_calendar:upcoming': async ({ token, get }) => {
    const now = new Date();
    const end = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
    const d = await get('https://graph.microsoft.com/v1.0/me/calendarview?startdatetime=' + encodeURIComponent(now.toISOString()) +
      '&enddatetime=' + encodeURIComponent(end.toISOString()) + '&$top=5&$orderby=start/dateTime', { headers: bearer(token) });
    return (Array.isArray(d && d.value) ? d.value : []).map((e) => ({
      summary: e.subject || '(no title)', start: (e.start && e.start.dateTime) || '',
    }));
  },
  'outlook_contacts:list': async ({ token, get }) => {
    const d = await get('https://graph.microsoft.com/v1.0/me/contacts?$top=10&$select=displayName,emailAddresses', { headers: bearer(token) });
    return (Array.isArray(d && d.value) ? d.value : []).map((c) => ({
      name: c.displayName || '',
      email: c.emailAddresses && c.emailAddresses[0] ? c.emailAddresses[0].address : '',
    }));
  },

  /* --- More OAuth providers --- */
  'dropbox:files': async ({ token }) => {
    const d = await getJson('https://api.dropboxapi.com/2/files/list_folder', {
      method: 'POST', headers: { ...bearer(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: '', limit: 10 }),
    });
    return (Array.isArray(d && d.entries) ? d.entries : []).map((e) => ({ name: e.name, type: e['.tag'] || '' }));
  },
  'box:items': async ({ token, get }) => {
    const d = await get('https://api.box.com/2.0/folders/0/items?limit=10', { headers: bearer(token) });
    return (Array.isArray(d && d.entries) ? d.entries : []).map((e) => ({ name: e.name, type: e.type || '' }));
  },
  'notion:search': async ({ token }) => {
    const d = await getJson('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: { ...bearer(token), 'Content-Type': 'application/json', 'Notion-Version': '2022-06-28' },
      body: JSON.stringify({ page_size: 10, sort: { direction: 'descending', timestamp: 'last_edited_time' } }),
    });
    return (Array.isArray(d && d.results) ? d.results : []).map((r) => ({
      id: r.id, type: r.object || '',
      title: titleOfNotion(r),
    }));
  },
  'slack:channels': async ({ token, get }) => {
    const d = await get('https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=20', { headers: bearer(token) });
    if (!d || !d.ok) throw new Error('Slack error: ' + ((d && d.error) || 'unknown'));
    return (Array.isArray(d.channels) ? d.channels : []).map((c) => ({ name: c.name || '', members: c.num_members || 0 }));
  },
  'figma:me': async ({ token, get }) => {
    const d = await get('https://api.figma.com/v1/me', { headers: bearer(token) });
    return { handle: (d && d.handle) || '', email: (d && d.email) || '' };
  },
  'zoom:meetings': async ({ token, get }) => {
    const d = await get('https://api.zoom.us/v2/users/me/meetings?type=upcoming&page_size=10', { headers: bearer(token) });
    return (Array.isArray(d && d.meetings) ? d.meetings : []).map((m) => ({
      topic: m.topic || '', start: m.start_time || '', join_url: m.join_url || '',
    }));
  },
  'linear:issues': async ({ token }) => {
    const d = await getJson('https://api.linear.app/graphql', {
      method: 'POST', headers: { ...bearer(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ viewer { assignedIssues(first: 10) { nodes { title state { name } } } } }' }),
    });
    const nodes = d && d.data && d.data.viewer && d.data.viewer.assignedIssues ? d.data.viewer.assignedIssues.nodes : [];
    return nodes.map((n) => ({ title: n.title || '', state: (n.state && n.state.name) || '' }));
  },
  'todoist:tasks': async ({ token, get }) => {
    const d = await get('https://api.todoist.com/api/v1/tasks?limit=10', { headers: bearer(token) });
    return (Array.isArray(d && d.results) ? d.results : []).map((t) => ({ content: t.content || '', due: (t.due && t.due.date) || '' }));
  },
  'asana:me': async ({ token, get }) => {
    const d = await get('https://app.asana.com/api/1.0/users/me?opt_fields=name,email,workspaces.name', { headers: bearer(token) });
    const u = (d && d.data) || {};
    return { name: u.name || '', email: u.email || '', workspaces: (u.workspaces || []).map((w) => w.name) };
  },
  'canva:me': async ({ token, get }) => {
    const d = await get('https://api.canva.com/rest/v1/users/me', { headers: bearer(token) });
    return { name: (d && d.display_name) || '', id: (d && d.id) || '' };
  },
  'quickbooks:company': async ({ token, get, meta }) => {
    const realmId = meta && meta.realmId ? String(meta.realmId) : '';
    if (!realmId) throw new Error('Missing QuickBooks company id.');
    const d = await get('https://quickbooks.api.intuit.com/v3/company/' + encodeURIComponent(realmId) + '/companyinfo/' + encodeURIComponent(realmId),
      { headers: { ...bearer(token), Accept: 'application/json' } });
    const c = (d && d.CompanyInfo) || {};
    return { name: c.CompanyName || '', email: (c.CompanyEmail && c.CompanyEmail.Address) || '' };
  },
  'withings:devices': async ({ token }) => {
    const d = await getJson('https://wbsapi.withings.net/v2/user?action=getdevice&access_token=' + encodeURIComponent(token));
    if (!d || d.status !== 0) throw new Error('Withings error ' + ((d && d.status) || ''));
    return (Array.isArray(d.body && d.body.devices) ? d.body.devices : []).map((x) => ({ type: x.type || '', model: x.model || '' }));
  },
  'vercel:projects': async ({ token, get }) => {
    const d = await get('https://api.vercel.com/v9/projects?limit=10', { headers: bearer(token) });
    return (Array.isArray(d && d.projects) ? d.projects : []).map((p) => ({ name: p.name || '', updated: p.updatedAt || 0 }));
  },

  /* --- API-key connectors --- */
  'plaid:balance': async ({ fields }) => {
    const host = fields.env === 'sandbox' ? 'https://sandbox.plaid.com' : 'https://production.plaid.com';
    const d = await getJson(host + '/accounts/balance/get', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: fields.client_id, secret: fields.secret, access_token: fields.access_token }),
    });
    if (!d || !Array.isArray(d.accounts)) throw new Error('Plaid did not respond as expected.');
    return d.accounts.map((a) => ({ name: a.name, type: a.type, subtype: a.subtype, balances: a.balances || {} }));
  },
  'stripe:balance': async ({ fields, get }) => {
    const d = await get('https://api.stripe.com/v1/balance', { headers: bearer(fields.secret_key) });
    const fmt = (arr) => (Array.isArray(arr) ? arr : []).map((b) => ({ amount: b.amount, currency: b.currency }));
    return { available: fmt(d && d.available), pending: fmt(d && d.pending) };
  },
  'shopify:products': async ({ fields, get }) => {
    const shop = String(fields.shop || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const d = await get('https://' + shop + '/admin/api/2024-01/products.json?limit=5', {
      headers: { 'X-Shopify-Access-Token': fields.access_token },
    });
    return (Array.isArray(d && d.products) ? d.products : []).map((p) => ({ title: p.title || '', status: p.status || '' }));
  },
  'calendly:events': async ({ fields, get }) => {
    const me = await get('https://api.calendly.com/users/me', { headers: { Authorization: 'Token ' + fields.api_token } });
    const uri = me && me.resource ? me.resource.uri : '';
    if (!uri) throw new Error('Calendly user not found.');
    const d = await get('https://api.calendly.com/scheduled_events?user=' + encodeURIComponent(uri) + '&count=10&sort=start_time:asc',
      { headers: { Authorization: 'Token ' + fields.api_token } });
    return (Array.isArray(d && d.collection) ? d.collection : []).map((e) => ({ name: e.name || '', start: e.start_time || '' }));
  },
  'klaviyo:lists': async ({ fields, get }) => {
    const d = await get('https://a.klaviyo.com/api/lists/?page[size]=10', {
      headers: { Authorization: 'Klaviyo-API-Key ' + fields.api_key, revision: '2024-10-15' },
    });
    return (Array.isArray(d && d.data) ? d.data : []).map((l) => ({ name: (l.attributes && l.attributes.name) || '', id: l.id || '' }));
  },
  'highlevel:me': async ({ fields, get }) => {
    const d = await get('https://services.leadconnectorhq.com/users/me', {
      headers: { Authorization: 'Bearer ' + fields.api_key, Version: '2021-07-28' },
    });
    return { name: (d && (d.name || d.firstName)) || '', email: (d && d.email) || '' };
  },
  'tessie:vehicles': async ({ fields, get }) => {
    const d = await get('https://api.tessie.com/vehicles', { headers: bearer(fields.api_token) });
    const arr = Array.isArray(d) ? d : (d && d.results) || [];
    return arr.map((v) => ({ vin: v.vin || '', name: v.display_name || v.displayName || '' }));
  },
  'tailscale:devices': async ({ fields, get }) => {
    const d = await get('https://api.tailscale.com/api/v2/tailnet/-/devices', {
      headers: { Authorization: 'Basic ' + b64(fields.api_key + ':') },
    });
    return (Array.isArray(d && d.devices) ? d.devices : []).map((x) => ({ name: x.name || '', os: x.os || '' }));
  },
  'printify:shops': async ({ fields, get }) => {
    const d = await get('https://api.printify.com/v1/shops.json', { headers: bearer(fields.api_token) });
    return (Array.isArray(d) ? d : []).map((s) => ({ title: s.title || '', id: s.id }));
  },
  'flightaware:track': async ({ fields, body }) => {
    const ident = String((body && body.ident) || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!ident) throw new Error('Missing flight ident.');
    const d = await getJson('https://aeroapi.flightaware.com/aeroapi/flights/' + encodeURIComponent(ident) + '?max_pages=1', {
      headers: { 'x-apikey': fields.api_key },
    });
    const f = Array.isArray(d && d.flights) && d.flights[0] ? d.flights[0] : null;
    if (!f) return { found: false };
    return {
      found: true, ident: f.ident, status: f.status,
      origin: f.origin && f.origin.code, destination: f.destination && f.destination.code,
      departure: f.scheduled_out || f.actual_out || '', arrival: f.scheduled_in || f.actual_in || '',
    };
  },
};

async function driveByType(get, token, mime) {
  const d = await get('https://www.googleapis.com/drive/v3/files?pageSize=10&q=' +
    encodeURIComponent("mimeType='" + mime + "' and trashed=false") +
    '&orderBy=modifiedTime%20desc&fields=files(id,name,modifiedTime)', { headers: bearer(token) });
  return (Array.isArray(d && d.files) ? d.files : []).map((f) => ({ name: f.name, modified: f.modifiedTime }));
}

function titleOfNotion(r) {
  try {
    const props = r.properties || {};
    for (const k of Object.keys(props)) {
      const p = props[k];
      if (p && p.type === 'title' && Array.isArray(p.title) && p.title[0]) {
        return p.title.map((t) => (t.plain_text || '')).join('');
      }
    }
  } catch { /* ignore */ }
  return '';
}

/* Custom connectors need bespoke handling (not a simple GET). */
async function customCall(userId, body) {
  const customId = String((body && body.custom_id) || '');
  if (!/^[0-9a-f-]{36}$/i.test(customId)) return { status: 400, data: { error: 'Invalid custom connector.' } };
  const rows = await sbGet(
    '/rest/v1/custom_connectors?select=id,base_url,auth_type,auth_value,auth_header' +
      '&id=eq.' + encodeURIComponent(customId) + '&user_id=eq.' + encodeURIComponent(userId)
  ).catch(() => []);
  const cc = Array.isArray(rows) && rows[0] ? rows[0] : null;
  if (!cc) return { status: 404, data: { error: 'Custom connector not found.' } };
  let path = String((body && body.path) || '/').trim();
  if (!path.startsWith('/')) path = '/' + path;
  if (/[<>]/.test(path)) return { status: 400, data: { error: 'Invalid path.' } };
  const headers = {};
  let url = cc.base_url.replace(/\/+$/, '') + path;
  const v = cc.auth_value || '';
  if (v) {
    if (cc.auth_type === 'bearer') headers.Authorization = 'Bearer ' + v;
    else if (cc.auth_type === 'header' && cc.auth_header) headers[cc.auth_header] = v;
    else if (cc.auth_type === 'xapikey') headers['x-apikey'] = v;
    else if (cc.auth_type === 'query') url += (url.includes('?') ? '&' : '?') + 'api_key=' + encodeURIComponent(v);
    else if (cc.auth_type === 'basic') headers.Authorization = 'Basic ' + Buffer.from(v).toString('base64');
  }
  const r = await fetch(url, { headers, signal: AbortSignal.timeout(20000) });
  const text = await r.text();
  if (!r.ok) return { status: 502, data: { error: 'The API returned ' + r.status + '.' } };
  let data;
  try { data = JSON.parse(text); } catch { data = text.slice(0, 200000); }
  return { status: 200, data: { ok: true, data } };
}

async function handle(req) {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed.' });
  const userId = await getUserId(req);
  const body = await req.json().catch(() => ({}));
  const connector = String(body.connector || '');
  const op = String(body.op || '');

  if (connector === 'custom') {
    const out = await customCall(userId, body);
    return json(out.status, out.data);
  }

  const conn = CONNECTORS.find((c) => c.id === connector);
  if (!conn) return json(400, { error: 'Unknown connector.' });
  const run = OPS[connector + ':' + op];
  if (!run) return json(400, { error: 'Unknown connector or operation.' });

  const creds = await getConnectorCreds(userId, conn);
  let token = null;
  let fields = null;
  if (conn.kind === 'oauth' || conn.kind === 'github') {
    let row = creds.token;
    if (!row) return json(404, { error: 'Connector is not connected.' });
    row = await refreshIfNeeded(userId, conn.provider, row);
    token = row.access_token;
  } else if (conn.kind === 'apikey') {
    fields = (creds.meta && creds.meta.fields) || null;
    if (!fields) return json(404, { error: 'Connector is not connected.' });
  } else {
    return json(400, { error: 'This connector has no operations.' });
  }

  try {
    const data = await run({ userId, body, token, fields, meta: creds.meta, get: getJson });
    return json(200, { ok: true, data });
  } catch (e) {
    const sc = e && e.statusCode;
    if (sc === 401 || sc === 403) {
      return json(502, { error: 'The provider refused the request. Try disconnecting and connecting again.' });
    }
    return json(502, { error: (e && e.message) || 'The provider did not respond as expected.' });
  }
}

async function handler(req) {
  try {
    return await handle(req);
  } catch (e) {
    const status = e && typeof e.status === 'number' ? e.status : 500;
    return json(status, { error: (e && e.message) || 'Server error.' });
  }
}

export { handler };
/* Exposed for tests. */
export const OP_KEYS = Object.keys(OPS);
