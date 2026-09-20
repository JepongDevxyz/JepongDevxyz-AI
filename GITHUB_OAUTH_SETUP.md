# GitHub OAuth setup for JepongDevxyz AI

The GitHub plugin now supports the official GitHub OAuth web application flow.

## Required Vercel environment variables

- `GITHUB_OAUTH_CLIENT_ID` — GitHub OAuth App client ID.
- `GITHUB_OAUTH_CLIENT_SECRET` — GitHub OAuth App client secret. Server-side only.
- `GITHUB_SESSION_SECRET` — at least 32 random characters; used to encrypt the HttpOnly browser session cookie.
- `GITHUB_OAUTH_CALLBACK_URL` — exact deployed callback URL, for example:
  `https://YOUR-DOMAIN/api/github-oauth-callback`
- `GITHUB_OAUTH_SCOPES` — optional. Default: `read:user user:email`.

If you need private-repository access with a classic GitHub OAuth App, add `repo` to `GITHUB_OAUTH_SCOPES`. GitHub does not provide read-only source-code scope for classic OAuth Apps, so request that broad scope only when you actually need private repositories.

## GitHub OAuth App registration

Create a GitHub OAuth App under GitHub Developer settings.

Set:
- Homepage URL: your deployed JepongDevxyz AI origin.
- Authorization callback URL: the exact value of `GITHUB_OAUTH_CALLBACK_URL`.

Do not put the client secret, OAuth access token, or `GITHUB_SESSION_SECRET` in `index.html`, `plugins.js`, localStorage, or any client-side code.

## Implemented flow

1. `/api/github-oauth-start` creates a CSRF state cookie and redirects to GitHub.
2. GitHub redirects to `/api/github-oauth-callback`.
3. The backend validates state, exchanges the authorization code, reads the GitHub user, encrypts the OAuth token with AES-GCM, and stores only the encrypted value in a Secure + HttpOnly + SameSite=Lax cookie.
4. `/api/github-oauth-session` reports account state without exposing the token.
5. Disconnect revokes the specific OAuth token on GitHub when possible and clears the local cookie.
6. `/api/plugins` uses the authenticated token server-side for account repositories and private-repository reads when authorized.
7. `/api/chat` uses the server-side GitHub session to re-fetch selected repository context; the browser never sends an OAuth token to the model.

## Real project test execution (GitHub + Superpowers)

The installed GitHub and Superpowers plugin management pages now include **Run project tests**. This uses the account holder's OAuth session to trigger an existing GitHub Actions **test/verification** workflow; it is not arbitrary shell access, an autonomous source-code editor, or automatic pull-request merging.

To use it:

1. Install GitHub, connect your account, and open a repository you can push to.
2. The repository must contain an **active test/verification GitHub Actions workflow** with `workflow_dispatch:` enabled on the selected branch and default branch.
3. If you use a classic GitHub OAuth App, set `GITHUB_OAUTH_SCOPES` to `read:user user:email public_repo` for public-repository write authorization, or `read:user user:email repo` for repositories requiring private access. A scope change requires the user to disconnect and authorize again. Classic `repo` grants broad repository access to the token: grant it only when genuinely necessary.
4. Choose **Manage → Run project tests → Find test workflows** in either installed plugin, choose the test workflow, then explicitly approve the exact repository/branch/workflow. Use **Check runs** for the actual status.
5. From any chat and AI provider on the same browser, type `/run-tests` or `/run-ci` to open the same execution panel. GitHub repository context and Superpowers skill choices persist across chat sessions, but the repository is revalidated on reload before attaching it to AI requests.

No workflow is triggered solely because the AI generated text: each run requires the user's confirmation in the app. The result is not called a success until GitHub reports a completed successful run. Repository write operations, arbitrary code execution on Vercel, automatic AI editing, and auto-merging are **not** part of this integration.

## Scope note

GitHub recommends GitHub Apps for finer-grained repository permissions. This implementation uses the official OAuth App web flow because it integrates cleanly with the current JepongDevxyz AI architecture. Chat source inspection remains read-only; the separate confirmation-based GitHub Actions runner can trigger existing test workflows only when the connected account has write permission.
