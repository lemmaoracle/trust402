## Context

The `@trust402/roles` package currently defines an `AgentCredential` type that is a subset of the canonical `agent-identity-authority-v1` schema, and uses SHA-256 with top-nibble masking to compute field hashes for its `CircuitWitness`. This approach has two problems:

1. **Type drift**: The local `AgentCredential` omits provenance fields (`sourceSystem`, `generatorId`, `chainContext`) and will silently diverge from the canonical schema
2. **Commitment mismatch**: The `role-spend-limit` circuit uses SHA-256 for commitment, but the upstream `agent-identity` circuit uses Poseidon6 section hashes. For trust402 to produce proof data that is verifiable against the `agent-identity-v1` circuit and submittable via `proofs.submit()`, it must compute commitments the same way the upstream circuit does.

`@lemmaoracle/agent@0.0.23` now provides:
- **`credential(input, options?)`** — Factory that builds a validated `AgentCredential` from partial `AgentCredentialInput`, filling defaults (issuedAt, currency, empty strings for optional fields)
- **`validate(credential, options?)`** — Pure validation returning `ValidationResult` (tagged union: `{ valid: true, credential }` or `{ valid: false, errors }`)
- **`commit(client, credential)`** — Async function that normalizes via the SDK, then computes a sectioned Poseidon6 commitment (`credentialCommitment` + 5 section hashes + salt) matching the `agent-identity.circom` circuit
- **`computeCredentialCommitment(normalized, salt?)`** — Pure function that computes the Poseidon commitment from an already-normalized credential

These functions produce data that is directly compatible with `proofs.submit()` from `@lemmaoracle/sdk@0.0.23`.

The full end-to-end flow is: **credential → commit → prove → submit**. The CLI should support this entire pipeline so a user can go from "I have an agent identity definition" to "I have a proof registered with the oracle" in a single command.

## Goals / Non-Goals

**Goals:**

- Replace local `AgentCredential` type with re-exports from `@lemmaoracle/agent`
- Replace the SHA-256-based `witness()` + `CircuitWitness` with a Poseidon-based proof flow using `commit()` from `@lemmaoracle/agent` + `prover.prove()` from `@lemmaoracle/sdk`
- Ensure proof data produced by trust402 is compatible with `proofs.submit()` and the `agent-identity-v1` circuit
- Provide a minimal CLI (`trust402-agent`) with three commands: `create`, `validate`, and `prove` — with only required flags for v1
- Keep the trust402 API surface small: delegate to upstream packages, add only domain-specific value

**Non-Goals:**

