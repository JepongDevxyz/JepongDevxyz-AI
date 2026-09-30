# Web search provider configuration

Web search credentials are read only by the server-side chat function. Add them in the Vercel project's Environment Variables for each environment where search should run, then redeploy. Do not add provider secrets to `index.html`, browser storage, or source control.

| Provider | Environment variable | Required configuration |
| --- | --- | --- |
| SerpAPI | `SERPAPI_API_KEYS` (or legacy single `SERPAPI_API_KEY`) | One or more comma/newline-separated SerpAPI keys |
| Tavily | `TAVILY_API_KEYS` (or legacy single `TAVILY_API_KEY`) | One or more comma/newline-separated Tavily keys |
| Firecrawl | `FIRECRAWL_API_KEYS` (or legacy single `FIRECRAWL_API_KEY`) | One or more comma/newline-separated Firecrawl keys |
| Google Search JSON | `GOOGLE_SEARCH_API_KEYS` (or legacy single `GOOGLE_SEARCH_API_KEY`) and `GOOGLE_SEARCH_CX` | One or more Google API keys plus Programmable Search Engine ID |
| Existing Brave provider | `BRAVE_SEARCH_API_KEYS` (or legacy single `BRAVE_SEARCH_API_KEY`) | Optional Brave keys; kept as an additional fallback |

By default, configured providers are tried in this order: SerpAPI, Tavily, Firecrawl, Google Search JSON, then Brave. Set `WEB_SEARCH_PROVIDER_ORDER` to a comma-separated list (for example `tavily,firecrawl,serpapi,google,brave`) to change the order. For each provider, every configured key is tried in sequence on authentication, quota/rate-limit, timeout, network, or upstream errors before moving to the next provider. `API_MAX_CREDENTIAL_RETRIES` limits the number of keys tried per provider (default 8, maximum 32), matching the model API credential retry cap. Providers without complete credentials are skipped. Google Search JSON is skipped unless at least one API key and the `cx` engine ID are present.

The existing Bing, DuckDuckGo, and Wikipedia fallback remains available when configured providers fail or return no relevant usable results. The app's Web Search toggle and explicit-search behavior remain unchanged.
