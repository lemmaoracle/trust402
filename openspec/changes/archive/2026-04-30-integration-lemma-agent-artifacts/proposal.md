## Why

@trust402/roles currently defines its own `AgentCredential` type as a local approximation of the `agent-identity-authority-v1` schema registered by `@lemmaoracle/agent`. This duplication creates a maintenance gap: when the upstream schema evolves, trust402's type drifts silently. More critically, users have no way to **create** an agent identity definition from the CLI — they must hand-author JSON conforming to an undocumented structure.

`@lemmaoracle/agent@0.0.23` now publishes canonical types (`AgentCredential`, `AgentCredentialInput`, `NormalizedAgentCredential`, etc.), a credential factory (`credential()`), validation (`validate()`), and a sectioned Poseidon commitment function (`commit()`) that computes the `credentialCommitment` and section hashes matching `agent-identity.circom`. This means trust402 can **delegate** all credential construction, validation, and commitment computation to the upstream package — eliminating type drift and ensuring the proof data is compatible with `proofs.submit()` from `@lemmaoracle/sdk@0.0.23`.

## What Changes

- Replace the ad-hoc `AgentCredential` type with re-exports from `@lemmaoracle/agent@0.0.23`
- Replace the local SHA-256-based `witness()` builder with a Poseidon-based flow using `commit()` from `@lemmaoracle/agent`, producing proof data compatible with the `agent-identity-v1` circuit
- Add `@lemmaoracle/agent@0.0.23` and update `@lemmaoracle/sdk@0.0.23` as dependencies
- Add a CLI (`trust402-agent`) with three commands:
  - `create` — build a validated `AgentCredential` from flags using `credential()` from `@lemmaoracle/agent`
  - `validate` — validate a credential JSON file using `validate()` from `@lemmaoracle/agent`
  - `prove` — execute the full commit → prove → submit pipeline against the Lemma oracle, producing and submitting a zero-knowledge proof for a given credential
- The `CircuitWitness` type is replaced by `CommitOutput` from `@lemmaoracle/agent`, carrying the sectioned Poseidon commitment data (`credentialCommitment`, `sectionHashes`, `salt`) needed by `agent-identity-v1` circuit inputs

## Capabilities

### New Capabilities
- `agent-identity-cli`: CLI tool for creating, validating, and proving agent identity credentials — `create` builds credentials, `validate` checks them, and `prove` runs the full commit → prove → submit pipeline against the Lemma oracle

### Modified Capabilities
- `zk-role-payment-gate`: `AgentCredential` type is imported from `@lemmaoracle/agent` instead of defined locally; witness builder is updated to use `commit()` for Poseidon commitment computation, producing data compatible with `proofs.submit()`

## Impact

- **Types**: `AgentCredential` and all sub-types are now imported from `@lemmaoracle/agent`; local type definitions are removed
- **Witness builder**: `witness()` is replaced by a flow that uses `commit()` (from `@lemmaoracle/agent`) + `prover.prove()` (from `@lemmaoracle/sdk`) to generate proof data compatible with `proofs.submit()`
- **CLI**: New `prove` command requires network access (Lemma API) and API key authentication
- **Dependencies**: Add `@lemmaoracle/agent@^0.0.23`; update `@lemmaoracle/sdk` to `^0.0.23`; add `commander` for CLI
- **Breaking change**: The `CircuitWitness` type shape changes from SHA-256 field hashes to Poseidon section hashes — consumers must update accordingly
- **Tests**: Existing tests for the old `witness()` must be rewritten for the new Poseidon-based flow; new tests for CLI including `prove` command
