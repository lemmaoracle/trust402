## ADDED Requirements

### Requirement: ENS name to address resolution
The system SHALL resolve ENS names to Ethereum addresses using viem's `getEnsAddress` at startup, using the RPC endpoint specified by `BASE_SEPOLIA_RPC_URL`.

#### Scenario: Successful ENS resolution
- **WHEN** `AGENT_ENS_NAME` is set to `agent.trust402.eth` and `BASE_SEPOLIA_RPC_URL` points to a valid RPC endpoint
- **THEN** the system resolves the ENS name to its corresponding Ethereum address and logs both the name and resolved address

#### Scenario: ENS resolution failure
- **WHEN** `AGENT_ENS_NAME` is set but the ENS name does not exist or the RPC endpoint is unreachable
- **THEN** the system logs a warning indicating the resolution failure and continues startup with `resolvedAgentAddress` set to `undefined`

#### Scenario: No ENS name configured
- **WHEN** `AGENT_ENS_NAME` is not set
- **THEN** the system skips ENS resolution entirely and `resolvedAgentAddress` is `undefined`

### Requirement: Separate async ENS resolution step
The system SHALL provide a `resolveEnsNames` async function that takes an `EnvConfig` and returns an updated `EnvConfig` with resolved addresses. This function SHALL be called after `validateEnv` and before any credential or artifact operations.

#### Scenario: Resolution step invocation
- **WHEN** the demo agent starts and `validateEnv` completes successfully
- **THEN** `resolveEnsNames` is called with the validated `EnvConfig` before credential generation or artifact loading

### Requirement: ENS resolution logging
The system SHALL log the ENS name and resolved address for each successfully resolved name using formatted console output.

#### Scenario: Logging resolved addresses
- **WHEN** `AGENT_ENS_NAME` resolves to `0xABC...123`
- **THEN** the system logs a message like `✓ agent.trust402.eth → 0xABC...123`

#### Scenario: Logging resolution failure
- **WHEN** `AGENT_ENS_NAME` fails to resolve
- **THEN** the system logs a warning like `⚠ Could not resolve agent.trust402.eth`
