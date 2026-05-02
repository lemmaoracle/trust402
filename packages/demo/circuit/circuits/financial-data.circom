pragma circom 2.1.0;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/mux1.circom";

/**
 * FinancialDataInclusion — proves that a named attribute
 * exists in the commitment Merkle tree.
 *
 * Mirrors the SDK's commitNormalized() structure:
 *   leaf = Poseidon3(nameHash, valueHash, blinding)
 *   root = Poseidon2 binary Merkle tree over leaves
 *
 * Public input:
 *   commitmentRoot   Merkle root from SDK prepare.commitments.root
 *
 * Private inputs:
 *   nameHash         SHA-256(field_name) mod P
 *   valueHash        SHA-256(field_value) mod P
 *   blinding         Randomness field element
 *   pathElements[DEPTH]  Merkle sibling hashes
 *   pathIndices[DEPTH]   0=left, 1=right
 */

template FinancialDataInclusion(DEPTH) {
    // ── Public input ───────────────────────────────────────────────
    signal input commitmentRoot;

    // ── Private inputs ─────────────────────────────────────────────
    signal input nameHash;
    signal input valueHash;
    signal input blinding;
    signal input pathElements[DEPTH];
    signal input pathIndices[DEPTH];

    // 1. Compute leaf = Poseidon3(nameHash, valueHash, blinding)
    component leafHasher = Poseidon(3);
    leafHasher.inputs[0] <== nameHash;
    leafHasher.inputs[1] <== valueHash;
    leafHasher.inputs[2] <== blinding;

    // 2. Merkle inclusion proof
    component hashers[DEPTH];
    component muxes[DEPTH];

    signal hashes[DEPTH + 1];
    hashes[0] <== leafHasher.out;

    for (var i = 0; i < DEPTH; i++) {
        hashers[i] = Poseidon(2);
        muxes[i] = MultiMux1(2);

        muxes[i].c[0][0] <== hashes[i];
        muxes[i].c[0][1] <== pathElements[i];
        muxes[i].c[1][0] <== pathElements[i];
        muxes[i].c[1][1] <== hashes[i];
        muxes[i].s        <== pathIndices[i];

        hashers[i].inputs[0] <== muxes[i].out[0];
        hashers[i].inputs[1] <== muxes[i].out[1];
        hashes[i + 1]        <== hashers[i].out;
    }

    // 3. Assert computed root matches commitmentRoot
    hashes[DEPTH] === commitmentRoot;
}

// Depth 3 = 8 leaves (5 attributes + 3 padding zeros)
component main {public [commitmentRoot]} = FinancialDataInclusion(3);
