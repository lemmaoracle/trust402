## 1. Formatting Utilities

- [ ] 1.1 Create a UI utility module in `packages/demo/agent/src/tui.ts` (or similar) containing a generic `printStateChange` function that prints padded, colored titles and uses `console.table` or `cli-table3` for data layout.

## 2. Extracting Prove/Witness Data

- [ ] 2.1 Investigate and implement a hook or interception strategy in `demo/agent/src/cli.ts` (e.g. mocking/patching `@trust402/roles` `prove` and `witness` functions) to capture the inputs/outputs of role proofs for payment 1 and payment 2 without altering the core protocol functionality.

## 3. Implementing State Changes UI

- [ ] 3.1 Update `packages/demo/agent/src/artifact.ts` (around lines 193-194) to output the "《Agent Identity Completed》" state change block including Credential, Encrypted Cred, and Proof data.
- [ ] 3.2 Update `packages/demo/agent/src/cli.ts` (around lines 85-86) to output the "《Proof of Solvency Submitted & Payment Completed》" state change block, referencing the captured witness/proof from task 2.1.
- [ ] 3.3 Update `packages/demo/agent/src/cli.ts` (around lines 111-112) to output the "《Proof Invalid, Payment Rejected》" state change block, referencing the failing witness and hardcoded "Failed" proof.
