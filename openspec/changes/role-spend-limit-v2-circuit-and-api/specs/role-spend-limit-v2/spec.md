## ADDED Requirements

### Requirement: Role-spend-limit-v2 Groth16 circuit

The system SHALL provide a Groth16 circuit (`role-spend-limit-v2`) that proves an agent holds a required role AND has a spend limit within a payment gate ceiling, using a separate `roleGateCommitment` binding and cross-proof correlation via public `credentialCommitment`.

#### Scenario: Valid proof with matching role and within-ceiling spend limit

- **WHEN** an agent credential with role "purchaser" and spend limit 50000 is built against a gate requiring role "purchaser" with ceiling 100000
- **THEN** a valid Groth16 proof is generated where `roleGateCommitment = Poseidon4(credentialCommitment, roleHash, spendLimit, salt)` and public inputs include `credentialCommitmentPublic` matching `credentialCommitment`

#### Scenario: Invalid proof — wrong role

- **WHEN** an agent credential with role "viewer" and spend limit 50000 is built against a gate requiring role "purchaser"
- **THEN** proof generation fails because `roleHash !== requiredRoleHash`

#### Scenario: Invalid proof — spend limit exceeds ceiling

- **WHEN** an agent credential with role "purchaser" and spend limit 200000 is built against a gate with ceiling 100000
- **THEN** proof generation fails because `spendLimit > maxSpend` violates the LessEqThan(128) constraint

#### Scenario: Spend limit equals ceiling exactly

- **WHEN** an agent credential with spend limit equal to the gate ceiling is built against that gate
- **THEN** the circuit accepts this as valid (LessEqThan is inclusive)

#### Scenario: Cross-proof correlation via credentialCommitmentPublic

- **WHEN** a valid role-spend-limit-v2 proof is generated
- **THEN** the public inputs SHALL contain `credentialCommitmentPublic` that equals the private `credentialCommitment` input, enabling server-side correlation with an agent-identity-v1 proof

#### Scenario: credentialCommitmentPublic mismatch with private credentialCommitment

- **WHEN** the witness provides different values for `credentialCommitment` (private) and `credentialCommitmentPublic` (public)
- **THEN** proof generation fails because the equality constraint `credentialCommitment === credentialCommitmentPublic` is violated

### Requirement: Witness builder for role-spend-limit-v2

The system SHALL provide a `witness(credential, gate, commitOutput)` function that maps an `AgentCredential`, a `PaymentGate`, and a `CommitOutput` into `CircuitWitness` field elements for the role-spend-limit-v2 circuit, computing `roleGateCommitment` via `poseidon-lite` Poseidon4.

#### Scenario: Deterministic witness generation

- **WHEN** the same credential, gate, and commit output are provided with the same timestamp
- **THEN** the witness builder produces identical output

#### Scenario: Identical roleHash for same role name

- **WHEN** the witness builder derives `roleHash` and `requiredRoleHash` for the same role name
- **THEN** both values are identical (SHA-256 with top-nibble masking)

#### Scenario: roleGateCommitment matches circuit Poseidon4

- **WHEN** the witness builder computes `roleGateCommitment`
- **THEN** `roleGateCommitment = Poseidon4(credentialCommitment, roleHash, spendLimit, saltScalar)` using `poseidon-lite`, matching the circuit constraint

#### Scenario: Missing spend limit defaults to zero

- **WHEN** a credential has no `financial.spendLimit` field
- **THEN** the witness builder defaults `spendLimit` to 0

#### Scenario: credentialCommitment sourced from commitOutput

- **WHEN** the witness builder receives a `CommitOutput` from the agent-identity commit step
- **THEN** `credentialCommitment` is set to `commitOutput.root` and `credentialCommitmentPublic` is set to the same value

#### Scenario: Salt sourced from commitOutput

- **WHEN** the witness builder receives a `CommitOutput`
- **THEN** `salt` is derived from `commitOutput.salt` as a BN254 field element scalar

### Requirement: Commit function for role-spend-limit-v2

The system SHALL provide a `commit(client, credential)` function that normalizes a credential and computes the sectioned Poseidon commitment, delegating to `@lemmaoracle/agent`'s `commit()`.

