## ADDED Requirements

### Requirement: Role-spend-limit Groth16 circuit
The system SHALL provide a Groth16 circuit (`role-spend-limit`) that proves an agent holds a required role AND has a spend limit within a payment gate ceiling, using a single combined proof with three constraints: role equality (`roleHash === requiredRoleHash`), spend comparison (`LessEqThan(128)(spendLimit, maxSpend) === 1`), and Poseidon4 commitment binding.

#### Scenario: Valid proof with matching role and within-ceiling spend limit
- **WHEN** an agent credential with role "purchaser" and spend limit 50000 is built against a gate requiring role "purchaser" with ceiling 100000
- **THEN** a valid Groth16 proof is generated and passes verification

#### Scenario: Invalid proof — wrong role
- **WHEN** an agent credential with role "viewer" and spend limit 50000 is built against a gate requiring role "purchaser"
- **THEN** proof generation fails because roleHash does not match requiredRoleHash

#### Scenario: Invalid proof — spend limit exceeds ceiling
- **WHEN** an agent credential with role "purchaser" and spend limit 200000 is built against a gate with ceiling 100000
- **THEN** proof generation fails because spendLimit exceeds maxSpend

#### Scenario: Spend limit equals ceiling exactly
- **WHEN** an agent credential with spend limit equal to the gate ceiling is built against that gate
- **THEN** the circuit accepts this as valid (LessEqThan is inclusive)

### Requirement: Witness builder
The system SHALL provide a `witness(cred, gate)` function that maps an `AgentCredential` and `PaymentGate` into `CircuitWitness` field elements using SHA-256 with top-nibble masking for BN254 safety.

#### Scenario: Deterministic witness generation
- **WHEN** the same credential, gate, and timestamp are provided
- **THEN** the witness builder produces identical output

#### Scenario: Identical roleHash for same role name
- **WHEN** the witness builder derives roleHash and requiredRoleHash for the same role name
- **THEN** both values are identical, enabling the circuit equality constraint to pass

#### Scenario: Missing spend limit defaults to zero
- **WHEN** a credential has no `financial.spendLimit` field
- **THEN** the witness builder defaults spendLimit to 0

#### Scenario: Multiple roles — only gate role hashed
- **WHEN** an agent holds multiple roles and is built against a gate requiring a specific role
- **THEN** the witness builder hashes only the gate's required role, not all roles in the credential

### Requirement: Prove function
The system SHALL provide a `prove(client, w)` function that delegates Groth16 proof generation to the Lemma SDK's `prover.prove` module with circuit ID `role-spend-limit-v1`.

#### Scenario: Successful proof generation
- **WHEN** a valid witness is provided to the prove function
- **THEN** the function returns a Groth16 proof and public inputs via the SDK

#### Scenario: Proof generation failure on constraint violation
- **WHEN** a witness that violates circuit constraints is provided
- **THEN** the function returns `Promise.reject(new Error(...))`

### Requirement: Submit function
The system SHALL provide a `submit(client, docHash, proofResult)` function that submits a generated proof to the Lemma oracle via the SDK's `proofs.submit` module.

#### Scenario: Successful proof submission
- **WHEN** a valid proof result and document hash are provided
- **THEN** the function submits the proof to the Lemma oracle for on-chain recording

### Requirement: Connect function
The system SHALL provide a `connect(apiBase)` curried factory that creates a Lemma client from an API base URL and API key.

#### Scenario: Client creation with valid credentials
- **WHEN** `connect` is called with an API base URL and then with an API key
- **THEN** a configured LemmaClient instance is returned for use with prove and submit

### Requirement: Circuit and schema registration
The system SHALL provide registration scripts that upload circuit artifacts to IPFS via Pinata and register schema and circuit metadata with the Lemma oracle using `schemas.register` and `circuits.register`.

#### Scenario: Successful circuit registration
- **WHEN** compiled circuit artifacts and Pinata API keys are available and the registration script runs
- **THEN** artifacts are uploaded to IPFS and circuit metadata is registered with the oracle

#### Scenario: Successful schema registration
- **WHEN** schema metadata conforming to `agent-identity-authority-v1` normalized fields is provided
- **THEN** the schema is registered and discoverable via `schemas.getById`

### Requirement: Proof-before-payment enforcement protocol
The system SHALL provide a SKILL.md template that defines a mandatory 5-step protocol (load credential, build witness, generate proof, attach headers, send payment) for autonomous agents, with halt conditions for revoked or incomplete credentials.

#### Scenario: Complete protocol execution
- **WHEN** an agent follows the SKILL.md protocol with a valid credential and matching gate
- **THEN** the x402 payment request includes `X-Lemma-Proof`, `X-Lemma-Proof-Inputs`, and `X-Lemma-Circuit-Id` headers

#### Scenario: Revoked credential halts protocol
- **WHEN** an agent with a revoked credential reaches the "Load credential" step
- **THEN** the protocol halts with a clear message that the credential is revoked

#### Scenario: Proof failure mid-flow halts protocol
- **WHEN** proof generation fails during the protocol
- **THEN** the protocol halts and no payment request is sent

### Requirement: Zero ceiling gate
The system SHALL accept a payment gate with `maxSpend === 0`, allowing only agents with `spendLimit === 0` to prove authority (effectively a read-only role).

#### Scenario: Agent with zero spend limit passes zero-ceiling gate
- **WHEN** an agent with spendLimit 0 is built against a gate with maxSpend 0
- **THEN** the circuit accepts this as valid

#### Scenario: Agent with non-zero spend limit fails zero-ceiling gate
- **WHEN** an agent with spendLimit > 0 is built against a gate with maxSpend 0
- **THEN** the circuit constraint fails
