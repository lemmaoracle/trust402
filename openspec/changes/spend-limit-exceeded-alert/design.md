## Context

Currently, `wrapFetchWithProof` calls `proveRoleFromArtifact`, which generates the role proof internally. When the proof fails due to spend limit exceeding, the error is caught and re-thrown via `rejectRoleFailure` as "Role proof generation failed", but no external notification is sent.

KeeperHub provides Webhook integration, allowing events to be sent via `POST /api/integrations/webhook/{webhookId}`. This endpoint is used to notify spend limit exceeded events in real-time.

## Goals / Non-Goals

**Goals:**
- Send events to KeeperHub Webhook when proof fails due to spend limit exceeding
- Use only existing `fetch` API, avoiding additional SDK dependencies
- Configure Webhook URL via environment variable, skip notification if unset

**Non-Goals:**
- Integrating KeeperHub SDK
- Notifying other error types (role mismatch, network errors, etc.)
- Implementing retry logic

## Decisions

### Decision 1: Place `notifyKeeperHub` function in a separate module

**Choice:** Create new `packages/protocol/src/keeperhub.ts`

**Rationale:**
- Separation of concerns: Decouple Webhook notification logic from proof logic
- Testability: Testable at module level
- Reusability: Usable for other event types in the future

**Alternative:** Implement inline in `wrap-fetch-with-proof.ts`
- Rejected: Mixing concerns, difficult to test

### Decision 2: Detect error in proof failure catch block

**Choice:** Detect spend limit exceeding in `proveRole` catch within `proveRoleFromArtifact`

**Rationale:**
- `proveRole` fails on `role-spend-limit-v2` circuit constraint violation (`spendLimit > maxSpend`)
- Identify spend limit exceeding via error message or error type

**Alternative:** Validate before witness construction
- Rejected: Duplicates circuit constraints, difficult to determine exact proof failure reason in advance

### Decision 3: Webhook notification is fire-and-forget

**Choice:** Silently ignore notification failures and continue original processing

**Rationale:**
- Notification is an auxiliary feature and should not block the main flow
- Prevents network errors from affecting main processing

## Risks / Trade-offs

- **[Risk] Notification not delivered if Webhook URL is incorrect**
  → Mitigation: No environment variable validation, silently ignore fetch failures

- **[Risk] Potential false positives for non-spend-limit errors**
  → Mitigation: Only notify when error message contains "spend" or "limit"

- **[Trade-off] No retry**
  → Prioritize simplicity over notification reliability. Can be added later if needed.
