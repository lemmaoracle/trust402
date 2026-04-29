---
name: trust402-prove-role
description: Enforce ZK role-proof before x402 autonomous payments. Use when an AI agent needs to make an x402 payment — the agent must generate a role-spend-limit proof first, then attach it to the payment request header.
---

# Prove Role Before Payment

Every x402 payment this agent makes MUST be preceded by a role-spend-limit ZK proof.
No proof = no payment. This is non-negotiable.

## Payment Protocol

```
Progress:
- [ ] Load credential
- [ ] Build witness
- [ ] Generate proof
- [ ] Attach proof to x402 header
- [ ] Send payment
```

## Step 1: Load credential

Read the agent's credential from the configured source (env var, file, or Lemma SDK).
The credential must conform to `AgentCredential` from `@trust402/roles`.

Required fields the credential MUST contain:
- `authority.roles` — at least one role matching the payment gate
- `financial.spendLimit` — a number within the gate ceiling
- `lifecycle.revoked` — must be `false` or absent

If any field is missing or the credential is revoked, **stop**. Do not proceed to payment.

## Step 2: Build witness

```typescript
import { witness, type AgentCredential, type PaymentGate } from "@trust402/roles";

const gate: PaymentGate = { role: "purchaser", maxSpend: 10000 }; // USD cents
const w = witness(credential, gate);
```

## Step 3: Generate proof

```typescript
import { connect, prove } from "@trust402/roles";

const client = connect(LEMMA_API_BASE, LEMMA_API_KEY);
const proofResult = await prove(client, w);
```

If proof generation fails, **stop**. Do not proceed to payment.

## Step 4: Attach proof to x402 header

Add the proof to the x402 payment request as an HTTP header:

```
X-Lemma-Proof: <proofResult.proof>
X-Lemma-Proof-Inputs: <proofResult.inputs.join(",")>
X-Lemma-Circuit-Id: role-spend-limit-v1
```

## Step 5: Send payment

Only after steps 1-4 complete successfully, send the x402 payment request
with the proof headers attached.

## What the server checks

The receiving x402 resource server verifies:
1. Proof headers are present
2. The proof is a valid Groth16 proof for circuit `role-spend-limit-v1`
3. Public inputs match the gate's `requiredRoleHash` and `maxSpend`

If any check fails, the server returns 402 and the payment is rejected.

## Edge Cases

### Spend limit equals gate ceiling (valid)
When the agent's `spendLimit` exactly equals the gate's `maxSpend`, the circuit accepts this as valid. The `LessEqThan(128)` constraint enforces `spendLimit <= maxSpend` (less-than-or-equal, not strictly less-than).

### Agent holds multiple roles
The witness builder hashes **only the specific role required by the gate**, not all roles in the credential. When building a witness for gate `{ role: "purchaser", maxSpend: 10000 }`, the builder hashes `"purchaser"` regardless of what other roles the agent holds.

### Gate ceiling is zero
A gate with `maxSpend: 0` only allows agents with `spendLimit: 0` to prove authority. This effectively creates a read-only role — the agent can prove it holds the role but cannot spend any money.

### Spend limit field is absent
If the credential's `financial.spendLimit` is missing, the witness builder defaults it to `0`. The agent can only pass gates with `maxSpend: 0`.

### Proof generation fails mid-flow
If proof generation fails at any step (witness build error, SDK failure, network error), the protocol **halts immediately**. No payment request is sent. The agent must resolve the error before retrying.
