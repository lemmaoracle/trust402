# Public API Contract: @trust402/roles

**Version**: 0.0.1 | **Date**: 2026-04-30

This library exposes four exported functions and three exported types. All cryptographic operations delegate to `@lemmaoracle/sdk`.

## Exported Types

### `AgentCredential`

```typescript
type AgentCredential = Readonly<{
  schema: string;
  identity: Readonly<{
    agentId: string;
    subjectId: string;
    controllerId?: string;
    orgId?: string;
  }>;
  authority: Readonly<{
    roles: ReadonlyArray<string>;
    scopes: ReadonlyArray<string>;
    permissions: ReadonlyArray<Readonly<{ resource: string; action: string }>>;
  }>;
  financial: Readonly<{
    spendLimit?: number;
    currency?: string;
    paymentPolicy?: string;
  }>;
  lifecycle: Readonly<{
    issuedAt: number;
    expiresAt?: number;
    revoked?: boolean;
  }>;
  provenance: Readonly<{
    issuerId: string;
  }>;
}>;
```

- `financial.spendLimit` defaults to `0` when absent (handled in witness builder)
- `lifecycle.revoked` — the SKILL.md protocol checks this; the circuit does not

### `PaymentGate`

```typescript
type PaymentGate = Readonly<{
  role: string;
  maxSpend: number;
}>;
```

- `role`: The role name required by the gate (hashed by the witness builder to produce both `roleHash` and `requiredRoleHash`)
- `maxSpend`: Ceiling in USD cents (compared via LessEqThan(128) in the circuit)

### `CircuitWitness`

```typescript
type CircuitWitness = Readonly<{
  credentialCommitment: string;
  roleHash: string;
  spendLimit: string;
  salt: string;
  requiredRoleHash: string;
  maxSpend: string;
  nowSec: string;
}>;
```

- All values are string representations of BN254 field elements (or decimal strings for numeric inputs)
- `roleHash` and `requiredRoleHash` are identical when the credential holds the gate's required role

## Exported Functions

### `witness(cred: AgentCredential, gate: PaymentGate): CircuitWitness`

Maps an agent credential and payment gate into the circuit's input format.

**Behavior**:
- Derives `credentialCommitment` by SHA-256 hashing the JSON-serialized credential (top nibble masked)
- Derives `roleHash` and `requiredRoleHash` by SHA-256 hashing `gate.role` (same derivation, same result)
- Maps `spendLimit` from `cred.financial.spendLimit ?? 0`
- Generates `salt` from SHA-256 of `credJson:gateRole:nowSec`
- Captures `maxSpend` from `gate.maxSpend`
- Captures `nowSec` from `Math.floor(Date.now() / 1000)`

**Determinism**: For the same credential, gate, and timestamp, the witness is deterministic. `roleHash` and `requiredRoleHash` are always equal for the same `gate.role`.

**Errors**: Does not throw. Invalid inputs will produce invalid witnesses that fail at the proof generation step.

---

### `prove(client: LemmaClient, w: CircuitWitness): Promise<ProveOutput>`

Generates a Groth16 proof using the Lemma SDK's prover module.

**Behavior**:
- Delegates to `prover.prove(client, { circuitId: "role-spend-limit-v1", witness: w })`
- The SDK fetches wasm/zkey artifacts from IPFS, runs `snarkjs groth16 fullProve`, and returns the proof + public inputs

**Errors**: Returns `Promise.reject(new Error(...))` if:
- The witness violates circuit constraints (wrong role or spend limit exceeds ceiling)
- The SDK cannot resolve circuit artifacts
- Network errors contacting the Lemma oracle

---

### `submit(client: LemmaClient, docHash: string, proofResult: ProveOutput): Promise<SubmitOutput>`

Submits a generated proof to the Lemma oracle for on-chain recording.

**Behavior**:
- Delegates to `proofs.submit(client, { docHash, circuitId: "role-spend-limit-v1", proof: proofResult.proof, inputs: proofResult.inputs })`

**Errors**: Returns `Promise.reject(new Error(...))` on network or oracle errors.

---

### `connect(apiBase: string): (apiKey: string) => LemmaClient`

Creates a Lemma client from an API base URL and API key. Curried for convenient partial application.

**Behavior**:
- Delegates to `create({ apiBase, apiKey })` from `@lemmaoracle/sdk`
- Returns a configured `LemmaClient` instance used by `prove` and `submit`

## Circuit Contract

### `role-spend-limit` (Circom 2.1.x)

| Signal | Visibility | Type | Description |
|---|---|---|---|
| `credentialCommitment` | private | field | Poseidon commitment binding all private inputs |
| `roleHash` | private | field | Hash of the role the agent claims |
| `spendLimit` | private | field | Agent's spend limit (USD cents) |
| `salt` | private | field | Binding randomness |
| `requiredRoleHash` | public | field | Hash of the gate's required role |
| `maxSpend` | public | field | Gate ceiling (USD cents) |
| `nowSec` | public | field | Current unix timestamp |

**Constraints**:
1. `roleHash === requiredRoleHash` (role membership)
2. `LessEqThan(128)(spendLimit, maxSpend) === 1` (spend within ceiling)
3. `Poseidon4(credentialCommitment, roleHash, spendLimit, salt) === credentialCommitment` (binding)

**Circuit ID**: `role-spend-limit-v1`

## Registration API

Two CLI scripts register the circuit and schema with the Lemma oracle:

### `register-schema.ts`

- Uploads the circuit's WASM artifact to IPFS via Pinata
- Registers the `role-spend-limit-v1` schema via `schemas.register(client, meta)`
- Requires `LEMMA_API_KEY`, `PINATA_API_KEY`, `PINATA_SECRET_API_KEY` environment variables

### `register-circuit.ts`

- Uploads wasm + zkey artifacts to IPFS via Pinata
- Registers the `role-spend-limit-v1` circuit via `circuits.register(client, meta)`
- Requires `LEMMA_API_KEY`, `PINATA_API_KEY`, `PINATA_SECRET_API_KEY` environment variables
- Optional `VERIFIER_ADDRESS` and `CHAIN_ID` environment variables
