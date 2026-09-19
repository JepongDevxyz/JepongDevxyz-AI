from pathlib import Path

root=Path(__file__).resolve().parents[1]
index=(root/"index.html").read_text(encoding="utf-8")
chat=(root/"api"/"chat.js").read_text(encoding="utf-8")

required_index=[
    "function upgradeVerifiedResultCards(root)",
    "jd-result-card",
    "jd-result-badge",
    "jd-result-action",
    "[!STATUS",
]
required_chat=[
    "When reporting a concrete VERIFIED software/project result",
    "> [!STATUS success|Badge text]",
    "Use success only for facts actually verified by tool context.",
]
for marker in required_index:
    assert marker in index, f"missing status-card UI marker: {marker}"
for marker in required_chat:
    assert marker in chat, f"missing status-card model instruction: {marker}"

# Keep the card opt-in. Ordinary blockquotes must not be globally restyled.
assert "querySelectorAll('blockquote')" in index
assert "if (!match) return;" in index

# External card actions must use safe new-tab behavior.
assert "setAttribute('rel','noopener noreferrer')" in index

print("verified status-card contract checks passed")
