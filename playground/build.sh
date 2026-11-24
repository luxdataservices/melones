#!/bin/sh
# Melones browser playground: the firmware's DSP (engines, voices, FX, sequencer, kick ducking, INFINITY CLAP)
# compiled to WebAssembly with the system clang, embedded in one HTML page. Run from the repo root after ./build.sh
# has generated build/gen (or just the python generators in tools/).
set -e
cd "$(dirname "$0")"
clang --target=wasm32 -Oz -ffreestanding -nostdlib -w -Istub -I../build/gen -I../firmware/src -DMELODEE_BLE=0 -DMELODEE_USB_HOST=0 \
  -Wl,--no-entry -Wl,--strip-all -Wl,-z,stack-size=1048576 -Wl,--initial-memory=33554432 wasm_v2.c -o melones.wasm
python3 - <<'PY'
import gzip, base64
ids = open('ids.json').read().strip()
italo = open('italo.js').read().replace('%%IDS%%', ids)
open('italo.built.js', 'w').write(italo)
b = base64.b64encode(gzip.compress(open('melones.wasm', 'rb').read(), 9)).decode()
open('melones_italo.html', 'w').write(open('page2.html').read().replace('%%WASM%%', b).replace('%%ITALO%%', italo))
PY
cp melones_italo.html ../docs/index.html     # the copy GitHub Pages serves (Settings > Pages: main, /docs)
echo "playground/melones_italo.html, docs/index.html"
