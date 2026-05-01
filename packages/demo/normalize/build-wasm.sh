#!/bin/bash
# Build WASM for Trust402 demo normalizer

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NORMALIZE_DIR="$SCRIPT_DIR"
OUT_DIR="$SCRIPT_DIR/pkg"

echo "Building Trust402 demo normalizer WASM..."

# Check for Rust
if ! command -v cargo &> /dev/null; then
  echo "Rust/cargo not found. Install from https://rustup.rs/"
  exit 1
fi

# Check for wasm-pack
if ! command -v wasm-pack &> /dev/null; then
  echo "wasm-pack not found. Installing..."
  curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
fi

# Create output directory
mkdir -p "$OUT_DIR"

# Build optimized WASM targeting web
echo "1. Building optimized WASM (target: web)..."
wasm-pack build \
  "$NORMALIZE_DIR" \
  --target web \
  --out-dir "$OUT_DIR" \
  --release \
  --scope trust402

echo "2. Renaming for compatibility..."
if [ -f "$OUT_DIR/trust402_demo_normalize_bg.wasm" ]; then
  mv "$OUT_DIR/trust402_demo_normalize_bg.wasm" "$OUT_DIR/demo-normalize.wasm"
fi
if [ -f "$OUT_DIR/trust402_demo_normalize.js" ]; then
  mv "$OUT_DIR/trust402_demo_normalize.js" "$OUT_DIR/demo-normalize.js"
fi

echo "WASM build complete!"
echo "Output: $OUT_DIR"
