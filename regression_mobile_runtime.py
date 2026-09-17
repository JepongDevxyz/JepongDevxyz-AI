from pathlib import Path
import subprocess, sys
root=Path(__file__).resolve().parent
result=subprocess.run(['node', str(root/'tests'/'test_runtime_regressions.js')])
sys.exit(result.returncode)
