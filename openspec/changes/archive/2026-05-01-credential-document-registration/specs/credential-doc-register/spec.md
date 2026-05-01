## ADDED Requirements

### Requirement: Identity document registration

The `@trust402/identity` package SHALL provide a `register()` function that accepts an `AgentCredential`, performs commit + encrypt, and registers it as a document in the Lemma oracle, returning `docHash`, `cid`, and `commitOutput`.

#### Scenario: Successful credential document registration

- **WHEN** `register(client, { credential, holderKey, schema })` is called with a valid LemmaClient, an AgentCredential, a holder public key, and an optional schema ID
- **THEN** it SHALL:
  1. Commit the credential via `agentCommit(client, credential)`
  2. Encrypt the credential via `encrypt(client, { payload: credential, holderKey })`
  3. Register the resulting document via `documents.register(client, { schema, docHash, cid, commitments, issuerId, subjectId, ... })`
  4. Return `{ docHash, cid, commitOutput }`

#### Scenario: Register uses passthrough-v1 as default schema

- **WHEN** `register(client, { credential, holderKey })` is called without an explicit schema
- **THEN** it SHALL use `"passthrough-v1"` as the schema ID

#### Scenario: Register populates commitments from commitOutput section hashes

- **WHEN** `register()` is called with a credential
- **THEN** the `documents.register()` call SHALL include:
  - `commitments.root` = `commitOutput.root`
  - `commitments.leaves` = values from `commitOutput.sectionHashes` (the section hashes)
  - `commitments.randomness` = `commitOutput.salt`
  - `commitments.scheme` = `"poseidon"`

#### Scenario: Register sources issuerId and subjectId from credential

- **WHEN** `register()` is called with a credential
- **THEN** the `documents.register()` call SHALL use `credential.provenance.issuerId` as `issuerId` and `credential.identity.subjectId` as `subjectId`

#### Scenario: Register returns commitOutput for downstream prove()

- **WHEN** `register()` completes successfully
- **THEN** the returned `commitOutput` SHALL be usable as input to `prove(client, commitOutput)`

### Requirement: Roles document registration

The `@trust402/roles` package SHALL provide a `register()` function that encrypts a credential payload and registers it as a document in the Lemma oracle, returning `docHash` and `cid`.

#### Scenario: Successful roles document registration

- **WHEN** `register(client, { payload, holderKey, schema })` is called with a valid LemmaClient, a credential payload, a holder public key, and a schema ID
- **THEN** it SHALL encrypt the payload via `encrypt(client, { payload, holderKey })`, register the resulting document via `documents.register(client, { schema, docHash, cid, commitments, ... })`, and return `{ docHash, cid }`

#### Scenario: Register uses passthrough-v1 as default schema

- **WHEN** `register(client, { payload, holderKey })` is called without an explicit schema
- **THEN** it SHALL use `"passthrough-v1"` as the schema ID
