# Feature Specification: ZK Role-Gated Autonomous Payments

**Feature Branch**: `001-zk-role-payment-gate`  
**Created**: 2026-04-30  
**Status**: Draft  
**Input**: User description: "ZK Role-Gated Autonomous Payments built on Lemma — a zero-knowledge role-enforcement layer that gates autonomous agent payments via the Lemma oracle, combining hasRole and spendLimitBelow into a single Groth16 proof that attaches to x402 settlement requests."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Prove Role Authority Before Payment (Priority: P1)

An autonomous agent receives a payment request via x402 protocol. Before settling, the agent must generate a zero-knowledge proof — backed by the Lemma oracle's circuit registry and proof submission infrastructure — that it holds a specific role (e.g., "purchaser") and that its spending limit falls within the payment gate's ceiling. The proof is attached to the x402 payment request as an HTTP header. The resource server verifies the proof against the Lemma-registered verification key before allowing settlement.

**Why this priority**: This is the core value proposition. Without proof-before-payment, there is no enforcement — any agent could make unlimited payments regardless of authority.

**Independent Test**: Can be fully tested by constructing a valid agent credential, building a witness, generating a Groth16 proof, and verifying it against known public inputs. Delivers the fundamental security guarantee.

**Acceptance Scenarios**:

1. **Given** an agent credential with role "purchaser" and spend limit 50000 (USD cents), **When** the agent builds a witness against a gate requiring role "purchaser" with ceiling 100000, **Then** a valid Groth16 proof is generated and passes verification
2. **Given** an agent credential with role "viewer" and spend limit 50000, **When** the agent builds a witness against a gate requiring role "purchaser", **Then** proof generation fails because the role hash does not match the required role hash
3. **Given** an agent credential with role "purchaser" and spend limit 200000, **When** the agent builds a witness against a gate with ceiling 100000, **Then** proof generation fails because the spend limit exceeds the gate ceiling

---

### User Story 2 - Register Circuit and Schema with Oracle (Priority: P2)

A developer registers the role-spend-limit circuit and its associated schema with the Lemma oracle. This makes the circuit's artifacts (wasm, zkey) discoverable and verifiable via the oracle's API, allowing any participant to locate and use the circuit for proof generation and verification.

**Why this priority**: Registration is required for production use but the circuit can be tested locally without it. The proof generation and verification logic works independently of oracle registration.

**Independent Test**: Can be tested by running the registration scripts against the Lemma API and confirming the circuit and schema metadata are retrievable via `circuits.getById` and `schemas.getById`.

**Acceptance Scenarios**:

1. **Given** compiled circuit artifacts (wasm, zkey) and a Pinata API key, **When** the registration script runs, **Then** artifacts are uploaded to IPFS and the circuit metadata is registered with the oracle
2. **Given** a registered circuit with ID "role-spend-limit-v1", **When** a client queries `circuits.getById("role-spend-limit-v1")`, **Then** the response includes the artifact location, verifier address, and input specification

---

### User Story 3 - Enforce Proof-Before-Payment Protocol (Priority: P3)

An AI agent follows a defined protocol (SKILL.md) that mandates generating a ZK role proof before every x402 payment. The protocol is enforced through a skill template: the agent reads the skill, follows the step-by-step checklist (load credential, build witness, generate proof, attach to header, send payment), and cannot proceed to payment without a valid proof.

**Why this priority**: Enforcement is the final layer that ties proof generation to actual payment flow. The circuit and SDK wrappers work independently; the skill merely orchestrates them in a mandatory sequence.

**Independent Test**: Can be tested by walking through the SKILL.md checklist with a sample credential and gate, verifying each step produces the expected output and the final payment request includes valid proof headers.

**Acceptance Scenarios**:

1. **Given** an agent following the SKILL.md protocol, **When** the agent completes all steps, **Then** the x402 payment request includes `X-Lemma-Proof`, `X-Lemma-Proof-Inputs`, and `X-Lemma-Circuit-Id` headers
2. **Given** an agent with a revoked credential, **When** the agent reaches the "Load credential" step, **Then** the protocol halts with a clear message that the credential is revoked

---

### Edge Cases

