#!/usr/bin/env python3
from pathlib import Path
import base64
import gzip
import subprocess
import tempfile

paths = sorted(Path('.sync').glob('v7_payload_*.txt'))
if len(paths) != 7:
    raise SystemExit(f'Expected 7 payload parts, found {len(paths)}')

payload = ''.join(p.read_text(encoding='utf-8').strip() for p in paths)
if len(payload) != 26096:
    raise SystemExit(f'Unexpected payload length: {len(payload)}')

patch = gzip.decompress(base64.b64decode(payload))
with tempfile.NamedTemporaryFile(prefix='jepong-v7-', suffix='.patch', delete=False) as f:
    f.write(patch)
    patch_path = f.name

subprocess.run(['git', 'apply', '--check', patch_path], check=True)
subprocess.run(['git', 'apply', patch_path], check=True)
print('Applied JepongDevxyz AI Personalization Navigation v7 patch')
