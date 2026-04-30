## Why

Autonomous AI agents need a cryptographic enforcement layer to gate payments by role authority and spending limits. Without proof-before-payment, any agent with network access could make unlimited payments regardless of organizational authority. The existing `zk-role-payment-gate` specification defines the desired behavior but has not been fully implemented as an OpenSpec-tracked change. This change formalizes the implementation of the complete ZK role-gated autonomous payment system — circuit, SDK wrappers, registration scripts, and enforcement protocol — under the OpenSpec workflow.

## What Changes

- Implement the `role-spend-limit` Groth16 circuit with three constraints (role equality, LessEqThan(128) spend comparison, Poseidon4 binding) in Circom
- Implement TypeScript witness builder (`witness`) that maps `AgentCredential` + `PaymentGate` into `CircuitWitness` field elements
- Implement `prove` function delegating to Lemma SDK's `prover.prove`
- Implement `submit` function delegating to Lemma SDK's `proofs.submit`
- Implement `connect` curried factory for Lemma client creation
- Implement registration scripts (`register-schema.ts`, `register-circuit.ts`) for Lemma oracle
- Create SKILL.md enforcement template for proof-before-payment protocol
- Define preset manifests for schema and circuit metadata

## Capabilities

### New Capabilities

- `zk-role-payment-gate`: Zero-knowledge proof system that gates autonomous agent payments by verifying role membership and spend limits within a single Groth16 proof attached to x402 settlement requests

### Modified Capabilities

_(None — this is the first implementation of the specification)_

## Impact

- **Code**: New package `@trust402/roles` under `packages/roles/` — circuit source, TypeScript wrappers, registration scripts, preset manifests, SKILL.md
- **APIs**: Four exported functions (`witness`, `prove`, `submit`, `connect`) and three exported types (`AgentCredential`, `PaymentGate`, `CircuitWitness`)
- **Dependencies**: `@lemmaoracle/sdk` ^0.0.22, `@lemmaoracle/spec` ^0.0.22, `ramda`, `circomlib`, `snarkjs`, `circomlibjs`
- **Systems**: Lemma oracle (circuit/schema registration), IPFS/Pinata (artifact storage), x402 protocol (proof header attachment)

## Non-goals

- Server-side proof verification (handled by the resource server independently)
- On-chain verifier contract deployment (the verifier address is a configuration parameter)
- Credential issuance or management (handled by the Lemma `agent` package)
- Runtime enforcement infrastructure such as MCP servers or middleware
- Supporting hash functions other than SHA-256 (outside circuit) and Poseidon (inside circuit)
