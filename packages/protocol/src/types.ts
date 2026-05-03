import type { CommitOutput } from "@trust402/identity";
import type { AgentCredential } from "@lemmaoracle/agent";
import type { ProveOutput } from "@lemmaoracle/sdk";

// ── Re-exports for artifact construction ──────────────────────────────

export type { CommitOutput } from "@trust402/identity";
export type { ProveOutput } from "@lemmaoracle/sdk";

// ── IdentityArtifact ──────────────────────────────────────────────────

/**
 * Pre-generated identity proof artifact, produced by `trust402 prove`.
 * Caches the commit output, identity proof, docHash, and credential
 * so they don't need to be regenerated on every fetch call.
 */
export type IdentityArtifact = Readonly<{
  commitOutput: CommitOutput;
  identityProof: ProveOutput;
  docHash: string;
  credential: AgentCredential;
}>;

// ── ProveRoleResult ───────────────────────────────────────────────────

/**
 * Result of generating a role proof from a cached identity artifact.
 */
export type ProveRoleResult = Readonly<{
  identityProof: ProveOutput;
  roleProof: ProveOutput;
  identitySubmission: unknown;
  roleSubmission: unknown;
}>;

// ── KeeperHub Types ───────────────────────────────────────────────────

export type SpendLimitExceededEvent = Readonly<{
  event: "spend_limit_exceeded";
  agentId: string;
  spendLimit: number;
  attempted: number;
  timestamp: number;
}>;

export type KeeperHubEvent = SpendLimitExceededEvent;
