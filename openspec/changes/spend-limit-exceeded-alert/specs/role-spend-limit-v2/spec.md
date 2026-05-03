## ADDED Requirements

### Requirement: Spend limit exceeded notification on proof failure

The system SHALL notify KeeperHub when a role proof fails due to spend limit exceeding the gate ceiling.

#### Scenario: Notification triggered on spend limit exceeded
- **WHEN** `proveRoleFromArtifact` fails because `spendLimit > maxSpend` in the role-spend-limit-v2 circuit
- **THEN** `notifyKeeperHub` is called with event type `spend_limit_exceeded`, the agent ID, the configured spend limit, and the attempted spend amount

#### Scenario: Notification not triggered on other proof failures
- **WHEN** `proveRoleFromArtifact` fails for reasons other than spend limit (e.g., wrong role, expired artifact, network error)
- **THEN** `notifyKeeperHub` is NOT called

#### Scenario: Notification failure does not affect proof error propagation
- **WHEN** `notifyKeeperHub` is called but the webhook request fails
- **THEN** the original proof failure error is still propagated to the caller

### Requirement: Webhook URL configuration in wrapFetchWithProof

The system SHALL accept an optional `webhookUrl` option in `wrapFetchWithProof` for KeeperHub notifications.

#### Scenario: Webhook URL provided
- **WHEN** `wrapFetchWithProof` is called with `options.webhookUrl` set
- **THEN** the URL is passed to `proveRoleFromArtifact` for potential notification use

#### Scenario: Webhook URL not provided
- **WHEN** `wrapFetchWithProof` is called without `options.webhookUrl`
- **THEN** no notification is attempted on proof failure
