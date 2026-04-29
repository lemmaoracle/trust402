# Data Model: ZK Role-Gated Autonomous Payments

**Feature**: 001-zk-role-payment-gate | **Date**: 2026-04-30

## Entities

### AgentCredential

An identity document issued under the `agent-identity-authority-v1` schema — the canonical credential schema defined in [`@lemma/agent`](https://github.com/lemmaoracle/lemma/tree/main/packages/agent), the Lemma core monorepo's agent identity package. That package provides the WASM-based `normalize()` and `validate()` functions that canonicalize credential fields into flat strings suitable for circuit encoding. Trust402's witness builder consumes credentials that have been normalized by this upstream schema. Contains the agent's identity, authority, financial parameters, lifecycle state, and provenance.

| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| `schema` | `string` | yes | Must equal `"agent-identity-authority-v1"` | Schema identifier for interoperability |
| `identity.agentId` | `string` | yes | Non-empty | Unique agent identifier |
| `identity.subjectId` | `string` | yes | Non-empty | DID of the agent's subject |
| `identity.controllerId` | `string` | no | — | DID of the controlling entity |
| `identity.orgId` | `string` | no | — | Organization identifier |
| `authority.roles` | `ReadonlyArray<string>` | yes | At least one role | Role names used for gate matching |
| `authority.scopes` | `ReadonlyArray<string>` | yes | — | Permission scopes |
| `authority.permissions` | `ReadonlyArray<{resource: string, action: string}>` | yes | — | Resource-action permission pairs |
| `financial.spendLimit` | `number` | no | ≥ 0, integer (USD cents) | Defaults to 0 if absent |
| `financial.currency` | `string` | no | — | e.g., "USD" |
| `financial.paymentPolicy` | `string` | no | — | e.g., "auto-approve-below-limit" |
| `lifecycle.issuedAt` | `number` | yes | Unix timestamp (seconds) | Credential issuance time |
| `lifecycle.expiresAt` | `number` | no | Unix timestamp (seconds) | Credential expiry |
| `lifecycle.revoked` | `boolean` | no | — | If true, credential is invalid |

**Derived fields** (computed by witness builder, not stored):
- `credentialCommitment`: SHA-256 of JSON-serialized credential, top nibble masked → BN254 field element
- `roleHash`: SHA-256 of the gate's role name, top nibble masked → BN254 field element
- `spendLimit`: `financial.spendLimit ?? 0` → string representation for circuit input
- `salt`: SHA-256 of `credentialJson:gateRole:nowSec` → BN254 field element

### PaymentGate

A policy specifying which role an agent must hold and the maximum spend ceiling.

| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| `role` | `string` | yes | Non-empty | Role name required to pass the gate |
| `maxSpend` | `number` | yes | ≥ 0, integer (USD cents) | Ceiling for the gate; compared via LessEqThan(128) |

### CircuitWitness

The set of field elements that constitute the circuit's input, produced by the witness builder.

| Field | Type | Visibility | Derivation |
|---|---|---|---|
| `credentialCommitment` | `string` | private | `fieldHash(JSON.stringify(cred))` |
| `roleHash` | `string` | private | `fieldHash(gate.role)` |
| `spendLimit` | `string` | private | `(cred.financial.spendLimit ?? 0).toString()` |
| `salt` | `string` | private | `fieldHash(credJson:gateRole:nowSec)` |
| `requiredRoleHash` | `string` | public | `fieldHash(gate.role)` (same as roleHash for matching role) |
| `maxSpend` | `string` | public | `gate.maxSpend.toString()` |
| `nowSec` | `string` | public | `Math.floor(Date.now() / 1000).toString()` |

### Groth16Proof

A zero-knowledge proof produced by the Lemma SDK's prover module.

| Field | Type | Notes |
|---|---|---|
| `proof` | `string` | Serialized Groth16 proof |
| `inputs` | `string[]` | Public signals (requiredRoleHash, maxSpend, nowSec) |

## Relationships

```text
AgentCredential ──1:1──> CircuitWitness    (via witness builder)
PaymentGate ──1:1──> CircuitWitness        (via witness builder)
CircuitWitness ──1:1──> Groth16Proof       (via prover.prove)
Groth16Proof ──1:1──> x402 HTTP Headers   (via SKILL.md protocol)
```

## Validation Rules

1. **Role matching**: The witness builder hashes only the specific role required by the gate (not all roles in the credential). The circuit enforces `roleHash === requiredRoleHash`.
2. **Spend limit default**: Missing `financial.spendLimit` defaults to 0, allowing only gates with `maxSpend === 0`.
3. **Revocation check**: If `lifecycle.revoked === true`, the SKILL.md protocol halts before proof generation.
4. **BN254 safety**: All field elements are derived via SHA-256 with top nibble zeroed, ensuring values remain below the BN254 prime.
5. **LessEqThan(128)**: The circuit uses 128-bit comparison, accepting `spendLimit <= maxSpend` (inclusive).

## State Transitions

```text
[No credential] ──load──> [Credential loaded] ──validate──> [Valid credential]
                                │                              │
                                └──revoked/missing──> [HALT]   └──build witness──> [Witness ready]
                                                                     │
                                                              ┌──────┴──────┐
                                                         [valid inputs] [constraint violation]
                                                              │                │
                                                     ┌────────┘                └──> [HALT: proof fails]
                                                     │
                                              ┌──────┴──────┐
                                         [prove success] [prove failure]
                                              │                │
                                     ┌────────┘                └──> [HALT: no proof]
                                     │
                              [Attach to x402 header] ──> [Send payment]
```
