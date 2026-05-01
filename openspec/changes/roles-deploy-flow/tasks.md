## 1. Foundry Project Setup

- [x] 1.1 Add `foundry.toml` to `packages/roles/circuits/` with `src` pointing to the build directory, `libs = ["lib"]`, and `[rpc_endpoints]` for `base-sepolia` via `${BASE_SEPOLIA_RPC_URL}` [US1]
- [x] 1.2 Add `remappings.txt` with `forge-std/=lib/forge-std/src/` [US1]
- [x] 1.3 Initialize `forge-std` as a git submodule under `packages/roles/circuits/lib/` [US1]
- [x] 1.4 Update `packages/roles/circuits/.env.example` with `BASE_SEPOLIA_RPC_URL` and `PRIVATE_KEY` placeholders [US1]

## 2. Build Script Enhancement

- [x] 2.1 Add `snarkjs zkey export solidityverifier` step to `build.sh` after the vkey export, outputting `RoleSpendLimitVerifier.sol` into the build directory [US1]
- [x] 2.2 Add `forge build` step to `build.sh` after the Solidity verifier export [US1]
- [x] 2.3 Verify the full build pipeline runs end-to-end (circom → zkey → vkey → solidity verifier → forge build) [US1]

## 3. Deploy Script

- [x] 3.1 Create `packages/roles/circuits/script/Deploy.s.sol` — a Foundry Script that deploys `Groth16Verifier` (from `RoleSpendLimitVerifier.sol`) and logs the contract address [US2]
- [x] 3.2 Add `deploy-verifier` npm script to `packages/roles/package.json`: `cd circuits && forge script script/Deploy.s.sol --rpc-url base-sepolia --broadcast` [US2]
- [x] 3.3 Verify the deploy script compiles successfully with `forge build` [US2]

## 4. Environment Variable Rename

- [x] 4.1 Rename `VERIFIER_ADDRESS` to `ROLES_VERIFIER_ADDRESS` in `packages/roles/scripts/register-circuit.ts`, keeping the zero-address default fallback [US3]
- [x] 4.2 Rename `VERIFIER_ADDRESS` to `DEMO_VERIFIER_ADDRESS` in `packages/demo/scripts/register.ts`, keeping the zero-address default fallback [US3]
- [x] 4.3 Update root `.env.example`: replace `VERIFIER_ADDRESS` with `ROLES_VERIFIER_ADDRESS` and `DEMO_VERIFIER_ADDRESS` entries with descriptions [US3] [P]

## 5. Git and Cleanup

- [x] 4.1 Update `.gitignore` in `packages/roles/circuits/` to include Foundry artifacts (`out/`, `cache/`, `broadcast/`) if not already present [P] [US3]
- [x] 4.2 Verify the git submodule for `forge-std` is properly tracked [P] [US3]
