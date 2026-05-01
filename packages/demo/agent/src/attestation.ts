/**
 * Attestation verification via Lemma oracle.
 *
 * Task 9.1: Extract docHash from API response.
 * Task 9.2: Call Lemma oracle to verify attestation.
 * Task 9.3: Handle verification failure (display warning, continue).
 * Task 9.4: Display verification result.
 */

import * as R from "ramda";
import chalk from "chalk";
import ora from "ora";
import { create } from "@lemmaoracle/sdk";
import type { LemmaClient } from "@lemmaoracle/sdk";
import type { EnvConfig } from "./env.js";
import type { ApiResponse } from "./payment.js";

type AttestationResult = Readonly<{
  docHash: string;
  verified: boolean;
  error?: string;
}>;

const extractDocHash = (response: ApiResponse): string | null =>
  response.attestation;

const verifyWithLemma = async (
  client: LemmaClient,
  docHash: string,
): Promise<AttestationResult> => {
  const spinner = ora("Verifying attestation with Lemma oracle...").start();

  const verified = await fetch(
    `${client.apiBase ?? ""}/v1/verified-attributes/query`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": client.apiKey ?? "",
      },
      body: JSON.stringify({ attributes: [], docHash }),
    },
  )
    .then((res) => res.json() as Promise<Record<string, unknown>>)
    .then((data) => {
      const results = data.results as ReadonlyArray<Record<string, unknown>>;
      const hasProof = R.isNotEmpty(results) && !R.isNil(R.head(results)?.proof);
      return { docHash, verified: hasProof };
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      return { docHash, verified: false, error: message };
    });

  verified.verified
    ? spinner.succeed("Attestation verified!")
    : spinner.warn("Attestation verification returned unverified");

  return verified;
};

export const verifyAttestation = async (
  env: EnvConfig,
  response: ApiResponse,
): Promise<AttestationResult> => {
  const docHash = extractDocHash(response);

  const noAttestation = R.isNil(docHash);
  noAttestation
    ? console.log(chalk.yellow("\n⚠️  No attestation (docHash) in response — skipping verification"))
    : undefined;

  const handleMissing = (): AttestationResult => ({
    docHash: "none",
    verified: false,
    error: "No attestation field in API response",
  });

  const handlePresent = async (): Promise<AttestationResult> => {
    const client = create({ apiBase: env.lemmaApiBase, apiKey: env.lemmaApiKey });
    const result = await verifyWithLemma(client, docHash!);

    result.verified
      ? console.log(chalk.green(`✓ Attestation verified — this financial data is certified (docHash: ${docHash})`))
      : console.log(chalk.yellow(`⚠️  Attestation could not be verified (docHash: ${docHash})`));

    result.error
      ? console.log(chalk.yellow(`   Error: ${result.error}`))
      : undefined;

    return result;
  };

  return noAttestation ? handleMissing() : handlePresent();
};

export type { AttestationResult };
