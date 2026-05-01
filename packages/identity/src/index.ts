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
          }).then(() => ({
            docHash: enc.docHash,
            cid: enc.cid,
            commitOutput,
          })),
        ),
    );
};

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
