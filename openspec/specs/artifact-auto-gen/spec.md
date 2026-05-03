## ADDED Requirements

### Requirement: Auto-generation of IdentityArtifact

The demo agent SHALL provide an auto-generation function that creates an `IdentityArtifact` when the artifact file is missing and the user confirms generation. The function SHALL execute the full pipeline: credential creation → register → prove → submit → save to disk.

#### Scenario: User confirms auto-generation

- **WHEN** no artifact file exists at `ARTIFACT_PATH` and the user answers "y" to the auto-generate prompt
- **THEN** the agent SHALL create a default `AgentCredential`, register it via `@trust402/identity.register()` (which performs commit + encrypt + documents.register), prove it via `@trust402/identity.prove()`, submit the proof, and save the resulting artifact to `ARTIFACT_PATH`

#### Scenario: User declines auto-generation

- **WHEN** no artifact file exists and the user answers "n"
- **THEN** the agent SHALL exit with an error message indicating the artifact is required

#### Scenario: Auto-generation persists artifact for reuse

- **WHEN** auto-generation completes successfully
- **THEN** the artifact JSON SHALL be written to `ARTIFACT_PATH` including `commitOutput`, `identityProof`, `docHash`, and `credential` so subsequent runs can load it without regeneration

### Requirement: Default credential values for auto-generation

The auto-generation function SHALL use default values for the credential: `role: "purchaser"`, `spendLimit` from `MAX_SPEND` env var, `agentId` from `AGENT_ID` env var, and `issuerId` from `ISSUER_ID` env var.

#### Scenario: All env vars provided

- **WHEN** `AGENT_ID` and `ISSUER_ID` environment variables are set
- **THEN** the auto-generated credential SHALL use those values for `agentId` and `issuerId`

#### Scenario: AGENT_ID not set

- **WHEN** the `AGENT_ID` environment variable is not set
- **THEN** the auto-generated credential SHALL use `"did:trust402:demo-agent"` as the default `agentId`

#### Scenario: ISSUER_ID not set

- **WHEN** the `ISSUER_ID` environment variable is not set
- **THEN** the auto-generated credential SHALL use `"did:trust402:demo-issuer"` as the default `issuerId`

### Requirement: HOLDER_PUBLIC_KEY for document encryption

The auto-generation function SHALL require `HOLDER_PUBLIC_KEY` environment variable for the `register()` call's `holderKey` parameter.

#### Scenario: HOLDER_PUBLIC_KEY is set

- **WHEN** the `HOLDER_PUBLIC_KEY` environment variable is set to a valid secp256k1 compressed public key hex string
- **THEN** the auto-generation SHALL pass it as `holderKey` to `register()`

#### Scenario: HOLDER_PUBLIC_KEY is not set

- **WHEN** the `HOLDER_PUBLIC_KEY` environment variable is not set
- **THEN** the auto-generation SHALL fail with an error indicating the variable is required

### Requirement: .env path resolution fix

The demo agent CLI SHALL load environment variables from the monorepo root `.env` file (`trust402/.env`), not from `packages/demo/.env`.

#### Scenario: Environment variables loaded from monorepo root

- **WHEN** the demo agent CLI starts
- **THEN** it SHALL resolve the `.env` file path as four directories above `cli.ts` (reaching `trust402/.env`)
