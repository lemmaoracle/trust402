## Context

The Trust402 demo agent is an interactive CLI tool that demonstrates the lifecycle of a verifiable agent using ZK proofs. Currently, key cryptographic state changes—identity generation, successful role/payment proofs, and budget-exceeded proof failures—are logged, but they don't visually stand out enough for a clear demonstration. We need to introduce highly visible UI blocks at these critical junctures. Furthermore, extracting the exact inputs (Witness) and outputs (Proof) of the `proveRole` mechanism requires a design decision since `wrapFetchWithProof` encapsulates these calls.

## Goals / Non-Goals

**Goals:**
- Provide highly visible console output (with padding, colors, and `console.table` or formatted tables) for three critical state changes.
- Output the Agent Identity creation details (Credential, Encrypted Credential, Proof result).
- Output the Successful Payment details (Condition, Witness, Proof, Output Content).
- Output the Failed Payment details (Condition, Witness, Proof result).
- Extract necessary inner data (witness, proof) from the protocol functions or mock/spy on them for the demo's purposes.

**Non-Goals:**
- Redesign the overall CLI navigation or flow.
- Alter the core logic of `proveRoleFromArtifact` or `wrapFetchWithProof` beyond what is necessary to extract logging information (or we handle logging purely in the demo package).

## Decisions

**1. UI Formatting Strategy:**
- We will use existing CLI formatting tools (like `chalk` or `cli-table3` / `console.table`) to create distinct, padded, and brightly colored sections. 
- A helper function (e.g., `printStateChange(title: string, data: any[])`) will be created in the demo agent package to ensure consistent padding and styling for these alternate screens.

**2. Data Extraction Strategy:**
- For Agent Identity (in `artifact.ts`), the data is already available in the scope of `generateArtifact`. We will collect `createTestCredential` output, `enc` (encrypted document), and the results of `prove` and `submit` to display them directly before saving the artifact.
- For Role Proofs during payment (in `cli.ts` / `wrapFetchWithProof`), the `witness` and `proof` generation happens deep inside `@trust402/protocol/src/prove-role-from-artifact.ts` and `@trust402/roles`. 
- **Decision:** Instead of modifying the core `@trust402/protocol` package to emit events just for the demo, we will use a hook, callback, or wrapper specifically in the demo package. Alternatively, if we need the actual witness/proof data, we might need to modify `proveRoleFromArtifact` to accept an optional logger/callback or return extended debug information. Given this is a demo, if we want to avoid changing the protocol, we can reconstruct the `witness` input in the demo CLI to show what is being sent, or we can use `jest.spyOn` or a similar proxy approach in the CLI to intercept the calls to the `@trust402/roles` package. 
- *Refined Decision:* We will use an interceptor or monkey-patching approach (e.g., wrapping the `proveRole` function from `@trust402/roles` in the demo CLI setup) to capture the witness and proof data globally during the demo run, storing it in a temporary variable that the CLI can read after `wrapFetchWithProof` completes.

## Risks / Trade-offs

- **Risk:** Monkey-patching `@trust402/roles` or `@trust402/protocol` could cause unexpected behavior if not done carefully.
- *Mitigation:* The patching will be strictly confined to the `demo/agent/src/cli.ts` or a dedicated debug setup file, and only hook into the input/output without altering the return values.

- **Risk:** Console tables might look messy with large proof objects.
- *Mitigation:* We will truncate or format large strings (like hex strings or deep objects) before displaying them in the tables to keep the UI clean.
