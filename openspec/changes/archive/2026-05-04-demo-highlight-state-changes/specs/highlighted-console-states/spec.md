## ADDED Requirements

### Requirement: Alternate Screen Interaction Model
Each highlighted state change block SHALL function as an alternate screen that pauses the demo flow using `waitForKeypress`. When the user presses Enter, the alternate screen is dismissed and the CLI resumes. Since the alternate screen already includes a keypress gate, any `waitForKeypress` call that would immediately follow the alternate screen in the original flow SHALL be removed to avoid a redundant double-pause.

The following `waitForKeypress` calls SHALL be removed:
- In `artifact.ts`, the `waitForKeypress("Continue to query")` at the end of `loadOrPromptArtifact` (since the "Agent Identity Completed" alternate screen replaces it as the transition point).
- In `cli.ts`, the `waitForKeypress("Continue to second payment")` after Phase 6 attestation (since the "Proof of Solvency Submitted, Payment Completed" alternate screen replaces it).
- In `cli.ts`, the `waitForKeypress("Continue to transaction summary")` after Phase 7 budget enforcement (since the "Proof Invalid, Payment Rejected" alternate screen replaces it).

#### Scenario: Alternate screen dismisses with keypress, no duplicate pause
- **WHEN** a highlighted state change alternate screen is displayed and the user presses Enter to dismiss it
- **THEN** the demo flow continues immediately to the next phase without an additional `waitForKeypress` pause

#### Scenario: Other waitForKeypress calls remain untouched
- **WHEN** a `waitForKeypress` call is not adjacent to a highlighted state change block
- **THEN** that `waitForKeypress` call remains in place (e.g., Phase 1→2 transition, "Continue to AI reasoning", "Execute first payment", "Attempt second payment")

### Requirement: Display Agent Identity Creation State
The demo CLI SHALL display a highlighted alternate screen when the Agent Identity artifact is successfully generated and saved. The block SHALL be rendered inside `generateArtifact` in `artifact.ts`, immediately after `saveArtifact` succeeds and before returning the artifact.

The title SHALL be "Agent Identity Completed" rendered with a prominent background color (e.g., `chalk.bgMagenta.bold`) and horizontal padding. The block SHALL have vertical and horizontal padding (at least 2 spaces on each side, blank lines above/below).

The data SHALL be presented as a formatted table with the following rows:

| Label | Value |
|---|---|
| Credential | The `AgentCredential` returned by `createTestCredential`, serialized as JSON (truncated to 120 chars if longer) |
| Encrypted Cred | The `RegisterOutput` from `registerIdentity`, containing `{ docHash, cid, commitOutput }`, serialized as JSON (truncated to 120 chars if longer) |
| Credential Proof | The `ProveOutput` from `proveIdentity` (containing `{ proof, inputs }`) followed by a newline and the submission result from `submitIdentity`, both serialized as JSON (each truncated to 120 chars if longer) |

The alternate screen SHALL end with a `waitForKeypress` prompt (e.g., "Press Enter to continue"), which serves as the transition back to the normal CLI flow. The `waitForKeypress("Continue to query")` that currently exists at the end of `loadOrPromptArtifact` SHALL be removed.

#### Scenario: Identity artifact generation succeeds
- **WHEN** `generateArtifact` in `artifact.ts` completes `saveArtifact` and is about to return the artifact
- **THEN** the system outputs a padded console block with the colored title "Agent Identity Completed"
- **THEN** the block contains a table with rows for "Credential", "Encrypted Cred", and "Credential Proof" showing the respective data
- **THEN** the alternate screen waits for keypress, then returns to the normal CLI flow without a second `waitForKeypress`

#### Scenario: Identity artifact generation fails partially (proof fails but partial artifact saved)
- **WHEN** `generateArtifact` completes but `proveIdentity` had failed (proofResult.proof is empty)
- **THEN** the system still outputs the block with "Credential" and "Encrypted Cred" rows populated, and "Credential Proof" showing "⚠ Partial — proof generation failed"

### Requirement: Display Successful Payment State
The demo CLI SHALL display a highlighted alternate screen after the first payment succeeds, at the boundary of Phase 6 (Attestation Verification). The title SHALL be "Proof of Solvency Submitted, Payment Completed" rendered with a prominent background color and horizontal/vertical padding.

The data SHALL be presented as a formatted table with the following rows:

