#!/usr/bin/env node
/**
 * Register financial data documents with the Lemma oracle.
 *
 * Follows the pattern of example-x402/scripts/register-with-full-content.ts.
 *
 * This script:
 * 1. Normalizes financial data using the demo normalizer
 * 2. Registers the document with the Lemma oracle
 * 3. Receives a docHash
 * 4. Writes the mapping to registered-docs.json
 *
 * Usage:
 *   tsx scripts/register-with-full-content.ts [reportId]
 *   tsx scripts/register-with-full-content.ts          # register all
 *   tsx scripts/register-with-full-content.ts 2026q1   # register specific
 */

import { create, schemas, prepare, documents, proofs } from "@lemmaoracle/sdk";
import type { LemmaClient } from "@lemmaoracle/spec";
import * as R from "ramda";
import * as dotenv from "dotenv";
import * as fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEMO_ROOT = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(DEMO_ROOT, "..", "..", ".env") });

const LEMMA_API_KEY = process.env.LEMMA_API_KEY;

// ── Hardcoded financial data ───────────────────────────────────────────

type FinancialReport = Readonly<{
  reportId: string;
  company: string;
  period: string;
  revenue: number;
  profit: number;
}>;

const REPORTS: ReadonlyArray<FinancialReport> = [
  {
    reportId: "2026q1",
    company: "Example Corp",
    period: "2026-Q1",
    revenue: 1250000000,
    profit: 340000000,
  },
];

// ── Validation ─────────────────────────────────────────────────────────

const validateEnvironment = (): Promise<void> =>
  R.isNil(LEMMA_API_KEY)
    ? Promise.reject(new Error("LEMMA_API_KEY environment variable is required"))
    : Promise.resolve();

// ── Client factory ─────────────────────────────────────────────────────

const createLemmaClient = (): LemmaClient =>
  create({ apiKey: LEMMA_API_KEY! });

// ── Registration ───────────────────────────────────────────────────────

const registerReport = (
  client: LemmaClient,
  report: FinancialReport,
): Promise<Readonly<{ reportId: string; docHash: string }>> => {
  console.log(`Registering report: ${report.reportId}`);

  const payload = {
    reportId: report.reportId,
    company: report.company,
    period: report.period,
    revenue: String(report.revenue),
    profit: String(report.profit),
  };

  return schemas
    .getById(client, "financial-data-v1")
    .then((schemaMeta) =>
      prepare(client, {
        schema: schemaMeta.id,
        payload,
      }),
    )
    .then((prep) => {
      const normalized = prep.normalized as Record<string, unknown>;
      const docHash = `0x${normalized.integrity as string}`;

      return documents
        .register(client, {
          schema: "financial-data-v1",
          docHash,
          cid: `cid://${docHash.slice(2)}`,
          issuerId: "did:example:trust402-demo",
          subjectId: "did:example:trust402-demo",
          attributes: normalized,
          commitments: {
            scheme: "poseidon",
            root: prep.commitments.root,
            leaves: prep.commitments.leaves,
            randomness: prep.commitments.randomness,
          },
          revocation: {
            type: "none" as const,
            root: "",
          },
        })
        .then(() =>
          proofs.submit(client, {
            docHash,
            circuitId: "financial-data-v1",
            proof: "",
            inputs: [prep.commitments.root],
          }),
        )
        .then(() => {
          console.log(`  docHash: ${docHash}`);
          return { reportId: report.reportId, docHash };
        });
    });
};

// ── Write registered-docs.json ─────────────────────────────────────────

const OUTPUT_PATH = path.join(DEMO_ROOT, "resource", "registered-docs.json");

const writeRegisteredDocs = (
  entries: ReadonlyArray<Readonly<{ reportId: string; docHash: string }>>,
): void => {
  const mapping: Record<string, string> = {};
  R.forEach((entry: Readonly<{ reportId: string; docHash: string }>) => {
    mapping[entry.reportId] = entry.docHash;
  }, entries);

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(mapping, null, 2) + "\n");
  console.log(`\nWrote ${entries.length} entries to ${OUTPUT_PATH}`);
};

// ── Main ───────────────────────────────────────────────────────────────

const main = async (): Promise<void> => {
  await validateEnvironment();
  const client = createLemmaClient();

  const reportIdArg = process.argv[2];
  const reportsToRegister = R.isNil(reportIdArg)
    ? REPORTS
    : REPORTS.filter((r) => r.reportId === reportIdArg);

  R.isEmpty(reportsToRegister)
    ? (console.log(`No reports found matching: ${reportIdArg}`), process.exit(1))
    : undefined;

  console.log(
    `Registering ${reportsToRegister.length} report(s) with Lemma oracle...\n`,
  );

  const results = await Promise.all(
    R.map((report: FinancialReport) => registerReport(client, report), reportsToRegister),
  );

  writeRegisteredDocs(results);
  console.log("\nDocument registration complete!");
};

main().catch((error: unknown) => {
  console.error("Registration failed:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
