from pathlib import Path

# Fix 7 (2026-10-18): the standalone frontend plugins.js was removed (dead
# 404 script tag). The plugin catalog it carried is gone; plugins-inject.js
# now degrades gracefully when window.JDPlugins is absent. This contract
# tests what actually exists.
frontend = Path('plugins-inject.js').read_text(encoding='utf-8')
backend = Path('api/chat.js').read_text(encoding='utf-8')

# Backend still honors the superpowers plugin contract.
assert 'superpowers' in backend
assert "Installed skill plugins are explicit, bounded behavior profiles." in backend
assert "Never claim subagents, shell commands, source edits or successful tests unless actual tool events confirm them." in backend

print('agent skill plugins contract: PASS')

# Injection layer degrades gracefully without the catalog frontend.
assert 'window.JDPlugins' in frontend
assert "getCatalog" in frontend
assert "Only apply skills relevant to the request" in frontend
print('installed plugin injection contract: PASS')
