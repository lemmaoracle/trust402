## 1. TUI Pacing Primitives

- [x] 1.1 Create `packages/demo/agent/src/tui.ts` with `waitForKeypress` function: displays "Press any key to continue" prompt, enables raw mode on stdin, waits for any keypress, restores terminal settings, returns Promise<void> [US1]
- [x] 1.2 Add `typewriter` function to `tui.ts`: streams text one character at a time, configurable delay (default 100ms), returns Promise<void> [US1]
- [x] 1.3 Add `asyncSpinner` function to `tui.ts`: shows spinning Braille pattern animation (e.g., `⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏`) while an async operation runs, resolves/rejects with the operation result, returns Promise<T> [US1]
- [x] 1.4 Add SIGINT handler in `tui.ts` that restores terminal raw mode settings before exit [US1] [P]
- [x] 1.5 Write unit tests: `tui.test.ts` for `typewriter` (delay calculation, character output ordering) and `asyncSpinner` (spinner frame cycling, result passthrough) — use vitest fake timers; skip raw-mode stdin tests [US1] [P]

## 2. Demo Resource — Contract Endpoint

- [x] 2.1 Add `CONTRACT_DATA` constant and `POST /contract` route to `buildRoutes` in `packages/demo/resource/src/index.ts` with price `$500`, network `eip155:84532`, scheme `exact` [US2]
- [x] 2.2 Add `POST /contract` handler that returns hardcoded contract data with `attestation` from `registered-docs.json` under key `"contract"` [US2]
- [x] 2.3 Add `"contract"` entry to `registered-docs.json` with the pre-registered docHash value [US2] [P]

## 3. Agent CLI — 9-Phase Flow Restructuring

- [x] 3.1 Rewrite `cli.ts` main function to use the 9-phase structure: (0) Resource startup note, (1) Agent startup with SKILL.md + keypress gate, (2) Identity generation + budget table + keypress gate, (3) First query typewriter + keypress gate, (4) AI reasoning simulation with keypress gates between stages, (5) x402 response with spinner, (6) Proof-gated payment with spinner, (7) Attestation verification, (8) Proof summary with blockchain events + keypress gate [US3]
- [x] 3.2 Update `displaySkillSummary` call to include keypress-gated pause after SKILL.md display [US3]
- [x] 3.3 Update `reasoning.ts` to separate each reasoning stage with keypress-gated pauses (presenter controls pacing through the 4 inference stages) [US3]
- [x] 3.4 Update `loadOrPromptArtifact` to show budget table (role: purchaser, max spend: $10.00) in a formatted table after artifact generation/loading, followed by keypress gate [US3]

## 4. Dual Payment Execution

- [x] 4.1 Modify `executeProofGatedPayment` in `payment.ts` to accept URL and HTTP method parameters (currently hardcoded to `GET /ir/2026q1`) rather than deriving from `resourceUrl` alone [US4]
- [x] 4.2 Add first payment call in `cli.ts`: `GET /ir/2026q1` at $0.01 USDC wrapped with async spinner, capture returned `data` for attestation verification [US4]
- [x] 4.3 Add second payment call in `cli.ts`: `POST /contract` at $500 USDC wrapped with async spinner — expect failure from `role-spend-limit-v1` proof rejection, display "Budget exceeded: $500.00 > $10.00 spend limit" on failure [US4]
- [x] 4.4 Add `MAX_SPEND` threshold warning: if `MAX_SPEND >= 50000`, display warning that the $500 payment may succeed instead of demonstrating budget enforcement [US4] [P]

## 5. Attestation Verification

- [x] 5.1 Update `verifyAttestation` call in `cli.ts` to only run on the first payment's response (second payment has no data to verify) [US3]
- [ ] 5.2 Add typewriter display for the attestation verification result text: "Attestation verified — this financial data is certified" [US3] [P]

## 6. Blockchain Event Log Display

- [x] 6.1 Add `queryDocumentRegistered` function to `attestation.ts`: uses viem `createPublicClient` with `BASE_SEPOLIA_RPC_URL` env var, queries `DocumentRegistered` events from `LemmaRegistry` (`0x75572e7eBeFBcBaa35aB8a9a6E4a6E6422C2a89d`), filters by agent docHash [US5]
- [x] 6.2 Add `queryProofSettled` function to `attestation.ts`: queries `ProofSettled` events from `LemmaProofSettlement` (`0x60da20C9635897099D88B194D8e7c3E8e4Cf7621`) [US5]
- [x] 6.3 Add `BASE_SEPOLIA_RPC_URL` to `EnvConfig` type and `validateEnv()` in `env.ts` (optional) [US5]
- [x] 6.4 Display event log results in the summary with formatted output (contract address, event name, block number, transaction hash) [US5]
- [x] 6.5 Gracefully skip event log display when `BASE_SEPOLIA_RPC_URL` is not set — show "RPC URL not configured — skipping on-chain event display" [US5] [P]

## 7. Summary Output Update

- [x] 7.1 Update `displaySummary` in `summary.ts` to include: dual proof summary (both `agent-identity-v1` and `role-spend-limit-v1` for each payment), successful payment details ($0.01 USDC, GET /ir/2026q1), failed payment details ($500 USDC rejected, POST /contract, budget enforcement), purchased financial data, blockchain event logs section [US3]
- [x] 7.2 Add keypress-gated pause before blockchain event log section in summary [US3] [P]

## 8. Integration Verification

- [x] 8.1 Start resource server (`pnpm -F @trust402/demo-resource dev`), verify both `GET /ir/2026q1` and `POST /contract` return 402 with correct pricing [US2]
- [x] 8.2 Run demo agent (`pnpm -F @trust402/demo-agent dev`) with artifact pre-generated, verify: 9 phases execute in order, keypress gates pause correctly, typewriter streams queries, spinner shows during network ops, first payment succeeds, second payment is rejected [US3]
- [x] 8.3 Verify summary output includes both successful and failed payment details, attestation result, and blockchain event logs (when RPC configured) [US3]