- What happens when the agent's spend limit equals exactly the gate ceiling? The circuit must accept this as valid (less-than-or-equal constraint).
- What happens when an agent holds multiple roles? The witness builder must hash only the specific role required by the gate, not all roles.
- What happens when the gate ceiling is zero? The only agent that can prove authority is one with a spend limit of zero, which is effectively a read-only role.
- What happens when the credential's financial.spendLimit field is absent? The witness builder must default to zero.
- What happens if proof generation fails mid-flow? The protocol must halt and not send the payment request.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a Groth16 circuit that proves an agent holds a required role AND has a spend limit within a payment gate ceiling, using a single combined proof
- **FR-002**: The circuit MUST accept four private inputs: credentialCommitment, roleHash, spendLimit, and salt
- **FR-003**: The circuit MUST accept three public inputs: requiredRoleHash, maxSpend, and nowSec
- **FR-004**: The circuit MUST enforce three constraints: roleHash equals requiredRoleHash, spendLimit is less than or equal to maxSpend, and a Poseidon4 commitment binds all private inputs to the credentialCommitment
- **FR-005**: The system MUST provide a witness builder function that maps an agent credential and a payment gate specification into the circuit's input format
- **FR-006**: The witness builder MUST derive field elements by hashing role names and credential data with SHA-256, masked to BN254-safe range (top nibble zeroed)
- **FR-007**: The witness builder MUST produce identical roleHash and requiredRoleHash values for the same role name, enabling the circuit's equality constraint to pass
- **FR-008**: The system MUST provide a prove function that delegates proof generation to the Lemma SDK's prover module
- **FR-009**: The system MUST provide a submit function that submits a generated proof to the Lemma oracle via the SDK's proofs module
- **FR-010**: The system MUST provide a connect function that creates a Lemma client from an API base URL and API key
- **FR-011**: The system MUST provide registration scripts that upload circuit artifacts to IPFS and register schema and circuit metadata with the Lemma oracle
- **FR-012**: The circuit's spend limit comparison MUST use LessEqThan(128) to support values up to approximately 3.4 x 10^38 (sufficient for any USD-cent denomination)
- **FR-013**: The system MUST provide a skill template (SKILL.md) that defines a mandatory proof-before-payment protocol for autonomous agents
- **FR-014**: The skill template MUST specify that proof headers are attached to x402 payment requests as X-Lemma-Proof, X-Lemma-Proof-Inputs, and X-Lemma-Circuit-Id HTTP headers
- **FR-015**: The skill template MUST halt the payment protocol if the agent's credential is revoked or missing required fields
- **FR-016**: The circuit and its artifacts MUST be registered with the Lemma oracle via the SDK's `circuits.register` and `schemas.register` APIs, making them discoverable by any participant in the Lemma network
- **FR-017**: The witness builder MUST reference the `agent-identity-authority-v1` schema's normalized field structure (specifically `authority.roles` and `financial.spendLimit`) to maintain interoperability with credentials issued under that schema

### Key Entities

- **AgentCredential**: An identity document containing an agent's identity (agentId, subjectId, controllerId, orgId), authority (roles, scopes, permissions), financial parameters (spendLimit, currency, paymentPolicy), lifecycle state (issuedAt, expiresAt, revoked), and provenance (issuerId)
- **PaymentGate**: A policy specifying which role an agent must hold and the maximum spend ceiling (in USD cents) for the gate
- **CircuitWitness**: The set of field elements (credentialCommitment, roleHash, spendLimit, salt, requiredRoleHash, maxSpend, nowSec) that constitute the circuit's input
- **Groth16Proof**: A zero-knowledge proof consisting of a proof string and public signals, verifiable against a known verification key

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An agent holding the correct role with a spend limit within the gate ceiling generates a valid Groth16 proof that passes on-chain verification in under 5 seconds
- **SC-002**: An agent with the wrong role or exceeding the gate ceiling cannot produce a proof that passes verification (constraint violation prevents valid proof generation)
- **SC-003**: The same role name always produces the same roleHash, ensuring deterministic proof generation across independent witness builds
- **SC-004**: The witness builder correctly defaults missing spendLimit values to zero, allowing read-only agents to attempt (and fail) gates with non-zero ceilings
- **SC-005**: The complete proof-to-payment flow (witness build, proof generation, header attachment) can be completed by an autonomous agent following the SKILL.md protocol without human intervention

## Assumptions

- Agent credentials follow the agent-identity-authority-v1 schema structure with normalized fields
- The Lemma SDK (version 0.0.22+) is available as an npm package for proof generation and oracle communication
- Circom 2.1.x and snarkjs are available for circuit compilation and proof generation
- The Groth16 proving system with BN254 curve is the target ZK backend
- Poseidon hash is the commitment scheme used within the circuit (matching the broader Lemma ecosystem)
- USD cents are the unit for spend limits and gate ceilings (e.g., $500 = 50000)
- The resource server (x402 side) independently verifies proofs against a known verification key; this package does not implement server-side verification
- IPFS (via Pinata) is the artifact storage layer for circuit wasm and zkey files

## Relationship to Lemma

This feature is built on the Lemma oracle stack. The upstream monorepo is [lemmaoracle/lemma](https://github.com/lemmaoracle/lemma) (`git@github.com:lemmaoracle/lemma.git`), which provides the core infrastructure:

- **[Lemma SDK](https://github.com/lemmaoracle/lemma/tree/main/packages/sdk)** (`@lemmaoracle/sdk`): Handles proof creation (`prover.prove`), on-chain proof submission (`proofs.submit`), circuit and schema registration (`circuits.register`, `schemas.register`), and artifact resolution from IPFS. Trust402 delegates all cryptographic operations to the SDK rather than reimplementing them locally.
- **Circuit registry**: The `role-spend-limit` circuit is registered with the Lemma oracle, making its artifacts (wasm, zkey, verification key) discoverable via the oracle's API.
- **Proof submission**: Generated proofs are submitted to the Lemma oracle via `proofs.submit`, creating an auditable on-chain record.
- **Schema interoperability**: The witness builder reads credentials conforming to the `agent-identity-authority-v1` schema — the same schema used by the Lemma `agent` package.

Because the SDK handles the full proof lifecycle (artifact resolution, Groth16 fullProve, on-chain submission), Trust402 can focus exclusively on the core circuit design and domain-specific value-add: the role-gating predicate, the witness mapping, and the enforcement protocol.
