## Context

The `@trust402/roles` package currently contains two interleaved concerns:

1. **Agent identity proof** — `commit()` (via `@lemmaoracle/agent`), `prove()`, `submit()` all targeting `agent-identity-v1`
2. **Role-spend-limit proof** — `PaymentGate` type and `SKILL.md` referencing `role-spend-limit-v1`, but no actual `witness`/`prove`/`submit` wiring

The `role-spend-limit.circom` circuit has a critical binding constraint bug: `Poseidon4(credentialCommitment, roleHash, spendLimit, salt) === credentialCommitment` can only hold when `roleHash === 0` and `spendLimit === 0`, because Poseidon is a permutation and cannot return its first input unchanged when other inputs are nonzero.

The two-proof flow (identity proof π₁ + role proof π₂) requires the server to correlate both proofs via `credentialCommitment`. In the current circuit, `credentialCommitment` is private, so the server cannot verify the correlation.

## Goals / Non-Goals

**Goals:**

- Fix the `role-spend-limit` circuit binding constraint to produce a separate `roleGateCommitment` output
- Expose `credentialCommitment` as a public input in the role circuit so servers can correlate π₁ and π₂
- Split `packages/roles` into `packages/identity` (agent-identity-v1) and `packages/roles` (role-spend-limit-v2)
- Provide a complete `commit → witness → prove → submit` pipeline for the role-spend-limit circuit
- Maintain FP style compliance across all TypeScript modules

**Non-Goals:**

- Server-side proof verification middleware or Relay `/prover/verify` endpoint
- Client-side `wrapFetchWithProof` middleware
- On-chain verifier contract deployment
- Credential issuance, normalization, or lifecycle management
- Supporting proof aggregation or recursive composition

## Decisions

### D1: Separate `roleGateCommitment` from `credentialCommitment`

**Decision**: Change constraint 3 from `Poseidon4(credentialCommitment, roleHash, spendLimit, salt) === credentialCommitment` to `Poseidon4(credentialCommitment, roleHash, spendLimit, salt) === roleGateCommitment`, where `roleGateCommitment` is a new public input.

**Rationale**: The original constraint is logically broken — Poseidon4(x, a, b, c) ≠ x for nonzero a, b, c. The corrected form produces a separate commitment that binds the credential to the role/spend claims, while allowing `credentialCommitment` to retain its original value from the identity proof.

**Alternatives considered**:
- Remove constraint 3 entirely and rely on server-side correlation only: Weaker guarantee — nothing prevents claiming an unrelated roleHash/spendLimit
- Use a hash of roleHash+spendLimit as the commitment: Loses the binding to the specific credential

### D2: `credentialCommitment` as public input for cross-proof correlation

**Decision**: Add `credentialCommitmentPublic` as a public input with an equality constraint `credentialCommitment === credentialCommitmentPublic`.

**Rationale**: The server verifies two independent proofs (π₁ for agent-identity, π₂ for role-spend-limit). To confirm they refer to the same credential, the server must see `credentialCommitment` in both proof's public inputs. In π₁ it is already public (`inputs[0]`). In π₂, making it a private input prevents server-side correlation. The dual-input pattern (private + public with equality constraint) is standard in Circom — the prover supplies the same value twice, and the circuit enforces consistency.

**Alternatives considered**:
- Make `credentialCommitment` directly public (remove private version): Would work but breaks the Poseidon4 binding input, which needs it as a signal
- Store `credentialCommitment` server-side between proofs: Requires stateful sessions, adding complexity
- Use `roleGateCommitment` as the sole correlation point: Cannot derive `credentialCommitment` from `roleGateCommitment` (Poseidon is one-way)

### D3: Package split — `packages/identity` and `packages/roles`

**Decision**: Extract agent-identity-v1 commit/prove/submit into `packages/identity` and rewrite `packages/roles` for role-spend-limit-v2.

**Rationale**: The two circuits serve distinct purposes and have different witness shapes, circuit IDs, and public inputs. Mixing them in one package creates confusion (the current `prove()` hardcodes `agent-identity-v1` despite the package name suggesting role gating). Separate packages allow independent versioning and clearer dependency graphs.