- Implementing normalization or validation in trust402 (delegated to `@lemmaoracle/agent`)
- Implementing Poseidon commitment computation (delegated to `@lemmaoracle/agent`'s `commit()`)
- Registering schemas or circuits (handled by `@lemmaoracle/agent`'s registration scripts)
- Supporting the old SHA-256 witness format (breaking change, replaced by Poseidon)
- Implementing the `agent-identity` circuit's issuer MAC verification (upstream circuit's responsibility)
- Providing interactive/repl mode for the CLI
- Customizable `apiBase` via CLI flag (use SDK default; environment variable override for advanced use)

## Decisions

### D1: Import types from @lemmaoracle/agent instead of duplicating

**Decision**: Re-export `AgentCredential`, `AgentCredentialInput`, `NormalizedAgentCredential`, `ValidationResult`, `CommitOutput`, `SectionedCommitResult`, etc. from `@lemmaoracle/agent` instead of defining them locally.

**Rationale**: `@lemmaoracle/agent@0.0.23` is now a published npm package that exports the canonical types. Importing eliminates type drift and makes trust402's dependency on the schema explicit.

**Alternative considered**: Continue defining local types with JSDoc referencing the schema. Rejected — type drift is inevitable with manual synchronization.

### D2: Replace SHA-256 witness with Poseidon commit → prove flow

**Decision**: Replace the current `witness()` → `prove()` → `submit()` flow with `commit()` → `prover.prove()` → `proofs.submit()`. The `CircuitWitness` type is replaced by using `CommitOutput` from `@lemmaoracle/agent` as input to `prover.prove()`.

**Rationale**: The `agent-identity-v1` circuit uses Poseidon6 for the `credentialCommitment` and section hashes. The SHA-256 approach produces incompatible field elements. Using `commit()` from `@lemmaoracle/agent` ensures the commitment matches what the circuit expects.

**Alternative considered**: Implement Poseidon hashing locally in trust402. Rejected — `commit()` already exists and has been tested against the circuit.

### D3: CLI framework — Commander.js

**Decision**: Use `commander` for CLI argument parsing.

**Rationale**: Lightweight, well-typed, declarative command definitions. Adds ~30KB, negligible for a CLI tool.

**Alternative considered**: `yargs`. Rejected — heavier, builder pattern conflicts with FP no-mutation rule.

### D4: CLI delegates to @lemmaoracle/agent for credential construction and validation

**Decision**: The CLI's `create` command uses `credential()` from `@lemmaoracle/agent` to construct the credential and `validate()` to check it. No local credential construction or validation logic.

**Rationale**: The upstream `credential()` factory already handles defaults and returns a `ValidationResult`. Duplicating this logic would create another drift surface.

### D5: Breaking change to CircuitWitness — acceptable

**Decision**: The `CircuitWitness` type and the `witness()` function are removed. They are replaced by the `commit()` → `prover.prove()` flow. This is a **BREAKING** change for anyone using `witness()` directly.

**Rationale**: The `CircuitWitness` type was based on SHA-256 field hashing, incompatible with the Poseidon-based `agent-identity-v1` circuit. No production consumers exist yet (v0.0.1), so the break is acceptable.

### D6: CLI prove command — single command for commit → prove → submit

**Decision**: The `prove` command executes the full pipeline: `commit(client, credential)` → `prover.prove(client, { circuitId, witness })` → `proofs.submit(client, payload)`. Output is a structured JSON with `commit`, `proof`, and `submission` sections. A `--dry-run` flag skips the submit step.

**Rationale**: The three steps are always sequential and depend on each other's output. Splitting them would force users to pipe complex JSON between commands. A single command with structured output gives both readability and programmatic consumability.

**Alternative considered**: Separate `commit`, `prove`, `submit` CLI commands. Rejected — intermediate data is complex and not useful on its own.

### D7: Minimal CLI flags — no --api-base; create retains all AgentCredentialInput fields

**Decision**: The `prove` command requires only `--credential <path>` and `--api-key`. The `apiBase` defaults to the SDK's built-in default (`https://workers.lemma.workers.dev`) — no `--api-base` flag. The `create` command exposes all `AgentCredentialInput` fields as CLI flags (4 required: `--agent-id`, `--subject-id`, `--roles`, `--issuer-id`; the rest optional).

**Rationale**: The `apiBase` has a sensible SDK default and most users target the production oracle, so `--api-base` is unnecessary for v1. In contrast, the `create` flags cannot be cut — fields like `--spend-limit`, `--currency`, and `--expires-at` are core to the "私の代理エージェントがXというロール、支払い上限XX" use case. Omitting them would force users to hand-edit JSON for every credential, defeating the CLI's purpose.

**Alternative considered**: Cut `create` optional flags and require JSON editing. Rejected — `--spend-limit` is the central parameter for the trust402 role-spend-limit flow.

## Risks / Trade-offs

- **[Breaking API change]** → `witness()` and `CircuitWitness` are removed. **Mitigation**: Package is pre-1.0; breaking changes are expected.
- **[New dependency on @lemmaoracle/agent]** → Adds a dependency on a young package. **Mitigation**: Same organization, same FP conventions. Version pinning (`^0.0.23`) ensures compatible updates.
- **[commit() requires LemmaClient]** → The prove flow is always network-dependent. **Mitigation**: Expected usage pattern. `computeCredentialCommitment()` is available as a programmatic pure alternative.
- **[prove command is long-running]** → Network calls can take several seconds. **Mitigation**: Progress indicators on stderr; structured JSON on stdout only at the end.
- **[No --api-base flag]** → Users targeting non-default oracles cannot configure the base URL via CLI. **Mitigation**: The SDK default covers the production oracle. Environment variable support can be added in a future iteration.
