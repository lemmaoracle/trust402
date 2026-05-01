import { createHash } from "node:crypto";
import { create, prover, proofs } from "@lemmaoracle/sdk";
import type { LemmaClient, ProveOutput } from "@lemmaoracle/sdk";
import { poseidon4 } from "poseidon-lite";
import type {
  CommitOutput,
} from "@lemmaoracle/agent";

// ── Re-exported types from @lemmaoracle/agent ──────────────────────────

export type {
  CommitOutput,
} from "@lemmaoracle/agent";

// ── Local types ────────────────────────────────────────────────────────

export type PaymentGate = Readonly<{
  role: string;
  maxSpend: number;
}>;

export type CircuitWitness = Readonly<{
  credentialCommitment: string;
  roleHash: string;
  spendLimit: string;
  salt: string;
  requiredRoleHash: string;
  maxSpend: string;
  nowSec: string;
  roleGateCommitment: string;
  credentialCommitmentPublic: string;
}>;

// ── Constants ──────────────────────────────────────────────────────────

const CIRCUIT_ID = "role-spend-limit-v1";

const BN254_PRIME = BigInt(
  "21888242871839275222246405745257275088548364400416034343698204186575808495617",
);

// ── fieldHash ──────────────────────────────────────────────────────────

/**
 * SHA-256 with top-nibble masking for BN254 field-element derivation.
 * Masks the top nibble (4 bits) of the 32-byte hash to ensure the
 * result fits within the BN254 scalar field.
 */
export const fieldHash = (name: string): string => {
  const hash = createHash("sha256").update(name, "utf8").digest("hex");
  // Top nibble mask: clear the high 4 bits of the first byte
  const maskedFirstByte = (parseInt(hash.slice(0, 2), 16) & 0x0f).toString(16).padStart(2, "0");
  const maskedHash = maskedFirstByte + hash.slice(2);
  const scalar = BigInt(`0x${maskedHash}`) % BN254_PRIME;
  return scalar.toString();
};

// ── Witness builder ────────────────────────────────────────────────────

/**
 * Build a CircuitWitness for the role-spend-limit-v1 circuit.
 * Maps PaymentGate + CommitOutput into field elements.
 * Spend limit is sourced from commitOutput.normalized.financial.spendLimit.
 */
export const witness = (
  gate: PaymentGate,
  commitOutput: CommitOutput,
): CircuitWitness => {
  const roleHash = fieldHash(gate.role);
  const spendLimit = commitOutput.normalized.financial.spendLimit;
  const saltScalar = BigInt(commitOutput.salt).toString();
  const nowSec = Math.floor(Date.now() / 1000).toString();

  const roleGateCommitment = poseidon4([
    BigInt(commitOutput.root),
    BigInt(roleHash),
    BigInt(spendLimit),
    BigInt(saltScalar),
  ]).toString();

  return {
    credentialCommitment: commitOutput.root,
    roleHash,
    spendLimit,
    salt: saltScalar,
    requiredRoleHash: roleHash,
    maxSpend: gate.maxSpend.toString(),
    nowSec,
    roleGateCommitment,
    credentialCommitmentPublic: commitOutput.root,
  };
};

// ── Prove ──────────────────────────────────────────────────────────────

export const prove = (
  client: LemmaClient,
  circuitWitness: CircuitWitness,
): Promise<ProveOutput> =>
  prover.prove(client, { circuitId: CIRCUIT_ID, witness: circuitWitness });

// ── Submit ─────────────────────────────────────────────────────────────

export const submit = (
  client: LemmaClient,
  docHash: string,
  proofResult: ProveOutput,
) =>
  proofs.submit(client, {
    docHash,
    circuitId: CIRCUIT_ID,
    proof: proofResult.proof,
    inputs: proofResult.inputs,
  });

// ── Client factory ─────────────────────────────────────────────────────

export const connect = (apiBase: string) => (apiKey: string): LemmaClient =>
  create({ apiBase, apiKey });
