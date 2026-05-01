#!/usr/bin/env bash
set -euo pipefail

CIRCUIT_NAME="role-spend-limit"
CIRCUIT_ID="role-spend-limit-v1"
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SRC_DIR="$SCRIPT_DIR/src"
BUILD_DIR="$SCRIPT_DIR/build"
PTAU_DIR="$BUILD_DIR/ptau"
CIRCOMLIB_DIR="$SCRIPT_DIR/node_modules"
SNARKJS="npx snarkjs"

mkdir -p "$BUILD_DIR" "$PTAU_DIR"

echo "→ compiling $CIRCUIT_NAME"
circom "$SRC_DIR/$CIRCUIT_NAME.circom" \
  --r1cs \
  --wasm \
  --sym \
  -l "$CIRCOMLIB_DIR" \
  -o "$BUILD_DIR"

# Rename build outputs to include v2 suffix
mv "$BUILD_DIR/$CIRCUIT_NAME.r1cs" "$BUILD_DIR/${CIRCUIT_ID}.r1cs" 2>/dev/null || true
mv "$BUILD_DIR/$CIRCUIT_NAME.sym" "$BUILD_DIR/${CIRCUIT_ID}.sym" 2>/dev/null || true
if [ -d "$BUILD_DIR/${CIRCUIT_NAME}_js" ]; then
  mv "$BUILD_DIR/${CIRCUIT_NAME}_js" "$BUILD_DIR/${CIRCUIT_ID}_js"
  mv "$BUILD_DIR/${CIRCUIT_ID}_js/${CIRCUIT_NAME}.wasm" "$BUILD_DIR/${CIRCUIT_ID}_js/${CIRCUIT_ID}.wasm" 2>/dev/null || true
  mv "$BUILD_DIR/${CIRCUIT_ID}_js/${CIRCUIT_NAME}.wtns" "$BUILD_DIR/${CIRCUIT_ID}_js/${CIRCUIT_ID}.wtns" 2>/dev/null || true
fi

echo "→ constraint info"
$SNARKJS r1cs info "$BUILD_DIR/${CIRCUIT_ID}.r1cs"

# Powers of Tau (2^12 is plenty for this circuit size)
PTAU="$PTAU_DIR/pot12_final.ptau"
if [ ! -f "$PTAU" ]; then
  echo "→ generating powers of tau"
  $SNARKJS powersoftau new bn128 12 "$PTAU_DIR/pot12_0000.ptau" -v
  $SNARKJS powersoftau contribute "$PTAU_DIR/pot12_0000.ptau" "$PTAU_DIR/pot12_0001.ptau" \
    --name="First contribution" -v -e="trust402 role-spend-limit"
  echo "→ preparing phase 1"
  $SNARKJS powersoftau prepare phase2 "$PTAU_DIR/pot12_0001.ptau" "$PTAU" -v
fi

echo "→ phase 2 setup"
$SNARKJS groth16 setup \
  "$BUILD_DIR/${CIRCUIT_ID}.r1cs" \
  "$PTAU" \
  "$BUILD_DIR/${CIRCUIT_ID}_0000.zkey"

$SNARKJS zkey contribute \
  "$BUILD_DIR/${CIRCUIT_ID}_0000.zkey" \
  "$BUILD_DIR/${CIRCUIT_ID}_final.zkey" \
  --name="First contribution" -v -e="trust402 ${CIRCUIT_ID}"

echo "→ exporting verification key"
$SNARKJS zkey export verificationkey \
  "$BUILD_DIR/${CIRCUIT_ID}_final.zkey" \
  "$BUILD_DIR/${CIRCUIT_ID}_vkey.json"

echo "→ exporting solidity verifier"
$SNARKJS zkey export solidityverifier \
  "$BUILD_DIR/${CIRCUIT_ID}_final.zkey" \
  "$BUILD_DIR/RoleSpendLimitVerifier.sol"

echo "→ compiling verifier with forge"
forge build

echo "✓ $CIRCUIT_ID built"
