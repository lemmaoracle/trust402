/**
 * Proof-gated payment execution.
 *
 * Supports dual payment: successful $0.01 GET and rejected $500 POST.
 * Uses asyncSpinner from tui.ts for spinner animation.
 */

import * as R from "ramda";
import chalk from "chalk";
import { create } from "@lemmaoracle/sdk";
import type { LemmaClient } from "@lemmaoracle/sdk";
import { wrapFetchWithProof } from "@trust402/protocol";
import type { IdentityArtifact, ProveRoleResult } from "@trust402/protocol";
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

const createLemmaClient = (env: EnvConfig): LemmaClient =>
  create({ apiBase: env.lemmaApiBase, apiKey: env.lemmaApiKey });

const buildPaymentGate = (maxSpend: number): PaymentGate => ({
  role: "purchaser",
  maxSpend,
});

const composeFetchPipeline = (
  artifact: IdentityArtifact,
  gate: PaymentGate,
  lemmaClient: LemmaClient,
): typeof fetch =>
  wrapFetchWithProof(fetch, artifact, gate, lemmaClient);

export const executeProofGatedPayment = async (
  env: EnvConfig,
  artifact: IdentityArtifact,
  url: string,
  method: string,
): Promise<PaymentResult> => {
  const lemmaClient = createLemmaClient(env);
  const gate = buildPaymentGate(env.maxSpend);

  console.log(chalk.cyan(`\n💳 Executing proof-gated payment: ${method} ${url}`));
  console.log(`   Gate: role=${gate.role}, maxSpend=${gate.maxSpend}\n`);

  const proofFetch = composeFetchPipeline(artifact, gate, lemmaClient);

  const spinnerLabel = `Generating role proof and executing ${method} ${url}...`;

  const result = await asyncSpinner(spinnerLabel, async () => {
    const response = await proofFetch(url, { method });
    const ok = response.ok;
    const json = await response.json() as ApiResponse | ContractResponse | Readonly<{ error: string }>;

    const isError = "error" in json;
    const data = isError ? null : json as ApiResponse;

    return { data, success: ok };
  }).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
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
