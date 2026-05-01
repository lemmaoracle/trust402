## ADDED Requirements

### Requirement: SKILL.md loading and display
The agent SHALL load and display the content of `@trust402/protocol/SKILL.md` at startup to establish the proof-before-payment protocol context.

#### Scenario: SKILL.md displayed at startup
- **WHEN** the demo agent CLI starts
- **THEN** it reads and displays the SKILL.md content (or a summary) before processing user queries

### Requirement: Fixed user query simulation
The agent SHALL process a predefined user query without requiring user input for the query itself. The query SHALL be hardcoded: "Retrieve the Q1 2026 financial report for Example Corp".

#### Scenario: Predefined query execution
- **WHEN** the agent starts its reasoning phase
- **THEN** it processes the hardcoded query "Retrieve the Q1 2026 financial report for Example Corp"

### Requirement: AI reasoning simulation
The agent SHALL simulate AI reasoning by displaying staged output that shows: (1) query interpretation, (2) API discovery (identifying the IR API as a paid endpoint at `/ir/2026q1`), (3) attestation awareness (noting that the response will include a verifiable docHash), and (4) payment decision. The output SHALL use typewriter effects and spinners to mimic real-time AI processing.

#### Scenario: Reasoning output stages
- **WHEN** the agent processes the predefined query
- **THEN** it displays four reasoning stages in sequence: query analysis, API discovery (`GET /ir/2026q1` → $0.01 paid endpoint), attestation awareness (response will include verifiable docHash), and payment authorization decision

### Requirement: IdentityArtifact detection and generation dialog
The agent SHALL check for an existing IdentityArtifact file (default `artifact.json`). If absent, it SHALL pause and prompt the user to generate one by running `trust402 create` + `trust402 prove`, or offer to run the commands automatically if the required environment variables (`LEMMA_API_KEY`, `AGENT_PRIVATE_KEY`) are set.

#### Scenario: Artifact exists
- **WHEN** the agent starts and `artifact.json` exists in the working directory
- **THEN** it loads the artifact and proceeds to the payment phase without prompting

#### Scenario: Artifact absent, user chooses to generate
- **WHEN** the agent starts and `artifact.json` does not exist
- **THEN** it displays a dialog explaining the IdentityArtifact requirement and offers to generate one automatically

#### Scenario: Artifact absent, user declines
- **WHEN** the user declines IdentityArtifact generation
- **THEN** the agent exits with an error message explaining that an IdentityArtifact is required

### Requirement: Proof-gated payment execution
The agent SHALL compose `wrapFetchWithProof` (from `@trust402/protocol`) with `wrapFetchWithPayment` (from `@x402/fetch`) in the documented order: payment fetch wraps proof fetch wraps native fetch. The `PaymentGate` SHALL use role `"purchaser"` with `maxSpend` configurable via environment variable (default 1000 = $10.00).

#### Scenario: Successful proof-gated payment
- **WHEN** the agent has a valid IdentityArtifact and calls the paid IR API
- **THEN** it generates a role proof via `proveRoleFromArtifact`, submits proofs to the oracle, executes the x402 payment, and receives the API response with financial data and `attestation` field

#### Scenario: Proof generation failure
- **WHEN** role proof generation fails (e.g. expired artifact, network error)
- **THEN** the agent does not make the payment fetch and displays an error message

### Requirement: Attestation verification
The agent SHALL verify the `attestation` (docHash) from the API response by calling the Lemma oracle to retrieve the associated proof. This confirms the financial data's authenticity.

#### Scenario: Successful attestation verification
- **WHEN** the agent receives a response with `attestation: "0x..."`
- **THEN** it calls the Lemma API with the docHash and displays that the financial data has been verified as authentic

#### Scenario: Attestation verification failure
- **WHEN** the Lemma API cannot verify the attestation (e.g. unregistered docHash, network error)
- **THEN** the agent displays a warning that the attestation could not be verified, but still shows the purchased data

### Requirement: Proof summary output
After a successful payment and verification, the agent SHALL output a human-readable summary to stdout including: (1) the identity proof circuit ID, (2) the role proof circuit ID, (3) the oracle submission status for both proofs, (4) the attestation verification result, (5) the purchased financial data, and (6) the payment amount and destination.

#### Scenario: Summary displayed after successful payment and verification
- **WHEN** the agent completes a proof-gated payment and attestation verification
- **THEN** it prints a formatted summary containing: identity proof (circuit ID: `agent-identity-v1`), role proof (circuit ID: `role-spend-limit-v1`), submission status for each, attestation verification result, the financial data (company, period, revenue, profit), and payment details ($0.01 USDC to the configured address)

### Requirement: Environment variable configuration
The agent SHALL read the following environment variables: `RESOURCE_URL` (demo resource server URL, required), `LEMMA_API_KEY` (Lemma API key, required), `AGENT_PRIVATE_KEY` (wallet private key for x402 payments, required), `ARTIFACT_PATH` (path to IdentityArtifact file, default `./artifact.json`), `MAX_SPEND` (spend limit in USD cents, default 1000).

#### Scenario: Missing required environment variable
- **WHEN** the agent starts without `RESOURCE_URL` set
- **THEN** it exits with an error message indicating the missing variable

### Requirement: CLI entry point
The agent SHALL provide a `demo-agent` CLI binary that starts the demo flow when invoked. No command-line arguments are required (all configuration via environment variables).

#### Scenario: Running the demo
- **WHEN** the user runs `demo-agent` with all required environment variables set
- **THEN** the full demo flow executes: SKILL.md display → query → reasoning → artifact check → payment → attestation verification → summary
