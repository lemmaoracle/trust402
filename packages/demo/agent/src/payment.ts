/**
 * Proof-gated payment execution.
 *
 * Composes wrapFetchWithProof → wrapFetchWithPayment as documented in SKILL.md:
 *   paymentFetch → proofFetch → native fetch
 *
 * Uses asyncSpinner from tui.ts for spinner animation.
 */

import * as R from "ramda";
import chalk from "chalk";
import { create } from "@lemmaoracle/sdk";
import type { LemmaClient } from "@lemmaoracle/sdk";
import { privateKeyToAccount } from "viem/accounts";
import { wrapFetchWithPayment } from "@x402/fetch";
import { x402Client } from "@x402/core/client";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { wrapFetchWithProof } from "@trust402/protocol";
import type { IdentityArtifact, ProveRoleResult, WrapFetchWithProofOptions } from "@trust402/protocol";
import type { PaymentGate } from "@trust402/roles";
import type { EnvConfig } from "./env.js";
import { asyncSpinner } from "./tui.js";

type ApiResponse = Readonly<{
  reportId: string;
  company: string;
  period: string;
  revenue: number;
  profit: number;
  attestation: string | null;
}>;

type ContractResponse = Readonly<{
  type: string;
  description: string;
  vendor: string;
  price: string;
  currency: string;
  period: string;
  attestation: string | null;
}>;

type PaymentResult = Readonly<{
  data: ApiResponse | null;
  success: boolean;
  error?: string;
}>;

type PaymentRequiredResponse = Readonly<{
  x402Version: number;
  error?: string;
  resource?: Readonly<{ url: string }>;
  accepts?: ReadonlyArray<Readonly<{ payTo?: string }>>;
}>;

const X402_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  address_not_registered:
    "Wallet address not registered with USDC EIP-3009 on Base Sepolia. The agent wallet needs USDC tokens and EIP-3009 delegation enabled.",
  insufficient_funds:
    "Insufficient USDC balance on Base Sepolia. Fund the agent wallet with USDC tokens.",
  Payment_required:
    "Payment required by the resource server.",
};

const createLemmaClient = (env: EnvConfig): LemmaClient =>
  create({ apiBase: env.lemmaApiBase, apiKey: env.lemmaApiKey });

const buildPaymentGate = (maxSpend: number): PaymentGate => ({
  role: "purchaser",
  maxSpend,
});

const decodePaymentRequired = (header: string | null): PaymentRequiredResponse | null => {
  const raw = header
    ? (() => {
      try { return JSON.parse(atob(header)); }
      catch { return null; }
    })()
    : null;
  return raw as PaymentRequiredResponse | null;
};

const describeX402Error = (error: string | undefined): string =>
  R.isNil(error) || R.isEmpty(error)
    ? "payment not accepted"
    : X402_ERROR_MESSAGES[error] ?? `x402 error: ${error}`;

const composeFetchPipeline = (
  artifact: IdentityArtifact,
  gate: PaymentGate,
  lemmaClient: LemmaClient,
  env: EnvConfig,
  proofOptions?: WrapFetchWithProofOptions,
): typeof fetch => {
  const proofFetch = wrapFetchWithProof(fetch, artifact, gate, lemmaClient, proofOptions);

  const account = privateKeyToAccount(env.agentPrivateKey as `0x${string}`);
  const client = new x402Client();
  const signer = {
    address: account.address,
    signTypedData: account.signTypedData.bind(account),
  };
  client.register("eip155:84532", new ExactEvmScheme(signer));

  return wrapFetchWithPayment(proofFetch, client);
};

export const executeProofGatedPayment = async (
  env: EnvConfig,
  artifact: IdentityArtifact,
  url: string,
  method: string,
  onProofResult?: (result: ProveRoleResult) => void,
): Promise<PaymentResult> => {
  const lemmaClient = createLemmaClient(env);
  const gate = buildPaymentGate(env.maxSpend);

  console.log(chalk.cyan(`\n💳 Executing proof-gated payment: ${method} ${url}`));
  console.log(`   Gate: role=${gate.role}, maxSpend=${gate.maxSpend}\n`);

  const proofOptions: WrapFetchWithProofOptions = {
    onProofResult,
    webhookUrl: env.keeperhubWebhookUrl,
    agentId: env.agentId,
  };
  const paymentFetch = composeFetchPipeline(artifact, gate, lemmaClient, env, proofOptions);

  const spinnerLabel = `Generating role proof and executing ${method} ${url}...`;

  const result = await asyncSpinner(spinnerLabel, async () => {
    const response = await paymentFetch(url, { method });
    const ok = response.ok;

    const text = await response.text();
    const jsonText = text.length > 0 ? text : "{}";
    const json = JSON.parse(jsonText) as ApiResponse | ContractResponse | Readonly<{ error: string }>;

    const paymentRequired = decodePaymentRequired(response.headers.get("payment-required"));

    !ok && paymentRequired
      ? console.error(chalk.dim(`  x402 error: ${paymentRequired.error ?? "unknown"}, payTo: ${paymentRequired.accepts?.[0]?.payTo ?? "none"}`))
      : undefined;

    const isError = !ok;
    const data = isError ? null : json as ApiResponse;
    const errorMessage = isError
      ? describeX402Error(paymentRequired?.error)
      : undefined;

    return { data, success: ok, error: errorMessage };
  }).catch((error: unknown) => {
    const message = error instanceof Error
      ? error.message
      : String(error);
    console.error(chalk.red(`  Payment error detail: ${message}`));
    return {
      data: null,
      success: false,
      error: message,
    } as PaymentResult;
  });

  return result;
};

export type { ApiResponse, ContractResponse, PaymentResult };
