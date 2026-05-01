## ADDED Requirements

### Requirement: Circom circuit for financial data attestation
The system SHALL provide a Circom circuit that verifies a financial data attestation. The circuit SHALL be written in Circom (not raw Solidity) and compiled via `circom` + `snarkjs` to produce a Groth16 verifier Solidity contract. The circuit SHALL accept: (1) private input — field elements representing the financial data (reportId, company, period, revenue, profit), (2) public input — the claimed docHash. It SHALL verify that `hash(fields) == claimedDocHash`.

#### Scenario: Valid attestation proof
- **WHEN** the circuit receives field elements matching the docHash and a valid Groth16 proof
- **THEN** the on-chain verifier returns true

#### Scenario: Invalid attestation proof (tampered data)
- **WHEN** the circuit receives field elements that do NOT match the docHash
- **THEN** the on-chain verifier returns false

### Requirement: Simplified circuit logic
The circuit logic SHALL be trivially simple — a hash-check proving that `hash(fields) == claimedDocHash`. Use Circom's built-in `Poseidon` or `MultiParenthesis` template for the hash. No ECDSA signature verification, no complex cryptographic operations. The circuit is a minimal demo, not production-grade.

#### Scenario: Hash-based verification in Circom
- **WHEN** the circuit computes `Poseidon(fields)` and compares it to `claimedDocHash`
- **THEN** it asserts equality, and the proof is only valid when they match

### Requirement: Circom project structure
The circuit SHALL be organized under `packages/demo/circuit` with the following structure:
- `circuits/financial-data.circom` — the Circom source file
- `circuits/input/` — JSON input files for testing/witness generation
- `build/` — compiled output (r1cs, wasm, zkey, vkey, verifier Solidity contract)
- `foundry.toml` — Foundry config for the verifier contract
- `script/Deploy.s.sol` — deployment script for the verifier on Base Sepolia

The parent `packages/demo/package.json` SHALL expose three DX scripts:
- `"build"` — runs Circom compilation + `snarkjs` Groth16 setup/contribute/export + `wasm-pack build --target web` for the normalizer
- `"deploy-verifier"` — runs `forge script script/Deploy.s.sol --rpc-url base-sepolia --broadcast` (Base Sepolia only)
- `"register"` — runs `register.ts` to register schema and circuit with Lemma SDK

#### Scenario: Circom compilation
- **WHEN** `circom circuits/financial-data.circom --r1cs --wasm --sym -o build` is run
- **THEN** the circuit compiles successfully, producing `build/financial-data.r1cs`, `build/financial-data_js/financial-data.wasm`

#### Scenario: Trusted setup and key generation
- **WHEN** `snarkjs groth16 setup` and `snarkjs zkey contribute` are run
- **THEN** proving key (`*.zkey`) and verification key (`*.vkey`) are generated

#### Scenario: Verifier contract generation
- **WHEN** `snarkjs zkey export solidityverifier` is run
- **THEN** a Solidity Groth16 verifier contract is generated in `build/`

### Requirement: Deployment script for Base Sepolia
The system SHALL include a Foundry script that deploys the generated Groth16 verifier contract to Base Sepolia (chain ID 84532). The deployed contract address SHALL be printed for use in the demo agent configuration.

#### Scenario: Deploy to Base Sepolia
- **WHEN** `forge script script/Deploy.s.sol --rpc-url $BASE_SEPOLIA_RPC --broadcast` is executed
- **THEN** the verifier contract is deployed and the address is printed

### Requirement: Circuit registration with Lemma oracle
The system SHALL include a TypeScript script that registers the circuit schema with the Lemma API, following the pattern from `lemma/packages/agent/scripts/register.ts`. The schema SHALL describe the financial data fields and their types. This registration is a one-time pre-deployment step, not a runtime operation.

#### Scenario: Schema registration
- **WHEN** the registration script is run with `LEMMA_API_KEY` set
- **THEN** the circuit and its schema are registered with the Lemma oracle, and the circuit ID is printed

### Requirement: Document registration script
The system SHALL include a `scripts/register-with-full-content.ts` script that registers financial data documents with the Lemma oracle and produces a `registered-docs.json` file. This follows the pattern of `example-x402/scripts/register-with-full-content.ts`. The script uses the demo normalizer to compute field elements and docHash, then submits the full document content to the Lemma oracle.

#### Scenario: Register a single report
- **WHEN** `tsx scripts/register-with-full-content.ts 2026q1` is run with `LEMMA_API_KEY` set
- **THEN** the financial data for Q1 2026 is normalized, registered with the Lemma oracle, and the resulting docHash is written to `registered-docs.json`

#### Scenario: Register all reports
- **WHEN** `tsx scripts/register-with-full-content.ts` is run without arguments
- **THEN** all hardcoded financial reports are registered and their docHashes are written to `registered-docs.json`
