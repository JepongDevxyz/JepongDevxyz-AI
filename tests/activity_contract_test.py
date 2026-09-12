from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
CHAT = (ROOT / "chat.js").read_text(encoding="utf-8")
INDEX = (ROOT / "index.html").read_text(encoding="utf-8")


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def main():
    # Backend normalized provider lifecycle contract.
    require("function providerLifecycleActivity" in CHAT,
            "missing providerLifecycleActivity helper")
    require("function providerAttemptDetail" in CHAT,
            "missing providerAttemptDetail helper")
    required_copy = (
        "Connecting to ${providerLabel(provider)}",
        "${providerLabel(provider)} connected",
        "Provider connection failed",
    )
    for token in required_copy:
        require(token in CHAT, f"normalized lifecycle copy missing: {token}")
    for provider in ("gemini", "cloudflare", "groq", "openrouter", "mistral", "cohere"):
        require(provider in CHAT, f"provider missing from chat.js: {provider}")

    # Existing SSE pipeline must remain intact.
    for event_name in ("activity", "meta", "text", "artifact", "done", "error"):
        require(f"send('{event_name}'" in CHAT or f'send("{event_name}"' in CHAT,
                f"missing SSE event: {event_name}")
    require("Content-Type':'text/event-stream; charset=utf-8'" in CHAT,
            "SSE response content type changed")

    # Frontend normalized timeline and collapse behavior.
    require("function normalizeActivityEventForUI" in INDEX,
            "frontend activity normalizer missing")
    require("function appendActivityEvent" in INDEX,
            "frontend activity renderer missing")
    require("function finishAIIndicator" in INDEX,
            "frontend completion handler missing")
    require("ai-activity-archived" in INDEX,
            "completed activity history is no longer archived")
    require("MAX_VISIBLE_ACTIVITY_ROWS" in INDEX,
            "compact row policy constant missing")

    # Explicitly keep OpenAI/Luna out of this version.
    forbidden = (
        "OPENAI_API_KEY",
        "gpt-5.6-luna",
        "GPT-5.6 Luna",
        "provider:'openai'",
        'provider:"openai"',
    )
    combined = CHAT + "\n" + INDEX
    for token in forbidden:
        require(token not in combined, f"out-of-scope OpenAI/Luna token found: {token}")

    visual_tokens = (
        "const MAX_VISIBLE_ACTIVITY_ROWS = 5",
        "ai-activity-current",
        "ai-activity-card.collapsed",
        "Worked for ${",
        "Searching the web",
        "Checking attached files",
        "Checking generated code",
        "Trying fallback provider",
    )
    for token in visual_tokens:
        require(token in INDEX, f"frontend activity token missing: {token}")

    truthful_pairs = (
        ("getEnhancedLiveWebContext", "activity(emit"),
        ("performVerification", "activity(emit"),
        ("analyzeMediaForNonVisionProvider", "activity(emit"),
        ("Static verification only; code was not arbitrarily executed.", "output-verification"),
    )
    for left, right in truthful_pairs:
        require(left in CHAT and right in CHAT,
                f"truthful activity path incomplete: {left} / {right}")

    require("activity(emit,'fallback'" in CHAT,
            "fallback activity is no longer emitted from actual fallback flow")

    # Truthfulness copy: static verification must not claim execution.
    require("Static verification only; code was not arbitrarily executed." in CHAT,
            "static verification truthfulness guard missing")

    print("activity contract checks passed")


if __name__ == "__main__":
    main()
