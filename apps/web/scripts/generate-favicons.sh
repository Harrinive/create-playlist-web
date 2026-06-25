#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
public="$root/public"
cd "$public"

render() {
  local src="$1"
  local size="$2"
  local out="$3"
  npx --yes @resvg/resvg-js-cli --shape-rendering 1 "$src" "$out" --fit-width "$size"
}

render favicon.svg 16 favicon-16x16.png
render favicon.svg 32 favicon-32x32.png
render favicon.svg 48 favicon-48x48.png
render favicon.svg 180 apple-touch-icon.png
render favicon-dark.svg 32 favicon-32x32-dark.png

magick favicon-16x16.png favicon-32x32.png favicon-48x48.png favicon.ico

echo "Generated favicon raster assets in $public"
