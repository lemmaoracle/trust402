## ADDED Requirements

### Requirement: Identity document registration

The `@trust402/identity` package SHALL provide a `register()` function that encrypts a credential payload and registers it as a document in the Lemma oracle, returning `docHash` and `cid`.

#### Scenario: Successful credential document registration

- **WHEN** `register(client, { payload, holderKey, schema })` is called with a valid LemmaClient, a credential payload, a holder public key, and a schema ID
- **THEN** it SHALL encrypt the payload via `encrypt(client, { payload, holderKey })`, register the resulting document via `documents.register(client, { schema, docHash, cid, ... })`, and return `{ docHash, cid }`

#### Scenario: Register uses passthrough-v1 as default schema

- **WHEN** `register(client, { payload, holderKey })` is called without an explicit schema
- **THEN** it SHALL use `"passthrough-v1"` as the schema ID

#### Scenario: Register includes commitment data in document attributes

- **WHEN** a `commitOutput` is provided alongside the payload
- **THEN** the `documents.register()` call SHALL include the commitment root, leaves, and randomness in the `commitments` field

### Requirement: Roles document registration

The `@trust402/roles` package SHALL provide a `register()` function that encrypts a credential payload and registers it as a document in the Lemma oracle, returning `docHash` and `cid`.

#### Scenario: Successful roles document registration

- **WHEN** `register(client, { payload, holderKey, schema })` is called with a valid LemmaClient, a credential payload, a holder public key, and a schema ID
- **THEN** it SHALL encrypt the payload via `encrypt(client, { payload, holderKey })`, register the resulting document via `documents.register(client, { schema, docHash, cid, ... })`, and return `{ docHash, cid }`

#### Scenario: Register uses passthrough-v1 as default schema

- **WHEN** `register(client, { payload, holderKey })` is called without an explicit schema
- **THEN** it SHALL use `"passthrough-v1"` as the schema ID
