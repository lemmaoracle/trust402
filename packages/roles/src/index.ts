import { createHash } from "node:crypto";
import { create, prover, proofs } from "@lemmaoracle/sdk";
import type { LemmaClient, ProveOutput } from "@lemmaoracle/sdk";

// ── Types ─────────────────────────────────────────────────────────────

export type AgentCredential = Readonly<{
  schema: string;
  identity: Readonly<{
    agentId: string;
    subjectId: string;
    controllerId?: string;
    orgId?: string;
  }>;
  authority: Readonly<{
    roles: ReadonlyArray<string>;
    scopes: ReadonlyArray<string>;
    permissions: ReadonlyArray<Readonly<{ resource: string; action: string }>>;
  }>;
  financial: Readonly<{
    spendLimit?: number;
    currency?: string;
    paymentPolicy?: string;
  }>;
  lifecycle: Readonly<{
    issuedAt: number;
    expiresAt?: number;
    revoked?: boolean;
  }>;
  provenance: Readonly<{
    issuerId: string;
  }>;
}>;

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
}>;

const CIRCUIT_ID = "role-spend-limit-v1";

// ── Witness builder ───────────────────────────────────────────────────

/** SHA-256 → BN254-safe field element (top nibble masked). */
const fieldHash = (s: string): string => {
  const digest = Buffer.from(createHash("sha256").update(s, "utf8").digest());
  const masked = Buffer.concat([Buffer.from([digest[0] & 0x0f]), digest.subarray(1)]);
  return BigInt("0x" + masked.toString("hex")).toString();
};

const spendLimitField = (cred: AgentCredential): string =>
  (cred.financial.spendLimit ?? 0).toString();

export const witness = (
  cred: AgentCredential,
  gate: PaymentGate,
): CircuitWitness => {
  const nowSec = Math.floor(Date.now() / 1000).toString();
  const credJson = JSON.stringify(cred);

  return {
    credentialCommitment: fieldHash(credJson),
    roleHash: fieldHash(gate.role),
    spendLimit: spendLimitField(cred),
    salt: fieldHash(`${credJson}:${gate.role}:${nowSec}`),
    requiredRoleHash: fieldHash(gate.role),
    maxSpend: gate.maxSpend.toString(),
    nowSec,
  };
};

// ── Prove ─────────────────────────────────────────────────────────────

export const prove = (
  client: LemmaClient,
  w: CircuitWitness,
): Promise<ProveOutput> =>
  prover.prove(client, { circuitId: CIRCUIT_ID, witness: w });

// ── Submit ────────────────────────────────────────────────────────────

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

// ── Client factory ────────────────────────────────────────────────────

export const connect = (apiBase: string) => (apiKey: string): LemmaClient =>
  create({ apiBase, apiKey });
