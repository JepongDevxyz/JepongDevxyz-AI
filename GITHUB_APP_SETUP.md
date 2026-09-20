# JepongDevxyz AI GitHub App setup

## Why this App is separate
The screenshot showing All repositories, Only select repositories, Permissions, Suspend and Uninstall is a real GitHub App installation. An OAuth App alone cannot display that screen. The ChatGPT Codex Connector belongs to OpenAI; a new JepongDevxyz AI GitHub App must be registered separately. GitHub Marketplace listing is not required.

## Register in GitHub → Settings → Developer settings → GitHub Apps
1. Create a new GitHub App with a unique name such as JepongDevxyz AI. Copy its GitHub Apps URL slug and numeric App ID (the App ID is NOT the OAuth Client ID).
2. Homepage URL: the live JepongDevxyz AI domain.
3. Setup URL: https://YOUR-DOMAIN/api/github-app-setup . Enable Redirect on update if available. Do not request GitHub App OAuth user authorization during installation; this website has a separately configured OAuth App for user identity.
4. Webhooks: this integration does not implement webhooks, so disable Active if GitHub allows it.
5. Request Metadata: Read, Contents: Read and write, Pull requests: Read and write, Actions: Read and write for existing browsing/PR/CI capabilities. Request fewer permissions if you do not need write features. Do not request Issues, Administration, Workflows, secrets or other unrelated permissions.
6. Where can this App be installed? For the present implementation, choose only your personal account. Organization installations require additional ownership/membership authorization that is not currently implemented.
7. Register. Generate and download a GitHub App private key from the App settings; do not share or commit it.

## Set Vercel production environment variables
- GITHUB_APP_SLUG = slug from https://github.com/apps/YOUR-APP-SLUG
- GITHUB_APP_ID = numeric App ID.
- GITHUB_APP_PRIVATE_KEY = full PEM private key, including BEGIN/END PRIVATE KEY (or RSA PRIVATE KEY) lines; literal backslash-n separators are supported in an environment input.
- Retain the preexisting GITHUB_OAUTH_CLIENT_ID, GITHUB_OAUTH_CLIENT_SECRET, GITHUB_OAUTH_CALLBACK_URL and GITHUB_SESSION_SECRET for your separately registered OAuth App that authenticates the user. App credentials do not replace them.
Redeploy production after setting these values. Never put private keys or OAuth secrets in the website HTML, localStorage, public GitHub source, or chat.

## Installation and permissions
Install the GitHub plugin inside JepongDevxyz AI, then GitHub → Manage → Connect GitHub → Install GitHub App. GitHub displays the native installation screen; choose All repositories or Only select repositories and confirm. GitHub redirects back to the setup URL. The backend ignores the installation_id query string and verifies ownership from the signed-in user's GitHub identity and GitHub App JWT.
The Manage page reports GitHub's actual installation selection and granted permissions and links to the GitHub Manage installation page for changes, suspension or removal. Repository-list and chat access, user-reviewed PRs and manually approved test workflows use short-lived repository-scoped GitHub App credentials when the App is installed. An account cannot bypass the App's selected repositories by falling back to a broader OAuth token. If the App is not installed, legacy OAuth behavior remains available.

Only personal-account installations are verified by this implementation. Organization-owned installation access is deliberately unsupported until a separate organization authorization model is implemented. A GitHub App registration and successful live deployment are required; this source code alone cannot create GitHub-owned install pages or activate an unregistered App.

## GitHub documentation
https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/about-the-setup-url
https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-an-installation-access-token-for-a-github-app
https://docs.github.com/en/rest/apps/apps