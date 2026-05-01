# @trust402/demo

CLI demo showcasing the Trust402 agent payment flow with Lemma attestation verification.

## Overview

This demo simulates an AI agent that:

1. Receives a user query for corporate IR financial data
2. Discovers a paid API endpoint behind an x402 paywall
3. Generates ZK proofs (identity + role) via the Trust402 protocol
4. Pays for access using proof-gated payment
5. Verifies the data's authenticity via the Lemma oracle attestation
6. Outputs a human-readable transaction summary

## Prerequisites

- **Node.js** >= 18
- **pnpm** >= 8
- **Rust** + **wasm-pack** (for the normalizer module)
- **Circom** >= 2.1.0 (for circuit compilation)
- **Foundry** (forge + cast, for verifier contract deployment)
- **Base Sepolia** wallet with USDC for payments

## Setup

```bash
# Install dependencies
pnpm install

# Build the circuit + WASM normalizer
pnpm demo:build

# Deploy the verifier contract to Base Sepolia
pnpm demo:deploy-verifier

# Register the schema and circuit with Lemma
pnpm demo:register

# Register financial data documents (produces registered-docs.json)
tsx scripts/register-with-full-content.ts
```

## Environment Variables

### Demo Agent (`packages/demo/agent/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `RESOURCE_URL` | Yes | — | Demo resource server URL |
| `LEMMA_API_KEY` | Yes | — | Lemma API key |
| `AGENT_PRIVATE_KEY` | Yes | — | Wallet private key for x402 payments |
| `ARTIFACT_PATH` | No | `./artifact.json` | Path to IdentityArtifact file |
| `MAX_SPEND` | No | `1000` | Spend limit in USD cents ($10.00) |
| `LEMMA_API_BASE` | No | `https://workers.lemma.workers.dev` | Lemma API base URL |

### Demo Resource (`packages/demo/resource/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `PAY_TO_ADDRESS` | Yes | — | Address to receive x402 payments |
| `FACILITATOR_URL` | Yes | — | x402 facilitator URL |
| `CDP_API_KEY_ID` | No | — | Coinbase Developer Platform API key ID |
| `CDP_API_KEY_SECRET` | No | — | Coinbase Developer Platform API key secret |
| `PORT` | No | `3001` | Server port |
| `VERIFIER_CONTRACT_ADDRESS` | No | — | Deployed verifier contract address |

## Running the Demo

### Step 1: Generate an IdentityArtifact

```bash
# Create a credential
trust402 create \
  --agent-id agent-demo \
  --subject-id subject-demo \
  --roles purchaser \
  --issuer-id did:example:issuer \
  > credential.json

# Prove the credential
trust402 prove \
  --credential credential.json \
  --api-key $LEMMA_API_KEY \
  > artifact.json
```

### Step 2: Start the resource server

```bash
pnpm demo:resource
```

### Step 3: Run the demo agent

```bash
pnpm demo:agent
```

## Package Structure

```
packages/demo/
├── package.json          # DX scripts (build, deploy-verifier, register)
├── scripts/
│   ├── build.sh          # Circuit + WASM build pipeline
│   ├── register.ts       # Schema + circuit registration with Lemma
│   └── register-with-full-content.ts  # Document registration
├── agent/                # Demo agent CLI
│   ├── src/
│   │   ├── cli.ts        # CLI entry point
│   │   ├── env.ts        # Environment variable validation
│   │   ├── skill-loader.ts  # SKILL.md loader
│   │   ├── reasoning.ts  # AI reasoning simulation
│   │   ├── artifact.ts   # IdentityArtifact handling
│   │   ├── payment.ts    # Proof-gated payment
│   │   ├── attestation.ts # Attestation verification
│   │   └── summary.ts    # Output formatting
│   └── package.json
├── resource/             # Demo resource server
│   ├── src/
│   │   ├── index.ts      # Hono app with x402 middleware
│   │   └── server.ts     # Node.js server entry
│   └── package.json
├── normalize/            # Rust→WASM normalizer
│   ├── src/lib.rs        # Financial data normalization
│   ├── Cargo.toml
│   └── build-wasm.sh
└── circuit/              # Circom circuit + Foundry
    ├── circuits/
    │   ├── financial-data.circom  # ZK circuit
    │   └── input/2026q1.json     # Test input
    ├── script/Deploy.s.sol        # Deployment script
    ├── src/FinancialDataVerifier.sol  # Generated verifier
    ├── foundry.toml
    └── package.json
```
