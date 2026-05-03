## Why

The current `@trust402` demo flow successfully executes ZK proofs for payments, but the critical state changes (identity creation, successful proof generation, failed budget enforcement) happen too silently in the console. To make the demo more impactful, we need to explicitly highlight these key moments with visually distinct UI elements (titles with padding, colors, and data tables) that show the exact inputs and outputs of the cryptography and protocol operations.

## What Changes

- Add a distinct UI block when the Agent Identity is created, showing the credential, encrypted credential, and generated proof.
- Add a distinct UI block when a payment succeeds, showing the successful proof generation (witness and proof objects) and the response content.
- Add a distinct UI block when a payment fails due to budget enforcement, showing the failing condition, witness, and proof failure.
- Ensure all new UI blocks use visible padding and colored titles to stand out from standard console logs.

## Capabilities

### New Capabilities
- `highlighted-console-states`: Defines the structure, styling, and data extraction mechanisms for the highlighted state UI blocks in the demo CLI.

### Modified Capabilities
- `<existing-name>`: 

## Impact

- `@trust402/packages/demo/agent/src/cli.ts` will be updated to include the new UI states.
- `@trust402/packages/demo/agent/src/artifact.ts` will be updated to output the identity creation state.
- Minor refactoring or event hooking may be needed in `@trust402/packages/demo/agent` or `@trust402/packages/protocol` to extract witness and proof data for the payment states.
