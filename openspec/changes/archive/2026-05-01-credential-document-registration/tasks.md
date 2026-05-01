## 1. Add register() to @trust402/identity

- [x] 1.1 Implement `register(client, { credential, holderKey, schema? })` in `packages/identity/src/index.ts`: internally calls `agentCommit()` → `encrypt()` → `documents.register()`, returns `{ docHash, cid, commitOutput }` [US1] [D1] [D5]
- [x] 1.2 Default schema to `"passthrough-v1"` when not provided [US1]
- [x] 1.3 Populate `commitments` from `commitOutput.sectionHashes` as leaves, `commitOutput.root` as root, `commitOutput.salt` as randomness [US1] [D5]
- [x] 1.4 Source `issuerId` from `credential.provenance.issuerId`, `subjectId` from `credential.identity.subjectId` [US1] [D6]
- [x] 1.5 Add `encrypt` and `documents` from `@lemmaoracle/sdk` as imports [US1]

## 2. Add register() to @trust402/roles

- [x] 2.1 Implement `register(client, { payload, holderKey, schema? })` in `packages/roles/src/index.ts` using `encrypt()` → `documents.register()` from `@lemmaoracle/sdk` [US1]
- [x] 2.2 Default schema to `"passthrough-v1"` when not provided [US1]

## 3. Update trust402 CLI prove command

- [x] 3.1 Add `--holder-key <hex>` option to the `prove` command in `packages/cli/src/cli.ts` [US2]
- [x] 3.2 Call `register()` from `@trust402/identity` before `submit()`, using the `docHash` from `register()` for `proofs.submit()` and `commitOutput` for `prove()` [US2]
- [x] 3.3 Output the `docHash` and `cid` in the prove command result [US2]

## 4. Update proveRoleFromArtifact in @trust402/protocol

- [x] 4.1 Add `docHash` and `credential` to `IdentityArtifact` type [US2]
- [x] 4.2 Use `artifact.docHash` (not `commitOutput.root`) for proof submissions [US2]
- [x] 4.3 Update `parseArtifact()` to extract `docHash` and `credential` from artifact JSON [US2]
- [x] 4.4 `wrapFetchWithProof()` unchanged — registration happens at artifact generation time, not at fetch time [US2]

## 5. Update demo agent

- [x] 5.1 Add `HOLDER_PUBLIC_KEY` to `EnvConfig` and `loadEnv()` [US3]
- [x] 5.2 Update `generateArtifact()` to use `register()` → `prove()` from `@trust402/identity` instead of `agentCommit()` + `prover.prove()` [US3] [P]

## 6. Documentation

- [x] 6.1 Add `HOLDER_PUBLIC_KEY` to `.env.example` [P] [US3]
