# Codex Workspace integration — development branch

This is the first **working code path** for an isolated Codex task runner, not a complete copy of the ChatGPT Codex product. The web UI is at `/codex.html`. The existing AI/chat, pet, and GitHub plugin code remains intact.

## Implemented in this branch

- Existing GitHub OAuth session verifies the actual user on every request.
- A GitHub App issues a short-lived repository-scoped **contents:read** token for checkout. The broad OAuth token is **never forwarded** to the runner.
- Vercel Edge `/api/codex` signs calls to a separate private service using HMAC-SHA256, a timestamp and a replay nonce.
- A single-owner Node runner clones an isolated working copy, starts the official `@openai/codex-sdk` in a separate process, streams bounded *observable execution events*, provides stop/follow-up controls and returns source changes and a Git diff for manual review.
- The runner may load the **actual upstream Superpowers SKILL.md directories**, if the operator explicitly mounts an official checkout and configures `RUNNER_SUPERPOWERS_SKILLS_DIR`. This does **not** install the full Codex plugin, its hooks or marketplace metadata.

## Required infrastructure — NOT provisioned by this GitHub branch

**Do not enable this on an open, multi-user website yet.** The first runner is explicitly restricted to a single GitHub owner; it is not safe to co-host unrelated users or to execute untrusted repositories on your ordinary host. Deploy the runner in a disposable, isolated Linux container or VM with an unprivileged account, a tight resource limit, no host mounts, and a restricted network policy. The Codex CLI sandbox is defense-in-depth and is not a substitute for isolating the host. Use an HTTPS reverse proxy pointing to the runner's loopback listener.

On the Vercel **site** set:

- `CODEX_RUNNER_URL`: public HTTPS URL of the isolated runner's reverse proxy (no trailing slash).
- `CODEX_RUNNER_SHARED_SECRET`: 32+ random bytes, supplied as a secret, **identical** on the runner and Vercel.
- Existing `GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_SECRET`, `GITHUB_SESSION_SECRET`, `GITHUB_APP_SLUG`, `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, and the configured OAuth callback on the same origin.

On the **runner** set:

- `CODEX_RUNNER_SHARED_SECRET`: the same strong shared secret.
- `RUNNER_ALLOWED_GITHUB_LOGIN`: the exact personal GitHub login authorized for the single-owner instance.
- `OPENAI_API_KEY`: a dedicated server-side API credential. **Do not place this in HTML, the GitHub repository, or a public Vercel variable.** This first implementation uses API billing, **not** the user's ChatGPT Plus subscription.
- `PORT`: optional, default `8080`.
- `RUNNER_SUPERPOWERS_SKILLS_DIR`: optional absolute **read-only** mount to the upstream `obra/superpowers/skills` directory. Do not expose this path to users and do not allow them to change it. See the official upstream documentation for installation and the MIT license.

Runner setup inside the isolated environment: `cd codex-runner && npm install && npm run check && npm start`. Git and a Linux-compatible environment are required. Never copy your personal ChatGPT cookies or browser tokens to this server.

## Explicitly unfinished and not to be represented as complete

1. Deploy and verify the isolated runner with the user's actual Vercel environment, an authorized GitHub App installation, and a valid OpenAI credential.
2. Implement supported **per-user ChatGPT sign-in** using Codex App Server and per-user authentication/session isolation; this branch does not convert ChatGPT subscriptions into shared API credit.
3. Persistent storage and resume across runner restarts (jobs currently reside in memory and temporary workspaces).
4. A reviewed multi-file commit/branch/PR write path after explicit confirmation; this branch intentionally does **not** automatically push repository changes.
5. Full Superpowers plugin lifecycle/hook support, multiple concurrent user isolation, workspace browser/editor, browser/IDE integration, and production audit/limits.
6. End-to-end live verification that a real Codex turn can clone, edit, run tests, produce a diff and resume; syntax-only checks are insufficient for this claim.

Do not merge or deploy this as a completed Codex feature merely because the repository syntax checks pass.
