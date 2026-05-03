## MODIFIED Requirements

### Requirement: Environment variable configuration
The agent SHALL read the following environment variables: `RESOURCE_URL` (demo resource server URL, required), `LEMMA_API_KEY` (Lemma API key, required), `AGENT_PRIVATE_KEY` (wallet private key for x402 payments, required), `ARTIFACT_PATH` (path to IdentityArtifact file, default `./artifact.json`), `MAX_SPEND` (spend limit in USD cents, default 1000), `AGENT_ENS_NAME` (ENS name for the agent, default `agent.trust402.eth`), `ISSUER_ENS_NAME` (ENS name for the issuer, default `issuer.trust402.eth`). When `AGENT_ENS_NAME` or `ISSUER_ENS_NAME` is set, the resolved addresses SHALL be stored in `resolvedAgentAddress` and `resolvedIssuerAddress` respectively. The existing `AGENT_ID` and `ISSUER_ID` environment variables SHALL still be supported; when set, they take precedence over the ENS name defaults.

#### Scenario: Missing required environment variable
- **WHEN** the agent starts without `RESOURCE_URL` set
- **THEN** it exits with an error message indicating the missing variable

#### Scenario: ENS name takes default
- **WHEN** the agent starts without `AGENT_ENS_NAME` or `AGENT_ID` set
- **THEN** `agentId` defaults to `agent.trust402.eth`

#### Scenario: Explicit AGENT_ID overrides ENS default
- **WHEN** the agent starts with `AGENT_ID=did:trust402:my-agent` set
- **THEN** `agentId` is `did:trust402:my-agent` and no ENS resolution occurs for the agent ID

## ADDED Requirements

### Requirement: ENS name used in credential creation
The `createTestCredential` function SHALL use the ENS name (from `env.agentId`) as `subjectId` and the issuer ENS name (from `env.issuerId`) as `issuerId` in the generated credential.

#### Scenario: Credential with ENS names
- **WHEN** `createTestCredential` is called with `env.agentId = "agent.trust402.eth"` and `env.issuerId = "issuer.trust402.eth"`
- **THEN** the resulting credential has `subjectId: "agent.trust402.eth"` and `issuerId: "issuer.trust402.eth"`

### Requirement: Startup displays ENS resolution results
The agent SHALL display ENS resolution results during startup, showing each ENS name and its resolved address (or a warning if resolution failed).

#### Scenario: Successful resolution display
- **WHEN** the agent starts and ENS names resolve successfully
- **THEN** the startup output includes lines showing `✓ agent.trust402.eth → 0x...` for each resolved name

#### Scenario: Partial resolution failure display
- **WHEN** the agent starts and one ENS name resolves but another fails
- **THEN** the startup output shows the successful resolution and a warning for the failed one
