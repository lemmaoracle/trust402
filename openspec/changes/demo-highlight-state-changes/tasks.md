## 1. Formatting Utilities

- [ ] 1.1 Create a UI utility module in `packages/demo/agent/src/tui.ts` (or similar) containing a generic `printStateChange` function that prints padded, colored titles and uses `console.table` or `cli-table3` for data layout. The function MUST end with a `waitForKeypress` to dismiss the alternate screen.

## 2. Extracting Prove/Witness Data

- [ ] 2.1 Import `witness` from `@trust402/roles` in `demo/agent/src/cli.ts` and call it directly with `gate` and `artifact.commitOutput` to obtain `CircuitWitness` for display. This works because `witness` is a pure, synchronous, exported function.
- [ ] 2.2 Add an optional `onProofResult` callback parameter to `wrapFetchWithProof` in `@trust402/protocol`, which is invoked with the `ProveRoleResult` after successful proof generation. Register a callback in the demo CLI that stores the result for display.

## 3. Implementing State Changes UI

- [ ] 3.1 Update `packages/demo/agent/src/artifact.ts` (around lines 193-194) to output the "Agent Identity Completed" alternate screen including Credential, Encrypted Cred, and Proof data, ending with `waitForKeypress`.
- [ ] 3.2 Remove `waitForKeypress("Continue to query")` at the end of `loadOrPromptArtifact` in `artifact.ts` (line 230) since the alternate screen already includes the keypress gate.
- [ ] 3.3 Update `packages/demo/agent/src/cli.ts` (around lines 85-86) to output the "Proof of Solvency Submitted, Payment Completed" alternate screen, referencing the witness and proof data from tasks 2.1/2.2, ending with `waitForKeypress`.
- [ ] 3.4 Remove `waitForKeypress("Continue to second payment")` at line 95 in `cli.ts` since the alternate screen already includes the keypress gate.
- [ ] 3.5 Update `packages/demo/agent/src/cli.ts` (around lines 111-112) to output the "Proof Invalid, Payment Rejected" alternate screen, referencing the failing witness and "Failed" proof, ending with `waitForKeypress`.
- [ ] 3.6 Remove `waitForKeypress("Continue to transaction summary")` at line 112 in `cli.ts` since the alternate screen already includes the keypress gate.
