## MODIFIED Requirements

### Requirement: Fixed user query simulation
The agent SHALL process predefined user queries without requiring user input for the queries themselves. The queries SHALL be hardcoded: (1) "Q1 2026 financial report for Example Corp" (results in $0.01 payment), followed by (2) "All the historical financial report for Example Corp" (results in $500 payment attempt). Both queries SHALL be displayed using typewriter-style character-by-character text streaming at ~100ms per character.

#### Scenario: First query displayed with typewriter effect
- **WHEN** the agent reaches the AI reasoning phase
- **THEN** it displays "Q1 2026 financial report for Example Corp" using typewriter streaming at ~100ms per character

#### Scenario: Second query displayed with typewriter effect
- **WHEN** the first payment cycle completes and the agent proceeds to the second payment attempt
- **THEN** it displays "All the historical financial report for Example Corp" using typewriter streaming at ~100ms per character

### Requirement: AI reasoning simulation
The agent SHALL simulate AI reasoning by displaying staged output that shows: (1) query interpretation, (2) API discovery (identifying the IR API at `/ir/2026q1`), (3) attestation awareness (noting that the response will include a verifiable docHash), and (4) payment decision. Each reasoning stage SHALL be preceded by a keypress-gated pause so the presenter controls the pacing.

#### Scenario: Reasoning stages with pacing gates
- **WHEN** the agent processes the first predefined query
- **THEN** it displays four reasoning stages in sequence, with a keypress-gated pause between each stage allowing the presenter to advance one stage at a time

### Requirement: Proof-gated payment execution
The agent SHALL compose `wrapFetchWithProof` (from `@trust402/protocol`) with `wrapFetchWithPayment` (from `@x402/fetch`) in the documented order: payment fetch wraps proof fetch wraps native fetch. The `PaymentGate` SHALL use role `"purchaser"` with `maxSpend` configurable via environment variable (default 1000 = $10.00). The agent SHALL execute two sequential payment attempts: (1) `GET /ir/2026q1` at $0.01 USDC (expected to succeed), followed by (2) `POST /contract` at $500 USDC (expected to fail due to the role-spend-limit proof rejecting the $500 amount against the $10.00 budget). Both payment attempts SHALL display an async spinner animation while in progress.

#### Scenario: Successful first payment with spinner
- **WHEN** the agent has a valid IdentityArtifact and calls `GET /ir/2026q1` ($0.01 USDC)
- **THEN** an async spinner displays while the fetch is in progress, the role proof succeeds (0.01 <= 10.00), the x402 payment executes, and the agent receives the financial data with `attestation`

#### Scenario: Failed second payment with spinner
- **WHEN** the agent calls `POST /contract` ($500 USDC) with the same IdentityArtifact
- **THEN** an async spinner displays while the fetch is in progress, the role-spend-limit proof fails (500.00 > 10.00), payment is NOT executed, and the agent displays that the payment was blocked

#### Scenario: Proof-spend mismatch
- **WHEN** `wrapFetchWithProof` generates a role proof for $500 against a $10.00 budget
- **THEN** proof generation fails (circuit constraint violation or gate rejection), payment fetch is skipped, and the failure reason is displayed

### Requirement: Attestation verification
The agent SHALL verify the `attestation` (docHash) from the API response by calling the Lemma oracle to retrieve the associated proof. This confirms the financial data's authenticity. Attestation verification SHALL only run for the successful first payment (the second payment produces no data to verify).

#### Scenario: Successful attestation verification
- **WHEN** the agent receives a response with `attestation: "0x..."` from the first payment
- **THEN** it calls the Lemma API with the docHash and displays "Attestation verified — this financial data is certified"

#### Scenario: Attestation verification failure
- **WHEN** the Lemma API cannot verify the attestation (e.g. unregistered docHash, network error)
- **THEN** the agent displays a warning that the attestation could not be verified, but still shows the purchased data

### Requirement: Proof summary output
After both payment cycles complete, the agent SHALL output a human-readable summary to stdout including: (1) the identity proof circuit ID, (2) the role proof circuit ID, (3) the oracle submission status for both proofs, (4) the attestation verification result, (5) the purchased financial data from the first payment, (6) the payment amount and destination for the successful payment, (7) the failed payment attempt details (endpoint, amount, rejection reason), and (8) a keypress-gated pause before displaying blockchain event logs. After the keypress, the agent SHALL query and display: (9) `DocumentRegistered` event logs from `LemmaRegistry` (`0x75572e7eBeFBcBaa35aB8a9a6E4a6E6422C2a89d`) on Base Sepolia showing the agent identity docHash registration, and (10) `ProofSettled` event logs from `LemmaProofSettlement` (`0x60da20C9635897099D88B194D8e7c3E8e4Cf7621`) on Base Sepolia showing the $0.01 settlement.

#### Scenario: Complete summary with blockchain events
- **WHEN** both payment cycles complete (one success, one failure)
- **THEN** the agent prints a formatted summary containing: identity proof (circuit ID: `agent-identity-v1`), role proof (circuit ID: `role-spend-limit-v1`), submission status for each, attestation verification result ("verified"), financial data (Example Corp, Q1 2026, $1.25B revenue, $340M profit), successful payment details ($0.01 USDC on Base Sepolia), failed payment details ($500 — budget exceeded), then a keypress-gated pause, then `DocumentRegistered` and `ProofSettled` blockchain event logs

### Requirement: Environment variable configuration
The agent SHALL read the following environment variables: `RESOURCE_URL` (demo resource server URL, required), `LEMMA_API_KEY` (Lemma API key, required), `AGENT_PRIVATE_KEY` (wallet private key for x402 payments, required), `ARTIFACT_PATH` (path to IdentityArtifact file, default `./artifact.json`), `MAX_SPEND` (spend limit in USD cents, default 1000 = $10.00), `BASE_SEPOLIA_RPC_URL` (optional — for blockchain event queries; if absent, event logs SHALL be skipped with a warning message).

#### Scenario: Missing required environment variable
- **WHEN** the agent starts without `RESOURCE_URL` set
- **THEN** it exits with an error message indicating the missing variable

#### Scenario: Blockchain event query with no RPC
- **WHEN** the agent completes the flow without `BASE_SEPOLIA_RPC_URL`
- **THEN** the summary skips the blockchain event logs and displays a brief note that RPC access is needed for on-chain event display

## ADDED Requirements

### Requirement: 9-phase interactive flow
The agent SHALL execute the demo in 9 distinct phases, each labeled in the output (phase 0 through 8), with keypress-gated pauses at the end of each phase to let the presenter control pacing.

#### Scenario: Phase labeling and pacing
- **WHEN** the demo runs from start to finish
- **THEN** each phase is clearly labeled (e.g., "## 1. Agent Startup") and the flow pauses at a "Press any key to continue" prompt before advancing to the next phase
