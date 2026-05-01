## 1. Types — IdentityArtifact and ProveRoleResult

- [ ] 1.1 Add `IdentityArtifact` type to `types.ts` — `Readonly<{ commitOutput: CommitOutput; identityProof: ProveOutput }>` [US1]
- [ ] 1.2 Add `ProveRoleResult` type to `types.ts` — `Readonly<{ identityProof: ProveOutput; roleProof: ProveOutput; identitySubmission: unknown; roleSubmission: unknown }>` [US1]
- [ ] 1.3 Add re-exports of `CommitOutput` (from `@trust402/identity`) and `ProveOutput` (from `@lemmaoracle/sdk`) in `types.ts` [US1]

## 2. witness() signature change in @trust402/roles

- [ ] 2.1 Change `witness(credential, gate, commitOutput)` to `witness(gate, commitOutput)` in `packages/roles/src/index.ts` [US1]
- [ ] 2.2 Source `spendLimit` from `commitOutput.normalized.financial.spendLimit` (string) instead of `credential.financial?.spendLimit` (number) [US1]
- [ ] 2.3 Update `witness` JSDoc to reflect new signature [US1]
- [ ] 2.4 Update `packages/roles/src/index.test.ts` to match new `witness` signature [US1]

## 3. proveRoleFromArtifact function

- [ ] 3.1 Create `prove-role-from-artifact.ts` with `proveRoleFromArtifact(client, artifact, gate)` — builds witness via `witness(gate, artifact.commitOutput)`, generates role proof via `proveRole(client, circuitWitness)`, submits both proofs via `safeSubmit`, returns `ProveRoleResult` [US1]
- [ ] 3.2 Handle role proof generation failure — catch and return `Promise.reject(new Error("Role proof generation failed"))` [US1]
- [ ] 3.3 Handle oracle submission failure — log warning, return `undefined` for failed submission, do not block [US1]

## 4. wrapFetchWithProof refactor

- [ ] 4.1 Change `wrapFetchWithProof` signature to `(baseFetch, artifact, gate, lemmaClient)` — remove `credential` parameter [US2]
- [ ] 4.2 Replace internal `proveAndSubmit` call with `proveRoleFromArtifact(client, artifact, gate)` [US2]

## 5. Public API cleanup

- [ ] 5.1 Remove `proveAndSubmit` from `index.ts` exports [US2]
- [ ] 5.2 Remove `ProveAndSubmitResult` from `index.ts` type exports [US2]
- [ ] 5.3 Add `proveRoleFromArtifact`, `IdentityArtifact`, `ProveRoleResult` to `index.ts` exports [US2]
- [ ] 5.4 Delete `prove-and-submit.ts` file [US2]

## 6. Tests

- [ ] 6.1 Add `prove-role-from-artifact.test.ts` — test successful flow, role proof failure, oracle submission failure [P] [US1]
- [ ] 6.2 Update `wrap-fetch-with-proof.test.ts` — update signature and verify `proveRoleFromArtifact` is called without `credential` [P] [US2]
