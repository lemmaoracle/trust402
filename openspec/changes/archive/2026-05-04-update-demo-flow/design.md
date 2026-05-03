## Context

The demo agent (`@trust402/demo-agent`) currently runs a linear 8-step flow with no user interaction between steps beyond an initial artifact-generation prompt. All steps execute sequentially without pacing control, which makes it difficult for a presenter to narrate each step during a live demo. The output lacks visual distinction between different types of operations (waiting for external services vs. displaying content). Additionally, the demo only shows a successful $0.01 payment, missing the opportunity to demonstrate that the ZK role-spend-limit proof actually enforces the budget constraint.

The `@trust402/protocol` already provides `wrapFetchWithProof`, which integrates proof generation with the fetch call. The proof-gating logic (`role-spend-limit-v1` circuit) constrains the payment amount against the credential's `spendLimit`, so a $500 payment should naturally fail proof generation against a $10.00 budget — the demo just doesn't exercise this path yet.

## Goals / Non-Goals

**Goals:**
- Restructure the CLI flow into 9 labeled phases separated by keypress-gated pauses
- Add typewriter-style character-by-character text streaming for user queries and narrative text
- Add ASCII spinner animation for network operations (proof generation, x402 payment, oracle queries)
- Add a `POST /contract` endpoint at $500 USDC to the demo resource server
- Execute two sequential payment cycles: successful $0.01 + rejected $500 (budget enforcement demo)
- Display blockchain event logs (`DocumentRegistered`, `ProofSettled`) from Base Sepolia contracts in the summary

**Non-Goals:**
- Using a real TUI framework (ink, blessed) — stick with `readline` built-in + `chalk`
- Adding real LLM integration (agent reasoning stays simulated)
- Changing the IdentityArtifact auto-generation logic (already implemented)
- Changing the attestation verification flow (already implemented)
- Adding a third or fourth payment cycle
- Making event log queries work without an RPC URL (graceful skip)

## Decisions

### D1: TUI pacing via Node.js built-in readline, not a framework

**Decision**: Implement keypress gates, typewriter streaming, and spinner logic using `node:readline` (raw mode keypress capture), `setTimeout`-based delays, and `chalk` for styling — no external TUI framework.

**Rationale**: `chalk` is already a dependency. `readline` is a Node.js built-in with no install cost. The pacing primitives are simple enough (keypress wait, char-by-char output, spinner loop) that adding a framework like `ink` or `blessed` would introduce unnecessary complexity for a demo.

**Alternative**: Use `ink` (React-based TUI) — rejected because it adds a heavy dependency and requires a React mental model incompatible with the existing imperative Commander-based CLI.

### D2: Separate `tui.ts` module for pacing primitives

**Decision**: Extract the three pacing primitives (`waitForKeypress`, `typewriter`, `asyncSpinner`) into a new file `packages/demo/agent/src/tui.ts`, imported by modules that need them (`cli.ts`, `reasoning.ts`, `payment.ts`).

**Rationale**: These are reusable presentation utilities independent of any specific demo phase. Keeping them in one module makes them testable (as FP functions) and avoids duplicating `readline` raw mode setup across files.

**Alternative**: Inline the logic in `cli.ts` — rejected because it makes `cli.ts` bloated and the utilities aren't reusable for different display contexts.

### D3: Dual payment execution in `cli.ts`, not in `payment.ts`

**Decision**: `cli.ts` calls `executeProofGatedPayment` twice sequentially (once for `GET /ir/2026q1` at $0.01, once for `POST /contract` at $500) rather than `payment.ts` handling a list of payments internally. The second call's failure is expected and displayed as a success case for the demo (budget enforcement working).

**Rationale**: `executeProofGatedPayment` already contains the core logic: create `PaymentGate` from env (`role: "purchaser"`, `maxSpend: env.maxSpend`), call `wrapFetchWithProof`, return `{ data, success }`. The calling code in `cli.ts` can wrap each call with the async spinner, handle success vs. failure differently, and maintain clear phase separation.

**Alternative**: Create a `executeMultiplePayments` function that takes an array of payment configs — rejected because the two payments have structurally different post-payment behavior (first: verify attestation, second: display rejection reason).

### D4: viem `getLogs` for blockchain event queries

**Decision**: Use `viem` (already a workspace dependency) with `createPublicClient` to query `DocumentRegistered` events from `LemmaRegistry` and `ProofSettled` events from `LemmaProofSettlement` on Base Sepolia. Contract addresses and ABIs are hardcoded. If `BASE_SEPOLIA_RPC_URL` is not set, skip event queries with a note.

**Rationale**: `viem` is already used in the payment flow for wallet operations. `getLogs` is a standard JSON-RPC call with no additional API key requirements beyond having an RPC URL. This keeps the demo self-contained without depending on Etherscan API keys.

**Alternative**: Use `fetch` to call the Base Sepolia RPC directly with manual JSON-RPC — rejected because `viem` handles ABI encoding, event topic derivation, and log parsing correctly without reinventing the wheel.

### D5: `POST /contract` endpoint reuses existing x402 middleware pattern

**Decision**: Add `POST /contract` to the same `buildRoutes` object in `resource/src/index.ts` with `price: "$500"`, `network: "eip155:84532"`, `scheme: "exact"`, and `extensions: { lemma: {} }`. The handler returns hardcoded contract data from a `CONTRACT_DATA` constant. No new dependencies or middleware changes needed.

**Rationale**: The existing `paymentMiddleware` processes all routes defined in the routes object. Adding a second route is purely a configuration change — no new server logic required. The pre-registered docHash pattern for attestations is identical to `GET /ir/:reportId`.

**Alternative**: Create a separate server for the contract endpoint — rejected because it adds unnecessary operational complexity for what is a single additional endpoint.

### D6: Dual query strings for two payment cycles

**Decision**: The demo now has two hardcoded query strings: `"Q1 2026 financial report for Example Corp"` (first cycle, $0.01) and `"All the historical financial report for Example Corp"` (second cycle, $500). Both are displayed via `typewriter` streaming at their respective points in the flow.

**Rationale**: The user's specification explicitly defines two separate queries with different scopes. The first query is narrow (single quarter) matching the $0.01 endpoint; the second is broad ("all historical") which the AI reasoning interprets as requiring the full contract at $500.

## Risks / Trade-offs

- **[RPC dependency for event logs]** → Querying Base Sepolia events requires an RPC endpoint. Mitigated by making `BASE_SEPOLIA_RPC_URL` optional and gracefully skipping event log display if absent.
- **[Second payment may succeed]** → If `MAX_SPEND` is configured >= 50000 cents ($500), the second payment will actually succeed instead of being rejected, breaking the demo narrative. Mitigated by documenting the expected `MAX_SPEND` value (default 1000 = $10.00) and adding a warning in the output if `MAX_SPEND > 50000`.
- **[Raw mode terminal hijack]** → `readline` raw mode captures all stdin, preventing Ctrl+C during keypress wait. Mitigated by restoring terminal settings in a `process.on('SIGINT')` handler and in a cleanup function after each `waitForKeypress` call.
- **[Typewriter speed tuning]** → 100ms/char may feel too slow or too fast depending on terminal width. Mitigated by making the delay configurable and setting a sensible default that works for demo pacing.
