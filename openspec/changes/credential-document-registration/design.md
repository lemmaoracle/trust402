## Context

The Lemma SDK defines the document lifecycle as: **encrypt → documents.register → proofs.submit**. The `encrypt()` call produces a `docHash` and `cid` from the ECIES-encrypted document. The `documents.register()` call creates the document record in the oracle. Only after registration can `proofs.submit()` attach proofs to the document via its `docHash`.

Currently, `@trust402/identity` and `@trust402/roles` both have `submit()` functions that call `proofs.submit()` with a `docHash`, but the prerequisite `encrypt()` → `documents.register()` step is missing. The `docHash` passed is typically `commitOutput.root` (a Poseidon commitment root), which is not the same as the ECIES-encrypted document hash the oracle expects.

The Lemma SDK defines the correct flow: `encrypt(payload, holderKey)` → `documents.register(schema, docHash, cid, ...)` → `proofs.submit(docHash, circuitId, ...)`.

## Goals / Non-Goals

**Goals:**
- Add `register()` to `@trust402/identity` that encrypts a credential and registers it as a document
- Add `register()` to `@trust402/roles` that encrypts role proof data and registers it as a document
- Update the `trust402 prove` CLI to call `register()` before `submit()`
- Update `proveRoleFromArtifact()` to register the document before submitting proofs

**Non-Goals:**
- Changing `proofs.submit()` API
- BBS+ selective disclosure
- Multi-recipient encryption
- Changing `commitOutput.root` computation

## Decisions

### D1: Add `register()` as a separate function, not merged into `submit()`

**Decision**: Add a `register()` function that performs `encrypt()` → `documents.register()` and returns `{ docHash, cid }`. Keep `submit()` unchanged — it already takes `docHash`.

**Rationale**: Separation of concerns. `register()` is a prerequisite step that produces `docHash`; `submit()` consumes it. Merging them would break the existing `submit()` API and make it harder to use `docHash` for other purposes (e.g., referencing in payment flows).

**Alternative**: Merge `register()` into `submit()` — rejected because it changes the existing API and hides the `docHash`/`cid` from callers who need them.

### D2: Use `passthrough-v1` schema for identity and roles document registration

**Decision**: Register credential documents under the `passthrough-v1` schema, which requires no input normalization.

**Rationale**: Credentials are already normalized by the `commit()` step. The `passthrough-v1` schema simply passes data through without transformation, which is exactly what's needed — the document content is the credential JSON itself.

**Alternative**: Create a dedicated `agent-credential-v1` schema — rejected as unnecessary overhead since passthrough already exists for this purpose.

### D3: Holder key from environment variable

**Decision**: The `register()` function takes `holderKey` as an explicit parameter. Callers obtain it from `HOLDER_PRIVATE_KEY` → `derivePublicKey()`.

**Rationale**: The holder key is context-dependent (different for each deployment). Making it a parameter rather than reading an env var inside the function keeps the library functions pure and testable.

### D4: docHash replaces commitOutput.root as the proof submission key

**Decision**: After `register()` is called, the `docHash` from `encrypt()` (not `commitOutput.root`) should be used for `proofs.submit()`.

**Rationale**: `commitOutput.root` is a Poseidon commitment root used inside the ZK circuit. `docHash` is the SHA3-256 hash of the ECIES-encrypted document, which is what the oracle uses as the document identifier. They serve different purposes and must not be conflated.

## Risks / Trade-offs

- **[Breaking change for existing submit() callers]** → Callers currently passing `commitOutput.root` as `docHash` must switch to the `docHash` from `register()`. Mitigated by documenting the change and providing the `register()` function.
- **[HOLDER_PRIVATE_KEY availability]** → The registration flow requires a holder private key. If not set, `register()` will fail. Mitigated by adding the env var to `.env.example` and validating early.
