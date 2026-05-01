## ADDED Requirements

### Requirement: Build script exports Solidity Verifier contract

The circuit build script SHALL export a Solidity Verifier contract after generating the verification key. The Verifier contract SHALL be written to the build directory as `RoleSpendLimitVerifier.sol`.

#### Scenario: Verifier exported after successful build

- **WHEN** the circuit build script runs to completion
- **THEN** a Solidity file named `RoleSpendLimitVerifier.sol` SHALL exist in the build directory, generated via `snarkjs zkey export solidityverifier`

#### Scenario: Build script compiles the Verifier with Forge

- **WHEN** the Solidity Verifier has been exported
- **THEN** the build script SHALL run `forge build` to compile the contract

### Requirement: Foundry project configuration

The `packages/roles/circuits/` directory SHALL contain a valid Foundry project configuration enabling Solidity compilation of the generated Verifier contract.

#### Scenario: Foundry config references build output as source

- **WHEN** `forge build` is executed in `packages/roles/circuits/`
- **THEN** the Foundry configuration SHALL set `src` to the build directory so that the generated `RoleSpendLimitVerifier.sol` is discoverable

#### Scenario: RPC endpoint configured for Base Sepolia

- **WHEN** a deploy script references the `base-sepolia` RPC endpoint
- **THEN** Foundry SHALL resolve it from the `BASE_SEPOLIA_RPC_URL` environment variable

### Requirement: Deploy script for Verifier contract

A Foundry Script SHALL be provided that deploys the generated Verifier contract to a target network.

#### Scenario: Deploy script deploys RoleSpendLimitVerifier

- **WHEN** the deploy script is executed via `forge script`
- **THEN** it SHALL deploy a new instance of `RoleSpendLimitVerifier` and log the deployed contract address

### Requirement: deploy-verifier npm script

The `packages/roles/package.json` SHALL include a `deploy-verifier` script that executes the Foundry deploy script targeting Base Sepolia.

#### Scenario: Running deploy-verifier deploys to Base Sepolia

- **WHEN** `pnpm deploy-verifier` is executed in `packages/roles`
- **THEN** it SHALL run `forge script script/Deploy.s.sol --rpc-url base-sepolia --broadcast` from the circuits directory

#### Scenario: Missing RPC URL

- **WHEN** `pnpm deploy-verifier` is executed without the `BASE_SEPOLIA_RPC_URL` environment variable set
- **THEN** the forge command SHALL fail with an appropriate error message indicating the missing configuration
