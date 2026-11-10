#!/usr/bin/env bash
# Encode the rendered Blender PNG sequence into web-ready hero loops + poster.
# usage: blender/encode_hero.sh <frames_dir> <hero_still.png> <macro_still.png>
set -euo pipefail
FRAMES=${1:?frames dir}
STILL=${2:?hero still}
MACRO=${3:?macro still}
OUT="$(cd "$(dirname "$0")/.." && pwd)/assets/media"
mkdir -p "$OUT"
# H.264 (universal) — faststart for instant playback
ffmpeg -y -loglevel error -framerate 24 -i "$FRAMES/frame_%04d.png" \
  -vf "format=yuv420p" -c:v libx264 -preset slow -crf 22 -tune film -movflags +faststart -an "$OUT/hero.mp4"
# VP9 (smaller, sharper on Chrome/Firefox)
ffmpeg -y -loglevel error -framerate 24 -i "$FRAMES/frame_%04d.png" \
  -c:v libvpx-vp9 -b:v 0 -crf 34 -row-mt 1 -deadline good -cpu-used 2 -pix_fmt yuv420p -an "$OUT/hero.webm"
ffmpeg -y -loglevel error -i "$STILL" -vf "scale=1920:-2" -q:v 3 "$OUT/hero-poster.jpg"
ffmpeg -y -loglevel error -i "$MACRO" -vf "scale=1600:-2" -q:v 3 "$OUT/macro.jpg"
ls -lh "$OUT"
