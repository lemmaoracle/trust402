## ADDED Requirements

### Requirement: CLI produces validated agent identity credential
The system SHALL provide a CLI command `trust402-agent create` that accepts identity parameters via flags and outputs a validated `AgentCredential` JSON object, using `credential()` and `validate()` from `@lemmaoracle/agent` for construction and validation. Required flags: `--agent-id`, `--subject-id`, `--roles` (comma-separated), `--issuer-id`. Optional flags: `--controller-id`, `--org-id`, `--scopes` (comma-separated), `--spend-limit`, `--currency`, `--expires-at`, `--source-system`, `--generator-id`, `--chain-id`, `--network`.

#### Scenario: Create credential with required fields only
- **WHEN** user runs `trust402-agent create --agent-id agent-1 --subject-id subject-1 --roles admin --issuer-id issuer-1`
- **THEN** CLI outputs a JSON object with `schema: "agent-identity-authority-v1"`, populated `identity` (agentId, subjectId), `authority` (roles), `lifecycle` (issuedAt set to current epoch), and `provenance` (issuerId) sections

#### Scenario: Create credential with optional fields
- **WHEN** user runs `trust402-agent create --agent-id agent-1 --subject-id subject-1 --roles admin --issuer-id issuer-1 --org-id org-1 --controller-id ctrl-1 --spend-limit 50000 --currency USD --scopes read,write --expires-at 1735689600`
- **THEN** CLI outputs a JSON object including `identity.orgId`, `identity.controllerId`, `financial.spendLimit`, `financial.currency`, `authority.scopes`, and `lifecycle.expiresAt` fields

### Requirement: CLI delegates validation to @lemmaoracle/agent
The CLI SHALL delegate all credential validation to `validate()` from `@lemmaoracle/agent`. When `validate()` returns `{ valid: false, errors }`, the CLI SHALL exit with code 1 and print all error details to stderr. The CLI SHALL NOT implement its own validation logic.

#### Scenario: Validation failure surfaces all errors
- **WHEN** `validate()` returns `{ valid: false, errors: [{ kind: "EmptyAgentId", message: "..." }, { kind: "EmptyRoles", message: "..." }] }`
- **THEN** CLI exits with code 1 and prints all errors to stderr, one per line

#### Scenario: Validation success passes through
- **WHEN** `validate()` returns `{ valid: true, credential }`
- **THEN** CLI outputs the credential JSON to stdout and exits with code 0

### Requirement: CLI outputs JSON to stdout
The CLI SHALL output the validated credential as a single JSON object to stdout, allowing piping to other tools.

#### Scenario: Pipe credential to file
- **WHEN** user runs `trust402-agent create --agent-id agent-1 --subject-id subject-1 --roles admin --issuer-id issuer-1 > credential.json`
- **THEN** `credential.json` contains a valid JSON object parseable by `JSON.parse`

### Requirement: CLI validates existing credential file
The CLI SHALL provide a `trust402-agent validate` command that reads a credential JSON file and validates it using `validate()` from `@lemmaoracle/agent`, returning exit code 0 for valid credentials and non-zero with error details for invalid ones.

#### Scenario: Valid credential file
- **WHEN** user runs `trust402-agent validate credential.json` with a valid credential
- **THEN** CLI exits with code 0 and prints "Valid"

#### Scenario: Invalid credential file
- **WHEN** user runs `trust402-agent validate credential.json` with a credential that `validate()` rejects
- **THEN** CLI exits with code 1 and prints all errors from `ValidationResult.errors`

### Requirement: CLI proves and submits credential to Lemma oracle
The CLI SHALL provide a `trust402-agent prove` command that executes the full commit → prove → submit pipeline for a given credential file. The command accepts `--credential <path>` (required) and `--api-key` (required). The `apiBase` defaults to the SDK's built-in default. The pipeline: (1) creates a `LemmaClient`, (2) calls `commit(client, credential)` from `@lemmaoracle/agent`, (3) calls `prover.prove(client, { circuitId: "agent-identity-v1", witness })` from `@lemmaoracle/sdk`, (4) calls `proofs.submit(client, payload)`.

#### Scenario: Successful prove and submit
- **WHEN** user runs `trust402-agent prove --credential credential.json --api-key $LEMMA_API_KEY`
- **THEN** CLI outputs structured JSON with `commit`, `proof`, and `submission` keys — exit code 0

#### Scenario: Prove with invalid credential
- **WHEN** user runs `trust402-agent prove --credential invalid.json --api-key $LEMMA_API_KEY` where `validate()` rejects the credential
- **THEN** CLI exits with code 1 and prints validation errors before attempting commitment

#### Scenario: Prove with missing API key
- **WHEN** user runs `trust402-agent prove --credential credential.json` without `--api-key`
- **THEN** CLI exits with code 1 and prints an error indicating `--api-key` is required

#### Scenario: Prove with network failure
- **WHEN** the Lemma API is unreachable during `commit()` or `prover.prove()`
- **THEN** CLI exits with code 1 and prints the network error details

### Requirement: CLI prove command outputs structured JSON result
The `prove` command SHALL output a structured JSON result to stdout containing: the `CommitOutput` from `commit()`, the `ProveOutput` from `prover.prove()`, and the `SubmitProofResponse` from `proofs.submit()`.

#### Scenario: Prove output is valid JSON
- **WHEN** the prove pipeline succeeds
- **THEN** stdout contains a single JSON object with keys `commit`, `proof`, and `submission` — each containing the respective API response

### Requirement: CLI prove command supports dry-run mode
The `prove` command SHALL accept an optional `--dry-run` flag that executes commit and prove but skips `proofs.submit()`.

#### Scenario: Dry-run prove
- **WHEN** user runs `trust402-agent prove --credential credential.json --api-key $KEY --dry-run`
- **THEN** CLI outputs `commit` and `proof` data but does not call `proofs.submit()` — exit code 0
