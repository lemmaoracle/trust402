## 1. Add register() to @trust402/identity

- [ ] 1.1 Implement `register(client, { payload, holderKey, schema?, commitOutput? })` in `packages/identity/src/index.ts` using `encrypt()` → `documents.register()` from `@lemmaoracle/sdk` [US1]
- [ ] 1.2 Default schema to `"passthrough-v1"` when not provided [US1]
- [ ] 1.3 Include commitment data (root, leaves, randomness) in `documents.register()` when `commitOutput` is provided [US1]
- [ ] 1.4 Add `encrypt` and `documents` from `@lemmaoracle/sdk` as imports [US1]

## 2. Add register() to @trust402/roles

- [ ] 2.1 Implement `register(client, { payload, holderKey, schema? })` in `packages/roles/src/index.ts` using `encrypt()` → `documents.register()` from `@lemmaoracle/sdk` [US1]
- [ ] 2.2 Default schema to `"passthrough-v1"` when not provided [US1]

## 3. Update trust402 CLI prove command

- [ ] 3.1 Add `--holder-key <hex>` option to the `prove` command in `packages/cli/src/cli.ts` [US2]
- [ ] 3.2 Call `register()` from `@trust402/identity` before `submit()`, using the `docHash` from `register()` for `proofs.submit()` [US2]
- [ ] 3.3 Output the `docHash` and `cid` in the prove command result [US2]

## 4. Update proveRoleFromArtifact in @trust402/protocol

- [ ] 4.1 Add `holderKey` parameter to `proveRoleFromArtifact()` [US2]
- [ ] 4.2 Call `register()` from `@trust402/identity` with the credential payload before submitting proofs [US2]
- [ ] 4.3 Use the `docHash` from `register()` (not `commitOutput.root`) for both identity and role proof submissions [US2]
- [ ] 4.4 Update `wrapFetchWithProof()` to accept and pass `holderKey` [US2]

## 5. Update demo agent

- [ ] 5.1 Update `payment.ts` to derive `holderKey` from `AGENT_PRIVATE_KEY` via `derivePublicKey()` and pass it to `wrapFetchWithProof()` [US3]
- [ ] 5.2 Add `HOLDER_PRIVATE_KEY` / `AGENT_PRIVATE_KEY` usage in the auto-gen artifact flow [US3] [P]

## 6. Documentation

- [ ] 6.1 Add `HOLDER_PRIVATE_KEY` / `--holder-key` to `.env.example` and CLI help text [P] [US3]
