## Context

The `@trust402/roles` package provides a zero-knowledge proof system that gates autonomous agent payments by verifying role membership and spend limits. The package is part of the Trust402 monorepo and sits on top of the Lemma oracle stack. All cryptographic operations are delegated to `@lemmaoracle/sdk` — the package itself contains only the circuit definition, witness mapping logic, and SDK wrapper functions.

The existing codebase has Phase 1–6 tasks already implemented (all 26 tasks marked complete in the Spec-Kit `tasks.md`). This design document captures the architectural decisions that guided that implementation and documents the design for ongoing maintenance and future changes.

### Current State

- Circuit (`role-spend-limit.circom`) compiles and produces Groth16 proofs
- TypeScript wrappers (`witness`, `prove`, `submit`, `connect`) delegate to Lemma SDK
- Registration scripts upload artifacts to IPFS and register with the oracle
- SKILL.md defines the proof-before-payment enforcement protocol
- All tests pass with Vitest

## Goals / Non-Goals

**Goals:**

- Single Groth16 circuit proving role membership AND spend limit compliance in one proof
- Deterministic witness building — same credential + gate + timestamp always produces the same witness
- Thin SDK wrappers that add domain-specific value (witness mapping, credential validation) without reimplementing crypto
- Discoverable circuit via Lemma oracle registration
- Enforceable protocol via SKILL.md template

**Non-Goals:**

- Server-side proof verification (resource server responsibility)
- Credential issuance or lifecycle management (Lemma `agent` package)
- Runtime enforcement via MCP server or middleware
- Multi-proof aggregation or recursive proof composition
- Support for commitment schemes other than Poseidon4

## Decisions

### D1: Circuit commitment — Poseidon4 inside, SHA-256 outside

**Decision**: Use Poseidon4 inside the circuit for commitment binding; use SHA-256 with top-nibble masking outside the circuit for field-element derivation.

**Rationale**: Poseidon is the standard hash in Circom/Groth16 circuits due to its low constraint count (arithmetization-friendly). SHA-256 would require thousands of constraints inside the circuit. Outside the circuit, SHA-256 is simpler and more interoperable. The witness builder hashes role names and credential JSON with SHA-256 and masks the top nibble to produce BN254-safe field elements.

**Alternatives considered**:
- Pure Poseidon everywhere: Would require circomlibjs in the witness builder, adding a heavy dependency for no security gain
- Pure SHA-256 in circuit: Prohibitively expensive in constraints

### D2: Spend limit comparison — LessEqThan(128)

**Decision**: Use `LessEqThan(128)` for the spend comparison constraint.

**Rationale**: 64 bits supports up to ~1.8 × 10^19 (sufficient for USD cents), but 128 bits adds negligible constraint overhead and provides future-proofing for other denominations. Matches the pattern in upstream Lemma circuits.

**Alternatives considered**:
- LessEqThan(64): Sufficient but unnecessarily restrictive
- LessEqThan(240): Overkill for USD-cent comparisons

### D3: Embedded circuit — not a separate workspace package

**Decision**: Embed the circuit as `packages/roles/circuits/` without its own `package.json`.

**Rationale**: The pnpm workspace config (`packages/*`) only matches direct children. Making `circuits/` a separate workspace package would require changing the workspace config. Embedding keeps the circuit close to its TypeScript consumers.

**Alternatives considered**:
- Separate workspace package (`packages/roles-circuits`): No meaningful public API beyond the Circom source
- `packages/**` workspace pattern: Overly broad

### D4: SDK delegation — no local crypto

**Decision**: All proof generation, verification, and submission delegate to `@lemmaoracle/sdk`.

**Rationale**: The SDK handles the full proof lifecycle (artifact resolution, Groth16 fullProve, on-chain submission). Reimplementing locally would duplicate effort and risk inconsistency with the oracle's expected formats.

### D5: Enforcement — SKILL.md (not MCP server)

**Decision**: Use a Cursor skill template (SKILL.md) for enforcement.

**Rationale**: A skill template defines a mandatory protocol that an AI agent follows step-by-step. An MCP server would add significant complexity for a problem that is fundamentally about "agent reads instructions and follows them." The skill approach makes proof generation the only documented path to payment.

**Alternatives considered**:
- MCP server: Runtime enforcement but heavy infrastructure for an MVP
- x402 middleware: Complementary but out of scope — the resource server handles verification independently

### D6: Package structure — single-package monorepo

**Decision**: All functionality lives in `packages/roles/` — circuit, TypeScript wrappers, registration scripts, presets, and SKILL.md.

**Rationale**: The circuit has no independent publish target. Its artifacts feed directly into the TypeScript wrappers and registration scripts. A single package keeps everything cohesive.

### D7: FP style — Ramda-based expression-oriented TypeScript

**Decision**: All TypeScript code uses `eslint-plugin-functional` strict preset. Branching via `R.cond`/`R.ifElse`/ternaries, no `if`/`switch`/`let`/`var`/`class`/`for`/`while`/`throw`.

**Rationale**: Consistency with the broader Lemma monorepo's functional programming style. Test files are exempt to allow imperative test scaffolding.

### D8: No schema registration — circuit artifacts are not normalize artifacts

**Decision**: The package does NOT register a schema with the Lemma oracle. Only `circuits.register` is used. The `register-schema.ts` script is removed.

**Rationale**: The Lemma SDK distinguishes two artifact types:
- **Schema normalize WASM** (`schemas.register`): A wasm-bindgen module exporting a `normalize(rawJson) → normJson` function. Used by `schema.define()` to transform raw JSON into normalized form. This is a completely different WASM from the circuit.
- **Circuit WASM** (`circuits.register`): A circom-compiled WASM used by `prover.prove()` via `snarkjs.groth16.fullProve(witness, wasmBuf, zkeyBuf)`. This WASM has no `normalize` export.

The initial implementation incorrectly uploaded the circom-compiled circuit WASM as a schema normalize artifact. This would cause `define()` to fail at runtime because the circom WASM does not export a `normalize` function. The `role-spend-limit-v1` circuit references the `agent-identity-authority-v1` schema's normalized fields (via FR-017) but does not need to register its own schema — that schema is expected to be registered separately by the credential issuer.

**Alternatives considered**:
- Build a dedicated normalize WASM for the schema: Adds complexity without clear value. The `agent-identity-authority-v1` schema already exists and is registered by the Lemma agent package. A new schema ID `role-spend-limit-v1` would be redundant.
- Register the circuit WASM as both schema and circuit artifacts: Incorrect. The two WASM formats are fundamentally incompatible.

## Risks / Trade-offs

- **[SDK version coupling]** → The package is tightly coupled to `@lemmaoracle/sdk` 0.0.22+. API changes in the SDK may require updates. Mitigation: Pin SDK version in `package.json` and validate on upgrade.
- **[Circuit artifact size]** → WASM + zkey files are large (tens of MB). IPFS upload via Pinata is the distribution mechanism. Mitigation: Artifacts are fetched on-demand by the SDK during proof generation.
- **[Proof generation latency]** → Groth16 proof generation takes 2–5 seconds depending on hardware. Mitigation: This is acceptable for the use case (pre-payment verification, not real-time).
- **[SDK development export condition]** → The SDK's `development` export condition causes Vite resolution issues. Mitigation: Alias the SDK's dist entry in `vitest.config.ts`.
- **[No runtime enforcement]** → The SKILL.md protocol is advisory; a misconfigured agent could skip proof generation. Mitigation: The resource server independently verifies proofs, so payment without a valid proof is rejected server-side.
