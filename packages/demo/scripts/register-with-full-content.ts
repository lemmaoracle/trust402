#!/usr/bin/env node
/**
 * Register financial data documents with the Lemma oracle.
 *
 * Follows the pattern of example-mw/packages/server/src/report.ts.
 *
 * This script:
 * 1. Defines the schema (downloads WASM normalizer)
 * 2. Encrypts the payload to obtain docHash and CID
 * 3. Normalizes and commits the data
 * 4. Registers the document with the Lemma oracle
 * 5. Generates ZK proof via prover.prove (Merkle inclusion)
 * 6. Submits proof via proofs.submit
 * 7. Writes the mapping to registered-docs.json
 *
 * Usage:
 *   tsx scripts/register-with-full-content.ts [reportId]
 *   tsx scripts/register-with-full-content.ts          # register all
 *   tsx scripts/register-with-full-content.ts 2026q1   # register specific
 */

import { create, define, schemas, prepare, encrypt, documents, prover, proofs } from "@lemmaoracle/sdk";
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
const HOLDER_PRIVATE_KEY = process.env.HOLDER_PRIVATE_KEY ?? "";
const CIRCUIT_ID = "financial-data-v1.8";
const CHAIN_ID = 84532;

// ── Hardcoded financial data ───────────────────────────────────────────

type FinancialReport = Readonly<{
  reportId: string;
  company: string;
  period: string;
  revenue: string;
  profit: string;
}>;

const REPORTS: ReadonlyArray<FinancialReport> = [
  {
    reportId: "2026q1",
    company: "Example Corp",
    period: "2026-Q1",
    revenue: "$1.25B",
    profit: "$340M",
  },
];

// ── Validation ─────────────────────────────────────────────────────────

const validateEnvironment = (): Promise<void> =>
  R.any(R.isNil, [LEMMA_API_KEY, HOLDER_PRIVATE_KEY])
    ? Promise.reject(new Error("LEMMA_API_KEY and HOLDER_PRIVATE_KEY environment variables are required"))
    : Promise.resolve();

// ── Client factory ─────────────────────────────────────────────────────

const createLemmaClient = (): LemmaClient =>
  create({ apiKey: LEMMA_API_KEY! });

// ── Holder public key derivation ───────────────────────────────────────

const { derivePublicKey } = await import("@lemmaoracle/sdk");

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
    revenue: report.revenue,
    profit: report.profit,
  };

  const holderPublicKey = derivePublicKey(HOLDER_PRIVATE_KEY);

  return schemas
    .getById(client, CIRCUIT_ID)
    .then((schemaMeta) => define(schemaMeta))
    .then((schemaDef) =>
      Promise.all([
        encrypt(client, { payload, holderKey: holderPublicKey }),
        prepare(client, { schema: schemaDef.id, payload }),
      ]),
    )
    .then(([enc, prep]) => {
      const normalized = prep.normalized as Record<string, unknown>;

      return documents
        .register(client, {
          schema: CIRCUIT_ID,
          docHash: enc.docHash,
          cid: enc.cid,
          issuerId: "did:example:trust402-demo",
          subjectId: "did:example:trust402-demo",
          attributes: normalized,
          commitments: {
            scheme: prep.commitments.scheme,
            root: prep.commitments.root,
            leaves: prep.commitments.leaves,
            randomness: prep.commitments.randomness,
          },
          chainId: CHAIN_ID,
          revocation: {
            type: "none" as const,
            root: "",
          },
        })
        .then(() => {
          console.log("  Document registered. Generating ZK proof...");

          // Pick the first attribute for Merkle inclusion proof
          const leafPreimages = prep.leafPreimages as ReadonlyArray<Readonly<{
            name: string;
            value: string | number;
            nameHash: string;
            valueHash: string;
            blindingHash: string;
          }>>;
          const inclusionProofs = prep.inclusionProofs as ReadonlyArray<Readonly<{
            siblings: ReadonlyArray<string>;
            indices: ReadonlyArray<number>;
          }>>;

          const pre = leafPreimages[0];
          const inclusionProof = inclusionProofs[0];

          const CIRCUIT_DEPTH = 3;

          const witness: Record<string, unknown> = {
            commitmentRoot: BigInt(prep.commitments.root).toString(),
            nameHash: BigInt(pre.nameHash).toString(),
            valueHash: BigInt(pre.valueHash).toString(),
            blinding: BigInt(prep.commitments.randomness).toString(),
            pathElements: inclusionProof.siblings.map((s: string) => BigInt(s).toString()),
            pathIndices: inclusionProof.indices,
          };

          console.log(`  Witness: commitmentRoot=${prep.commitments.root}, leaf="${pre.name}"`);

          return prover.prove(client, {
            circuitId: CIRCUIT_ID,
            witness,
          }).then((zkResult) => {
            console.log(`  Proof generated (${typeof zkResult.proof === "string" ? zkResult.proof.substring(0, 20) + "..." : "object"})`);

            return proofs.submit(client, {
              docHash: enc.docHash,
              circuitId: CIRCUIT_ID,
              proof: zkResult.proof,
              inputs: zkResult.inputs,
              onchain: true,
              chainId: CHAIN_ID,
            });
          });
        })
        .then((proofResult) => {
          console.log(`  Proof submitted: ${proofResult.status ?? "ok"}`);
          console.log(`  docHash: ${enc.docHash}`);
          console.log(`  cid:     ${enc.cid}`);
          return { reportId: report.reportId, docHash: enc.docHash };
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