| Label | Value |
|---|---|
| Condition | A human-readable string: `role="purchaser", spendLimit=$10.00, price=$0.01 → OK` (formatted from `env.maxSpend` and the payment amount) |
| Witness | The `CircuitWitness` object produced by calling `witness(gate, artifact.commitOutput)` from `@trust402/roles`, displayed as a key-value table |
| Proof | The `ProveOutput` (role proof) obtained via an `onProofResult` callback from `wrapFetchWithProof`, serialized as JSON (truncated to 120 chars if longer) |
| Content | The `summaryJson` (pretty-printed JSON of the first payment's `ApiResponse`) |

The Witness data SHALL be obtained by importing `witness` from `@trust402/roles` and calling it directly with the same `gate` and `artifact.commitOutput` used by the payment pipeline. This is possible because `witness` is a pure, synchronous, exported function.

The Proof data SHALL be obtained by adding an optional `onProofResult` callback parameter to `wrapFetchWithProof` (in `@trust402/protocol`), which is invoked with the `ProveRoleResult` after successful proof generation. The demo CLI SHALL register a callback that stores the result for later display.

The alternate screen SHALL end with a `waitForKeypress` prompt. The `waitForKeypress("Continue to second payment")` that currently exists after Phase 6 attestation SHALL be removed.

#### Scenario: First payment succeeds
- **WHEN** the first payment ($0.01) completes successfully and Phase 6 (Attestation) begins
- **THEN** the system outputs a padded console block with the colored title "Proof of Solvency Submitted, Payment Completed"
- **THEN** the block contains a table with "Condition" showing the passing constraint, "Witness" showing the circuit witness fields, "Proof" showing the role proof output, and "Content" showing the response JSON
- **THEN** the alternate screen waits for keypress, then returns to the normal CLI flow without a second `waitForKeypress`

#### Scenario: First payment fails
- **WHEN** the first payment fails
- **THEN** the system does NOT display this state block (only the existing error message is shown)
- **THEN** the `waitForKeypress("Continue to second payment")` remains in place (no alternate screen to replace it)

### Requirement: Display Failed Payment State
The demo CLI SHALL display a highlighted alternate screen after the second payment fails due to budget enforcement, immediately before the Phase 8 summary. The title SHALL be "Proof Invalid, Payment Rejected" rendered with a prominent background color and horizontal/vertical padding.

The data SHALL be presented as a formatted table with the following rows:

| Label | Value |
|---|---|
| Condition | A human-readable string: `role="purchaser", spendLimit=$10.00, price=$500.00 → NG` (formatted from `env.maxSpend` and the attempted payment amount) |
| Witness | The `CircuitWitness` object produced by calling `witness(gate, artifact.commitOutput)` from `@trust402/roles`, displayed as a key-value table |
| Proof | The string `"Failed"` (since the role proof circuit rejects the over-budget witness) |
| Content | The string `"-"` (no content was obtained) |

The Witness data SHALL be obtained by the same mechanism as the successful payment: calling `witness(gate, artifact.commitOutput)` directly. Even though the proof fails, the witness itself can still be constructed because `witness` is a pure function that does not validate circuit constraints.

The alternate screen SHALL end with a `waitForKeypress` prompt. The `waitForKeypress("Continue to transaction summary")` that currently exists after Phase 7 budget enforcement SHALL be removed.

#### Scenario: Second payment fails budget enforcement
- **WHEN** the second payment ($500) is rejected because the price exceeds the spend limit
- **THEN** the system outputs a padded console block with the colored title "Proof Invalid, Payment Rejected"
- **THEN** the block contains a table with "Condition" showing the failing constraint, "Witness" showing the circuit witness fields, "Proof" showing "Failed", and "Content" showing "-"
- **THEN** the alternate screen waits for keypress, then returns to the normal CLI flow without a second `waitForKeypress`

#### Scenario: Second payment unexpectedly succeeds (MAX_SPEND too high)
- **WHEN** the second payment succeeds because MAX_SPEND is >= $500.00
- **THEN** the system does NOT display this failure state block (the existing warning message is sufficient)
- **THEN** the `waitForKeypress("Continue to transaction summary")` remains in place (no alternate screen to replace it)

### Requirement: State Change Block Formatting
All highlighted state change alternate screens SHALL use consistent formatting:

- The title SHALL be rendered with a colored background (`chalk.bgMagenta.bold` or equivalent prominent color) and centered within a fixed-width bar.
- The block SHALL have at least 2 spaces of horizontal padding on each side of the content.
- The block SHALL have at least one blank line above and below the table content.
- Table rows SHALL use `console.table` or a manually formatted key-value table with aligned columns.
- Large string values (proofs, JSON objects) SHALL be truncated to a maximum of 120 characters with a "…" suffix when exceeding that length.
- Each alternate screen SHALL end with a `waitForKeypress` prompt to dismiss the screen and return to the normal CLI flow.

#### Scenario: Consistent formatting across all state blocks
- **WHEN** any highlighted state change block is displayed
- **THEN** the title uses the same background color and padding style
- **THEN** the table content has consistent indentation and alignment
- **THEN** any value exceeding 120 characters is truncated with "…"
- **THEN** the block waits for keypress before returning to the CLI flow
