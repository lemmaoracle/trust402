import { create, prover, proofs, encrypt, documents } from "@lemmaoracle/sdk";
import type { LemmaClient, ProveOutput, DocumentCommitments } from "@lemmaoracle/sdk";
import { commit as agentCommit, computeCredentialCommitment } from "@lemmaoracle/agent";
import type {
  AgentCredential,
  AgentCredentialInput,
  NormalizedAgentCredential,
  ValidationResult,
  CommitOutput,
  SectionedCommitResult,
  ValidationError,
  ValidationErrorKind,
  CredentialOptions,
} from "@lemmaoracle/agent";

// ── Re-exported types from @lemmaoracle/agent ──────────────────────────

export type {
  AgentCredential,
  AgentCredentialInput,
  NormalizedAgentCredential,
  ValidationResult,
  CommitOutput,
  SectionedCommitResult,
  ValidationError,
  ValidationErrorKind,
  CredentialOptions,
};

// ── Constants ──────────────────────────────────────────────────────────

const CIRCUIT_ID = "agent-identity-v1";

// ── Re-exported functions from @lemmaoracle/agent ──────────────────────

export { computeCredentialCommitment };

// ── Register ──────────────────────────────────────────────────────────

export type RegisterInput = Readonly<{
  credential: AgentCredential;
  holderKey: string;
  schema?: string;
  chainId?: number;
}>;

export type RegisterOutput = Readonly<{
  docHash: string;
  cid: string;
  commitOutput: CommitOutput;
}>;

const DEFAULT_SCHEMA = "passthrough-v1";

const commitOutputToCommitments = (co: CommitOutput): DocumentCommitments => ({
  scheme: "poseidon" as const,
  root: co.root,
  leaves: Object.values(co.sectionHashes),
  randomness: co.salt,
});

export const register = (
  client: LemmaClient,
  input: RegisterInput,
): Promise<RegisterOutput> => {
  const schema = input.schema ?? DEFAULT_SCHEMA;
  const chainId = input.chainId ?? 84532;

  return agentCommit(client, input.credential)
    .then((commitOutput) =>
      encrypt(client, { payload: input.credential, holderKey: input.holderKey })
        .then((enc) =>
          documents.register(client, {
            schema,
            docHash: enc.docHash,
            cid: enc.cid,
            issuerId: input.credential.provenance.issuerId,
            subjectId: input.credential.identity.subjectId,
            commitments: commitOutputToCommitments(commitOutput),
            revocation: { root: "" },
            chainId,
          }).then(() => ({
            docHash: enc.docHash,
            cid: enc.cid,
            commitOutput,
          })),
        ),
    );
};

// ── Prove ──────────────────────────────────────────────────────────────

export type ProveInput = Readonly<{
  commitOutput: CommitOutput;
  issuerSecretKey: string;
  mac: string;
  issuerPublicKey: string;
  nowSec?: string;
}>;

const toUnixSeconds = (value: string): string => {
  const isNumeric = /^\d+$/.test(value);
  const isNone = value === "none" || value === "" || value === "0";

  const parseIso = (): string => {
    const ms = Date.parse(value);
    return Number.isNaN(ms) ? "0" : Math.floor(ms / 1000).toString();
  };

  return isNumeric ? value : isNone ? "0" : parseIso();
};

const commitOutputToWitness = (input: ProveInput): Readonly<Record<string, unknown>> => {
  const co = input.commitOutput;
  const n = co.normalized;
  return {
    identityHash: co.sectionHashes.identityHash,
    authorityHash: co.sectionHashes.authorityHash,
    financialHash: co.sectionHashes.financialHash,
    lifecycleHash: co.sectionHashes.lifecycleHash,
    provenanceHash: co.sectionHashes.provenanceHash,
    salt: co.salt,
    issuerSecretKey: input.issuerSecretKey,
    mac: input.mac,
    issuedAt: toUnixSeconds(n.lifecycle.issuedAt),
    expiresAt: toUnixSeconds(n.lifecycle.expiresAt),
    revoked: n.lifecycle.revoked === "true" ? "1" : "0",
    credentialCommitment: co.root,
    issuerPublicKey: input.issuerPublicKey,
    nowSec: input.nowSec ?? Math.floor(Date.now() / 1000).toString(),
  };
};

export const prove = (
  client: LemmaClient,
  input: ProveInput,
): Promise<ProveOutput> =>
  prover.prove(client, {
    circuitId: CIRCUIT_ID,
    witness: commitOutputToWitness(input),
  });

// ── Submit ─────────────────────────────────────────────────────────────

export const submit = (
  client: LemmaClient,
  docHash: string,
  proofResult: ProveOutput,
  chainId: number = 84532,
) =>
  proofs.submit(client, {
    docHash,
    circuitId: CIRCUIT_ID,
    proof: proofResult.proof,
    inputs: proofResult.inputs,
    onchain: true,
    chainId,
  });

// ── Client factory ─────────────────────────────────────────────────────

export const connect = (apiBase: string) => (apiKey: string): LemmaClient =>
  create({ apiBase, apiKey });
