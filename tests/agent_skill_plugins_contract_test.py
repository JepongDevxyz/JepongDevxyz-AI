from pathlib import Path

frontend=Path('plugins.js').read_text(encoding='utf-8')
backend=Path('api/chat.js').read_text(encoding='utf-8')

plugins={
 'superpowers':'Superpowers',
}

for plugin,source in plugins.items():
    assert f"id:'{plugin}'" in frontend, f'missing plugin catalog entry: {plugin}'
    assert f"name:'{source}'" in frontend, f'missing plugin display name: {plugin}'

assert "superpowers: { enabled: isInstalled('superpowers'), phase: 'auto' }" in frontend
assert "Installed skill plugins are explicit, bounded behavior profiles." in backend
assert "Never claim subagents, shell commands, source edits or successful tests unless actual tool events confirm them." in backend

print('agent skill plugins contract: PASS')

assert "autoUse: true" in frontend
assert "plugins-inject.js" in frontend or "plugins-inject.js" in Path('index.html').read_text(encoding='utf-8')
assert "getCatalog: function () { return CATALOG; }" in frontend
assert "Only apply skills relevant to the request" in Path('plugins-inject.js').read_text(encoding='utf-8')
print('installed plugin injection contract: PASS')
