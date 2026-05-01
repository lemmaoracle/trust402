## Why

The Trust402 monorepo currently provides `@trust402/identity` (agent-identity-v1 commit/prove/submit) and `@trust402/roles` (role-spend-limit-v2 witness/prove/submit), but there is no integration that enforces the proof-before-payment protocol for AI agents. An agent that wants to make a role-gated payment must manually orchestrate: credential commit → identity proof → role witness → role proof → oracle submit → x402 fetch. This orchestration is error-prone — an agent could skip proof generation and directly make an unauthorized payment. A dedicated protocol package is needed to enforce this flow at the code level, protecting the buyer (user) from unauthorized spending by their AI agent.

## What Changes

- Add a new `@trust402/protocol` package that enforces the role-gated payment protocol on the buyer side
- Implement `wrapFetchWithProof` — a fetch wrapper that generates identity + role proofs, submits them to the oracle for audit, and only calls the underlying fetch if both proofs succeed (blocking unauthorized payments)
- Implement `proveAndSubmit` — a pure function that generates both proofs and submits them to the oracle, returning the proof results without making an HTTP request (for programmatic use)
- Re-export `PaymentGate` from `@trust402/roles` for convenience
- Add a SKILL.md describing the proof-before-payment protocol

## Capabilities

### New Capabilities
- `proof-gated-payment`: Buyer-side enforcement of the proof-before-payment protocol — automatically generates identity and role proofs, submits to oracle, and blocks fetch on proof failure

### Modified Capabilities

## Impact

- **New package**: `@trust402/protocol` with dependencies on `@trust402/identity`, `@trust402/roles`, `@lemmaoracle/sdk`
- **No breaking changes** to existing packages (`@trust402/identity`, `@trust402/roles`, `@trust402/cli`)
- **No custom HTTP headers** — buyer protection is enforced by blocking the fetch call on proof failure, not by attaching proof headers
- **No seller-side changes** — seller-side proof verification middleware is out of scope for MVP
- **Demo impact**: `example-x402/packages/agent` can replace its manual fetch setup with `wrapFetchWithProof`
