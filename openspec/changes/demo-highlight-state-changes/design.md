## Context

The Trust402 demo agent is an interactive CLI tool that demonstrates the lifecycle of a verifiable agent using ZK proofs. Currently, key cryptographic state changes—identity generation, successful role/payment proofs, and budget-exceeded proof failures—are logged, but they don't visually stand out enough for a clear demonstration. We need to introduce highly visible alternate screens at these critical junctures. Furthermore, extracting the exact inputs (Witness) and outputs (Proof) of the `proveRole` mechanism requires a design decision since `wrapFetchWithProof` encapsulates these calls.

## Goals / Non-Goals

**Goals:**
- Provide highly visible console output (with padding, colors, and `console.table` or formatted tables) for three critical state changes.
- Each state change block functions as an alternate screen with its own `waitForKeypress` to dismiss.
- Remove redundant `waitForKeypress` calls that would immediately follow an alternate screen.
- Output the Agent Identity creation details (Credential, Encrypted Credential, Proof result).
- Output the Successful Payment details (Condition, Witness, Proof, Output Content).
- Output the Failed Payment details (Condition, Witness, Proof result).
- Extract necessary inner data (witness, proof) from the protocol functions or via clean extension points.

**Non-Goals:**
- Redesign the overall CLI navigation or flow.
- Alter the core logic of `proveRoleFromArtifact` or `wrapFetchWithProof` beyond what is necessary to extract logging information (or we handle logging purely in the demo package).

## Decisions

**1. Alternate Screen Interaction Model:**
- Each highlighted state change block acts as an alternate screen that pauses with `waitForKeypress`.
- When the user presses Enter, the alternate screen dismisses and the CLI resumes.
- Any `waitForKeypress` that would immediately follow an alternate screen in the original flow is removed to avoid double-pause.
- Three `waitForKeypress` calls are removed:
  - `artifact.ts:230` — `waitForKeypress("Continue to query")` after identity creation
  - `cli.ts:95` — `waitForKeypress("Continue to second payment")` after successful payment
  - `cli.ts:112` — `waitForKeypress("Continue to transaction summary")` after failed payment

**2. UI Formatting Strategy:**
- We will use existing CLI formatting tools (like `chalk` or `cli-table3` / `console.table`) to create distinct, padded, and brightly colored sections. 
- A helper function (e.g., `printStateChange(title: string, data: any[])`) will be created in the demo agent package to ensure consistent padding and styling for these alternate screens.

**3. Data Extraction Strategy:**
- For Agent Identity (in `artifact.ts`), the data is already available in the scope of `generateArtifact`. We will collect `createTestCredential` output, `enc` (encrypted document), and the results of `prove` and `submit` to display them directly before saving the artifact.
- For Role Proofs during payment (in `cli.ts` / `wrapFetchWithProof`):
  - **Witness:** `witness` from `@trust402/roles` is a pure, synchronous, exported function. We import it directly in the demo CLI and call `witness(gate, artifact.commitOutput)` to obtain the `CircuitWitness`. No monkey-patching needed.
  - **Proof:** `wrapFetchWithProof` in `@trust402/protocol` internally generates a `ProveRoleResult` but discards it after fetching. We add an optional `onProofResult` callback parameter to `wrapFetchWithProof` that receives the `ProveRoleResult`. The demo CLI registers a callback that stores the result for later display. This is a minimal, non-breaking change to the protocol package.

## Risks / Trade-offs

- **Risk:** Adding `onProofResult` to `wrapFetchWithProof` is a public API change.
- *Mitigation:* The parameter is optional and defaults to a no-op, so existing callers are unaffected.

- **Risk:** Console tables might look messy with large proof objects.
- *Mitigation:* We will truncate or format large strings (like hex strings or deep objects) before displaying them in the tables to keep the UI clean.

- **Risk:** Removing `waitForKeypress` calls changes the demo pacing.
- *Mitigation:* The alternate screen's own `waitForKeypress` provides the same pause, so the pacing is equivalent — just without the redundant double-pause.
