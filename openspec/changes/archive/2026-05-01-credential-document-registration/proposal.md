## Why

The `@trust402/identity` and `@trust402/roles` `submit()` functions accept a `docHash` and call `proofs.submit()` to attach a proof to a document. However, the corresponding `encrypt()` → `documents.register()` step that creates the document in the Lemma oracle is never executed anywhere in the trust402 codebase. Without a registered document, `proofs.submit()` references a non-existent `docHash`, violating the Lemma SDK protocol flow (`documents.register` must precede `proofs.submit`).

## What Changes

- Add a `register()` function to `@trust402/identity` that performs `encrypt()` → `documents.register()` for a credential, returning `docHash` and `cid`
- Add a `register()` function to `@trust402/roles` that performs `encrypt()` → `documents.register()` for role proof data, returning `docHash` and `cid`
- Update `@trust402/identity.submit()` and `@trust402/roles.submit()` to accept the `docHash` from `register()` (no change to signature — already takes `docHash`)
- Update `trust402 prove` CLI command to call `register()` before `submit()`
- Update `proveRoleFromArtifact()` in `@trust402/protocol` to call `register()` before `submit()`
- Add `HOLDER_PRIVATE_KEY` and `HOLDER_PUBLIC_KEY` handling to the identity and roles registration flows

## Capabilities

### New Capabilities
- `credential-doc-register`: Document registration flow for credentials (encrypt + documents.register) in the identity pipeline, ensuring proofs can be submitted against a valid docHash

### Modified Capabilities
- `role-spend-limit-v2`: The roles submit flow requires a registered document before proof submission; `proveRoleFromArtifact` must register the document before submitting role proofs

## Impact

- **Code**: `@trust402/identity` (add register), `@trust402/roles` (add register), `@trust402/protocol` (update proveRoleFromArtifact), `@trust402/cli` (update prove command)
- **API**: New `register()` exports from `@trust402/identity` and `@trust402/roles`
- **Dependencies**: `encrypt`, `documents` from `@lemmaoracle/sdk` are now required at registration time
- **Configuration**: `HOLDER_PRIVATE_KEY` env var needed for ECIES encryption

## Non-goals

- Changing the `proofs.submit()` API — it already takes `docHash`
- BBS+ selective disclosure integration
- Multi-recipient encryption
