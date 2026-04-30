import { create, prover, proofs } from "@lemmaoracle/sdk";
import type { LemmaClient, ProveOutput } from "@lemmaoracle/sdk";
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

export { agentCommit as commit, computeCredentialCommitment };

// ── Prove ──────────────────────────────────────────────────────────────

export const prove = (
  client: LemmaClient,
  commitOutput: CommitOutput,
): Promise<ProveOutput> =>
  prover.prove(client, { circuitId: CIRCUIT_ID, witness: commitOutput });

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
