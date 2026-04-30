## 1. Setup

- [x] 1.1 Initialize `@trust402/roles` package with `package.json` dependencies (`@lemmaoracle/sdk` ^0.0.22, `@lemmaoracle/spec` ^0.0.22, `ramda`, dev deps: `vitest` ^3.0.0, `typescript` ^5.8.0, `tsx` ^4.19.0, `dotenv` ^16.4.7, `@types/node` ^22.0.0) in `packages/roles/package.json`
- [x] 1.2 [P] Configure TypeScript strict mode with ES2022 target, ESNext modules, bundler moduleResolution in `packages/roles/tsconfig.json`
- [x] 1.3 [P] Configure Vitest with SDK alias workaround (`@lemmaoracle/sdk` → `dist/index.js`) and co-located test include pattern in `packages/roles/vitest.config.ts`
- [x] 1.4 [P] Create circuit build script (`circom` compile → `snarkjs` powers of tau → phase 2 setup → zkey contribute → export vkey) in `packages/roles/circuits/scripts/build.sh`
- [x] 1.5 [P] Create preset manifest for circuit metadata in `packages/roles/presets/circuits/role-spend-limit-v1.json`

## 2. Foundational — Circuit and Types

- [x] 2.1 Implement the `role-spend-limit` Circom circuit with three constraints (role equality, LessEqThan(128) spend comparison, Poseidon4 binding), 4 private signals and 3 public signals in `packages/roles/circuits/src/role-spend-limit.circom`
- [x] 2.2 Define exported TypeScript types (`AgentCredential`, `PaymentGate`, `CircuitWitness`) with `Readonly<>` / `ReadonlyArray<>` wrapping in `packages/roles/src/index.ts`
- [x] 2.3 Implement `fieldHash` helper (SHA-256 → top nibble mask → BN254 field element string) in `packages/roles/src/index.ts`

## 3. User Story 1 — Prove Role Authority Before Payment [US1]

- [x] 3.1 [P] Write witness builder tests — maps credential + gate into circuit input shape, identical roleHash for same gate role, different roleHash for different gates, defaults spendLimit to 0 when absent, produces non-empty salt — in `packages/roles/src/index.test.ts`
- [x] 3.2 [P] Write circuit-related tests — field hash determinism, BN254 field bounds, build artifact existence, field hash for role names — in `packages/roles/src/role-spend-limit.test.ts`
- [x] 3.3 Implement `witness(cred, gate)` function that maps `AgentCredential` + `PaymentGate` into `CircuitWitness` using `fieldHash` for commitment/roleHash/salt derivation, `spendLimitField` for defaulting, and `Date.now()` for `nowSec` in `packages/roles/src/index.ts`
- [x] 3.4 Implement `prove(client, w)` function that delegates to `prover.prove(client, { circuitId: "role-spend-limit-v1", witness: w })` in `packages/roles/src/index.ts`
- [x] 3.5 Implement `submit(client, docHash, proofResult)` function that delegates to `proofs.submit(client, { docHash, circuitId: "role-spend-limit-v1", proof, inputs })` in `packages/roles/src/index.ts`
- [x] 3.6 Implement `connect(apiBase)` curried factory that returns `(apiKey) => create({ apiBase, apiKey })` in `packages/roles/src/index.ts`
- [x] 3.7 Verify all FP style rules pass — no if/switch/let/var/class/for/while/throw in `packages/roles/src/index.ts`, only const, ternary, Promise.reject

## 4. User Story 2 — Register Circuit with Oracle [US2]

~- [x] 4.1 [P] Implement `register-schema.ts` script — Pinata upload for wasm artifact, build `SchemaMeta` with ABI from `agent-identity-authority-v1` normalized fields, call `schemas.register(client, meta)` — in `packages/roles/scripts/register-schema.ts`~ **REMOVED**: Schema registration was incorrect — the Lemma `schemas.register` API requires a dedicated normalize WASM (wasm-bindgen format exporting a `normalize` function), not the circom-compiled circuit WASM. Circuit WASM artifacts are only used by `circuits.register`. The `register-schema.ts` script has been deleted.
- [x] 4.2 [P] Implement `register-circuit.ts` script — Pinata upload for wasm + zkey, build `CircuitMeta` with verifier config and artifact location, call `circuits.register(client, meta)` — in `packages/roles/scripts/register-circuit.ts`
- [x] 4.3 Add `register` npm script entry (`tsx scripts/register-circuit.ts`) to `packages/roles/package.json`
- [x] 4.4 ~~Fix Pinata upload in `register-schema.ts` — ensure js path points to the generated JS wrapper from circom compilation, not the `.wasm` file~~ **OBSOLETED**: `register-schema.ts` has been deleted (see 4.1)

## 5. User Story 3 — Enforce Proof-Before-Payment Protocol [US3]

- [x] 5.1 Create SKILL.md enforcement template — 5-step proof-before-payment protocol (load credential → build witness → generate proof → attach headers → send payment), revocation/missing-field halt rules, x402 header format (`X-Lemma-Proof`, `X-Lemma-Proof-Inputs`, `X-Lemma-Circuit-Id`) — in `packages/roles/SKILL.md`
- [x] 5.2 Add edge case documentation to SKILL.md — spend limit equals ceiling (valid), multiple roles (hash only gate role), zero ceiling (read-only), absent spendLimit (default to 0), proof failure mid-flow (halt)

## 6. Polish and Cross-Cutting Concerns

- [x] 6.1 [P] Write package README with circuit signal table, usage examples (witness → prove → submit), build instructions, and requirements in `packages/roles/README.md`
- [x] 6.2 [P] Add `.env.example` with required environment variables (`LEMMA_API_KEY`, `PINATA_API_KEY`, `PINATA_SECRET_API_KEY`, `VERIFIER_ADDRESS`, `CHAIN_ID`) in `packages/roles/`
- [x] 6.3 Verify TypeScript build succeeds (`tsc --build`) with no type errors in `packages/roles/`
- [x] 6.4 Verify Vitest suite passes (`vitest run`) — all witness tests, circuit tests, and field hash tests in `packages/roles/`
- [x] 6.5 Run quickstart validation — build circuit, build TS package, run tests, verify witness output matches expected values
