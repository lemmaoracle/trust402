## Requirements

### Requirement: IdentityArtifact type

The system SHALL define an `IdentityArtifact` type as a `Readonly` object containing `commitOutput` (`CommitOutput` from `@trust402/identity`) and `identityProof` (`ProveOutput` from `@lemmaoracle/sdk`).

#### Scenario: Type structure

- **WHEN** an `IdentityArtifact` is constructed
- **THEN** it contains `commitOutput` of type `CommitOutput` and `identityProof` of type `ProveOutput`, and no other fields

#### Scenario: Compatibility with CLI prove output

- **WHEN** the CLI `trust402 prove --credential <path> --api-key <key>` outputs `{ commit: CommitOutput, proof: ProveOutput }`
- **THEN** mapping `{ commitOutput: output.commit, identityProof: output.proof }` produces a valid `IdentityArtifact`

### Requirement: proveRoleFromArtifact function

The system SHALL provide a `proveRoleFromArtifact(client, artifact, gate)` function that generates a role-spend-limit proof using the artifact's pre-computed identity data, submits both proofs to the oracle, and returns a `ProveRoleResult`. No `AgentCredential` parameter is required — the `spendLimit` is sourced from `artifact.commitOutput.normalized.financial.spendLimit`.

#### Scenario: Successful role proof from artifact

- **WHEN** `proveRoleFromArtifact(client, artifact, gate)` is called with a valid artifact and matching gate
- **THEN** the function builds a role witness via `witness(gate, artifact.commitOutput)`, generates a role proof via `proveRole(client, circuitWitness)`, submits both the artifact's identity proof and the new role proof to the oracle, and returns `{ identityProof, roleProof, identitySubmission, roleSubmission }`

#### Scenario: No identity proof generation

- **WHEN** `proveRoleFromArtifact` is called
- **THEN** no `commit` or `prove` call is made for the `agent-identity-v1` circuit; the artifact's `commitOutput` and `identityProof` are used directly

#### Scenario: Spend limit sourced from artifact

- **WHEN** `proveRoleFromArtifact` builds the role witness
- **THEN** `spendLimit` is sourced from `artifact.commitOutput.normalized.financial.spendLimit` (a `string`), not from a separate `AgentCredential` parameter

#### Scenario: Role proof generation failure

- **WHEN** the role witness or proof generation fails during `proveRoleFromArtifact`
- **THEN** the function SHALL return `Promise.reject(new Error("Role proof generation failed"))`

#### Scenario: Oracle submission failure does not block result

- **WHEN** proof generation succeeds but oracle submission fails during `proveRoleFromArtifact`
- **THEN** the function SHALL log a warning and include `undefined` for the failed submission result, returning the rest of the `ProveRoleResult`

### Requirement: ProveRoleResult type

The system SHALL define a `ProveRoleResult` type containing `identityProof` (ProveOutput), `roleProof` (ProveOutput), `identitySubmission` (unknown), and `roleSubmission` (unknown).

#### Scenario: Type contains all proof and submission data

- **WHEN** a `ProveRoleResult` is returned from `proveRoleFromArtifact`
- **THEN** all four fields are present and correctly typed

### Requirement: IdentityArtifact re-export

The system SHALL re-export `CommitOutput` from `@trust402/identity` and `ProveOutput` from `@lemmaoracle/sdk` for consumers constructing `IdentityArtifact` values.

#### Scenario: Types are importable from @trust402/protocol

- **WHEN** `CommitOutput` and `ProveOutput` are imported from `@trust402/protocol`
- **THEN** they are the same types as from their source packages