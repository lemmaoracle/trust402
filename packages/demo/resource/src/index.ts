/**
 * Trust402 Demo Resource Server
 *
 * x402 paid REST API serving corporate IR financial data.
 * Uses @lemmaoracle/x402 (Lemma-augmented x402 middleware) following
 * the pattern from example-x402/packages/worker/src/index.ts:17-23.
 *
 * Endpoints:
 *   GET /ir/:reportId  — Financial data ($0.01 USDC, includes docHash attestation)
 *   POST /contract     — High-value contract data ($500 USDC, includes docHash attestation)
 *   GET /              — Health check
 */

import { Hono } from "hono";
import {
  HTTPFacilitatorClient,
  x402ResourceServer,
  paymentMiddleware,
  ExactEvmScheme,
} from "@lemmaoracle/x402";
import { createFacilitatorConfig } from "@coinbase/x402";
import * as R from "ramda";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ── Types ──────────────────────────────────────────────────────────────

type Env = Readonly<{
  PAY_TO_ADDRESS: string;
  FACILITATOR_URL: string;
  CDP_API_KEY_ID?: string;
  CDP_API_KEY_SECRET?: string;
  LEMMA_API_BASE?: string;
  LEMMA_API_KEY?: string;
  LEMMA_RELAY_URL?: string;
  PORT?: string;
  VERIFIER_CONTRACT_ADDRESS?: string;
}>;

type FinancialReport = Readonly<{
  reportId: string;
  company: string;
  period: string;
  revenue: number;
  profit: number;
}>;

type ContractData = Readonly<{
  type: string;
  description: string;
  vendor: string;
  price: string;
  currency: string;
  period: string;
  attestation: string | null;
}>;

type AttestedReport = FinancialReport & Readonly<{
  attestation: string | null;
}>;

// ── Hardcoded financial data ───────────────────────────────────────────

const REPORTS: Readonly<Record<string, FinancialReport>> = {
  "2026q1": {
    reportId: "2026q1",
    company: "Example Corp",
    period: "2026-Q1",
    revenue: 1250000000,
    profit: 340000000,
  },
};

// ── Hardcoded contract data ───────────────────────────────────────────

const CONTRACT_DATA: ContractData = {
  type: "contract",
  description: "Master Service Agreement — Full historical financial data access for Example Corp",
  vendor: "Example Corp",
  price: "$500",
  currency: "USDC",
  period: "Full History",
  attestation: null,
};

// ── Pre-registered docHash loading ─────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const loadRegisteredDocs = (): Readonly<Record<string, string>> => {
  const docsPath = path.resolve(__dirname, "..", "registered-docs.json");
  const fileExists = fs.existsSync(docsPath);
  const loaded = fileExists
    ? JSON.parse(fs.readFileSync(docsPath, "utf8")) as Record<string, string>
    : {};
  R.isEmpty(loaded) && fileExists === false
    ? console.warn("Warning: registered-docs.json not found. Attestations will be null.")
    : undefined;
  return loaded;
};

const registeredDocs = loadRegisteredDocs();

// ── x402 route configuration ───────────────────────────────────────────

const buildRoutes = (payTo: string) => ({
  "GET /ir/:reportId": {
    accepts: [
      {
        scheme: "exact" as const,
        price: "$0.01",
        network: "eip155:84532" as const,
        payTo,
        extra: {
          name: "USDC",
          version: "2",
        },
      },
    ],
    description: "Corporate IR financial data with Lemma-verified attestation",
    mimeType: "application/json",
    extensions: { lemma: {} },
  },
  "POST /contract": {
    accepts: [
      {
        scheme: "exact" as const,
        price: "$500",
        network: "eip155:84532" as const,
        payTo,
        extra: {
          name: "USDC",
          version: "2",
        },
      },
    ],
    description: "High-value corporate contract API with Lemma-verified attestation",
    mimeType: "application/json",
    extensions: { lemma: {} },
  },
});

// ── App ────────────────────────────────────────────────────────────────

const app = new Hono<{ Bindings: Env }>();

// x402 middleware
app.use("*", async (c, next) => {
  const payTo = c.env.PAY_TO_ADDRESS;

  R.isEmpty(payTo)
    ? (console.warn("PAY_TO_ADDRESS not set, skipping x402 middleware"), await next())
    : undefined;

  // Use OpenX402 (no auth required) unless CDP keys are provided
  const hasCdpKeys = R.isNotEmpty(c.env.CDP_API_KEY_ID ?? "") && R.isNotEmpty(c.env.CDP_API_KEY_SECRET ?? "");

  const facilitatorConfig = hasCdpKeys
    ? {
        url: (c.env.FACILITATOR_URL ?? "https://api.cdp.coinbase.com/platform/v2/x402").replace(/\/$/, ""),
        ...createFacilitatorConfig(c.env.CDP_API_KEY_ID, c.env.CDP_API_KEY_SECRET),
      }
    : {
        url: (c.env.FACILITATOR_URL ?? "https://facilitator.openx402.ai").replace(/\/$/, ""),
      };

  const facilitatorClient = new HTTPFacilitatorClient(facilitatorConfig);

  const lemmaConfig = {
    apiBase: c.env.LEMMA_API_BASE ?? "",
    apiKey: c.env.LEMMA_API_KEY,
    relayUrl: c.env.LEMMA_RELAY_URL ?? "https://p01--lemma-relay-api--svxwx5rc5jzx.code.run/",
    circuitId: "x402-payment-v1",
  };

  const resourceServer = new x402ResourceServer(facilitatorClient, lemmaConfig)
    .register("eip155:84532", new ExactEvmScheme());

  const routes = buildRoutes(payTo);
  const middleware = paymentMiddleware(routes, resourceServer);
  return middleware(c, next);
});

// ── GET /ir/:reportId ──────────────────────────────────────────────────

app.get("/ir/:reportId", (c) => {
  const reportId = c.req.param("reportId");
  const report = R.prop(reportId, REPORTS);

  const reportNotFound = R.isNil(report);
  const docHash = R.prop(reportId, registeredDocs);

  const attestation: string | null = R.isNil(docHash) ? null : docHash;

  const response: AttestedReport | Readonly<{ error: string }> = reportNotFound
    ? { error: "Report not found" }
    : { ...report, attestation };

  const status = reportNotFound ? 404 : 200;

  R.isNil(docHash) && !reportNotFound
    ? c.header("X-Attestation-Warning", "not-registered")
    : undefined;

  return c.json(response, status as 200);
});

// ── POST /contract ────────────────────────────────────────────────────

app.post("/contract", (c) => {
  const docHash = R.prop("contract", registeredDocs);

  const attestation: string | null = R.isNil(docHash) ? null : docHash;

  R.isNil(docHash)
    ? c.header("X-Attestation-Warning", "not-registered")
    : undefined;

  const response: ContractData = { ...CONTRACT_DATA, attestation };

  return c.json(response, 200);
});

// ── Health check ───────────────────────────────────────────────────────

app.get("/", (c) =>
  c.json({
    status: "ok",
    service: "trust402-demo-resource",
  }),
);

// ── Server startup ─────────────────────────────────────────────────────

const PORT = Number(process.env.PORT ?? 3001);

const start = (): void => {
  console.log(`Trust402 demo resource server starting on port ${PORT}`);
  console.log(`Endpoints:`);
  console.log(`  GET /ir/:reportId  — Corporate IR financial data ($0.01 USDC)`);
  console.log(`  POST /contract     — High-value contract data ($500 USDC)`);
  console.log(`  GET /              — Health check`);
};

export { app, start, PORT };