**Alternatives considered**:
- Keep single package with both APIs: Leads to import ambiguity and mixed concerns
- Sub-exports from one package (`@trust402/roles/identity`): Subpath exports add configuration complexity without real benefit for two small modules

### D4: `witness()` derives `roleGateCommitment` using `poseidon-lite`

**Decision**: Compute `roleGateCommitment` in the TypeScript `witness()` function using `poseidon-lite` (same library as `@lemmaoracle/agent`'s `computeCredentialCommitment`), matching the circuit's `Poseidon4` computation.

**Rationale**: The witness must supply values that satisfy the circuit constraints. Since `roleGateCommitment = Poseidon4(credentialCommitment, roleHash, spendLimit, salt)` is a constraint, the witness builder must compute it identically to the circuit. Using `poseidon-lite` (the JS counterpart of circom's Poseidon) ensures consistency.

**Alternatives considered**:
- Let `snarkjs fullProve` compute `roleGateCommitment` from the circuit: The witness must still provide all signal values; snarkjs doesn't auto-compute derived signals
- Use SHA-256 for the gate commitment: Would not match the circuit's Poseidon4 constraint

### D5: `fieldHash` uses SHA-256 with top-nibble masking for `roleHash` and `requiredRoleHash`

**Decision**: Retain the existing pattern from the spec — SHA-256 of the role name, top nibble masked to ensure BN254 field safety.

**Rationale**: Consistent with the v1 design. Poseidon inside the circuit handles commitment binding; SHA-256 outside provides deterministic, interoperable field-element derivation for role names.

### D6: Circuit versioning — `role-spend-limit-v2`

**Decision**: Register the updated circuit as `role-spend-limit-v2` (new circuitId) rather than overwriting `role-spend-limit-v1`.

**Rationale**: Existing proofs generated with v1 (even though broken) may be recorded on-chain. A new circuitId avoids confusion and allows clean migration. The v1 circuit can be deprecated but not deleted.

### D7: CLI consolidation into `@trust402/cli`

**Decision**: Consolidate all CLI commands into a single `@trust402/cli` package. The CLI operator's primary concern is "giving an agent identity" — `create`, `validate`, and `prove` (agent-identity-v1 pipeline). Role management (witness, role-prove) is a programmatic concern handled via `@trust402/roles` API calls, not CLI commands.

**Rationale**: The CLI's audience is the demo runner / credential issuer who creates and validates agent identities and submits identity proofs. Role-spend-limit proofs are generated programmatically by the agent's payment middleware, not interactively by a human operator. Including `witness` and `role-prove` in the CLI would expose internal plumbing that has no interactive use case. Removing CLI files from `@trust402/identity` and `@trust402/roles` eliminates code duplication and makes `commander`/`ramda` a concern of only the CLI package.

**Alternatives considered**:
- Keep separate CLIs in each package: Duplicates `create`/`validate` commands and forces users to switch between `trust402-identity` and `trust402-roles` binaries
- Add `witness` and `role-prove` commands to the unified CLI: No interactive use case for these operations; they are always called programmatically by the agent runtime

## Risks / Trade-offs

- **[Circuit re-compilation required]** → All artifacts (wasm, zkey) must be rebuilt and re-registered. Mitigation: The `circuits/scripts/build.sh` and `scripts/register-circuit.ts` scripts already exist and only need the circuit ID update.
- **[Breaking API change]** → Consumers of `@trust402/roles` must migrate to `@trust402/identity` for agent-identity proofs and update imports for role proofs. Mitigation: The package is pre-1.0; breaking changes are expected. Provide a migration note.
- **[Two-proof overhead]** → Each payment now requires two proof generations instead of one, roughly doubling proof generation latency (4–10s total). Mitigation: Proofs can be generated in parallel since π₁ and π₂ share no dependency (π₂ only needs `credentialCommitment` from the commit step, not the proof).
- **[credentialCommitmentPublic doubles the public input]** → Slightly larger proof and more on-chain gas for settlement. Mitigation: One additional field element is negligible in Groth16 (proof size is constant; only verification gas increases slightly).
