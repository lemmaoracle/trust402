pragma circom 2.1.0;

include "circomlib/circuits/poseidon.circom";

/**
 * FinancialData — proves that a set of financial data fields
 * hash to a claimed docHash (attestation).
 *
 * Private inputs:
 *   reportId       Field element for the report identifier
 *   company        Field element for the company name
 *   period         Field element for the reporting period
 *   revenue        Revenue in USD (integer)
 *   profit         Profit in USD (integer)
 *
 * Public input:
 *   claimedDocHash  The expected hash, verifiable via the Lemma oracle
 *
 * Constraint:
 *   Poseidon5(reportId, company, period, revenue, profit) === claimedDocHash
 */

template FinancialData() {
    // ── Private inputs ──────────────────────────────────────────────
    signal input reportId;
    signal input company;
    signal input period;
    signal input revenue;
    signal input profit;

    // ── Public input ────────────────────────────────────────────────
    signal input claimedDocHash;

    // Compute Poseidon hash of all financial data fields
    component hasher = Poseidon(5);
    hasher.inputs[0] <== reportId;
    hasher.inputs[1] <== company;
    hasher.inputs[2] <== period;
    hasher.inputs[3] <== revenue;
    hasher.inputs[4] <== profit;

    // Assert that the computed hash matches the claimed docHash
    hasher.out === claimedDocHash;
}

component main {public [claimedDocHash]} = FinancialData();
