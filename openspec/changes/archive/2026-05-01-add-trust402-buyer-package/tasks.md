## 1. Package Setup [US1]

- [x] 1.1 Create `packages/protocol/` directory structure — `package.json`, `tsconfig.json`, `vitest.config.ts`, `src/`, `src/index.ts`
- [x] 1.2 [P] Configure `packages/protocol/package.json` — name `@trust402/protocol`, dependencies: `@trust402/identity`, `@trust402/roles`, `@lemmaoracle/sdk`, `@lemmaoracle/spec`, `ramda`; dev deps: `vitest`, `typescript`, `@types/node`, `eslint-plugin-functional`
- [x] 1.3 [P] Configure `packages/protocol/tsconfig.json` — strict mode, ES2022 target, ESNext modules, bundler moduleResolution
- [x] 1.4 [P] Configure `packages/protocol/vitest.config.ts` — SDK alias workaround if needed, co-located test pattern
- [x] 1.5 Add `@trust402/protocol` to pnpm workspace (verify `packages/*` glob includes it)

## 2. proveAndSubmit — Core Proof Pipeline [US1]

- [x] 2.1 Define `ProveAndSubmitResult` type in `src/types.ts` — `commitOutput` (CommitOutput), `identityProof` (ProveOutput), `roleProof` (ProveOutput), `identitySubmission` (unknown), `roleSubmission` (unknown)
- [x] 2.2 Implement `proveAndSubmit(client, credential, gate)` in `src/prove-and-submit.ts` — commit via `@trust402/identity`, identity prove via `@trust402/identity`, role witness via `@trust402/roles`, role prove via `@trust402/roles`, submit both to oracle, return `ProveAndSubmitResult`
- [x] 2.3 Handle identity proof failure — return `Promise.reject(new Error(...))`
- [x] 2.4 Handle role proof failure — return `Promise.reject(new Error(...))`
- [x] 2.5 Handle oracle submission failure — log warning, include `undefined` for the failed submission in result (non-fatal)
- [x] 2.6 Write `src/prove-and-submit.test.ts` — test successful pipeline, test identity failure rejects, test role failure rejects, test oracle submission failure is non-fatal

## 3. wrapFetchWithProof — Buyer-Side Enforcement [US1]

- [x] 3.1 Implement `wrapFetchWithProof(baseFetch, credential, gate, lemmaClient)` in `src/wrap-fetch-with-proof.ts` — calls `proveAndSubmit` internally, blocks fetch on proof failure, proceeds to `baseFetch` on success
- [x] 3.2 Pass through `RequestInit` unchanged to the base fetch
- [x] 3.3 Write `src/wrap-fetch-with-proof.test.ts` — test fetch is called after successful proofs, test fetch is NOT called on identity proof failure, test fetch is NOT called on role proof failure, test fetch is called even if oracle submission fails, test RequestInit is preserved, test composable with `wrapFetchWithPayment` (mock)

## 4. Package Entry Point [US2]

- [x] 4.1 Implement `src/index.ts` — re-export `wrapFetchWithProof`, `proveAndSubmit`, `ProveAndSubmitResult` type, `PaymentGate` from `@trust402/roles`
- [x] 4.2 Write `src/index.test.ts` — test that all expected exports are present and correctly typed

## 5. SKILL.md [US2]

- [x] 5.1 Create `packages/protocol/SKILL.md` — document the proof-before-payment protocol: two-proof flow, `wrapFetchWithProof` usage and composition with `wrapFetchWithPayment`, `proveAndSubmit` for programmatic use, edge cases (proof failure blocks payment, oracle submission is non-fatal)

## 6. Build and Lint Verification [US2]

- [x] 6.1 Run `tsc --build` on `packages/protocol` — verify no type errors
- [x] 6.2 Run `vitest run` on `packages/protocol` — verify all tests pass
- [x] 6.3 Run ESLint on `packages/protocol` — verify FP style compliance (no if/switch/let/var/class/for/while/throw in non-test files)
- [x] 6.4 Verify `pnpm install` resolves workspace dependencies correctly across all trust402 packages
