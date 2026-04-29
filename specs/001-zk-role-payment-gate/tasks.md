# Tasks: ZK Role-Gated Autonomous Payments

**Input**: Design documents from `/specs/001-zk-role-payment-gate/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Co-located test files are part of the existing codebase and will be updated alongside implementation tasks.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Monorepo package**: `packages/roles/` is the primary package
- Circuit source: `packages/roles/circuits/src/`
- Circuit build: `packages/roles/circuits/build/`
- TypeScript source: `packages/roles/src/`
- Scripts: `packages/roles/scripts/`
- Presets: `packages/roles/presets/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and package configuration

- [ ] T001 Initialize `@trust402/roles` package with `package.json` dependencies (`@lemmaoracle/sdk` ^0.0.22, `@lemmaoracle/spec` ^0.0.22, `ramda`, dev deps: `vitest` ^3.0.0, `typescript` ^5.8.0, `tsx` ^4.19.0, `dotenv` ^16.4.7, `@types/node` ^22.0.0) in `packages/roles/package.json`
- [ ] T002 [P] Configure TypeScript strict mode with ES2022 target, ESNext modules, bundler moduleResolution in `packages/roles/tsconfig.json`
- [ ] T003 [P] Configure Vitest with SDK alias workaround (`@lemmaoracle/sdk` → `dist/index.js`) and co-located test include pattern in `packages/roles/vitest.config.ts`
- [ ] T004 [P] Create circuit build script (`circom` compile → `snarkjs` powers of tau → phase 2 setup → zkey contribute → export vkey) in `packages/roles/circuits/scripts/build.sh`
- [ ] T005 [P] Create preset manifests for schema and circuit metadata in `packages/roles/presets/schemas/role-spend-limit-v1.json` and `packages/roles/presets/circuits/role-spend-limit-v1.json`

**Checkpoint**: Package structure initialized, dependencies installable, build scripts ready

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core circuit and type infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T006 Implement the `role-spend-limit` Circom circuit with three constraints (role equality, LessEqThan(128) spend comparison, Poseidon4 binding), 4 private signals (credentialCommitment, roleHash, spendLimit, salt) and 3 public signals (requiredRoleHash, maxSpend, nowSec) in `packages/roles/circuits/src/role-spend-limit.circom`
- [ ] T007 Define exported TypeScript types (`AgentCredential`, `PaymentGate`, `CircuitWitness`) with `Readonly<>` / `ReadonlyArray<>` wrapping in `packages/roles/src/index.ts`
- [ ] T008 Implement `fieldHash` helper (SHA-256 → top nibble mask → BN254 field element string) in `packages/roles/src/index.ts`

**Checkpoint**: Foundation ready — circuit source compiles, types are defined, field hash utility available

---

## Phase 3: User Story 1 — Prove Role Authority Before Payment (Priority: P1) 🎯 MVP

**Goal**: An autonomous agent can generate a valid Groth16 proof that it holds a required role and its spend limit falls within a payment gate ceiling, and verify the proof passes on-chain verification

**Independent Test**: Construct a valid agent credential, build a witness against a matching gate, generate a Groth16 proof, and verify it against known public inputs. Also verify that wrong-role and over-limit credentials fail constraint checks.

### Tests for User Story 1

- [ ] T009 [P] [US1] Write witness builder tests — maps credential + gate into circuit input shape, identical roleHash for same gate role, different roleHash for different gates, defaults spendLimit to 0 when absent, produces non-empty salt — in `packages/roles/src/index.test.ts`
- [ ] T010 [P] [US1] Write circuit-related tests — field hash determinism, BN254 field bounds, build artifact existence, field hash for role names — in `packages/roles/src/role-spend-limit.test.ts`

### Implementation for User Story 1

- [ ] T011 [US1] Implement `witness(cred, gate)` function that maps `AgentCredential` + `PaymentGate` into `CircuitWitness` using `fieldHash` for commitment/roleHash/salt derivation, `spendLimitField` for defaulting, and `Date.now()` for `nowSec` in `packages/roles/src/index.ts` (depends on T007, T008)
- [ ] T012 [US1] Implement `prove(client, w)` function that delegates to `prover.prove(client, { circuitId: "role-spend-limit-v1", witness: w })` in `packages/roles/src/index.ts`
- [ ] T013 [US1] Implement `submit(client, docHash, proofResult)` function that delegates to `proofs.submit(client, { docHash, circuitId: "role-spend-limit-v1", proof, inputs })` in `packages/roles/src/index.ts`
- [ ] T014 [US1] Implement `connect(apiBase)` curried factory that returns `(apiKey) => create({ apiBase, apiKey })` in `packages/roles/src/index.ts`
- [ ] T015 [US1] Verify all FP style rules pass — no if/switch/let/var/class/for/while/throw in `packages/roles/src/index.ts`, only const, ternary, Promise.reject

**Checkpoint**: User Story 1 complete — witness builder produces correct circuit inputs, prove/submit/connect delegate to SDK, all tests pass

---

## Phase 4: User Story 2 — Register Circuit and Schema with Oracle (Priority: P2)

**Goal**: A developer can register the role-spend-limit circuit and its associated schema with the Lemma oracle, making artifacts discoverable and verifiable via the oracle's API

**Independent Test**: Run registration scripts against the Lemma API and confirm circuit and schema metadata are retrievable via `circuits.getById` and `schemas.getById`

### Implementation for User Story 2

