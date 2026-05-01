#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEMO_DIR="$(dirname "$SCRIPT_DIR")"
CIRCUIT_DIR="$DEMO_DIR/circuit"
NORMALIZE_DIR="$DEMO_DIR/normalize"

CIRCUIT_NAME="financial-data"
CIRCUIT_ID="financial-data-v1"
CIRCOMLIB_DIR="$CIRCUIT_DIR/node_modules"
BUILD_DIR="$CIRCUIT_DIR/build"
PTAU_DIR="$BUILD_DIR/ptau"
SNARKJS="npx snarkjs"

# ── Step 1: Circom compilation ──────────────────────────────────────────

echo "→ Step 1: Compiling $CIRCUIT_NAME circuit"
mkdir -p "$BUILD_DIR" "$PTAU_DIR"

circom "$CIRCUIT_DIR/circuits/$CIRCUIT_NAME.circom" \
  --r1cs \
  --wasm \
  --sym \
  -l "$CIRCOMLIB_DIR" \
  -o "$BUILD_DIR"

# Rename build outputs to use circuit ID
mv "$BUILD_DIR/$CIRCUIT_NAME.r1cs" "$BUILD_DIR/${CIRCUIT_ID}.r1cs" 2>/dev/null || true
mv "$BUILD_DIR/$CIRCUIT_NAME.sym" "$BUILD_DIR/${CIRCUIT_ID}.sym" 2>/dev/null || true
if [ -d "$BUILD_DIR/${CIRCUIT_NAME}_js" ]; then
  mv "$BUILD_DIR/${CIRCUIT_NAME}_js" "$BUILD_DIR/${CIRCUIT_ID}_js"
  mv "$BUILD_DIR/${CIRCUIT_ID}_js/${CIRCUIT_NAME}.wasm" "$BUILD_DIR/${CIRCUIT_ID}_js/${CIRCUIT_ID}.wasm"
fi

echo "→ Constraint info"
$SNARKJS r1cs info "$BUILD_DIR/${CIRCUIT_ID}.r1cs"

# ── Step 2: Groth16 setup ───────────────────────────────────────────────

PTAU="$PTAU_DIR/pot12_final.ptau"
if [ ! -f "$PTAU" ]; then
  echo "→ Step 2a: Generating powers of tau"
  $SNARKJS powersoftau new bn128 12 "$PTAU_DIR/pot12_0000.ptau" -v
  $SNARKJS powersoftau contribute "$PTAU_DIR/pot12_0000.ptau" "$PTAU_DIR/pot12_0001.ptau" \
    --name="First contribution" -v -e="trust402 demo financial-data"
  echo "→ Preparing phase 1"
  $SNARKJS powersoftau prepare phase2 "$PTAU_DIR/pot12_0001.ptau" "$PTAU" -v
else
  echo "→ Step 2a: Powers of tau already exists, skipping"
fi

echo "→ Step 2b: Phase 2 setup"
$SNARKJS groth16 setup \
  "$BUILD_DIR/${CIRCUIT_ID}.r1cs" \
  "$PTAU" \
  "$BUILD_DIR/${CIRCUIT_ID}_0000.zkey"

$SNARKJS zkey contribute \
  "$BUILD_DIR/${CIRCUIT_ID}_0000.zkey" \
  "$BUILD_DIR/${CIRCUIT_ID}_final.zkey" \
  --name="First contribution" -v -e="trust402 demo ${CIRCUIT_ID}"

echo "→ Step 2c: Exporting verification key"
$SNARKJS zkey export verificationkey \
  "$BUILD_DIR/${CIRCUIT_ID}_final.zkey" \
  "$BUILD_DIR/${CIRCUIT_ID}_vkey.json"

# ── Step 3: Export Solidity verifier ────────────────────────────────────

echo "→ Step 3: Exporting Solidity verifier contract"
$SNARKJS zkey export solidityverifier \
  "$BUILD_DIR/${CIRCUIT_ID}_final.zkey" \
  "$BUILD_DIR/FinancialDataVerifier.sol"

echo "→ Running forge build"
cd "$CIRCUIT_DIR" && forge build

# ── Step 4: Build WASM normalizer ───────────────────────────────────────

echo "→ Step 4: Building WASM normalizer"

if ! command -v wasm-pack &> /dev/null; then
  echo "⚠️  wasm-pack not found. Installing..."
  curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
fi

OUT_DIR="$DEMO_DIR/normalize/pkg"
mkdir -p "$OUT_DIR"

wasm-pack build \
  "$NORMALIZE_DIR" \
  --target web \
  --out-dir "$OUT_DIR" \
  --release \
  --scope trust402

echo "✅ Demo build complete!"
