# Research: ZK Role-Gated Autonomous Payments

## Decision 1: Circuit commitment scheme — Poseidon vs. SHA-256

**Decision**: Use Poseidon4 inside the circuit for commitment binding; use SHA-256 outside the circuit for field-element derivation (roleHash, credentialCommitment).

**Rationale**: Poseidon is the standard hash in Circom/Groth16 circuits due to its low constraint count (arithmetization-friendly). SHA-256 would require thousands of constraints. Outside the circuit, SHA-256 is simpler and more interoperable — the witness builder hashes role names and credential JSON with SHA-256 and masks the top nibble to produce BN254-safe field elements. This matches the pattern established in `example-origin/packages/circuits/src/hash.ts`.

**Alternatives considered**:
- Pure Poseidon everywhere: Would require circomlibjs in the witness builder, adding a heavy dependency for no security gain (the witness builder's hash is not constrained by the circuit)
- Pure SHA-256 in circuit: Prohibitively expensive in constraints

## Decision 2: Spend limit comparison bit width — 64 vs 128

**Decision**: LessEqThan(128)

**Rationale**: 64 bits supports up to ~1.8 x 10^19, which is sufficient for USD cents (max ~10^15 for global M2 money supply). However, 128 bits adds negligible constraint overhead (the LessEqThan component scales linearly with bit width) and provides future-proofing for other denominations or higher-precision requirements. This matches the established pattern in `example-origin` circuits which use 128-bit and 240-bit comparators.

**Alternatives considered**:
- LessEqThan(64): Sufficient for USD cents but unnecessarily restrictive
- LessEqThan(240): Overkill — would match the `bridge-approval-origin` pattern but we don't need 256-bit hash comparisons

## Decision 3: Package structure — embedded circuit vs. separate workspace package

**Decision**: Embed the circuit as `packages/roles/circuits/` (no separate package.json)

**Rationale**: The pnpm workspace config (`packages/*`) only matches direct children of `packages/`, not nested directories. Making `circuits/` a separate workspace package would require changing the workspace config to `packages/**` or flattening the structure. Embedding keeps the circuit close to its TypeScript consumers and avoids workspace nesting issues. The `circuits/` directory contains only the Circom source and build script — no independent npm publish target.

**Alternatives considered**:
- Separate workspace package (`packages/roles-circuits`): Adds a workspace entry but creates a package with no meaningful public API beyond the Circom source file
- `packages/**` workspace pattern: Overly broad — would pick up unrelated subdirectories

## Decision 4: SDK version compatibility

**Decision**: Target `@lemmaoracle/sdk` 0.0.22+ and `@lemmaoracle/spec` 0.0.22+

**Rationale**: These are the latest published versions. The SDK provides `prover.prove` with Groth16 fullProve (fetches wasm/zkey from IPFS), `proofs.submit` for oracle submission, and `schemas.register` / `circuits.register` for registration. The SDK's `development` export condition in its package.json causes Vite resolution issues; the workaround is to alias the SDK's dist entry in vitest.config.ts.

**Alternatives considered**:
- Using the SDK from the lemma monorepo (workspace:*): Not possible for trust402 which is a separate repo per ETHGlobal rules
- Forking the SDK: Unnecessary — the published npm package has all needed functionality

## Decision 5: Enforcement mechanism — SKILL.md vs. MCP server

**Decision**: SKILL.md (Cursor skill template)

**Rationale**: A skill template is the lightest enforcement mechanism — it defines a mandatory protocol that an AI agent follows step-by-step. Building an MCP server would add significant complexity (server process, tool definitions, transport layer) for a problem that is fundamentally about "agent reads instructions and follows them." The skill approach makes proof generation the *only documented path* to payment without requiring runtime enforcement infrastructure.

**Alternatives considered**:
- MCP server: Runtime enforcement but heavy infrastructure for a hackathon MVP
- x402 middleware (server-side gate): Complementary but out of scope for this package — the resource server would implement verification independently
- System prompt only: Too weak — easily overridden or ignored by the agent

## Decision 6: Field element derivation for roleHash

**Decision**: SHA-256 with top-nibble masking (`digest[0] = digest[0] & 0x0f`)

**Rationale**: This is the same `fieldHashOfString` function used in `example-origin/packages/circuits/src/hash.ts`. It produces a deterministic BN254 field element from any string input. The top-nibble mask ensures the result is always less than the BN254 prime. Since the same function hashes both the private `roleHash` and the public `requiredRoleHash` for the same role name, the circuit's equality constraint always passes when the role matches.

**Alternatives considered**:
- Poseidon hash of the role name: Would require circomlibjs in the witness builder (heavy dependency) for no circuit-level benefit
- keccak256: Not arithmetization-friendly, and we don't need Ethereum compatibility for role names
