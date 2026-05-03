/**
 * KeeperHub Webhook notification for spend limit exceeded events.
 *
 * Fire-and-forget notification to KeeperHub when ZK proof fails due to
 * spend limit exceeding the payment gate ceiling.
 */

import type { SpendLimitExceededEvent, KeeperHubEvent } from "./types.js";

const isNonEmptyString = (value: string | undefined): value is string =>
  value !== undefined && value.length > 0;

const createSpendLimitExceededPayload = (
  agentId: string,
  spendLimit: number,
  attempted: number,
): SpendLimitExceededEvent => ({
  event: "spend_limit_exceeded",
  agentId,
  spendLimit,
  attempted,
  timestamp: Date.now(),
});

const postWebhook = async (
  webhookUrl: string,
  payload: KeeperHubEvent,
): Promise<void> => {
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // Fire-and-forget: silently ignore errors
  }
};

/**
 * Send a spend limit exceeded event to KeeperHub Webhook.
 *
 * @param webhookUrl - The KeeperHub Webhook URL. If empty/undefined, no notification is sent.
 * @param agentId - The agent identifier that exceeded the spend limit.
 * @param spendLimit - The configured spend limit.
 * @param attempted - The attempted spend amount that exceeded the limit.
 */
export const notifyKeeperHub = (
  webhookUrl: string | undefined,
  agentId: string,
  spendLimit: number,
  attempted: number,
): Promise<void> => {
  if (!isNonEmptyString(webhookUrl)) {
    return Promise.resolve();
  }

  const payload = createSpendLimitExceededPayload(agentId, spendLimit, attempted);
  return postWebhook(webhookUrl, payload);
};
