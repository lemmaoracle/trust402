## Context

The Trust402 monorepo provides two core proof packages: `@trust402/identity` (agent-identity-v1 commit/prove/submit) and `@trust402/roles` (role-spend-limit-v2 witness/prove/submit). An AI agent acting as a buyer must currently orchestrate the proof-before-payment flow manually: load credential → commit → generate identity proof → build role witness → generate role proof → submit to oracle → send x402 payment request. This orchestration is error-prone and has no code-level enforcement — an agent could skip proof generation and directly make an unauthorized payment.

The core insight is that **buyer protection does not require custom HTTP headers or seller-side verification**. If `wrapFetchWithProof` blocks the fetch call on proof failure, the payment never happens. The proof submission to the oracle serves as an audit trail. Seller-side verification (rejecting requests without proof) is a separate concern that can be added later.

## Goals / Non-Goals

**Goals:**

- Provide a `wrapFetchWithProof` fetch wrapper that enforces the two-proof flow (identity π₁ + role π₂) before allowing any x402 payment request
- Provide a `proveAndSubmit` pure function for programmatic use without fetch
- Keep `@trust402/identity` and `@trust402/roles` as pure proof-generation libraries without x402 or HTTP dependencies
- Enable the demo agent to use `wrapFetchWithProof` composed with `wrapFetchWithPayment`

**Non-Goals:**

- Custom HTTP proof headers (not needed for buyer protection — the fetch is blocked on proof failure)
- Seller-side proof verification middleware (separate concern, out of scope for MVP)
- Relay `/prover/verify` endpoint (only needed for seller-side verification)
- Replacing or modifying `@lemmaoracle/x402` — it continues to handle seller-side settlement proofs independently
- Credential issuance, lifecycle management, or revocation checking (handled by `@lemmaoracle/agent`)
- On-chain proof verification (deferred to future)

## Decisions

### D1: Buyer protection via fetch blocking, not HTTP headers

**Decision**: `wrapFetchWithProof` blocks the fetch call on proof failure. No custom HTTP headers are attached to the request.

**Rationale**: The purpose of the proof-before-payment protocol is to protect the buyer (user) from unauthorized spending by their AI agent. If the agent cannot generate a valid proof, the payment request is never sent. This is enforced at the code level without requiring any cooperation from the seller. Custom headers and seller-side verification are a separate concern (seller access control) that can be added as a future extension.

**Alternatives considered**:
- Custom `X-Lemma-*` proof headers: Adds complexity without buyer-protection benefit. Headers are only useful if the seller verifies them, which is a seller-side concern. For MVP, blocking the fetch is sufficient.
- Proof in `PAYMENT-SIGNATURE` extensions: Tight coupling with x402 internals. `wrapFetchWithPayment` constructs `PAYMENT-SIGNATURE` internally with no extension hook. Proof generation also has different timing (before 402, not after).

### D2: Two-proof flow with oracle submission as audit trail

**Decision**: The buyer generates two proofs (identity π₁ + role π₂), submits both to the oracle via `proofs.submit`, and only proceeds to fetch if both succeed.

**Rationale**: Oracle submission creates an immutable audit trail: "this agent proved role X with spend limit Y at time Z". Even without seller-side verification, the oracle records prove that the protocol was followed. This is valuable for compliance and dispute resolution.

**Alternatives considered**:
- Skip oracle submission, just generate proofs: Loses audit trail. The proofs exist only in memory and vanish after the request.
- Submit only role proof: Loses the credentialCommitment correlation — the identity proof anchors the role proof to a specific credential.

### D3: Single protocol package

**Decision**: `@trust402/protocol` owns the buyer-side enforcement logic.

**Rationale**: The package name "protocol" reflects that it defines the interaction rules for the role-gated payment protocol. Currently only buyer-side, but extensible to seller-side in the future.

**Alternatives considered**:
- `@trust402/buyer`: Misleading name if seller-side is added later.
- `@trust402/http`: Suggests generic HTTP utilities rather than a specific payment protocol.
- Add to `@trust402/roles`: Would pollute the pure proof-generation library with x402/fetch concerns.

### D4: proveAndSubmit as a separate export

**Decision**: Export `proveAndSubmit(client, credential, gate)` as a pure function separate from `wrapFetchWithProof`.

**Rationale**: Some callers want proof results without immediately making an HTTP request (e.g., CLI tools, testing, or agents that need to inspect proof outputs before deciding to proceed). `wrapFetchWithProof` uses `proveAndSubmit` internally.

**Alternatives considered**:
- Only provide `wrapFetchWithProof`: Forces all callers through the fetch path, even when they don't need HTTP.

### D5: FP style compliance

**Decision**: All TypeScript code in `@trust402/protocol` follows the same eslint-plugin-functional strict preset as other trust402 packages.

**Rationale**: Consistency with the rest of the monorepo.

## Risks / Trade-offs

- **[Proof generation latency]** → `wrapFetchWithProof` generates two proofs sequentially (identity + role), each requiring 2–5 seconds via the Relay. Total latency could be 4–10 seconds per payment request. Mitigation: Acceptable for MVP (autonomous agent payments are not real-time). Future: cache identity proofs, parallel proof generation, or local proof generation.

- **[No seller enforcement]** → A malicious agent could bypass `wrapFetchWithProof` and call `wrapFetchWithPayment` directly. Mitigation: The protocol is enforced at the SKILL level and code architecture level — the agent's code path goes through `wrapFetchWithProof`. For stronger enforcement, seller-side verification can be added as a future extension.

- **[Oracle submission failure is non-fatal]** → If oracle submission fails after proof generation, the fetch still proceeds. The proofs are valid even if not recorded on-chain. Mitigation: Log warnings on submission failure; the proofs themselves are the primary enforcement mechanism.
