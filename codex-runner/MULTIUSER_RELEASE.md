# Per-user Codex sandbox release checklist

This branch now includes an **opt-in, fail-closed per-user sandbox router** using Vercel Sandbox, not the earlier shared Railway runner. It has NOT been authorized for public deployment or verified with real ChatGPT users.

## Architecture

Each enrolled GitHub account receives a distinct named persistent Firecracker microVM and its own Codex App Server home. A per-tenant HMAC signing key is derived on the server from a private master secret. Private GitHub installation tokens only pass through the authenticated gateway for a single repository clone; they must never be shown to the model or browser.

The sandbox is created only by an explicit "Connect ChatGPT" action. The backend verifies a signed GitHub session before choosing the tenant. Browser-provided user IDs, model labels and localStorage flags never grant access. A user's ChatGPT password and raw ChatGPT tokens are never sent to the website.

## Required Vercel project configuration

1. Confirm that Vercel Sandbox is available on the project and review its compute/snapshot billing. Each persistent sandbox has separate usage and storage costs.
2. Set `CODEX_RUNNER_SHARED_SECRET` to a private random value of at least 32 characters, generated and saved **only** in the Vercel Environment Variables UI, not in GitHub or chat.
3. Set `CODEX_ALLOWED_GITHUB_IDS` to an explicit comma-separated allowlist of enrolled GitHub numeric account IDs. Begin with the owner's own GitHub account and expand only after quotas, payments and production security review. This is a controlled beta, not an unrestricted public launch.
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
