## MODIFIED Requirements

### Requirement: Circuit registration for role-spend-limit-v2

The system SHALL provide an updated registration script that uploads circuit artifacts to IPFS via Pinata and registers circuit metadata with the Lemma oracle using `circuits.register` with circuit ID `role-spend-limit-v2`. The registration script SHALL read the verifier address from the `ROLES_VERIFIER_ADDRESS` environment variable instead of `VERIFIER_ADDRESS`.

#### Scenario: Successful circuit registration

- **WHEN** compiled circuit artifacts and Pinata API keys are available and the registration script runs
- **THEN** artifacts are uploaded to IPFS and circuit metadata is registered with the oracle via `circuits.register` with `circuitId: "role-spend-limit-v2"` and public inputs `["requiredRoleHash", "maxSpend", "nowSec", "roleGateCommitment", "credentialCommitmentPublic"]`

#### Scenario: Verifier address read from ROLES_VERIFIER_ADDRESS

- **WHEN** the registration script reads the verifier address for on-chain verifier metadata
- **THEN** it SHALL read the value from the `ROLES_VERIFIER_ADDRESS` environment variable, defaulting to `"0x0000000000000000000000000000000000000000"` if not set

## ADDED Requirements

### Requirement: Package-scoped verifier address environment variables

The monorepo SHALL use package-scoped environment variable names for verifier contract addresses to avoid ambiguity between the `@trust402/roles` and `@trust402/demo` packages.

#### Scenario: Roles registration script uses ROLES_VERIFIER_ADDRESS

- **WHEN** the `@trust402/roles` registration script reads the verifier address
- **THEN** it SHALL use the `ROLES_VERIFIER_ADDRESS` environment variable

#### Scenario: Demo registration script uses DEMO_VERIFIER_ADDRESS

- **WHEN** the `@trust402/demo` registration script reads the verifier address
- **THEN** it SHALL use the `DEMO_VERIFIER_ADDRESS` environment variable

#### Scenario: Root .env.example documents both variables

- **WHEN** a developer inspects the root `.env.example`
- **THEN** it SHALL contain both `ROLES_VERIFIER_ADDRESS` and `DEMO_VERIFIER_ADDRESS` entries with descriptions, and SHALL NOT contain a bare `VERIFIER_ADDRESS` entry
