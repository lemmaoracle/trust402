#!/usr/bin/env node
/**
 * Register the financial-data circuit and schema with Lemma.
 *
 * This script:
 * 1. Registers the circuit schema (financial-data-v1)
 * 2. Registers the circuit metadata with verifier information
 *
 * Prerequisites:
 * - LEMMA_API_KEY environment variable
 * - Circuit artifacts built (run `pnpm build` first)
 * - Verifier contract deployed (run `pnpm deploy-verifier` first)
 */

import { create, schemas, circuits } from "@lemmaoracle/sdk";
import type { LemmaClient, SchemaMeta, CircuitMeta } from "@lemmaoracle/spec";
import * as R from "ramda";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEMO_ROOT = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(DEMO_ROOT, "..", "..", ".env") });

const LEMMA_API_KEY = process.env.LEMMA_API_KEY;
const VERIFIER_ADDRESS =
  process.env.VERIFIER_ADDRESS ?? "0x0000000000000000000000000000000000000000";
const CHAIN_ID = Number(process.env.CHAIN_ID ?? 84532);

// ── Constants ──────────────────────────────────────────────────────────

const SCHEMA_ID = "financial-data-v1";
const CIRCUIT_ID = "financial-data-v1";

// ── Validation ─────────────────────────────────────────────────────────

const validateEnvironment = (): Promise<void> =>
  R.isNil(LEMMA_API_KEY)
    ? Promise.reject(new Error("LEMMA_API_KEY environment variable is required"))
    : Promise.resolve();

// ── Client factory ─────────────────────────────────────────────────────

const createLemmaClient = (): LemmaClient =>
  create({ apiKey: LEMMA_API_KEY! });

// ── Schema registration ────────────────────────────────────────────────

const buildSchemaMeta = (): SchemaMeta => ({
  id: SCHEMA_ID,
  description:
    "Corporate IR financial data — quarterly report with revenue, profit, and attestation docHash",
  normalize: {
    artifact: {
      type: "wasm",
      wasm: "",
      js: "",
    },
    hash: "",
    abi: {
      raw: {
        reportId: "string",
        company: "string",
        period: "string",
        revenue: "integer",
        profit: "integer",
      },
      norm: {
        reportId: "field",
        company: "field",
        period: "field",
        revenue: "field",
        profit: "field",
      },
    },
  },
  metadata: {
    type: "financial-data",
    version: "1.0.0",
    purpose: "Corporate IR financial report with ZK attestation verification",
    implementation: "rust-wasm",
    circuitReady: true,
  },
});

const registerSchema = (client: LemmaClient): Promise<SchemaMeta> => {
  const schemaMeta = buildSchemaMeta();
  console.log(`Registering schema: ${schemaMeta.id}`);
  return schemas.register(client, schemaMeta);
};

// ── Circuit registration ───────────────────────────────────────────────

const buildCircuitMeta = (networks: ReadonlyArray<Readonly<{ chainId: number; address: string }>>): CircuitMeta => ({
  circuitId: CIRCUIT_ID,
  schema: SCHEMA_ID,
  description:
    "Financial data attestation circuit — proves hash(fields) == claimedDocHash using Poseidon",
  inputs: ["reportId", "company", "period", "revenue", "profit", "claimedDocHash"],
  verifiers: R.map(
    (entry: Readonly<{ chainId: number; address: string }>) => ({
      type: "onchain",
      address: entry.address,
      chainId: entry.chainId,
      alg: "groth16-bn254-snarkjs",
    }),
    networks,
  ),
  artifact: {
    location: {
      type: "local",
      wasm: "",
      zkey: "",
    },
  },
});

const registerCircuit = (client: LemmaClient): Promise<CircuitMeta> => {
  const networks = [{ chainId: CHAIN_ID, address: VERIFIER_ADDRESS }];
  const circuitMeta = buildCircuitMeta(networks);
  console.log(`Registering circuit: ${circuitMeta.circuitId}`);
  return circuits.register(client, circuitMeta);
};

// ── Main pipeline ──────────────────────────────────────────────────────

const main = async (): Promise<void> => {
  await validateEnvironment();
  const client = createLemmaClient();

  console.log("Registering schema and circuit with Lemma oracle...\n");

  const registeredSchema = await registerSchema(client);
  console.log(`Schema registered: ${registeredSchema.id}\n`);

  const registeredCircuit = await registerCircuit(client);
  console.log(`Circuit registered: ${registeredCircuit.circuitId}`);
  console.log(`Schema: ${registeredCircuit.schema}`);
  console.log(`Verifier: ${VERIFIER_ADDRESS} (Chain: ${CHAIN_ID})`);
  console.log("\nRegistration complete!");
};

main().catch((error: unknown) => {
  console.error("Registration failed:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
