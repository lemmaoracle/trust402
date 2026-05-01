## Context

The Lemma SDK defines the document lifecycle as: **encrypt → documents.register → proofs.submit**. The `encrypt()` call produces a `docHash` and `cid` from the ECIES-encrypted document. The `documents.register()` call creates the document record in the oracle. Only after registration can `proofs.submit()` attach proofs to the document via its `docHash`.

Currently, `@trust402/identity` and `@trust402/roles` both have `submit()` functions that call `proofs.submit()` with a `docHash`, but the prerequisite `encrypt()` → `documents.register()` step is missing. The `docHash` passed is typically `commitOutput.root` (a Poseidon commitment root), which is not the same as the ECIES-encrypted document hash the oracle expects.

The correct registration flow is: `agentCommit(credential)` → `encrypt(credential, holderKey)` → `documents.register(schema, docHash, cid, commitments, ...)` → `proofs.submit(docHash, circuitId, ...)`.

Note: Unlike the standard SDK flow (`encrypt → prepare → documents.register → proofs.submit`), `@trust402/identity` uses `agentCommit()` which computes a **sectioned Poseidon commitment** rather than the SDK's flat Merkle tree commitment. Therefore `prepare()` is not used; the commitment data is sourced directly from `commitOutput` (see D5).

## Goals / Non-Goals

**Goals:**
- Add `register()` to `@trust402/identity` that accepts an `AgentCredential`, commits, encrypts, and registers it as a document
- Add `register()` to `@trust402/roles` that encrypts role proof data and registers it as a document
- Update the `trust402 prove` CLI to call `register()` before `submit()`
- Update `proveRoleFromArtifact()` to register the document before submitting proofs

**Non-Goals:**
- Changing `proofs.submit()` API
- BBS+ selective disclosure
- Multi-recipient encryption
- Changing `commitOutput.root` computation
- Using SDK `prepare()` for commitment computation (agentCommit uses a different scheme)

## Decisions

### D1: `register()` accepts AgentCredential and performs commit internally

**Decision**: `register(client, { credential, holderKey })` performs `agentCommit()` → `encrypt()` → `documents.register()` internally and returns `{ docHash, cid, commitOutput }`. The `commitOutput` is returned so callers can pass it to `prove()`.

**Rationale**: Requiring callers to first call `commit()` separately and then pass both `payload` and `commitOutput` to `register()` is redundant — the `commitOutput` is always derived from the same credential. Having `register()` accept the credential directly is more intuitive and eliminates the possibility of passing a mismatched `commitOutput`. The `commitOutput` is still needed by callers for `prove()`, so it's included in the return value.

**Alternative**: Keep `register()` taking `payload` + `commitOutput` as separate inputs — rejected because it's error-prone (callers could pass a `commitOutput` from a different credential) and adds unnecessary coupling.

### D2: Use `passthrough-v1` schema for identity and roles document registration

**Decision**: Register credential documents under the `passthrough-v1` schema, which requires no input normalization.

**Rationale**: Credentials are already normalized by the `commit()` step inside `register()`. The `passthrough-v1` schema simply passes data through without transformation, which is exactly what's needed — the document content is the credential JSON itself.

**Alternative**: Create a dedicated `agent-credential-v1` schema — rejected as unnecessary overhead since passthrough already exists for this purpose.

### D3: Holder key from environment variable

**Decision**: The `register()` function takes `holderKey` as an explicit parameter. Callers obtain it from `HOLDER_PRIVATE_KEY` → `derivePublicKey()`.

**Rationale**: The holder key is context-dependent (different for each deployment). Making it a parameter rather than reading an env var inside the function keeps the library functions pure and testable.

### D4: docHash replaces commitOutput.root as the proof submission key

**Decision**: After `register()` is called, the `docHash` from `encrypt()` (not `commitOutput.root`) should be used for `proofs.submit()`.

**Rationale**: `commitOutput.root` is a Poseidon commitment root used inside the ZK circuit. `docHash` is the SHA3-256 hash of the ECIES-encrypted document, which is what the oracle uses as the document identifier. They serve different purposes and must not be conflated.

### D5: Use section hashes as commitment leaves (not SDK prepare)

**Decision**: The `documents.register()` `commitments` field SHALL be populated from `commitOutput` directly, using the section hashes as leaves. Specifically:
- `root` = `commitOutput.root` (the poseidon6 output)
- `leaves` = values from `commitOutput.sectionHashes` (identityHash, authorityHash, financialHash, lifecycleHash, provenanceHash)
- `randomness` = `commitOutput.salt`
- `scheme` = `"poseidon"`

**Rationale**: `@trust402/identity` uses `agentCommit()` which computes a **sectioned Poseidon commitment** — it hashes each section (identity, authority, financial, lifecycle, provenance) via `toScalar(JSON.stringify(sectionObj))` and computes the root as `poseidon6([sectionHashes..., salt])`. This is fundamentally different from the SDK's `prepare()` which builds a flat Merkle tree over `Record<string, Json>` key-value pairs.

The `agent-identity-authority-v1` schema's normalized output is a **nested object** (with identity, authority, financial, lifecycle, provenance sub-objects), which cannot be passed to `prepare()` because `prepare()` expects flat key-value pairs where each value is a primitive (string/number) that becomes a leaf.

Using the section hashes as leaves preserves all commitment information and is consistent with the circuit's commitment scheme, even though it differs from the SDK's standard Merkle tree structure.

**Alternative 1**: Use SDK `prepare()` with a flattened credential — rejected because it would produce a different root than the one used in the ZK circuit (double commitment problem).

**Alternative 2**: Flatten the normalized credential before passing to `prepare()` — rejected for the same reason; the circuit expects the sectioned commitment, not a flat Merkle tree.

### D6: issuerId and subjectId sourced from credential

**Decision**: `register()` extracts `issuerId` from `credential.provenance.issuerId` and `subjectId` from `credential.identity.subjectId` for the `documents.register()` call.

**Rationale**: These identifiers are already part of the credential and should be passed consistently to the oracle. Hardcoding them (as was done in earlier drafts) loses important provenance information.

## Risks / Trade-offs

- **[Breaking change for existing submit() callers]** → Callers currently passing `commitOutput.root` as `docHash` must switch to the `docHash` from `register()`. Mitigated by documenting the change and providing the `register()` function.
- **[HOLDER_PRIVATE_KEY availability]** → The registration flow requires a holder private key. If not set, `register()` will fail. Mitigated by adding the env var to `.env.example` and validating early.
- **[Non-standard commitment structure]** → The section-hashes-as-leaves approach differs from the SDK's Merkle tree commitments. The oracle stores commitments but does not verify the tree structure, so this is safe. However, tools that assume a standard Merkle tree may not work with these commitments.
