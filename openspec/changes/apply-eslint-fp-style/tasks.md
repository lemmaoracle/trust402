## 1. Install ESLint dev-dependencies [US1]

- [x] 1.1 Add ESLint dev-dependencies to workspace root `package.json`: `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-functional`, `eslint-config-prettier`
- [x] 1.2 Add the same ESLint dev-dependencies to `packages/roles/package.json`
- [x] 1.3 Run `pnpm install` and verify no resolution errors

## 2. Create ESLint flat config [US1]

- [x] 2.1 Create `eslint.config.js` at workspace root with three config blocks: base TS, test-file override, CLI-file override (modelled on `@lemmaoracle/lemma/eslint.config.js`)
- [x] 2.2 Verify the base block extends `strictTypeChecked` + `functional/strict` + `eslintConfigPrettier` with the six rule overrides from Lemma (`no-expression-statements` `ignoreVoid`, `no-throw-statements` `allowToRejectPromises`, `no-return-void` off, `prefer-immutable-types` off, `type-declaration-immutability` off, `no-mixed-types` off)
- [x] 2.3 Verify the test-file block disables all `functional/*` and type-checked `@typescript-eslint/*` rules for `*.test.ts` / `*.spec.ts`
- [x] 2.4 Verify the CLI-file block relaxes FP rules for `**/cli.ts` (`no-classes`, `no-expression-statements`, `no-conditional-statements`, `no-let`, `no-loop-statements`, `functional-parameters`, `immutable-data`, `no-this-expressions`) while keeping type-checked TS rules active

## 3. Add lint scripts [US1]

- [x] 3.1 Add `lint` and `lint:fix` scripts to root `package.json`
- [x] 3.2 Add `lint` and `lint:fix` scripts to `packages/roles/package.json`
- [x] 3.3 Run `pnpm lint` and confirm ESLint executes (violations expected at this stage)

## 4. Fix existing lint violations [US2]

- [x] 4.1 Run `pnpm lint` and catalogue all violations in `packages/roles/src/`
- [x] 4.2 Fix violations in `packages/roles/src/index.ts` (if any)
- [x] 4.3 Verify `packages/roles/src/cli.ts` is covered by the CLI override and produces no FP errors
- [x] 4.4 Fix any remaining violations across the package
- [x] 4.5 Run `pnpm lint` and confirm zero errors across all source files

## 5. Verify and validate [US3]

- [x] 5.1 Run `pnpm lint` from workspace root — exit code 0
- [x] 5.2 Run `pnpm test` — all existing tests still pass
- [x] 5.3 Run `pnpm type-check` — no new type errors introduced
