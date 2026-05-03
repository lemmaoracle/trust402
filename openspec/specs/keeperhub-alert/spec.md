### Requirement: notifyKeeperHub function

The system SHALL provide a `notifyKeeperHub` function that sends a spend limit exceeded event to KeeperHub Webhook via HTTP POST.

#### Scenario: Successful webhook notification
- **WHEN** `notifyKeeperHub` is called with a valid webhook URL and event payload containing `event: "spend_limit_exceeded"`, `agentId`, `spendLimit`, and `attempted`
- **THEN** the function sends a POST request to the webhook URL with JSON body and returns `Promise<void>`

#### Scenario: Webhook URL not configured
- **WHEN** `notifyKeeperHub` is called with `undefined` or empty webhook URL
- **THEN** the function returns immediately without making any HTTP request

#### Scenario: Webhook request fails
- **WHEN** the POST request to the webhook URL fails (network error, 4xx/5xx response)
- **THEN** the function catches the error and returns silently without throwing

### Requirement: Event payload structure

The system SHALL send webhook events with a structured JSON payload.

#### Scenario: Event payload format
- **WHEN** a spend limit exceeded event is sent
- **THEN** the JSON payload contains: `event: "spend_limit_exceeded"`, `agentId: string`, `spendLimit: number`, `attempted: number`, `timestamp: number`

#### Scenario: Content-Type header
- **WHEN** the webhook POST request is sent
- **THEN** the `Content-Type` header is set to `application/json`
