## Why

The current demo agent runs a linear, non-interactive 8-step flow that showcases proof-gated payment but lacks visual pacing, user interaction points, and demonstration of payment failure scenarios. For a compelling demo to external developers and stakeholders, the flow should feel like a real agent interaction — with typewriter text streaming, spinner animations, paced pauses, and a deliberate demonstration that the budget constraint (role spend limit) actually prevents overspending on a $500 contract endpoint.

## What Changes

- Restructure the demo agent CLI flow from 8 linear steps to a 9-phase interactive experience with pause-on-keypress pacing between phases
- Add three TUI presentation behaviors at designated points in the flow: keypress-gated pauses ("Press any key to continue"), typewriter-style character-by-character text streaming at ~100ms/char, and ASCII spinner animation during async network operations
- Add a `POST /contract` endpoint to the demo resource server priced at $500 USDC (same Base Sepolia network) to demonstrate budget enforcement
- Split the current single payment into two: a successful $0.01 USDC payment for `GET /ir/2026q1`, followed by a failed $500 USDC payment for `POST /contract` that is rejected by the role-spend-limit proof
- Add blockchain event log display at the end: query `DocumentRegistered` events from `LemmaRegistry` (`0x75572e7eBeFBcBaa35aB8a9a6E4a6E6422C2a89d`) and `ProofSettled` events from `LemmaProofSettlement` (`0x60da20C9635897099D88B194D8e7c3E8e4Cf7621`) on Base Sepolia
- Expand the proof summary to cover both payments (one successful, one rejected)

## Capabilities

### New Capabilities
- `demo-tui-pacing`: TUI presentation primitives for interactive demo pacing — keypress-gated pause, typewriter text streaming, and async spinner
- `demo-contract-endpoint`: High-value `POST /contract` endpoint on the demo resource server priced at $500 USDC for demonstrating budget/role enforcement

### Modified Capabilities
- `demo-agent`: Flow restructuring from 8 linear steps to 9 interactive phases; dual payment scenario (success + budget rejection); TUI pacing integration; blockchain event log display in summary
- `demo-resource`: New `POST /contract` endpoint at $500 USDC in addition to existing `GET /ir/:reportId`

## Impact

- **Code**: `packages/demo/agent/src/cli.ts` (flow restructuring), `packages/demo/agent/src/reasoning.ts` (TUI pacing integration), `packages/demo/agent/src/payment.ts` (dual payment support), `packages/demo/agent/src/summary.ts` (expanded output), `packages/demo/agent/src/attestation.ts` (blockchain event queries), `packages/demo/resource/src/index.ts` (new `POST /contract` endpoint), new file `packages/demo/agent/src/tui.ts` (pacing primitives)
- **Dependencies**: `viem` (already present — used for blockchain event queries via `getLogs`), no new packages required for the resource's new endpoint
- **Configuration**: No new environment variables needed; existing `MAX_SPEND` (default 1000 = $10.00) stays as the budget for demonstrating rejection of the $500 payment
- **Network**: Base Sepolia contract addresses hardcoded for `LemmaRegistry` and `LemmaProofSettlement`

## Non-goals

- Real-time TUI framework (ink, blessed) — using simple `readline`/`process.stdin` keypress capture and `chalk` styling (already present)
- Bundling or installing `readline` separately (it's a Node.js built-in)
- Changing the existing artifact generation, SKILL.md loading, or environment variable validation logic
- Production-grade TUI with resizable layouts or mouse support
