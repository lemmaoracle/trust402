## 1. Circuit Update [US1]

- [x] 1.1 Update `role-spend-limit.circom` — add `roleGateCommitment` and `credentialCommitmentPublic` as public inputs, fix constraint 3 to `binder.out === roleGateCommitment`, add constraint 4 `credentialCommitment === credentialCommitmentPublic`, update `component main` public signal list
- [x] 1.2 [P] Update `circuits/scripts/build.sh` — change output artifact names to include `v2` suffix (e.g., `role-spend-limit-v2.wasm`, `role-spend-limit-v2_final.zkey`)
- [x] 1.3 [P] Create `presets/circuits/role-spend-limit-v2.json` — updated manifest with `circuitId: "role-spend-limit-v2"`, `inputs: ["requiredRoleHash", "maxSpend", "nowSec", "roleGateCommitment", "credentialCommitmentPublic"]`
- [x] 1.4 Compile the updated circuit locally and verify constraint count increases by ~1 (from the new equality constraint) — compiled: 425 non-linear constraints, 5 public inputs, 4 private inputs

## 2. Package Split — Identity Package [US2]

- [x] 2.1 Create `packages/identity/` directory structure — `package.json`, `tsconfig.json`, `vitest.config.ts`, `src/index.ts`, `src/index.test.ts`
- [x] 2.2 [P] Configure `packages/identity/package.json` — name `@trust402/identity`, dependencies: `@lemmaoracle/sdk`, `@lemmaoracle/agent`, `ramda`; dev deps: `vitest`, `typescript`, `@types/node`
- [x] 2.3 [P] Configure `packages/identity/tsconfig.json` — strict mode, ES2022 target, ESNext modules, bundler moduleResolution
- [x] 2.4 Implement `packages/identity/src/index.ts` — extract `commit`, `prove`, `submit`, `connect` from current `packages/roles/src/index.ts` targeting `agent-identity-v1`, re-export relevant types from `@lemmaoracle/agent`
- [x] 2.5 Write `packages/identity/src/index.test.ts` — test `prove` delegates with `circuitId: "agent-identity-v1"`, `submit` delegates with same circuit ID, `connect` creates client

## 3. Roles Package Rewrite — Witness Builder [US3]

- [x] 3.1 Define `CircuitWitness` type in `packages/roles/src/index.ts` — fields: `credentialCommitment`, `roleHash`, `spendLimit`, `salt`, `requiredRoleHash`, `maxSpend`, `nowSec`, `roleGateCommitment`, `credentialCommitmentPublic`
- [x] 3.2 Implement `fieldHash(name: string): string` — SHA-256 with top-nibble masking to BN254 field element string
- [x] 3.3 Implement `witness(credential, gate, commitOutput)` — derive all `CircuitWitness` fields: `roleHash = fieldHash(gate.role)`, `requiredRoleHash = fieldHash(gate.role)`, `spendLimit` from credential with default 0, `credentialCommitment` from `commitOutput.root`, `salt` from `commitOutput.salt`, `roleGateCommitment` via `poseidon4`, `credentialCommitmentPublic` same as `credentialCommitment`, `nowSec` from `Date.now()`
- [x] 3.4 Write `packages/roles/src/index.test.ts` — test `witness` determinism, `roleHash === requiredRoleHash` for same role, different hash for different role, `spendLimit` default to 0, `roleGateCommitment` matches `poseidon4` computation, `credentialCommitment === credentialCommitmentPublic`

## 4. Roles Package Rewrite — Prove/Submit/Connect [US3]

- [x] 4.1 Update `CIRCUIT_ID` constant to `"role-spend-limit-v2"` in `packages/roles/src/index.ts`
- [x] 4.2 Implement `prove(client, circuitWitness)` — delegate to `prover.prove(client, { circuitId: CIRCUIT_ID, witness: circuitWitness })`
- [x] 4.3 Implement `submit(client, docHash, proofResult)` — delegate to `proofs.submit(client, { docHash, circuitId: CIRCUIT_ID, proof: proofResult.proof, inputs: proofResult.inputs })`
- [x] 4.4 Implement `connect(apiBase)` curried factory — delegate to `create({ apiBase, apiKey })` from `@lemmaoracle/sdk`
- [x] 4.5 Update `packages/roles/src/index.ts` — remove `agentCommit` re-export, remove `computeCredentialCommitment` re-export, export `witness`, `commit`, `prove`, `submit`, `connect`, `CircuitWitness` type, `PaymentGate` type
- [x] 4.6 Write `packages/roles/src/role-spend-limit.test.ts` — test `prove` delegates with `circuitId: "role-spend-limit-v2"`, `submit` delegates with same circuit ID

## 5. Roles Package Rewrite — Commit Function [US3]

- [x] 5.1 Implement `commit(client, credential)` in `packages/roles/src/index.ts` — delegate to `@lemmaoracle/agent`'s `commit()` (same as identity, needed to produce `CommitOutput` for `witness()`)
- [x] 5.2 Write tests for `commit` — verify it returns `CommitOutput` with `root`, `sectionHashes`, `salt`

## 6. CLI Consolidation — packages/cli [US3]

- [x] 6.1 Create `packages/cli/` directory structure — `package.json`, `tsconfig.json`, `vitest.config.ts`, `src/cli.ts`, `src/cli.test.ts`
- [x] 6.2 Implement `packages/cli/src/cli.ts` — unified `trust402` CLI with `create`, `validate`, and `prove` commands (agent-identity-v1 pipeline: commit → prove → submit). Program name: `trust402`. Binary: `trust402`
- [x] 6.3 Configure `packages/cli/package.json` — name `@trust402/cli`, dependencies: `@lemmaoracle/agent`, `@lemmaoracle/sdk`, `@lemmaoracle/spec`, `commander`, `ramda`; bin: `{ "trust402": "dist/cli.js" }`
- [x] 6.4 Write `packages/cli/src/cli.test.ts` — test program name, command presence, prove targets `agent-identity-v1`, no witness/role-prove commands
- [x] 6.5 Remove `packages/identity/src/cli.ts` and `packages/roles/src/cli.ts` — CLI is now exclusively in `@trust402/cli`
- [x] 6.6 Remove `packages/roles/src/cli.test.ts` — CLI tests consolidated into `@trust402/cli`
- [x] 6.7 Update `packages/identity/package.json` — remove `bin`, `commander`, `ramda`, `@types/ramda` dependencies
- [x] 6.8 Update `packages/roles/package.json` — remove `bin`, `commander`, `ramda`, `@types/ramda` dependencies

## 7. Registration Script Update [US4]

- [x] 7.1 Update `packages/roles/scripts/register-circuit.ts` — change `circuitId` to `"role-spend-limit-v2"`, update artifact file paths to v2 suffix, update public inputs list in metadata

## 8. SKILL.md Update [US3]

- [x] 8.1 Update `packages/roles/SKILL.md` — document the two-proof flow (identity π₁ + role π₂), updated header format with separate identity and role proof headers, describe `credentialCommitment` correlation, update edge cases for v2 circuit

## 9. Build and Lint Verification

- [x] 9.1 Run `tsc --build` on both `packages/identity` and `packages/roles` — verify no type errors
- [x] 9.2 Run `vitest run` on both packages — verify all tests pass
- [x] 9.3 Run ESLint on both packages — verify FP style compliance (no if/switch/let/var/class/for/while/throw in non-test files)
- [x] 9.4 Verify `pnpm install` resolves workspace dependencies correctly
