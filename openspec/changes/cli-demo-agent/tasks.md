## 1. Workspace Setup [US1]

- [ ] 1.1 Create `packages/demo` directory with root `package.json` (name: `@trust402/demo`), `tsconfig.json`, and the following DX scripts:
  - `"build"`: runs Circom circuit compilation + `snarkjs` Groth16 key generation + Verifier Solidity contract export + `wasm-pack build --target web` for the normalizer
  - `"deploy-verifier"`: runs `forge script script/Deploy.s.sol --rpc-url base-sepolia --broadcast` (Base Sepolia only)
  - `"register"`: runs `register.ts` (schema + circuit registration with Lemma SDK)
- [ ] 1.2 Create `packages/demo/resource` with `package.json` (name: `@trust402/demo-resource`), `tsconfig.json`, source entry
- [ ] 1.3 Create `packages/demo/agent` with `package.json` (name: `@trust402/demo-agent`), `tsconfig.json`, source entry
- [ ] 1.4 Create `packages/demo/normalize` with `Cargo.toml` and `src/lib.rs` (Rust→WASM crate)
- [ ] 1.5 Create `packages/demo/circuit` directory structure: `circuits/`, `build/`, `circuits/input/`, `script/`, `foundry.toml`
- [ ] 1.6 Update trust402 `pnpm-workspace.yaml` to include `packages/demo/*`
- [ ] 1.7 Add dependencies: resource — `hono`, `@lemmaoracle/x402`, `@coinbase/x402`; agent — `@trust402/protocol`, `@trust402/identity`, `@trust402/roles`, `@lemmaoracle/sdk`, `@x402/fetch`, `@coinbase/x402`, `viem`, `snarkjs`, `chalk`, `ora`, `commander`, `dotenv`; normalize — `wasm-bindgen`; circuit — `forge-std`, `circomlib`

## 2. Demo Normalization Module [US2]

- [ ] 2.1 Implement `src/lib.rs` — `normalize(json_str) -> Vec<FieldElement>` function that parses financial JSON and converts each field to a field element
- [ ] 2.2 Add `wasm-bindgen` annotations and expose `normalize` as a WASM export
- [ ] 2.3 Configure `Cargo.toml` with `crate-type = ["cdylib", "rlib"]`, `wasm-bindgen` dependency
- [ ] 2.4 Add build script (`build-wasm.sh`) that runs `wasm-pack build --target web`
- [ ] 2.5 Add JS integration test that calls the WASM module from Node.js and verifies output matches expected field elements

## 3. Demo Circom Circuit [US2]

- [ ] 3.1 Implement `circuits/financial-data.circom` — minimal Circom circuit that takes private financial data field elements and a public `claimedDocHash`, computes `Poseidon(fields)`, and asserts equality with `claimedDocHash`
- [ ] 3.2 Add test input file `circuits/input/2026q1.json` with sample field elements and expected docHash
- [ ] 3.3 Add build script (`build-circuit.sh`) that runs: `circom` compilation → `snarkjs groth16 setup` → `snarkjs zkey contribute` (powers of tau) → `snarkjs zkey export solidityverifier`
- [ ] 3.4 Configure `foundry.toml` for the generated verifier contract
- [ ] 3.5 Implement `script/Deploy.s.sol` — deployment script that deploys the generated Groth16 verifier to Base Sepolia
- [ ] 3.6 Verify full build pipeline: `circom` → `snarkjs` → `forge build` succeeds
- [ ] 3.7 Generate proof for test input and verify it against the generated verifier contract
- [ ] 3.8 Deploy to Base Sepolia and record the verifier contract address

## 4. Pre-Registration Scripts [US3]

- [ ] 4.1 Implement `packages/demo/scripts/register.ts` — register the circuit schema with Lemma API (circuit ID, field descriptions: reportId, company, period, revenue, profit)
- [ ] 4.2 Implement `packages/demo/scripts/register-with-full-content.ts` — register financial data documents with Lemma oracle following `example-x402/scripts/register-with-full-content.ts` pattern: normalize data → submit to Lemma → receive docHash → write to `registered-docs.json`

## 5. Demo Resource Server [US3]

