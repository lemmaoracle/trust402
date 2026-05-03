# Trust402

ZK-proof-gated payments for autonomous AI agents. Trust402 combines zero-knowledge role enforcement with the [x402 payment protocol](https://github.com/coinbase/x402) to let AI agents pay for verified data — without exposing credentials.

## How It Works

```text
User Query -> AI Reasoning -> ZK Role Proof -> x402 Payment -> Verified Data

ZK Role Proof validates:
  - Agent role (e.g. "purchaser")
  - Spend limit <= gate ceiling
  - Credential not expired / not revoked
```

An agent holds a Verifiable Credential (committed on-chain via [Lemma](https://lemma.frame00.com/)). Before paying, it generates a Groth16 ZK proof that its role and spend limit satisfy the payment gate. The resource server verifies the proof before accepting payment — credentials never leave the agent.

## Packages

| Package | Description |
|---|---|
| `@trust402/roles` | ZK role-enforcement circuits (Groth16 + BN254). Witness builder, `fieldHash`, and on-chain submit. |
| `@trust402/identity` | Agent identity proof (`agent-identity-v1`) — commit, prove, and submit via Lemma SDK. |
| `@trust402/protocol` | Buyer-side `wrapFetchWithProof` — composes proof generation into the fetch pipeline. |
| `@trust402/cli` | CLI for agent identity operations (`trust402` command). |
| `@trust402/demo` | End-to-end demo: resource server (x402 paid API) + agent CLI. |

## Quick Start (Demo)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in the **Required** section (`AGENT_PRIVATE_KEY`, `HOLDER_PUBLIC_KEY`). `LEMMA_API_KEY` and `RESOURCE_URL` are pre-filled with demo defaults.

> The agent wallet needs USDC on Base Sepolia with EIP-3009 delegation enabled.

See `.env.example` for the full list of optional variables and their defaults.

### 3. Start the resource server

```bash
pnpm demo:resource
```

This starts the x402-paid REST API on `localhost:3001`:

- `GET /ir/:reportId` — Financial data ($0.01 USDC)
- `POST /contract` — High-value contract data ($500 USDC)
- `GET /` — Health check

### 4. Run the demo agent

In a separate terminal:

```bash
pnpm demo:agent
```

The agent walks through 8 phases:

1. **Agent startup** — loads SKILL.md context
2. **Identity & budget** — generates ZK credential, displays budget table
3. **User query** — simulated financial data request
4. **AI reasoning** — decision process for accessing paid data
5. **First payment** ($0.01) — proof-gated x402 payment succeeds
6. **Attestation verification** — Lemma-verified data integrity check
7. **Budget enforcement** ($500) — proof fails, payment rejected (spend limit exceeded)
8. **Transaction summary** — on-chain proof events and cost breakdown

## Development

```bash
pnpm build          # Build all packages
pnpm test           # Run all tests
pnpm type-check     # TypeScript strict check
pnpm lint           # ESLint
pnpm lint:fix       # ESLint --fix
```

### Individual packages

```bash
pnpm --filter @trust402/roles build
pnpm --filter @trust402/protocol test
```

## Architecture

### Proof-Before-Payment Protocol

The fetch pipeline composes two middleware layers:

```
paymentFetch = wrapFetchWithPayment(proofFetch, x402Client)
                         │
              proofFetch = wrapFetchWithProof(fetch, artifact, gate, lemmaClient)
```

1. `wrapFetchWithProof` — generates a ZK role proof before each request
2. `wrapFetchWithPayment` — attaches x402 payment headers to the request

If the proof fails (e.g. spend limit exceeded), the request is rejected before payment is attempted.

### Circuits

| Circuit ID | Package | Purpose |
|---|---|---|
| `agent-identity-v1` | `@trust402/identity` | Proves credential validity (not expired, not revoked) |
| `role-spend-limit-v1` | `@trust402/roles` | Proves agent role + spend limit satisfy payment gate |

Both use Groth16 with BN254. Poseidon hash inside the circuit; SHA-256 with top-nibble masking outside.

## License

Apache-2.0
