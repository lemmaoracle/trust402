## Why

The current `@trust402` demo flow successfully executes ZK proofs for payments, but the critical state changes (identity creation, successful proof generation, failed budget enforcement) happen too silently in the console. To make the demo more impactful, we need to explicitly highlight these key moments with visually distinct alternate screens (titles with padding, colors, and data tables) that show the exact inputs and outputs of the cryptography and protocol operations. Each alternate screen pauses with `waitForKeypress` and then returns to the CLI flow, replacing any immediately-following redundant `waitForKeypress` calls.

## What Changes

- Add an alternate screen when the Agent Identity is created, showing the credential, encrypted credential, and generated proof.
- Add an alternate screen when a payment succeeds, showing the successful proof generation (witness and proof objects) and the response content.
- Add an alternate screen when a payment fails due to budget enforcement, showing the failing condition, witness, and proof failure.
- Each alternate screen uses `waitForKeypress` to dismiss, so redundant `waitForKeypress` calls immediately after are removed:
  - Remove `waitForKeypress("Continue to query")` in `artifact.ts` (after identity creation)
  - Remove `waitForKeypress("Continue to second payment")` in `cli.ts` (after successful payment)
  - Remove `waitForKeypress("Continue to transaction summary")` in `cli.ts` (after failed payment)
- Ensure all new alternate screens use visible padding and colored titles to stand out from standard console logs.

## Capabilities

### New Capabilities
- `highlighted-console-states`: Defines the structure, styling, alternate screen interaction model, and data extraction mechanisms for the highlighted state UI blocks in the demo CLI.

### Modified Capabilities

## Impact

- `@trust402/packages/demo/agent/src/cli.ts` will be updated to include the new alternate screens and remove 2 redundant `waitForKeypress` calls.
- `@trust402/packages/demo/agent/src/artifact.ts` will be updated to output the identity creation alternate screen and remove 1 redundant `waitForKeypress` call.
- `@trust402/packages/protocol/src/wrap-fetch-with-proof.ts` will receive an optional `onProofResult` callback parameter for proof data extraction.
