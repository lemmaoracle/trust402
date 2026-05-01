---
name: trust402-proof-gated-payment
description: Enforce proof-before-payment protocol for x402 buyer-side protection. Use when an AI agent needs to make an x402 payment — the agent must present a cached identity artifact and generate a role proof before the payment fetch is allowed to proceed.
---

# Proof-Gated Payment Protocol

Every x402 payment this agent makes MUST be preceded by a role proof, backed by a pre-generated identity artifact. The `wrapFetchWithProof` function enforces this at the code level — if proof generation fails, the payment request is never sent.

## Two-Phase Flow

### Phase 1: Establish identity (one-time, via CLI)

```bash
# Create a credential
trust402 create \
  --agent-id agent-0xabc123 \
  --subject-id "did:lemma:agent:0xabc123" \
  --roles purchaser \
  --issuer-id "did:lemma:org:trust-anchor" \
  --spend-limit 100000 \
  --currency USD \
  > credential.json

# Generate the identity artifact (commit → prove → submit)
trust402 prove \
  --credential credential.json \
  --api-key YOUR_API_KEY \
  > artifact.json
```

The `artifact.json` contains `{ commit, proof }` — this is your `IdentityArtifact`.

### Phase 2: Role-gated payments (per request, in code)

```
1. Load IdentityArtifact from artifact.json (generated once in Phase 1)
2. Build role witness from gate + artifact.commitOutput
3. Generate role proof (π₂) via role-spend-limit-v1
4. Submit both proofs to the oracle (audit trail)
5. Call the underlying fetch (e.g., wrapFetchWithPayment)
```

No role proof = no payment. This is enforced by code, not by server-side verification.

## Using wrapFetchWithProof

The primary API is `wrapFetchWithProof`, which wraps a `fetch` function to enforce the proof-before-payment protocol:

```typescript
import { wrapFetchWithProof, type IdentityArtifact, type PaymentGate } from "@trust402/protocol";
import { wrapFetchWithPayment } from "@x402/fetch";
import { create } from "@lemmaoracle/sdk";

const client = create({ apiKey: "your-api-key" });
const artifact: IdentityArtifact = loadArtifact(); // from trust402 prove output
const gate: PaymentGate = { role: "purchaser", maxSpend: 100000 };

// Compose: proof enforcement → x402 payment
const proofFetch = wrapFetchWithProof(fetch, artifact, gate, client);
const paymentFetch = wrapFetchWithPayment(proofFetch, ...paymentConfig);

// Now use paymentFetch — role proof is generated automatically before each request
const response = await paymentFetch("https://api.example.com/resource");
```

### What if I don't have an IdentityArtifact?

You MUST generate one before using `wrapFetchWithProof`. Use the CLI:

```bash
trust402 prove --credential credential.json --api-key YOUR_API_KEY > artifact.json
```

Then load the output in your application:

```typescript
import fs from "node:fs/promises";

const loadArtifact = async (): Promise<IdentityArtifact> => {
  const raw = JSON.parse(await fs.readFile("artifact.json", "utf8"));
  return {
    commitOutput: raw.commit,
    identityProof: raw.proof,
  };
};
```

The CLI `trust402 prove` output has `{ commit: CommitOutput, proof: ProveOutput }`. Map `commit` → `commitOutput` and `proof` → `identityProof` to construct the `IdentityArtifact`.

### Composition order

`wrapFetchWithProof` wraps the innermost fetch. When composed with `wrapFetchWithPayment`, the proof step runs first, then the payment step:

```
paymentFetch(url)
  → wrapFetchWithPayment logic
    → proofFetch(url)       ← role proof generation happens here
      → native fetch(url)   ← only called if proof succeeds
```

## Using proveRoleFromArtifact

For programmatic use without making an HTTP request, use `proveRoleFromArtifact`:

```typescript
import { proveRoleFromArtifact, type IdentityArtifact, type PaymentGate } from "@trust402/protocol";

const gate: PaymentGate = { role: "purchaser", maxSpend: 100000 };
const result = await proveRoleFromArtifact(client, artifact, gate);

// result.identityProof   — the identity proof (π₁, from artifact)
// result.roleProof       — the role proof (π₂, freshly generated)
// result.identitySubmission — oracle submission result (or undefined if failed)
// result.roleSubmission     — oracle submission result (or undefined if failed)
```

Use this when you need to inspect proof results before deciding whether to proceed, or in CLI tools that don't make HTTP requests.

## Edge Cases

### Proof failure blocks payment
If the role proof fails to generate, `wrapFetchWithProof` returns `Promise.reject(new Error(...))`. The underlying fetch is never called. The agent must resolve the error before retrying.

### Oracle submission failure is non-fatal
If proof generation succeeds but oracle submission fails (network error, API down), `wrapFetchWithProof` still proceeds to call the underlying fetch. A warning is logged to the console. The proofs themselves are valid regardless of oracle recording — the submission is an audit trail, not a validity check.

### No custom HTTP headers
Buyer protection is enforced by blocking the fetch call on proof failure, not by attaching proof headers to the request. Seller-side proof verification (checking headers) is a separate concern and can be added as a future extension.

### Proof generation latency
Each role proof takes 2–5 seconds via the Relay prover. Since identity proof generation is cached in the artifact, the per-request latency is typically 2–5 seconds (one proof instead of two). This is acceptable for autonomous agent payments, which are not real-time.