## Context

The trust402 monorepo (a pnpm workspace with `packages/roles`) has no ESLint configuration. The sibling `@lemmaoracle/lemma` monorepo already enforces functional programming via a flat ESLint config (`eslint.config.js`) that combines `typescript-eslint` strictTypeChecked, `eslint-plugin-functional` strict preset, and `eslint-config-prettier`. The trust402 project's `docs/architecture/fp.md` and `.cursorrules` document the same FP conventions, but without lint enforcement they are aspirational rather than verifiable in CI.

Key constraint: trust402 uses Commander.js for its CLI (`src/cli.ts`), which is inherently imperative (class-based `Command`, `.action()` callbacks). The Lemma monorepo has a similar pattern for its Astro/web package and disables many functional rules there. We must replicate this exemption pattern.

## Goals / Non-Goals

**Goals:**

- Provide an `eslint.config.js` at the trust402 workspace root that mirrors Lemma's FP + TS strict enforcement.
- Ensure test files (`*.test.ts`, `*.spec.ts`) are exempt from functional and type-checked TS rules.
- Provide a CLI-file override that relaxes functional rules where Commander.js requires imperative patterns.
- Add `lint` / `lint:fix` npm scripts so developers and CI can run ESLint.
- Fix all existing lint violations in `packages/roles/src/` source code.

**Non-Goals:**

- Adding Circom / circuit linting (out of scope for this change).
- Changing existing `tsconfig.json` settings.
- Introducing Prettier configuration (already assumed to be present or handled separately).
- Migrating the Lemma monorepo's ESLint config — we only reference it as the source of truth.

## Decisions

### D1: Flat config (ESLint 9+) at workspace root

**Choice**: Single `eslint.config.js` at `trust402/` root using the flat config format.

**Alternative**: Per-package configs → rejected because trust402 currently has only one TS package (`packages/roles`), and a root config is simpler to maintain and consistent with Lemma's approach.

**Rationale**: Matches Lemma's pattern; one file to update when rules change.

### D2: Three config blocks mirroring Lemma

1. **Base TS config** (`**/*.ts`, excluding `*.test.ts`): `strictTypeChecked` + `functional/strict` + `eslintConfigPrettier`, with the same six rule overrides Lemma uses.
2. **Test-file override** (`**/*.test.ts`, `**/*.spec.ts`): Disables all functional rules and type-checked TS rules (identical to Lemma's test block).
3. **CLI override** (`**/cli.ts`): Disables functional rules that conflict with Commander.js (`no-classes`, `no-expression-statements`, `no-conditional-statements`, `no-let`, `no-loop-statements`, `functional-parameters`, `immutable-data`, `no-this-expressions`). Keeps TS type-checked rules active.

**Rationale**: Proven pattern from Lemma; CLI files need the same exemption as web/UI code.

### D3: Dev-dependency installation at root + roles package

Install ESLint packages as root devDependencies so `pnpm lint` works from the workspace root. Also add them to `packages/roles/package.json` so the package can be linted independently.

Packages: `eslint`, `typescript-eslint`, `eslint-plugin-functional`, `eslint-config-prettier`, `@eslint/js`.

### D4: Existing code fixes

`src/cli.ts` uses Commander's `Command` class and imperative `.action()` callbacks — these will be exempted via the CLI override. `src/index.ts` appears already FP-compliant (uses `const`, arrow functions, `Readonly<>`), but ESLint may flag `new Command()` in tests or minor issues.

## Risks / Trade-offs

- **[Risk] CLI override scope creep** → Mitigation: Override applies only to `**/cli.ts` files; if new CLI files are added, they must be explicitly included.
- **[Risk] Breaking existing CI** → Mitigation: Add `lint` script before making it a CI gate; run manually first to assess violation count.
- **[Risk] `eslint-plugin-functional` strictness too aggressive for library code** → Mitigation: Same six overrides as Lemma (`no-return-void` off, `prefer-immutable-types` off, `type-declaration-immutability` off, `no-mixed-types` off, `no-expression-statements` with `ignoreVoid`, `no-throw-statements` with `allowToRejectPromises`) already prune the strictest rules.
