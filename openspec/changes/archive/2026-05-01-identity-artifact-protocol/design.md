## Context

The `@trust402/protocol` package currently provides `wrapFetchWithProof(fetch, credential, gate, client)` which internally calls `proveAndSubmit` on every `fetch` invocation. `proveAndSubmit` performs the full pipeline: `identityCommit → proveIdentity → witness → proveRole → submitIdentity → submitRole`. The identity proof (`agent-identity-v1`) is deterministic for a given credential — it always produces the same `CommitOutput` and `ProveOutput`. Re-generating it on every fetch call adds unnecessary latency (two relay round-trips: commit + prove) and cost.

The CLI `trust402 prove --credential <path> --api-key <key>` already outputs `{ commit: CommitOutput, proof: ProveOutput, submission?: ... }`, which contains exactly the data needed to skip identity proof generation.

## Goals / Non-Goals

**Goals:**
- Enable identity proof caching so that `wrapFetchWithProof` only generates a fresh role-spend-limit proof per fetch call
- Define an `IdentityArtifact` type that matches the CLI `trust402 prove` output format
- Add a `proveRoleFromArtifact` function that uses a pre-existing `IdentityArtifact` to generate and submit a role proof
- Update `wrapFetchWithProof` to accept `IdentityArtifact` instead of `AgentCredential`

**Non-Goals:**
- Adding an `establishIdentity` function to `@trust402/protocol` (CLI `trust402 prove` already provides this capability — no duplicate)
- Server-side proof verification or HTTP header attachment
- Identity artifact expiration, revocation, or refresh logic
- Changes to `@trust402/identity` or `@trust402/cli` packages

## Decisions

### D1: IdentityArtifact type shape

The `IdentityArtifact` type mirrors the CLI `trust402 prove` output:

```typescript
type IdentityArtifact = Readonly<{
  commitOutput: CommitOutput;
  identityProof: ProveOutput;
}>;
```

The `submission` field from CLI output is omitted — oracle submission is handled separately by `proveRoleFromArtifact` which submits both proofs after generation. This keeps the artifact minimal and focused on the data needed for proof reuse.

**Alternative considered (rejected)**: Include `AgentCredential` in the artifact. This would create coupling to a type from another package and does not solve the consistency problem — a caller could still pass a mismatched credential alongside the artifact.

**Consistency concern**: Passing both `AgentCredential` and `IdentityArtifact` creates a consistency risk. The `witness()` function takes `credential.financial.spendLimit`, but `commitOutput.root` is derived from a different credential. If they differ, the circuit accepts the proof (because `roleGateCommitment` is computed from the same inputs), but the `spendLimit` would not match the `credentialCommitment`.

**Decision**: Change `witness()` in `@trust402/roles` to extract `spendLimit` from `commitOutput.normalized.financial.spendLimit` instead of from a separate `AgentCredential` parameter. The `CommitOutput` type already includes `normalized: NormalizedAgentCredential`, which contains `financial.spendLimit` as a `string`. This eliminates the `AgentCredential` parameter entirely from `witness()`, `proveRoleFromArtifact()`, and `wrapFetchWithProof()`, removing the consistency risk structurally.

### D2: proveRoleFromArtifact function

New function signature:

```typescript
const proveRoleFromArtifact = (
  client: LemmaClient,
  artifact: IdentityArtifact,
  gate: PaymentGate,
): Promise<ProveRoleResult> =>
  // 1. Build witness via witness(gate, artifact.commitOutput) — spendLimit from commitOutput.normalized
  // 2. Generate role proof via proveRole(client, circuitWitness)
  // 3. Submit both proofs (identity from artifact + fresh role proof) to oracle
  // 4. Return { identityProof, roleProof, identitySubmission, roleSubmission }
```

No `AgentCredential` parameter — all data comes from the artifact's `commitOutput` (which includes `normalized`). This eliminates the consistency risk between credential and artifact.

### D3: wrapFetchWithProof signature change

**Before (breaking)**:
```typescript
wrapFetchWithProof(baseFetch, credential, gate, lemmaClient)
```

**After**:
```typescript
wrapFetchWithProof(baseFetch, artifact, gate, lemmaClient)
```

No `AgentCredential` parameter. The `artifact` provides both the cached identity proof and the normalized credential data needed for witness construction.

### D4: Removal of proveAndSubmit from public API

`proveAndSubmit` is removed from `@trust402/protocol`'s public exports. Its functionality is split:
- Identity establishment: CLI `trust402 prove` (one-time)
- Role proof per fetch: `proveRoleFromArtifact` (every fetch call)

This avoids API surface duplication. Consumers who want the full pipeline can call `trust402 prove` then `proveRoleFromArtifact`.

### D5: ProveRoleResult type

```typescript
type ProveRoleResult = Readonly<{
  identityProof: ProveOutput;
  roleProof: ProveOutput;
  identitySubmission: unknown;
  roleSubmission: unknown;
}>;
```

This replaces `ProveAndSubmitResult`, removing `commitOutput` (now available via `artifact.commitOutput`).

### D6: witness() signature change in @trust402/roles

Change `witness(credential, gate, commitOutput)` to `witness(gate, commitOutput)`.

The `spendLimit` field is sourced from `commitOutput.normalized.financial.spendLimit` (type `string`) instead of `credential.financial?.spendLimit` (type `number | undefined`). This is a **breaking change** to `@trust402/roles`' public API.

The `NormalizedFinancial.spendLimit` is a `string` (normalized representation), while `AgentCredential.financial.spendLimit` is a `number`. The `witness()` function currently calls `String(rawSpendLimit)` — with the new signature, the string conversion is already done by normalization.

**Alternative considered (rejected)**: Keep `witness(credential, gate, commitOutput)` and add a separate `validateArtifactConsistency()` function. Rejected because it places the burden of consistency checking on every caller, whereas removing the `credential` parameter eliminates the inconsistency risk structurally.

## Risks / Trade-offs

- **[Breaking change]** `wrapFetchWithProof` and `witness()` signatures change → Since `@trust402/protocol` is a new package and `witness()` is primarily used internally, the impact is minimal. Callers now pass `IdentityArtifact` instead of `AgentCredential`.

- **[Artifact staleness]** A long-lived `IdentityArtifact` could become stale if the credential is revoked or expires → Mitigation: The circuit itself validates credential structure and the oracle records submission timestamps. Staleness detection is a future concern, not a current blocker for the MVP demo.

- **[witness() breaking change in @trust402/roles]** The `witness()` function signature changes, which is a public API break in `@trust402/roles` → Mitigation: `witness()` is a low-level function primarily consumed by `@trust402/protocol`. Direct consumers are rare.
