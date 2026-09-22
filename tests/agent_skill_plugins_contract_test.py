from pathlib import Path

frontend=Path('plugins.js').read_text(encoding='utf-8')
backend=Path('api/chat.js').read_text(encoding='utf-8')

plugins={
 'superpowers':'obra/superpowers',
 'mattpocock':'mattpocock/skills',
 'uiuxpro':'nextlevelbuilder/ui-ux-pro-max-skill',
 'caveman':'Shawnchee/caveman-skill',
 'humanizer':'blader/humanizer',
 'findskills':'vercel-labs/skills/find-skills',
 'deployvercel':'vercel-labs/agent-skills/deploy-to-vercel',
 'brainstorming':'obra/superpowers/brainstorming',
 'tdd':'obra/superpowers/test-driven-development',
 'excalidraw':'coleam00/excalidraw-diagram-skill',
 'remotion':'remotion-dev/skills',
 'webquality':'addyosmani/web-quality-skills',
}

for plugin,source in plugins.items():
    assert source in frontend, f'missing plugin source: {plugin}'

for plugin in set(plugins)-{'superpowers'}:
    assert f"{plugin}:'" in backend, f'missing backend behavior: {plugin}'

assert "skills:skillPluginIds.filter(id=>installed(id))" in frontend
assert "Object.hasOwn(skillPluginRules,id)" in backend
assert "They never override user intent, safety rules, tool permissions, or evidence requirements." in backend
assert "Never claim a URL, deployment ID, or successful deploy without real deployment evidence." in backend
assert "never claim red, green, or passing tests without actual test output." in backend

print('agent skill plugins contract: PASS')
