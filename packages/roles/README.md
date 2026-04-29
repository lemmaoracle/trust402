# @trust402/roles

ZK role-enforcement circuits for autonomous agent payments.

Proves that an AI agent holds a required role **and** its spend limit falls within a payment gate ceiling — before the agent can settle an x402 payment.

Built on [Lemma](https://github.com/lemmaoracle/lemma) — all cryptographic operations delegate to `@lemmaoracle/sdk`.

## Circuit: `role-spend-limit`

Combined proof of `hasRole AND spendLimitBelow`:

| | Signal | Description |
|---|---|---|
| Private | `credentialCommitment` | Poseidon hash of the agent's normalized credential |
| Private | `roleHash` | Hash of the role the agent claims |
| Private | `spendLimit` | Agent's spend limit (USD cents) |
| Private | `salt` | Binding randomness |
| Public | `requiredRoleHash` | Hash of the role required by the payment gate |
| Public | `maxSpend` | Ceiling imposed by the gate |
| Public | `nowSec` | Current unix timestamp |

Constraints:
1. `roleHash === requiredRoleHash` — role membership
2. `spendLimit <= maxSpend` — spend ceiling (via `LessEqThan(128)`)
3. `Poseidon4(commitment, roleHash, spendLimit, salt) === credentialCommitment` — binding

## Usage

```typescript
import { connect, witness, prove, submit } from "@trust402/roles";
import type { AgentCredential, PaymentGate } from "@trust402/roles";

// Your agent credential (conforms to agent-identity-authority-v1)
const credential: AgentCredential = { /* ... */ };

// The payment gate requiring role "purchaser" with ceiling $1000
const gate: PaymentGate = { role: "purchaser", maxSpend: 100000 };

// Connect to Lemma
const client = connect("https://workers.lemma.workers.dev")(apiKey);

// Build witness
const w = witness(credential, gate);

// Generate ZK proof (delegates to @lemmaoracle/sdk prover)
const proofResult = await prove(client, w);

// Submit proof to Lemma oracle for on-chain recording
await submit(client, docHash, proofResult);
```

### Attach to x402 Payment

```typescript
const headers = {
  "X-Lemma-Proof": proofResult.proof,
  "X-Lemma-Proof-Inputs": proofResult.inputs.join(","),
  "X-Lemma-Circuit-Id": "role-spend-limit-v1",
};
```

## Enforcement (SKILL.md)

The package includes a `SKILL.md` that defines the proof-before-payment protocol for AI agents. When an agent follows this skill, it must generate a valid ZK proof before every x402 payment — no proof, no payment.

The protocol defines 5 mandatory steps:
1. Load credential (halt if revoked or missing fields)
2. Build witness
3. Generate proof (halt if proof fails)
4. Attach proof to x402 header
5. Send payment

## Build

```bash
# Build the circuit artifacts (requires circom 2.1.x)
cd packages/roles/circuits && bash scripts/build.sh

# Build the TypeScript package
cd packages/roles && pnpm build

# Run tests
pnpm test
```

## Registration

Register the circuit and schema with the Lemma oracle (requires API keys):

```bash
export LEMMA_API_KEY=your-key
export PINATA_API_KEY=your-pinata-key
export PINATA_SECRET_API_KEY=your-pinata-secret

# Register schema and circuit
pnpm register
```

## Requirements

- `circom` >= 2.1.x
- Node.js >= 20
- `@lemmaoracle/sdk` as a peer dependency

## License

MIT