- [ ] 5.1 Implement Hono app with `GET /ir/:reportId` returning mock financial data (reportId, company, period, revenue, profit, attestation from `registered-docs.json`)
- [ ] 5.2 Implement `GET /` health check returning `{ status: "ok", service: "trust402-demo-resource" }`
- [ ] 5.3 Configure `@lemmaoracle/x402` middleware following `example-x402/packages/worker/src/index.ts:17-23` pattern — $0.01 USDC on `eip155:84532`, `payTo` from env
- [ ] 5.4 Load pre-registered docHashes from `registered-docs.json` (produced by `register-with-full-content.ts`); do NOT register documents at runtime
- [ ] 5.5 Handle missing docHash for a report — return `attestation: null` with `X-Attestation-Warning: not-registered` header
- [ ] 5.6 Implement 404 handling for unknown report IDs
- [ ] 5.7 Add server startup script (`dev` with `tsx`), configurable `PORT` (default 3001)
- [ ] 5.8 Add `.env.example` with `PAY_TO_ADDRESS`, `FACILITATOR_URL`, `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`, `PORT`, `VERIFIER_CONTRACT_ADDRESS`

## 6. Demo Agent — Core Flow [US4]

- [ ] 6.1 Implement environment variable validation (`RESOURCE_URL`, `LEMMA_API_KEY`, `AGENT_PRIVATE_KEY`, `ARTIFACT_PATH`, `MAX_SPEND`) with clear error messages
- [ ] 6.2 Implement SKILL.md loader — read `@trust402/protocol/SKILL.md` from the installed package and display a condensed summary
- [ ] 6.3 Implement hardcoded query: "Retrieve the Q1 2026 financial report for Example Corp"
- [ ] 6.4 Implement AI reasoning simulation — staged typewriter output: (1) query analysis, (2) API discovery (`GET /ir/2026q1` → $0.01), (3) attestation awareness (response will include verifiable docHash), (4) payment authorization

## 7. Demo Agent — IdentityArtifact Handling [US4]

- [ ] 7.1 Implement artifact file detection — check `ARTIFACT_PATH` (default `./artifact.json`) for existence, parse as `IdentityArtifact`
- [ ] 7.2 Implement interactive generation dialog — when absent, display explanation and prompt user; offer auto-run of `trust402 create` + `trust402 prove` if env vars are set
- [ ] 7.3 Implement artifact loading — parse `artifact.json` mapping `commit` → `commitOutput`, `proof` → `identityProof` per SKILL.md

## 8. Demo Agent — Proof-Gated Payment [US5]

- [ ] 8.1 Set up x402 client — create `x402Client`, register `eip155:84532` with `ExactEvmScheme` using `AGENT_PRIVATE_KEY`
- [ ] 8.2 Compose fetch pipeline — `wrapFetchWithProof(fetch, artifact, gate, lemmaClient)` then `wrapFetchWithPayment(proofFetch, x402Client)`
- [ ] 8.3 Execute payment call — `paymentFetch(RESOURCE_URL + "/ir/2026q1")` with spinner indicating proof generation and payment progress
- [ ] 8.4 Handle proof failure — catch errors from `wrapFetchWithProof` and display clear error without attempting underlying fetch

## 9. Demo Agent — Attestation Verification [US5]

- [ ] 9.1 Extract `attestation` (docHash) from the API response
- [ ] 9.2 Call Lemma oracle to verify the attestation — `lemmaClient.verifyAttestation(docHash)` or equivalent
- [ ] 9.3 Handle verification failure — display warning but continue to show purchased data
- [ ] 9.4 Display verification result as part of the summary

## 10. Demo Agent — Summary Output [US5]

- [ ] 10.1 Implement proof summary formatter — identity proof circuit ID (`agent-identity-v1`), role proof circuit ID (`role-spend-limit-v1`), oracle submission status for each
- [ ] 10.2 Implement attestation summary — docHash, verification result, verifier contract address
- [ ] 10.3 Implement financial data display — format company, period, revenue, profit from the paid response
- [ ] 10.4 Implement payment details — amount ($0.01 USDC), network (Base Sepolia), payTo address
- [ ] 10.5 Add `demo-agent` binary entry point in `package.json` (`bin` field → compiled CLI)

## 11. Documentation and Polish [US1]

- [ ] 11.1 Add `README.md` to `packages/demo` with setup instructions (Rust + wasm-pack + Circom + Foundry prerequisites), required environment variables, and step-by-step walkthrough (including pre-registration step)
- [ ] 11.2 Add `.env.example` to `packages/demo/agent` with all required and optional env vars
- [ ] 11.3 Add top-level pnpm scripts in trust402 root `package.json`: `demo:resource` (`tsx packages/demo/resource/src/index.ts`), `demo:agent` (`demo-agent`), `demo:build` (`pnpm --filter @trust402/demo build`), `demo:deploy-verifier` (`pnpm --filter @trust402/demo deploy-verifier`), `demo:register` (`pnpm --filter @trust402/demo register`)
