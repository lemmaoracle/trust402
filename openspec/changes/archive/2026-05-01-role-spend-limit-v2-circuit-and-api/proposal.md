## Why

The current `role-spend-limit-v1` circuit has a binding constraint bug: `Poseidon4(credentialCommitment, roleHash, spendLimit, salt) === credentialCommitment` can only hold when `roleHash === 0` and `spendLimit === 0`, making the circuit unusable for any real payment gating scenario. Additionally, the `@trust402/roles` package mixes two distinct concerns — agent identity proof (`agent-identity-v1`) and role-spend-limit proof (`role-spend-limit-v1`) — in a single module with a single `prove`/`submit` API that hardcodes `CIRCUIT_ID = "agent-identity-v1"`, leaving the role circuit without proper TypeScript wrappers.

## What Changes

- **BREAKING**: Fix the `role-spend-limit` circuit binding constraint to use a separate `roleGateCommitment` output and expose `credentialCommitment` as a public input for cross-proof correlation
- **BREAKING**: Split `@trust402/roles` into two packages: `packages/identity` (agent-identity-v1 commit/prove/submit) and `packages/roles` (role-spend-limit-v1 commit/prove/submit)
- Add `witness(cred, gate, commitOutput)` function that maps `AgentCredential` + `PaymentGate` + `CommitOutput` into `CircuitWitness` for the updated circuit
- Add `commit`, `prove`, `submit` functions for `role-spend-limit-v1` in `packages/roles`
- Move existing `agent-identity-v1` commit/prove/submit to `packages/identity`
- Update the circuit preset manifest for the new public inputs
- Update SKILL.md to reflect the two-proof flow

## Capabilities

### New Capabilities

- `role-spend-limit-v2`: Updated Groth16 circuit with corrected binding constraint (separate roleGateCommitment), credentialCommitment as public input for cross-proof correlation, and matching TypeScript commit/prove/submit API

### Modified Capabilities

_(None — this is a new capability that replaces the broken role-spend-limit-v1 circuit)_

## Impact

- **Code**: Two packages under `trust402/packages/` — `identity` (extracted from current `roles`) and `roles` (rewritten for v2 circuit)
- **APIs**:
  - `packages/identity`: `commit`, `prove`, `submit`, `connect` (moved from current `roles/src/index.ts`)
  - `packages/roles`: `witness`, `commit`, `prove`, `submit`, `connect` (new, targeting `role-spend-limit-v2`)
- **Circuit**: `role-spend-limit.circom` updated — new public inputs `roleGateCommitment` and `credentialCommitmentPublic`, constraint 3 fixed, constraint 4 added
- **Dependencies**: Same as current (`@lemmaoracle/sdk`, `@lemmaoracle/agent`, `ramda`, `poseidon-lite`)
- **Systems**: Lemma oracle (circuit re-registration required), Relay (no changes), x402 protocol (proof header format changes)

## Non-goals

- Server-side proof verification middleware (separate change)
- `wrapFetchWithProof` client middleware (separate change)
- Relay `/prover/verify` endpoint (separate change)
- On-chain verifier contract deployment
- Credential issuance or management
- Supporting hash functions other than SHA-256 (outside circuit) and Poseidon (inside circuit)
