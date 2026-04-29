pragma circom 2.1.0;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";

/**
 * RoleSpendLimit — proves an agent holds a required role AND their
 * spend limit falls within a payment gate ceiling.
 *
 * Private inputs:
 *   credentialCommitment   Poseidon commitment to the agent's normalized credential
 *   roleHash               Hash of the role the agent claims
 *   spendLimit             Agent's spend limit from the credential (USD cents)
 *   salt                   Binding randomness
 *
 * Public inputs:
 *   requiredRoleHash       Hash of the role required by the payment gate
 *   maxSpend               Ceiling imposed by the gate (USD cents)
 *   nowSec                 Current unix timestamp
 *
 * Constraints:
 *   1. roleHash === requiredRoleHash        (agent has the role)
 *   2. spendLimit <= maxSpend               (within gate ceiling)
 *   3. Poseidon4(commitment, roleHash, spendLimit, salt) === credentialCommitment
 *                                          (binding integrity)
 */

template RoleSpendLimit() {
    // ── Private ─────────────────────────────────────────────────────
    signal input credentialCommitment;
    signal input roleHash;
    signal input spendLimit;
    signal input salt;

    // ── Public ──────────────────────────────────────────────────────
    signal input requiredRoleHash;
    signal input maxSpend;
    signal input nowSec;

    // 1. Role membership: private roleHash must match the public requirement
    roleHash === requiredRoleHash;

    // 2. Spend ceiling: spendLimit ≤ maxSpend
    //    LessEqThan works on n-bit values. USD cents fit in 64 bits;
    //    we use 128 for headroom (supports up to ~3.4×10^38 cents).
    component leq = LessEqThan(128);
    leq.in[0] <== spendLimit;
    leq.in[1] <== maxSpend;
    leq.out === 1;

    // 3. Binding: Poseidon4 ties all private fields to the commitment
    component binder = Poseidon(4);
    binder.inputs[0] <== credentialCommitment;
    binder.inputs[1] <== roleHash;
    binder.inputs[2] <== spendLimit;
    binder.inputs[3] <== salt;
    binder.out === credentialCommitment;
}

component main {public [requiredRoleHash, maxSpend, nowSec]} = RoleSpendLimit();
