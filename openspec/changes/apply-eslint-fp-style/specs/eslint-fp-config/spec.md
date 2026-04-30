## ADDED Requirements

### Requirement: ESLint flat config with FP strict enforcement
The project SHALL contain an `eslint.config.js` at the workspace root that exports a flat config array with at least three configuration blocks: base TypeScript, test-file override, and CLI-file override.

#### Scenario: Base TypeScript config enforces FP and strict TS
- **WHEN** a `*.ts` or `*.tsx` file is linted (excluding `*.test.ts`)
- **THEN** ESLint SHALL apply `eslint.configs.recommended`, `typescript-eslint` `strictTypeChecked`, `eslint-plugin-functional` `strict` preset, and `eslint-config-prettier`
- **AND** the following rule overrides SHALL be active:
  - `@typescript-eslint/no-unused-vars`: error with `argsIgnorePattern: "^_"` and `varsIgnorePattern: "^_"`
  - `functional/no-expression-statements`: error with `ignoreVoid: true`
  - `functional/no-throw-statements`: error with `allowToRejectPromises: true`
  - `functional/no-return-void`: off
  - `functional/prefer-immutable-types`: off
  - `functional/type-declaration-immutability`: off
  - `functional/no-mixed-types`: off

#### Scenario: Test files are exempt from FP and type-checked TS rules
- **WHEN** a `*.test.ts` or `*.spec.ts` file is linted
- **THEN** all `functional/*` rules SHALL be set to `off`
- **AND** all type-checked `@typescript-eslint/*` rules SHALL be set to `off`
- **AND** `@typescript-eslint/no-unused-vars` SHALL be set to `off`

#### Scenario: CLI files have relaxed FP rules
- **WHEN** a file matching `**/cli.ts` is linted
- **THEN** the following functional rules SHALL be set to `off`: `functional-parameters`, `immutable-data`, `no-expression-statements`, `no-conditional-statements`, `no-let`, `no-loop-statements`, `no-classes`, `no-this-expressions`
- **AND** type-checked `@typescript-eslint/*` rules SHALL remain active

### Requirement: ESLint dev-dependencies installed
The workspace root `package.json` and `packages/roles/package.json` SHALL list the following devDependencies: `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-functional`, `eslint-config-prettier`.

#### Scenario: Dependencies are installable
- **WHEN** `pnpm install` is run from the workspace root
- **THEN** all ESLint packages SHALL be installed without errors

### Requirement: Lint npm scripts available
Both the workspace root `package.json` and `packages/roles/package.json` SHALL define `lint` and `lint:fix` scripts.

#### Scenario: Lint script runs ESLint
- **WHEN** `pnpm lint` is executed
- **THEN** ESLint SHALL run on all `*.ts` / `*.tsx` files in the workspace
- **AND** exit with code 0 if no violations, or non-zero if violations exist

#### Scenario: Lint fix script auto-fixes
- **WHEN** `pnpm lint:fix` is executed
- **THEN** ESLint SHALL run with `--fix` and auto-fix correctable violations

### Requirement: Existing source code passes lint
All `*.ts` source files under `packages/roles/src/` (excluding test files) SHALL produce zero ESLint errors after the config and code fixes are applied.

#### Scenario: Zero lint errors on source files
- **WHEN** `pnpm lint` is run after all changes are applied
- **THEN** no ESLint errors SHALL be reported for `packages/roles/src/index.ts` or `packages/roles/src/cli.ts`
