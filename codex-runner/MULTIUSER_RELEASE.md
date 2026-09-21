# Per-user Codex sandbox release checklist

This branch now includes an **opt-in, fail-closed per-user sandbox router** using Vercel Sandbox, not the earlier shared Railway runner. It has NOT been authorized for public deployment or verified with real ChatGPT users.

## Architecture

Each enrolled authenticated JepongDevxyz AI cloud account receives a distinct named persistent Firecracker microVM and its own Codex App Server home. GitHub login is optional until the user opens a repository in Work. A per-tenant HMAC signing key is derived on the server from a private master secret. Private GitHub installation tokens only pass through the authenticated gateway for a single repository clone; they must never be shown to the model or browser.

The sandbox is created only by an explicit "Connect ChatGPT" action. The backend verifies the app account's Supabase access token against Supabase Auth before choosing the tenant. Browser-provided user IDs, model labels and localStorage flags never grant access. A user's ChatGPT password and raw ChatGPT tokens are never sent to the website.

## Required Vercel project configuration

1. Confirm that Vercel Sandbox is available on the project and review its compute/snapshot billing. Each persistent sandbox has separate usage and storage costs.
2. Set `CODEX_RUNNER_SHARED_SECRET` to a private random value of at least 32 characters, generated and saved **only** in the Vercel Environment Variables UI, not in GitHub or chat.
3. Set `CODEX_ALLOWED_ACCOUNT_IDS` to an explicit comma-separated allowlist of authenticated JepongDevxyz AI account UUIDs (Supabase Auth IDs). The old GitHub numeric allowlist is not an app account identity and must not grant Codex access. Begin with the owner's app account and expand only after quotas, payments and production security review.
4. Enable `CODEX_MULTIUSER_SANDBOX_ENABLED=true` **only after** a successful private end-to-end test. Until enabled, this branch preserves the existing owner-only runner fallback and does not create per-user sandboxes.
5. Make sure Vercel Sandbox server-side authentication is enabled for the project. On Vercel production runtimes the SDK uses the project's OIDC identity; do not expose a Vercel access token to a tenant sandbox or to the browser.
6. Use a private repository-scoped GitHub App installation for clone access. Enable device-code authorization in the user's own ChatGPT settings when required. Test official login, account isolation, coding turn, stop, diff and logout with **two different test accounts**, and confirm that cross-tenant access is rejected.
7. Verify that serverless tracing includes the fixed `codex-runner` runtime files and that the sandbox restarts the detached runner after a snapshot resume. Verify one preview deployment before merging.

## Release gates still unresolved

- Actual Vercel OIDC/Sandbox provisioning, CLI boot, login and paid execution have not been tested in a live user session.
- Tenant quota accounting, rate limiting and abuse prevention beyond an explicit allowlist; multi-user public availability must remain disabled until implemented.
- Durable job history and resumable task queues across sandbox sleep/restarts; jobs currently live in the sandbox process, but the filesystem persists.
- End-to-end GitHub branch/commit/PR write workflow and independent security audit.
- Official downstream subscription usage rights, individual account limits and plan access depend on OpenAI's Codex authorization and can change.

**Do not merge PR #22 or claim production parity based on syntax/unit tests or a READY Vercel preview alone.** The owner must explicitly enable billable sandbox capacity and complete a successful authorized end-to-end test before public launch.

## ChatGPT-first Settings flow

Users sign in to their existing JepongDevxyz AI cloud account (email or Google is sufficient), then open Settings → ChatGPT & Codex → Connect ChatGPT. Only a backend-verified ChatGPT Codex account unlocks Chat / Work at the top of the app. The model picker remains dedicated to existing chat providers. GitHub OAuth and repository-scoped GitHub App tokens are requested only when the user enters Work and selects a GitHub repository. Superpowers skills remain a separate opt-in runtime integration and are not represented as already installed.

## Self-service enrollment (operator configuration only)

The new `CODEX_PUBLIC_SIGNUP_ENABLED=true` switch allows **all server-verified JepongDevxyz AI cloud accounts** to start their own Codex device-code login without a per-user UUID allowlist. It is an **operator** variable: ordinary users must never set Vercel variables or paste API keys. The user must still sign in to the app and explicitly complete authorization on the official OpenAI page. A ChatGPT login is verified by Codex App Server before Work unlocks; a local UI flag is insufficient.

The operator must set `CODEX_MULTIUSER_SANDBOX_ENABLED=true` and a 32+ character `CODEX_RUNNER_SHARED_SECRET` privately in Production. The legacy `CODEX_ALLOWED_ACCOUNT_IDS` remains available for restricted pilot operation and is not required once self-service is explicitly enabled.

**Safety gate: do not enable unrestricted public signup solely because this switch exists.** Before turning it on for production, configure provider-level spending limits/alerts, project-wide tenant admission and per-account rate limiting using an atomic shared store, abuse prevention, user-session expiry handling, and test the full login/turn/disconnect flow with at least two distinct accounts. The Vercel Sandboxes have independent compute/storage costs; this branch does not implement a globally atomic account-count or spending cap. CI and Vercel READY status cannot prove paid Codex execution or authorized subscription access. Do not claim public rollout complete without real login and running a bounded coding turn.

Once provisioned, a user only needs the normal JepongDevxyz AI login and the official ChatGPT verification page. They do **not** need Vercel or a developer API key. A developer must still provision and pay for the central backend once; a third-party app cannot borrow general-purpose ChatGPT Plus API capacity.
