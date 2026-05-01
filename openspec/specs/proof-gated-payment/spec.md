## Requirements

### Requirement: wrapFetchWithProof function

The system SHALL provide a `wrapFetchWithProof` function that accepts a base `fetch`, an `IdentityArtifact`, a `PaymentGate`, and a `LemmaClient`, and returns a new `fetch`-compatible function that enforces the proof-before-payment protocol by generating a role proof (using the artifact's cached identity proof) before each request.

#### Scenario: Successful proof-then-fetch with artifact

- **WHEN** `wrapFetchWithProof(fetch, artifact, gate, lemmaClient)` is called and the returned fetch is invoked with a URL
- **THEN** the function generates a role proof (π₂) via `witness(gate, artifact.commitOutput) → prove(role-spend-limit-v1)`, submits both proofs to the oracle, and calls the base fetch only after all steps succeed; no identity proof generation occurs; `spendLimit` is sourced from `artifact.commitOutput.normalized.financial.spendLimit`

#### Scenario: Role proof generation failure blocks fetch

- **WHEN** the role proof generation fails during `wrapFetchWithProof`
- **THEN** the function SHALL return `Promise.reject(new Error(...))` and no HTTP request SHALL be sent

#### Scenario: Oracle submission failure does not block fetch

- **WHEN** proof generation succeeds but oracle submission fails during `wrapFetchWithProof`
- **THEN** the function SHALL log a warning and proceed to call the base fetch, as the proofs themselves are valid regardless of oracle recording

#### Scenario: Preserves existing request init

- **WHEN** `wrapFetchWithProof` is called and the returned fetch is invoked with a `RequestInit`
- **THEN** the `RequestInit` SHALL be passed through unchanged to the base fetch

#### Scenario: Composable with wrapFetchWithPayment

- **WHEN** `wrapFetchWithProof` wraps a fetch that has already been wrapped by `wrapFetchWithPayment` from `@x402/fetch`
- **THEN** the combined fetch SHALL first enforce role proof generation (via `wrapFetchWithProof`) and then handle x402 payment (via `wrapFetchWithPayment`), blocking unauthorized payments at the proof step

### Requirement: Witness builder for role-spend-limit-v1

The system SHALL provide a `witness(gate, commitOutput)` function that maps a `PaymentGate` and a `CommitOutput` into `CircuitWitness` field elements for the role-spend-limit circuit, computing `roleGateCommitment` via `poseidon-lite` Poseidon4. The `spendLimit` field SHALL be sourced from `commitOutput.normalized.financial.spendLimit` (type `string`), not from a separate `AgentCredential` parameter.

#### Scenario: Deterministic witness generation

- **WHEN** the same gate and commit output are provided with the same timestamp
- **THEN** the witness builder produces identical output

#### Scenario: Identical roleHash for same role name

- **WHEN** the witness builder derives `roleHash` and `requiredRoleHash` for the same role name
- **THEN** both values are identical (SHA-256 with top-nibble masking)

#### Scenario: roleGateCommitment matches circuit Poseidon4

- **WHEN** the witness builder computes `roleGateCommitment`
- **THEN** `roleGateCommitment = Poseidon4(credentialCommitment, roleHash, spendLimit, saltScalar)` using `poseidon-lite`, matching the circuit constraint

#### Scenario: Spend limit sourced from commitOutput

- **WHEN** the witness builder receives a `CommitOutput` containing `normalized.financial.spendLimit`
- **THEN** `spendLimit` is set to `commitOutput.normalized.financial.spendLimit` (already a `string`)

#### Scenario: credentialCommitment sourced from commitOutput

- **WHEN** the witness builder receives a `CommitOutput` from the agent-identity commit step
- **THEN** `credentialCommitment` is set to `commitOutput.root` and `credentialCommitmentPublic` is set to the same value

#### Scenario: Salt sourced from commitOutput

- **WHEN** the witness builder receives a `CommitOutput`
- **THEN** `salt` is derived from `commitOutput.salt` as a BN254 field element scalar

### Requirement: PaymentGate re-export

The system SHALL re-export the `PaymentGate` type from `@trust402/roles` for convenience.

#### Scenario: PaymentGate is importable from @trust402/protocol

- **WHEN** `PaymentGate` is imported from `@trust402/protocol`
- **THEN** it is the same type as `PaymentGate` from `@trust402/roles`