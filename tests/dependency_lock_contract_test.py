from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = (ROOT / ".github/workflows/codex-runner-checks.yml").read_text()

assert (ROOT / "package-lock.json").is_file(), "root package-lock.json must be committed"
assert (ROOT / "codex-runner/package-lock.json").is_file(), "Codex runner lockfile must be committed"
assert "npm ci --no-audit --no-fund" in WORKFLOW, "CI must install from committed lockfiles"
assert "npm install --no-audit --no-fund" not in WORKFLOW, "CI must not resolve dependencies without a lockfile"
assert "package-lock.json" in WORKFLOW, "root lockfile changes must trigger CI"
assert "codex-runner/package-lock.json" in WORKFLOW, "runner lockfile changes must trigger CI"
