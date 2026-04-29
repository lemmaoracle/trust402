# Quickstart: ZK Role-Gated Autonomous Payments

Get from zero to a generated ZK role-spend-limit proof in under 5 minutes.

## Prerequisites

- Node.js 20+
- pnpm 9+
- `circom` 2.1.x installed (for circuit compilation)
- Lemma API key (for proof generation and oracle submission)
- Pinata API keys (for circuit registration only)

## Install

```bash
# From the trust402 monorepo root
pnpm install
```

## 1. Build the Circuit

```bash
cd packages/roles/circuits
bash scripts/build.sh
```

This compiles the Circom source, generates the Powers of Tau, performs phase 2 setup, and exports the verification key. Output goes to `circuits/build/`.

## 2. Build the TypeScript Package

```bash
cd packages/roles
pnpm build
```

## 3. Run Tests

```bash
cd packages/roles
pnpm test
```

Tests verify:
- Witness builder maps credential + gate into correct circuit input shape
- `roleHash` and `requiredRoleHash` are identical for the same role name
- `spendLimit` defaults to 0 when absent
- Field hashes stay within BN254 field bounds
- Circuit source file exists and build artifacts are present

## 4. Generate a Proof

```typescript
import { connect, witness, prove, submit } from "@trust402/roles";
import type { AgentCredential, PaymentGate } from "@trust402/roles";

// Your agent credential (conforms to agent-identity-authority-v1)
const credential: AgentCredential = {
  schema: "agent-identity-authority-v1",
  identity: {
    agentId: "agent-0xabc123",
    subjectId: "did:lemma:agent:0xabc123",
    controllerId: "did:lemma:org:acme",
    orgId: "acme",
  },
  authority: {
    roles: ["purchaser", "viewer"],
    scopes: ["procurement", "reporting"],
    permissions: [{ resource: "payments", action: "create" }],
  },
  financial: {
    spendLimit: 50000,  // $500 USD
    currency: "USD",
    paymentPolicy: "auto-approve-below-limit",
  },
  lifecycle: {
    issuedAt: 1745900000,
    expiresAt: 1777436000,
    revoked: false,
  },
  provenance: {
    issuerId: "did:lemma:org:trust-anchor",
  },
};

// The payment gate requiring role "purchaser" with ceiling $1000
const gate: PaymentGate = { role: "purchaser", maxSpend: 100000 };

// Connect to Lemma
const client = connect("https://workers.lemma.workers.dev")(apiKeY);

// Build witness
const w = witness(credential, gate);

// Generate proof (delegates to Lemma SDK prover)
const proofResult = await prove(client, w);

// Submit to Lemma oracle for on-chain recording
await submit(client, docHash, proofResult);
```

## 5. Attach Proof to x402 Payment

When following the `SKILL.md` enforcement protocol, attach proof headers to the x402 payment request:

```typescript
const headers = {
  "X-Lemma-Proof": proofResult.proof,
  "X-Lemma-Proof-Inputs": proofResult.inputs.join(","),
  "X-Lemma-Circuit-Id": "role-spend-limit-v1",
};
```

The receiving resource server verifies the proof against the registered verification key before allowing settlement.

## 6. Register with Lemma (Production)

```bash
# Set environment variables
export LEMMA_API_KEY=your-key
export PINATA_API_KEY=your-pinata-key
export PINATA_SECRET_API_KEY=your-pinata-secret

# Register schema
pnpm tsx scripts/register-schema.ts

# Register circuit
pnpm tsx scripts/register-circuit.ts
```

This uploads artifacts to IPFS and registers the circuit/schema metadata with the Lemma oracle, making them discoverable by any participant.

## What Happens When Things Fail

| Scenario | Result |
|---|---|
| Agent has wrong role | Circuit constraint fails — `roleHash !== requiredRoleHash` — no valid proof possible |
| Agent spend limit exceeds ceiling | Circuit constraint fails — `LessEqThan(128)` returns 0 — no valid proof possible |
| Credential is revoked | SKILL.md protocol halts at Step 1 before proof generation |
| Spend limit is absent | Defaults to 0 — only gates with `maxSpend: 0` pass |
| Gate ceiling is 0 | Only agents with `spendLimit: 0` can prove authority (effectively read-only) |
