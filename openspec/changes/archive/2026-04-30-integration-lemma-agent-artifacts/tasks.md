## 1. Dependency Updates [US1]

- [x] 1.1 Add `@lemmaoracle/agent@^0.0.23` to `dependencies` in `packages/roles/package.json`; update `@lemmaoracle/sdk` to `^0.0.23`; add `commander` to `dependencies`
- [x] 1.2 Run `pnpm install` to verify dependency resolution; confirm `@lemmaoracle/agent` exports `credential`, `validate`, `commit`, `computeCredentialCommitment`, and all types

## 2. Type Migration — Import from @lemmaoracle/agent [US1]

- [x] 2.1 Replace the local `AgentCredential` type in `src/index.ts` with a re-export from `@lemmaoracle/agent`: `export type { AgentCredential, AgentCredentialInput, NormalizedAgentCredential, ValidationResult, CommitOutput, SectionedCommitResult, ValidationError, ValidationErrorKind, CredentialOptions } from "@lemmaoracle/agent"`
- [x] 2.2 Remove the local `PaymentGate` and `CircuitWitness` types
- [x] 2.3 Add a new `PaymentGate` type (unchanged — still `{ role: string; maxSpend: number }`) in `src/index.ts`
- [x] 2.4 Run `pnpm type-check` to verify all type imports resolve correctly

## 3. Replace Witness Builder with Poseidon Commit Flow [US1]

- [x] 3.1 Remove the `fieldHash`, `spendLimitField`, and `witness` functions from `src/index.ts`
- [x] 3.2 Update `prove()` to accept `CommitOutput` as input and delegate to `prover.prove(client, { circuitId: "agent-identity-v1", witness })` — update `CIRCUIT_ID` from `"role-spend-limit-v1"` to `"agent-identity-v1"`
- [x] 3.3 Update `prove()` to accept `CommitOutput` as input and delegate to `prover.prove(client, { circuitId: "agent-identity-v1", witness })` — update `CIRCUIT_ID` from `"role-spend-limit-v1"` to `"agent-identity-v1"`
- [x] 3.4 Update `submit()` to use `circuitId: "agent-identity-v1"` in the `proofs.submit()` payload
- [x] 3.5 Update `src/index.ts` exports to remove `witness` and `CircuitWitness`, and re-export `commit`, `computeCredentialCommitment` from `@lemmaoracle/agent`

## 4. Test Updates [US1]

- [x] 4.1 Rewrite `src/index.test.ts` to test the new `commit` + `prove` + `submit` pipeline — test that `commit()` produces valid `CommitOutput`, that `prove()` delegates correctly, and that `submit()` passes the right circuit ID
- [x] 4.2 Update `src/role-spend-limit.test.ts` to test the Poseidon commitment flow: verify `computeCredentialCommitment()` produces deterministic section hashes, and that the root matches `poseidon6([...sectionHashes, salt])`
- [x] 4.3 Run `pnpm test` and fix any remaining failures from the type/API migration

## 5. CLI — Create Command (v1 minimal) [US2]

- [x] 5.1 Add `bin.trust402-agent` field to `packages/roles/package.json` pointing to `dist/cli.js`; add shebang line to `src/cli.ts`
- [x] 5.2 Create `src/cli.ts` with `create` command using Commander — required flags: `--agent-id`, `--subject-id`, `--roles` (comma-separated), `--issuer-id`; optional flags: `--controller-id`, `--org-id`, `--scopes` (comma-separated), `--spend-limit`, `--currency`, `--expires-at`, `--source-system`, `--generator-id`, `--chain-id`, `--network`
- [x] 5.3 Implement `create` handler: map flags to `AgentCredentialInput`, call `credential()` from `@lemmaoracle/agent`, check `ValidationResult`, output JSON to stdout on success or errors to stderr with exit code 1 on failure
- [x] 5.4 Create `src/cli.test.ts` with tests for `create` command: valid minimal input, valid input with optional fields, missing required flag

## 6. CLI — Validate Command [US2]

- [x] 6.1 Add `validate` command to `src/cli.ts` — takes a file path argument, reads JSON, calls `validate()` from `@lemmaoracle/agent`, prints "Valid" or error details
- [x] 6.2 Add tests to `src/cli.test.ts` for `validate` command: valid credential file, invalid credential file

## 7. CLI — Prove Command (v1 minimal) [US2]

- [x] 7.1 Add `prove` command to `src/cli.ts` — required flags: `--credential <path>` (path to JSON file), `--api-key`; optional flag: `--dry-run` (skips submit step). No `--api-base` — use SDK default.
- [x] 7.2 Implement `prove` handler: (1) read credential JSON from `--credential`, (2) validate with `validate()`, (3) create `LemmaClient` via SDK `create({ apiKey })`, (4) call `commit(client, credential)`, (5) call `prover.prove()` with `circuitId: "agent-identity-v1"`, (6) unless `--dry-run`, call `proofs.submit()`, (7) output structured JSON `{ commit, proof, submission? }` to stdout
- [x] 7.3 Add tests to `src/cli.test.ts` for `prove` command: successful pipeline with mocked SDK calls, validation failure, missing `--api-key`, `--dry-run` mode

## 8. Documentation and Polish [US3]

- [x] 8.1 Update `packages/roles/README.md` with: updated API surface (commit → prove → submit flow, re-exported types), CLI usage examples for all three commands, migration note about breaking change from SHA-256 to Poseidon
- [x] 8.2 Run `pnpm type-check` and `pnpm test` across the full package; fix any remaining issues
