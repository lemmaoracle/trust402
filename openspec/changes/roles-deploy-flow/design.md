## Context

The `@trust402/roles` circuit build script (`packages/roles/circuits/scripts/build.sh`) performs circom compilation, Groth16 setup, and verification key export, but lacks the **Solidity Verifier export → Foundry build → forge script deploy** pipeline already established in `@trust402/demo`.

The current `@trust402/demo` flow:
1. `snarkjs zkey export solidityverifier` generates a `.sol` file
2. `forge build` compiles the Solidity contract
3. `forge script script/Deploy.s.sol --rpc-url base-sepolia --broadcast` deploys on-chain

Additionally, both packages read `VERIFIER_ADDRESS` from the shared `.env` file. Since each package deploys its own Verifier contract, using the same variable name creates ambiguity and prevents both packages from being configured simultaneously in a monorepo environment.

## Goals / Non-Goals

**Goals:**
- Add a Verifier Solidity contract export step to the circuit build script
- Introduce a Foundry project structure (`foundry.toml`, `remappings.txt`, `lib/`) under `packages/roles/circuits/`
- Provide a deploy script via `forge script`
- Add a `deploy-verifier` npm script to `packages/roles/package.json`
- Rename `VERIFIER_ADDRESS` to package-scoped names (`ROLES_VERIFIER_ADDRESS`, `DEMO_VERIFIER_ADDRESS`) in both packages
- Update `.env.example` to reflect the renamed variables

**Non-Goals:**
- Automated Verifier contract testing (forge test)
- Multi-chain deployment automation
- CI/CD deployment step integration
- Circuit-level changes
- Changes to the registration script logic beyond the env var rename

## Decisions

### D1: Place the Foundry project directly under `packages/roles/circuits/`

**Decision**: Place `foundry.toml`, `lib/`, `script/` directly inside `packages/roles/circuits/`, matching the `@trust402/demo` layout (`packages/demo/circuit/`).

**Rationale**: Aligning with the existing layout in `@trust402/demo` reduces cognitive overhead for the team. Separating into a subdirectory would deepen build artifact paths and complicate `build.sh` references.

**Alternative**: Separate `packages/roles/circuits/forge/` — rejected because it adds unnecessary nesting and complicates build script path management.

### D2: Append Verifier export as the final step of build.sh

**Decision**: Add `zkey export solidityverifier` immediately after `zkey export verificationkey` in the existing `build.sh`, followed by `forge build`.

**Rationale**: The `@trust402/demo` `build-circuit.sh` uses exactly this sequence (vkey export → solidity verifier export → forge build). Keeping it in one script avoids the risk of a separate step being skipped.

**Alternative**: Separate `export-verifier.sh` script — rejected because it introduces a step that can be forgotten.

### D3: Use `forge script` for deployment

**Decision**: Define a Foundry Script in `script/Deploy.s.sol` and invoke it via the `deploy-verifier` npm script using `forge script`.

**Rationale**: Identical pattern to `@trust402/demo`. `forge script --broadcast` handles transaction submission in a single command.

### D4: RPC endpoint via environment variable

**Decision**: Reference `${BASE_SEPOLIA_RPC_URL}` in `foundry.toml`'s `[rpc_endpoints]` section and pass `--rpc-url base-sepolia` in the `deploy-verifier` npm script.

**Rationale**: Same approach as `@trust402/demo`. Private keys are managed through Foundry's standard `PRIVATE_KEY` environment variable.

### D5: Package-scoped verifier address env vars

**Decision**: Rename `VERIFIER_ADDRESS` to `ROLES_VERIFIER_ADDRESS` in `packages/roles/scripts/register-circuit.ts` and to `DEMO_VERIFIER_ADDRESS` in `packages/demo/scripts/register.ts`. Update the root `.env.example` accordingly.

**Rationale**: Both packages share the monorepo root `.env` file. Using a single `VERIFIER_ADDRESS` creates ambiguity — developers cannot configure both verifiers simultaneously and must swap the value depending on which package they are registering. Package-scoped names make the configuration self-documenting and prevent accidental misconfiguration.

**Alternative**: Keep `VERIFIER_ADDRESS` as a shared variable — rejected because it prevents configuring both packages at once and is error-prone in a monorepo.

### D6: Default values retain zero-address fallback

**Decision**: Both renamed variables retain the `"0x0000000000000000000000000000000000000000"` default fallback, matching the existing behavior.

**Rationale**: The registration scripts use the verifier address for circuit metadata. A zero address is a clear signal that the verifier has not been deployed yet, preserving backward compatibility for development workflows.

## Risks / Trade-offs

- **[Foundry installation requirement]** → Developers and CI must have `forge` installed. Document the prerequisite and provide `foundryup` instructions.
- **[Redeployment on circuit changes]** → Changing the circuit changes the Verifier contract, requiring redeployment. This is an inherent Groth16 constraint and cannot be avoided.
- **[Git submodule management]** → `forge-std` must be added as a git submodule. Same operational pattern as `@trust402/demo`.
- **[BREAKING env var rename]** → Existing `.env` files using `VERIFIER_ADDRESS` must be updated. Mitigate by clearly documenting the rename in the `.env.example` and commit message.
