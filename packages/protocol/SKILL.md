---
name: trust402-proof-gated-payment
description: Enforce proof-before-payment protocol for x402 buyer-side protection. Use when an AI agent needs to make an x402 payment — the agent must generate both an identity proof and a role proof before the payment fetch is allowed to proceed.
---

# Proof-Gated Payment Protocol

Every x402 payment this agent makes MUST be preceded by two ZK proofs. The `wrapFetchWithProof` function enforces this at the code level — if proof generation fails, the payment request is never sent.

## Two-Proof Flow

```
1. Commit credential → get CommitOutput
2. Generate identity proof (π₁) via agent-identity-v1
3. Build role witness from credential + gate + commitOutput
4. Generate role proof (π₂) via role-spend-limit-v1
5. Submit both proofs to the oracle (audit trail)
6. Call the underlying fetch (e.g., wrapFetchWithPayment)
```

No proof = no payment. This is enforced by code, not by server-side verification.

## Using wrapFetchWithProof

The primary API is `wrapFetchWithProof`, which wraps a `fetch` function to enforce the proof-before-payment protocol:

```typescript
import { wrapFetchWithProof, type PaymentGate } from "@trust402/protocol";
import { wrapFetchWithPayment } from "@x402/fetch";
import { connect } from "@trust402/identity";

const client = connect("https://api.lemmaoracle.com")("your-api-key");
const credential = loadCredential(); // your AgentCredential
const gate: PaymentGate = { role: "purchaser", maxSpend: 100000 };

// Compose: proof enforcement → x402 payment
const proofFetch = wrapFetchWithProof(fetch, credential, gate, client);
const paymentFetch = wrapFetchWithPayment(proofFetch, ...paymentConfig);

// Now use paymentFetch — proofs are generated automatically before each request
const response = await paymentFetch("https://api.example.com/resource");
```

### Composition order

`wrapFetchWithProof` wraps the innermost fetch. When composed with `wrapFetchWithPayment`, the proof step runs first, then the payment step:

```
paymentFetch(url)
  → wrapFetchWithPayment logic
    → proofFetch(url)       ← proof generation happens here
      → native fetch(url)   ← only called if proofs succeed
```

## Using proveAndSubmit

For programmatic use without making an HTTP request, use `proveAndSubmit`:

```typescript
import { proveAndSubmit, type PaymentGate } from "@trust402/protocol";

const gate: PaymentGate = { role: "purchaser", maxSpend: 100000 };
const result = await proveAndSubmit(client, credential, gate);

// result.commitOutput    — the credential commitment
// result.identityProof   — the identity proof (π₁)
// result.roleProof       — the role proof (π₂)
// result.identitySubmission — oracle submission result (or undefined if failed)
// result.roleSubmission     — oracle submission result (or undefined if failed)
```

Use this when you need to inspect proof results before deciding whether to proceed, or in CLI tools that don't make HTTP requests.

## Edge Cases

### Proof failure blocks payment
If either the identity proof or role proof fails to generate, `wrapFetchWithProof` returns `Promise.reject(new Error(...))`. The underlying fetch is never called. The agent must resolve the error before retrying.

### Oracle submission failure is non-fatal
If proof generation succeeds but oracle submission fails (network error, API down), `wrapFetchWithProof` still proceeds to call the underlying fetch. A warning is logged to the console. The proofs themselves are valid regardless of oracle recording — the submission is an audit trail, not a validity check.

### No custom HTTP headers
Buyer protection is enforced by blocking the fetch call on proof failure, not by attaching proof headers to the request. Seller-side proof verification (checking headers) is a separate concern and can be added as a future extension.

### Proof generation latency
Each proof takes 2–5 seconds via the Relay prover. Total latency for the two-proof flow is typically 4–10 seconds per request. This is acceptable for autonomous agent payments, which are not real-time.