#### Scenario: Successful commit

- **WHEN** a valid `AgentCredential` and `LemmaClient` are provided
- **THEN** the function returns a `CommitOutput` containing `root` (the `credentialCommitment`), `sectionHashes`, `salt`, and `normalized` credential

### Requirement: Prove function for role-spend-limit-v2

The system SHALL provide a `prove(client, circuitWitness)` function that delegates Groth16 proof generation to the Lemma SDK's `prover.prove` module with circuit ID `role-spend-limit-v2`.

#### Scenario: Successful proof generation

- **WHEN** a valid `CircuitWitness` is provided to the prove function
- **THEN** the function returns a `ProveOutput` with `proof` and `inputs` via the SDK, where `inputs` contains `[requiredRoleHash, maxSpend, nowSec, roleGateCommitment, credentialCommitmentPublic]`

#### Scenario: Proof generation failure on constraint violation

- **WHEN** a `CircuitWitness` that violates circuit constraints is provided
- **THEN** the function returns `Promise.reject(new Error(...))`

### Requirement: Submit function for role-spend-limit-v2

The system SHALL provide a `submit(client, docHash, proofResult)` function that submits a generated proof to the Lemma oracle via the SDK's `proofs.submit` module with circuit ID `role-spend-limit-v2`.

#### Scenario: Successful proof submission

- **WHEN** a valid proof result and document hash are provided
- **THEN** the function submits the proof to the Lemma oracle for on-chain recording with `circuitId: "role-spend-limit-v2"`

### Requirement: Connect function for role-spend-limit-v2

The system SHALL provide a `connect(apiBase)` curried factory that creates a Lemma client from an API base URL and API key.

#### Scenario: Client creation with valid credentials

- **WHEN** `connect` is called with an API base URL and then with an API key
- **THEN** a configured `LemmaClient` instance is returned for use with commit, prove, and submit

### Requirement: Package split — identity package

The system SHALL provide a `@trust402/identity` package containing `commit`, `prove`, `submit`, and `connect` functions targeting the `agent-identity-v1` circuit, extracted from the current `@trust402/roles` package.

#### Scenario: Identity commit

- **WHEN** `commit` is called with a `LemmaClient` and `AgentCredential`
- **THEN** it delegates to `@lemmaoracle/agent`'s `commit()` and returns a `CommitOutput`

#### Scenario: Identity prove

- **WHEN** `prove` is called with a `LemmaClient` and `CommitOutput`
- **THEN** it delegates to `prover.prove(client, { circuitId: "agent-identity-v1", witness: commitOutput })`

#### Scenario: Identity submit

- **WHEN** `submit` is called with a `LemmaClient`, `docHash`, and `ProveOutput`
- **THEN** it delegates to `proofs.submit(client, { docHash, circuitId: "agent-identity-v1", proof, inputs })`

### Requirement: Circuit registration for role-spend-limit-v2

The system SHALL provide an updated registration script that uploads circuit artifacts to IPFS via Pinata and registers circuit metadata with the Lemma oracle using `circuits.register` with circuit ID `role-spend-limit-v2`.

#### Scenario: Successful circuit registration

- **WHEN** compiled circuit artifacts and Pinata API keys are available and the registration script runs
- **THEN** artifacts are uploaded to IPFS and circuit metadata is registered with the oracle via `circuits.register` with `circuitId: "role-spend-limit-v2"` and public inputs `["requiredRoleHash", "maxSpend", "nowSec", "roleGateCommitment", "credentialCommitmentPublic"]`

### Requirement: Updated preset manifest

The system SHALL provide an updated preset manifest (`role-spend-limit-v2.json`) reflecting the new public inputs and circuit ID.

#### Scenario: Manifest reflects v2 circuit structure

- **WHEN** the preset manifest is loaded
- **THEN** it contains `circuitId: "role-spend-limit-v2"`, `inputs: ["requiredRoleHash", "maxSpend", "nowSec", "roleGateCommitment", "credentialCommitmentPublic"]`, and updated artifact locations
