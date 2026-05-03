import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { notifyKeeperHub } from "./keeperhub.js";

describe("notifyKeeperHub", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("should not make HTTP request when webhook URL is undefined", async () => {
    await notifyKeeperHub(undefined, "agent-1", 1000, 2000);

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("should not make HTTP request when webhook URL is empty string", async () => {
    await notifyKeeperHub("", "agent-1", 1000, 2000);

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("should POST to webhook URL with correct payload", async () => {
    const webhookUrl = "https://app.keeperhub.com/api/integrations/webhook/test-id";

    await notifyKeeperHub(webhookUrl, "agent-1", 1000, 2000);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      webhookUrl,
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );

    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(call[1].body as string);

    expect(body.event).toBe("spend_limit_exceeded");
    expect(body.agentId).toBe("agent-1");
    expect(body.spendLimit).toBe(1000);
    expect(body.attempted).toBe(2000);
    expect(typeof body.timestamp).toBe("number");
  });

  it("should include Authorization header when apiKey is provided", async () => {
    const webhookUrl = "https://app.keeperhub.com/api/integrations/webhook/test-id";

    await notifyKeeperHub(webhookUrl, "agent-1", 1000, 2000, "kh-secret-key");

    expect(global.fetch).toHaveBeenCalledWith(
      webhookUrl,
      expect.objectContaining({
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer kh-secret-key",
        },
      }),
    );
  });

  it("should not include Authorization header when apiKey is undefined", async () => {
    const webhookUrl = "https://app.keeperhub.com/api/integrations/webhook/test-id";

    await notifyKeeperHub(webhookUrl, "agent-1", 1000, 2000);

    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[1].headers).not.toHaveProperty("Authorization");
  });

  it("should silently ignore network errors", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    await expect(
      notifyKeeperHub("https://example.com/webhook", "agent-1", 1000, 2000),
    ).resolves.toBeUndefined();
  });

  it("should silently ignore 4xx/5xx responses", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 500 }));

    await expect(
      notifyKeeperHub("https://example.com/webhook", "agent-1", 1000, 2000),
    ).resolves.toBeUndefined();
  });
});