- [ ] T016 [P] [US2] Implement `register-schema.ts` script — Pinata upload for wasm artifact, build `SchemaMeta` with ABI from `agent-identity-authority-v1` normalized fields, call `schemas.register(client, meta)` — in `packages/roles/scripts/register-schema.ts`
- [ ] T017 [P] [US2] Implement `register-circuit.ts` script — Pinata upload for wasm + zkey, build `CircuitMeta` with verifier config and artifact location, call `circuits.register(client, meta)` — in `packages/roles/scripts/register-circuit.ts`
- [ ] T018 [US2] Add `register` npm script entry (`tsx scripts/register-circuit.ts`) to `packages/roles/package.json`
- [ ] T019 [US2] Fix Pinata upload in `register-schema.ts` — current code uploads `role-spend-limit.wasm` as both wasm and js artifacts; correct js path to the generated JS wrapper from circom compilation in `packages/roles/scripts/register-schema.ts`

**Checkpoint**: User Story 2 complete — circuit and schema are registerable with the Lemma oracle, metadata matches preset manifests

---

## Phase 5: User Story 3 — Enforce Proof-Before-Payment Protocol (Priority: P3)

**Goal**: An AI agent follows a defined protocol (SKILL.md) that mandates generating a ZK role proof before every x402 payment — the protocol halts if the credential is revoked or missing required fields

**Independent Test**: Walk through the SKILL.md checklist with a sample credential and gate, verifying each step produces the expected output and the final payment request includes valid proof headers

### Implementation for User Story 3

- [ ] T020 [US3] Create SKILL.md enforcement template — 5-step proof-before-payment protocol (load credential → build witness → generate proof → attach headers → send payment), revocation/missing-field halt rules, x402 header format (`X-Lemma-Proof`, `X-Lemma-Proof-Inputs`, `X-Lemma-Circuit-Id`) — in `packages/roles/SKILL.md`
- [ ] T021 [US3] Add edge case documentation to SKILL.md — spend limit equals ceiling (valid), multiple roles (hash only gate role), zero ceiling (read-only), absent spendLimit (default to 0), proof failure mid-flow (halt) — in `packages/roles/SKILL.md`

**Checkpoint**: User Story 3 complete — SKILL.md defines mandatory proof-before-payment protocol with halt conditions

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T022 [P] Write package README with circuit signal table, usage examples (witness → prove → submit), build instructions, and requirements in `packages/roles/README.md`
- [ ] T023 [P] Verify TypeScript build succeeds (`tsc --build`) with no type errors in `packages/roles/`
- [ ] T024 Verify Vitest suite passes (`vitest run`) — all witness tests, circuit tests, and field hash tests in `packages/roles/`
- [ ] T025 Run quickstart.md validation — build circuit, build TS package, run tests, verify witness output matches expected values
- [ ] T026 [P] Add `.env.example` with required environment variables (`LEMMA_API_KEY`, `PINATA_API_KEY`, `PINATA_SECRET_API_KEY`, `VERIFIER_ADDRESS`, `CHAIN_ID`) in `packages/roles/`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3–5)**: All depend on Foundational phase completion
  - User Story 1 (Phase 3): Can start after Foundational — No dependencies on other stories
  - User Story 2 (Phase 4): Can start after Foundational — Independent of US1 but registers artifacts US1's circuit produces
  - User Story 3 (Phase 5): Can start after Foundational — References US1's API but independently testable via manual walkthrough
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2 — Core value proposition, no cross-story dependencies
- **User Story 2 (P2)**: Can start after Phase 2 — Registration requires built artifacts but scripts work independently
- **User Story 3 (P3)**: Can start after Phase 2 — SKILL.md references the API but is a documentation artifact

### Within Each User Story

- Types before witness builder
- Witness builder before prove/submit/connect
- Circuit source before build script execution
- Build artifacts before registration scripts
- Core implementation before edge case documentation

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T002, T003, T004, T005)
- Within US1: Tests T009 and T010 can run in parallel
- Within US2: Scripts T016 and T017 can run in parallel
- Polish tasks T022 and T026 can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch tests for User Story 1 together:
Task T009: "Write witness builder tests in packages/roles/src/index.test.ts"
Task T010: "Write circuit-related tests in packages/roles/src/role-spend-limit.test.ts"

# Then implement sequentially (same file):
Task T011: "Implement witness() in packages/roles/src/index.ts"
Task T012: "Implement prove() in packages/roles/src/index.ts"
Task T013: "Implement submit() in packages/roles/src/index.ts"
Task T014: "Implement connect() in packages/roles/src/index.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T005)
2. Complete Phase 2: Foundational (T006–T008)
3. Complete Phase 3: User Story 1 (T009–T015)
4. **STOP and VALIDATE**: Run `vitest run` and verify all tests pass, witness produces correct outputs
5. The circuit + SDK wrappers are the core value — deployable as a library

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Library is functional (MVP!)
3. Add User Story 2 → Test independently → Oracle registration works
4. Add User Story 3 → Test independently → Agent protocol enforced
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (circuit + SDK wrappers)
   - Developer B: User Story 2 (registration scripts)
   - Developer C: User Story 3 (SKILL.md protocol)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- All TypeScript code must follow FP rules (see `lemma/docs/architecture/fp.md`)
- Test files are exempt from FP rules
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- The `register-schema.ts` has a bug: js path points to `.wasm` instead of `.js` — tracked in T019
