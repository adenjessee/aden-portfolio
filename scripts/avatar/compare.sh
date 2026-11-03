#!/usr/bin/env bash
# Photo vs. model check for the avatar. Usage: npm run avatar:compare -- [path/to/export.vrm]
# Photos live in private/avatar/photos (gitignored). Writes private/avatar/compare_head.png and compare_body.png.
set -euo pipefail
cd "$(dirname "$0")/../.."
VRM="${1:-$HOME/Documents/me.vrm}"
BLENDER="${BLENDER:-/Applications/Blender 4.5.app/Contents/MacOS/Blender}"
OUT=private/avatar
PY=(uv run -q --no-project --with pyobjc-framework-Vision --with pyobjc-framework-Quartz --with pillow python -I)
mkdir -p "$OUT/cut" "$OUT/render"
# Background removal runs once per photo (Apple Vision, on device).
for f in "$OUT"/photos/*.jpeg "$OUT"/photos/*.jpg; do
  [ -e "$f" ] || continue
  n=$(basename "${f%.*}")
  [ -e "$OUT/cut/$n.png" ] || "${PY[@]}" scripts/avatar/cutout.py "$f" "$OUT/cut/$n.png" none
  [ -e "$OUT/cut/$n-small.png" ] || sips -Z 900 "$OUT/cut/$n.png" --out "$OUT/cut/$n-small.png" >/dev/null
done
for mode in head body; do
  "$BLENDER" -b --python scripts/avatar/render.py -- "$VRM" "$OUT/render" "$mode" 2>&1 | grep -E "^Saved|Error" || true
done
"${PY[@]}" scripts/avatar/sheet.py "$OUT"
echo "Wrote $OUT/compare_head.png and $OUT/compare_body.png"
