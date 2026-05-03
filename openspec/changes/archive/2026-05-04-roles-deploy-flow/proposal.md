## Why

The `@trust402/roles` package lacks a Verifier contract deployment flow. The `@trust402/demo` package already establishes the pattern of `snarkjs zkey export solidityverifier` → Foundry build → `forge script` deploy, but `@trust402/roles` has no equivalent. Additionally, both packages use the same `VERIFIER_ADDRESS` environment variable name, which is ambiguous when both verifiers coexist in a monorepo `.env` file.

## What Changes

- Add a Solidity Verifier export step (`snarkjs zkey export solidityverifier`) to `packages/roles/circuits/scripts/build.sh`
- Add a Foundry project structure (`foundry.toml`, `lib/`, `remappings.txt`) under `packages/roles/circuits/`
- Add a Forge deploy script (`script/Deploy.s.sol`) under `packages/roles/circuits/`
- Add a `deploy-verifier` npm script to `packages/roles/package.json` (following the `@trust402/demo` pattern)
- **BREAKING**: Rename `VERIFIER_ADDRESS` to `ROLES_VERIFIER_ADDRESS` in `packages/roles/scripts/register-circuit.ts`
- **BREAKING**: Rename `VERIFIER_ADDRESS` to `DEMO_VERIFIER_ADDRESS` in `packages/demo/scripts/register.ts`
- Update root `.env.example` to reflect the renamed variables

## Capabilities

### New Capabilities
- `verifier-deploy`: Solidity Verifier contract generation, compilation, and deployment flow for `@trust402/roles`. Covers the full pipeline from Verifier export after circuit build through Foundry compilation to on-chain deployment via forge script.

### Modified Capabilities
- `role-spend-limit-v2`: The `VERIFIER_ADDRESS` environment variable used in circuit registration is renamed to `ROLES_VERIFIER_ADDRESS` to avoid collision with the demo package.

## Impact

- **Code**: New files added to `packages/roles/circuits/`, modifications to `build.sh`, `packages/roles/package.json`, `packages/roles/scripts/register-circuit.ts`, `packages/demo/scripts/register.ts`, and root `.env.example`
- **Dependencies**: Foundry (forge) is required at build and deploy time
- **API**: The `deploy-verifier` npm script is added; the `VERIFIER_ADDRESS` env var is renamed in both packages (**BREAKING**)
- **Configuration**: `.env.example` updated with `ROLES_VERIFIER_ADDRESS` and `DEMO_VERIFIER_ADDRESS`

## Non-goals

- Automated Verifier contract testing (forge test)
- Multi-chain deployment automation
- CI/CD pipeline integration for deployment
- Circuit-level changes
