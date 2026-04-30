## 1. Circuit Update [US1]

- [ ] 1.1 Update `role-spend-limit.circom` — add `roleGateCommitment` and `credentialCommitmentPublic` as public inputs, fix constraint 3 to `binder.out === roleGateCommitment`, add constraint 4 `credentialCommitment === credentialCommitmentPublic`, update `component main` public signal list
- [ ] 1.2 [P] Update `circuits/scripts/build.sh` — change output artifact names to include `v2` suffix (e.g., `role-spend-limit-v2.wasm`, `role-spend-limit-v2_final.zkey`)
- [ ] 1.3 [P] Create `presets/circuits/role-spend-limit-v2.json` — updated manifest with `circuitId: "role-spend-limit-v2"`, `inputs: ["requiredRoleHash", "maxSpend", "nowSec", "roleGateCommitment", "credentialCommitmentPublic"]`
- [ ] 1.4 Compile the updated circuit locally and verify constraint count increases by ~1 (from the new equality constraint)

## 2. Package Split — Identity Package [US2]

- [ ] 2.1 Create `packages/identity/` directory structure — `package.json`, `tsconfig.json`, `vitest.config.ts`, `src/index.ts`, `src/index.test.ts`
- [ ] 2.2 [P] Configure `packages/identity/package.json` — name `@trust402/identity`, dependencies: `@lemmaoracle/sdk`, `@lemmaoracle/agent`, `ramda`; dev deps: `vitest`, `typescript`, `@types/node`
- [ ] 2.3 [P] Configure `packages/identity/tsconfig.json` — strict mode, ES2022 target, ESNext modules, bundler moduleResolution
- [ ] 2.4 Implement `packages/identity/src/index.ts` — extract `commit`, `prove`, `submit`, `connect` from current `packages/roles/src/index.ts` targeting `agent-identity-v1`, re-export relevant types from `@lemmaoracle/agent`
- [ ] 2.5 Write `packages/identity/src/index.test.ts` — test `prove` delegates with `circuitId: "agent-identity-v1"`, `submit` delegates with same circuit ID, `connect` creates client

## 3. Roles Package Rewrite — Witness Builder [US3]

- [ ] 3.1 Define `CircuitWitness` type in `packages/roles/src/index.ts` — fields: `credentialCommitment`, `roleHash`, `spendLimit`, `salt`, `requiredRoleHash`, `maxSpend`, `nowSec`, `roleGateCommitment`, `credentialCommitmentPublic`
- [ ] 3.2 Implement `fieldHash(name: string): string` — SHA-256 with top-nibble masking to BN254 field element string
- [ ] 3.3 Implement `witness(credential, gate, commitOutput)` — derive all `CircuitWitness` fields: `roleHash = fieldHash(gate.role)`, `requiredRoleHash = fieldHash(gate.role)`, `spendLimit` from credential with default 0, `credentialCommitment` from `commitOutput.root`, `salt` from `commitOutput.salt`, `roleGateCommitment` via `poseidon4`, `credentialCommitmentPublic` same as `credentialCommitment`, `nowSec` from `Date.now()`
- [ ] 3.4 Write `packages/roles/src/index.test.ts` — test `witness` determinism, `roleHash === requiredRoleHash` for same role, different hash for different role, `spendLimit` default to 0, `roleGateCommitment` matches `poseidon4` computation, `credentialCommitment === credentialCommitmentPublic`

## 4. Roles Package Rewrite — Prove/Submit/Connect [US3]

- [ ] 4.1 Update `CIRCUIT_ID` constant to `"role-spend-limit-v2"` in `packages/roles/src/index.ts`
- [ ] 4.2 Implement `prove(client, circuitWitness)` — delegate to `prover.prove(client, { circuitId: CIRCUIT_ID, witness: circuitWitness })`
- [ ] 4.3 Implement `submit(client, docHash, proofResult)` — delegate to `proofs.submit(client, { docHash, circuitId: CIRCUIT_ID, proof: proofResult.proof, inputs: proofResult.inputs })`
- [ ] 4.4 Implement `connect(apiBase)` curried factory — delegate to `create({ apiBase, apiKey })` from `@lemmaoracle/sdk`
- [ ] 4.5 Update `packages/roles/src/index.ts` — remove `agentCommit` re-export, remove `computeCredentialCommitment` re-export, export `witness`, `commit`, `prove`, `submit`, `connect`, `CircuitWitness` type, `PaymentGate` type
- [ ] 4.6 Write `packages/roles/src/role-spend-limit.test.ts` — test `prove` delegates with `circuitId: "role-spend-limit-v2"`, `submit` delegates with same circuit ID

## 5. Roles Package Rewrite — Commit Function [US3]

- [ ] 5.1 Implement `commit(client, credential)` in `packages/roles/src/index.ts` — delegate to `@lemmaoracle/agent`'s `commit()` (same as identity, needed to produce `CommitOutput` for `witness()`)
- [ ] 5.2 Write tests for `commit` — verify it returns `CommitOutput` with `root`, `sectionHashes`, `salt`

## 6. CLI Update [US3]

- [ ] 6.1 Update `packages/roles/src/cli.ts` — add `witness` command that takes `--credential <path>`, `--role <name>`, `--max-spend <number>`, reads credential, runs commit + witness, outputs `CircuitWitness` JSON
- [ ] 6.2 Update `packages/roles/src/cli.ts` `prove` command — change to accept `CircuitWitness` input (from `witness` command output) instead of raw credential, use `role-spend-limit-v2` circuit ID
- [ ] 6.3 [P] Create `packages/identity/src/cli.ts` — move the current `prove` command (agent-identity-v1) to the identity package
- [ ] 6.4 Update test files for CLI changes

## 7. Registration Script Update [US4]

- [ ] 7.1 Update `packages/roles/scripts/register-circuit.ts` — change `circuitId` to `"role-spend-limit-v2"`, update artifact file paths to v2 suffix, update public inputs list in metadata

## 8. SKILL.md Update [US3]

- [ ] 8.1 Update `packages/roles/SKILL.md` — document the two-proof flow (identity π₁ + role π₂), updated header format with separate identity and role proof headers, describe `credentialCommitment` correlation, update edge cases for v2 circuit

## 9. Build and Lint Verification

- [ ] 9.1 Run `tsc --build` on both `packages/identity` and `packages/roles` — verify no type errors
- [ ] 9.2 Run `vitest run` on both packages — verify all tests pass
- [ ] 9.3 Run ESLint on both packages — verify FP style compliance (no if/switch/let/var/class/for/while/throw in non-test files)
- [ ] 9.4 Verify `pnpm install` resolves workspace dependencies correctly
