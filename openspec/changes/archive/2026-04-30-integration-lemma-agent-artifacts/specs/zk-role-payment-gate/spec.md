## MODIFIED Requirements

### Requirement: FR-005 witness builder replaced by Poseidon commit flow
The SHA-256-based `witness()` function and `CircuitWitness` type are **BREAKING** replaced by a Poseidon-based flow using `commit()` from `@lemmaoracle/agent` and `prover.prove()` from `@lemmaoracle/sdk`. The proof generation pipeline becomes: `credential()` → `commit(client, credential)` → `prover.prove(client, { circuitId, witness })` → `proofs.submit(client, payload)`. The `commit()` function returns `CommitOutput` containing `normalized`, `root` (credentialCommitment), `sectionHashes`, and `salt` — which are the inputs needed by the `agent-identity-v1` circuit.

#### Scenario: Full proof generation flow with Poseidon commitment
- **WHEN** a caller invokes `commit(client, credential)` then passes the result to `prover.prove()` with `circuitId: "agent-identity-v1"`
- **THEN** the proof is generated against the Poseidon6 commitment and section hashes matching the `agent-identity.circom` circuit, and the proof data is submittable via `proofs.submit()`

#### Scenario: Pure commitment computation without network
- **WHEN** a caller invokes `computeCredentialCommitment(normalized)` with an already-normalized credential
- **THEN** the function returns `SectionedCommitResult` with `root`, `sectionHashes`, and `salt` — all computed locally without network access

## ADDED Requirements

### Requirement: Types imported from @lemmaoracle/agent
The `AgentCredential`, `AgentCredentialInput`, `NormalizedAgentCredential`, `ValidationResult`, `CommitOutput`, `SectionedCommitResult`, and all sub-types SHALL be re-exported from `@lemmaoracle/agent@^0.0.23` instead of defined locally in `@trust402/roles`.

#### Scenario: Type compatibility with SDK proofs.submit
- **WHEN** `commit(client, credential)` from `@lemmaoracle/agent` produces a `CommitOutput`
- **THEN** the `root` (credentialCommitment) and `sectionHashes` can be used as witness inputs to `prover.prove()`, and the resulting proof is accepted by `proofs.submit()`

#### Scenario: Credential factory produces canonical output
- **WHEN** `credential(input)` from `@lemmaoracle/agent` is called with an `AgentCredentialInput`
- **THEN** the resulting `AgentCredential` conforms to the `agent-identity-authority-v1` schema and passes `validate()` without errors

### Requirement: prove and submit use agent-identity-v1 circuit
The `prove()` function SHALL delegate to `prover.prove()` with `circuitId: "agent-identity-v1"`, and `submit()` SHALL delegate to `proofs.submit()` with the resulting proof data. The `CIRCUIT_ID` constant is updated from `"role-spend-limit-v1"` to `"agent-identity-v1"`.

#### Scenario: Prove uses agent-identity circuit
- **WHEN** `prove(client, commitOutput)` is called
- **THEN** it calls `prover.prove(client, { circuitId: "agent-identity-v1", witness: commitOutput })` and returns the proof

#### Scenario: Submit forwards proof data
- **WHEN** `submit(client, docHash, proofResult)` is called
- **THEN** it calls `proofs.submit(client, { docHash, circuitId: "agent-identity-v1", proof: proofResult.proof, inputs: proofResult.inputs })`
