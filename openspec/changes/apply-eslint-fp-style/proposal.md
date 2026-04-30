## Why

The trust402 project documents functional programming rules in `docs/architecture/fp.md` and `.cursorrules`, but has **no ESLint enforcement**. The `@lemmaoracle/lemma` monorepo already runs `eslint-plugin-functional` (strict preset) with type-checked TypeScript rules and a dedicated test-file override. Without equivalent linting, trust402 code can silently drift from FP conventions—using `if`/`let`/`class`/`throw`—with no CI signal.

## What Changes

- Add `eslint.config.js` to the trust402 workspace root, modelled on `@lemmaoracle/lemma/eslint.config.js`.
- Install ESLint dev-dependencies: `eslint`, `typescript-eslint`, `eslint-plugin-functional`, `eslint-config-prettier`.
- Configure three config blocks (matching Lemma's pattern):
  1. **Base TS config** — `strictTypeChecked` + `functional/strict`, with the same rule overrides as Lemma (`no-expression-statements` with `ignoreVoid`, `no-throw-statements` with `allowToRejectPromises`, `no-return-void` off, `prefer-immutable-types` off, `type-declaration-immutability` off, `no-mixed-types` off).
  2. **Test-file override** — disables all functional and type-checked TS rules for `*.test.ts` / `*.spec.ts`.
  3. **CLI override** — relaxes functional rules for `src/cli.ts` (Commander.js uses imperative patterns).
- Add `lint` / `lint:fix` scripts to root `package.json` and `packages/roles/package.json`.
- Fix any existing lint violations in `packages/roles/src/` source files.

## Capabilities

### New Capabilities

- `eslint-fp-config`: ESLint flat config with functional-programming enforcement, type-checked TypeScript rules, and per-context overrides (test files, CLI entry points).

### Modified Capabilities

_(none — no existing specs)_

## Impact

- **Code**: `packages/roles/src/index.ts` and `packages/roles/src/cli.ts` may need adjustments to satisfy functional rules (e.g., replacing `if` with ternary / `R.cond`, removing `let`/`class`).
- **Dependencies**: New dev-dependencies in root and `packages/roles/package.json`.
- **CI**: The `lint` script becomes a gate; existing code must pass before merge.
- **Developer workflow**: `pnpm lint` now enforces FP style; violations surface at development time rather than in review.
