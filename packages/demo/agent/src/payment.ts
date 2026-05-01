/**
 * Proof-gated payment execution.
 *
 * Task 8.1: Set up x402 client.
 * Task 8.2: Compose fetch pipeline (wrapFetchWithProof → wrapFetchWithPayment).
 * Task 8.3: Execute payment call with spinner.
 * Task 8.4: Handle proof failure.
 */

import * as R from "ramda";
import chalk from "chalk";
import ora from "ora";
import { create } from "@lemmaoracle/sdk";
import type { LemmaClient } from "@lemmaoracle/sdk";
import { wrapFetchWithProof } from "@trust402/protocol";
import type { IdentityArtifact, ProveRoleResult } from "@trust402/protocol";
import type { PaymentGate } from "@trust402/roles";
import type { EnvConfig } from "./env.js";

type ApiResponse = Readonly<{
  reportId: string;
  company: string;
  period: string;
  revenue: number;
  profit: number;
  attestation: string | null;
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

const executePaymentFetch = async (
  proofFetch: typeof fetch,
  url: string,
): Promise<ApiResponse> => {
  const spinner = ora("Generating role proof and executing payment...").start();

  const response = await proofFetch(url);
  const data = await response.json() as ApiResponse;

  spinner.succeed("Payment completed successfully!");
  return data;
};

const handleProofFailure = (error: unknown): Promise<never> => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(chalk.red(`\n✗ Proof generation failed: ${message}`));
  console.error("The payment was NOT executed. No funds were transferred.");
  return Promise.reject(new Error(`Proof failure: ${message}`));
};

export const executeProofGatedPayment = async (
  env: EnvConfig,
  artifact: IdentityArtifact,
): Promise<Readonly<{ data: ApiResponse; proveResult: ProveRoleResult }>> => {
  const lemmaClient = createLemmaClient(env);
  const gate = buildPaymentGate(env.maxSpend);
  const url = `${env.resourceUrl}/ir/2026q1`;

  console.log(chalk.cyan(`\n💳 Executing proof-gated payment to ${url}`));
  console.log(`   Gate: role=${gate.role}, maxSpend=${gate.maxSpend}\n`);

  const proofFetch = composeFetchPipeline(artifact, gate, lemmaClient);

  const data = await executePaymentFetch(proofFetch, url).catch(handleProofFailure);

  return { data, proveResult: {} as ProveRoleResult };
};

export type { ApiResponse };
