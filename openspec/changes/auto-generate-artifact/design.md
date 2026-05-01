## Context

The demo agent (`@trust402/demo-agent`) currently has a stub for auto-generating an `IdentityArtifact`. When the artifact file is missing and the user opts in, the agent rejects with "not yet implemented." The `trust402` CLI already provides `create` and `prove` commands that implement the full pipeline (`credential` → `commit` → `prove` → `submit`), so the logic can be reused from `@trust402/identity` and `@lemmaoracle/agent`.

Additionally, the `.env` path in `cli.ts` resolves to `packages/demo/.env` instead of the monorepo root `trust402/.env`, causing environment variables to not load.

## Goals / Non-Goals

**Goals:**
- Implement auto-generation of IdentityArtifact when the user confirms
- Reuse `@trust402/identity` (commit, prove, submit) and `@lemmaoracle/agent` (credential) in the demo agent
- Add `AGENT_ID` and `ISSUER_ID` environment variables for customizing the generated credential
- Fix the `.env` path resolution in `cli.ts`
- Persist the generated artifact to `ARTIFACT_PATH` for reuse on subsequent runs

**Non-Goals:**
- Auto-generating without user confirmation
- BBS+ selective disclosure
- Custom credential fields beyond defaults
- Changing the `trust402` CLI behavior

## Decisions

### D1: Reuse @trust402/identity package functions directly

**Decision**: Import `commit`, `prove`, `submit` from `@trust402/identity` and `credential` from `@lemmaoracle/agent` directly in the demo agent, rather than spawning the `trust402` CLI as a subprocess.

**Rationale**: Direct function calls are more reliable, faster, and produce structured results that can be directly saved as an artifact file. Spawning a subprocess would require parsing stdout JSON and handling exit codes.

**Alternative**: Spawn `trust402 create` + `trust402 prove` as child processes — rejected because of fragility (stdout parsing, error handling) and unnecessary process overhead.

### D2: Default credential values

**Decision**: Use hardcoded defaults for the auto-generated credential: `role: "purchaser"`, `spendLimit: MAX_SPEND` (from env), and `AGENT_ID`/`ISSUER_ID` from environment variables (with sensible defaults).

**Rationale**: The demo agent already has `maxSpend` in its env config. The `purchaser` role matches the `PaymentGate` used in the payment flow. `AGENT_ID` and `ISSUER_ID` allow customization without requiring full CLI flags.

**Alternative**: Prompt the user for every credential field — rejected because it defeats the purpose of auto-generation (convenience).

### D3: Fix .env path by adding one more parent directory

**Decision**: Change `path.resolve(import.meta.dirname, "..", "..", "..", ".env")` to `path.resolve(import.meta.dirname, "..", "..", "..", "..", ".env")` in `cli.ts`.

**Rationale**: `import.meta.dirname` is `trust402/packages/demo/agent/src/`. Four levels up reaches `trust402/`, which is where the root `.env` file lives. This matches the pattern used by `register-circuit.ts` and other scripts that reference the monorepo root `.env`.

## Risks / Trade-offs

- **[Proof submission cost]** → Auto-generation submits a proof to the Lemma oracle, which may consume API credits. Mitigated by requiring explicit user confirmation before proceeding.
- **[Artifact reuse]** → If the circuit or schema changes, a stale artifact file will produce invalid proofs. Mitigated by documenting that `ARTIFACT_PATH` should be deleted after circuit changes.
