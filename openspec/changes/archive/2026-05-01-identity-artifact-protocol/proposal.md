## Why

The current `wrapFetchWithProof` generates a fresh identity proof (`agent-identity-v1`) on every `fetch` call, even though the identity proof is static for a given credential. This is wasteful — identity proof generation involves a commit + Groth16 prove round-trip to the relay server. In a typical agent session, the credential does not change, so re-proving identity on every payment is unnecessary latency and cost. The CLI `trust402 prove` already produces the exact output needed (`CommitOutput` + `ProveOutput`), but the protocol package has no type or function to consume it.

Additionally, the current `witness(credential, gate, commitOutput)` function takes both an `AgentCredential` and a `CommitOutput`, creating a consistency risk: the `spendLimit` is sourced from `credential` while the `credentialCommitment` comes from `commitOutput`. If these derive from different credentials, the circuit cannot detect the mismatch. By sourcing `spendLimit` from `commitOutput.normalized.financial.spendLimit`, this risk is eliminated structurally.

## What Changes

- Add an `IdentityArtifact` type to `@trust402/protocol` representing a pre-generated identity proof (commit output + proof output)
- Add a `proveRoleFromArtifact` function that skips identity proof generation and uses the artifact's `commitOutput` and `identityProof` directly, generating only the role-spend-limit proof per fetch call
- **BREAKING**: Change `witness()` signature in `@trust402/roles` from `witness(credential, gate, commitOutput)` to `witness(gate, commitOutput)`, sourcing `spendLimit` from `commitOutput.normalized.financial.spendLimit`
- **BREAKING**: Change `wrapFetchWithProof` signature to accept `IdentityArtifact` instead of `AgentCredential`, eliminating both redundant identity proof generation and the credential-artifact consistency risk
- Remove `proveAndSubmit` from the public API (replaced by `proveRoleFromArtifact` + CLI `trust402 prove` for identity establishment)

## Capabilities

### New Capabilities
- `identity-artifact`: Type definition and consumer for a pre-generated identity proof artifact, enabling identity proof caching across multiple role-gated fetch calls

### Modified Capabilities
- `proof-gated-payment`: `wrapFetchWithProof` signature changes from `(fetch, AgentCredential, PaymentGate, LemmaClient)` to `(fetch, IdentityArtifact, PaymentGate, LemmaClient)`; `witness()` signature changes from `witness(credential, gate, commitOutput)` to `witness(gate, commitOutput)`; `proveAndSubmit` is removed from the public API

## Impact

- **Breaking API change**: `wrapFetchWithProof` parameter changes from `AgentCredential` to `IdentityArtifact`
- **Breaking API change**: `witness()` in `@trust402/roles` loses the `credential` parameter
- **Package**: `@trust402/protocol` — new `IdentityArtifact` type, new `proveRoleFromArtifact` function, modified `wrapFetchWithProof`
- **Package**: `@trust402/roles` — `witness()` signature change
- **No changes** to `@trust402/identity` or `@trust402/cli` — the CLI `trust402 prove` output already matches `IdentityArtifact`
- **No changes** to seller-side or server-side code — this is a buyer-side optimization only
