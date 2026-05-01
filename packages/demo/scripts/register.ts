#!/usr/bin/env node
/**
 * Register the financial-data circuit and schema with Lemma.
 *
 * This script:
 * 1. Uploads normalize WASM + JS to Pinata and calculates WASM hash
 * 2. Uploads circuit WASM + zkey to Pinata
 * 3. Registers the circuit schema (financial-data-v1) with IPFS artifact URLs
 * 4. Registers the circuit metadata with verifier information and IPFS artifact URLs
 *
 * Prerequisites:
 * - LEMMA_API_KEY, PINATA_API_KEY, PINATA_SECRET_API_KEY environment variables
 * - Circuit artifacts built (run `pnpm build` first)
 * - Verifier contract deployed (run `pnpm deploy-verifier` first)
 */

import { create, schemas, circuits } from "@lemmaoracle/sdk";
import type { LemmaClient, SchemaMeta, CircuitMeta, CircuitVerifier } from "@lemmaoracle/spec";
import * as R from "ramda";
import * as dotenv from "dotenv";
import * as fs from "node:fs";
import { createHash } from "node:crypto";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEMO_ROOT = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(DEMO_ROOT, "..", "..", ".env") });

const LEMMA_API_KEY = process.env.LEMMA_API_KEY;
const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_API_KEY = process.env.PINATA_SECRET_API_KEY;
const DEMO_VERIFIER_ADDRESS =
  process.env.DEMO_VERIFIER_ADDRESS ?? "0x0000000000000000000000000000000000000000";
const CHAIN_ID = Number(process.env.CHAIN_ID ?? 84532);

// ── Constants ──────────────────────────────────────────────────────────

const SCHEMA_ID = "financial-data-v1";
const CIRCUIT_ID = "financial-data-v1";

// ── Validation ─────────────────────────────────────────────────────────

const validateEnvironment = (): Promise<void> =>
  R.any(R.isNil, [LEMMA_API_KEY, PINATA_API_KEY, PINATA_SECRET_API_KEY])
    ? Promise.reject(
        new Error(
          "LEMMA_API_KEY, PINATA_API_KEY, and PINATA_SECRET_API_KEY environment variables are required",
        ),
      )
    : Promise.resolve();

const checkFileExists = (filePath: string): Promise<void> =>
  fs.existsSync(filePath)
    ? Promise.resolve()
    : Promise.reject(new Error(`File not found: ${filePath}`));

// ── Pinata Upload ──────────────────────────────────────────────────────

type PinataUploadResponse = Readonly<{
  readonly IpfsHash: string;
  readonly PinSize: number;
  readonly Timestamp: string;
  readonly isDuplicate?: boolean;
}>;

const uploadToPinata = (
  filePath: string,
  fileName: string,
  projectTag: string,
): Promise<PinataUploadResponse> => {
  const formData = new FormData();
  const file = fs.readFileSync(filePath);
  const blob = new Blob([file]);
  formData.append("file", blob, fileName);

  const metadata = JSON.stringify({
    name: fileName,
    keyvalues: {
      project: projectTag,
      circuit: CIRCUIT_ID,
      timestamp: Date.now().toString(),
    },
  });
  formData.append("pinataMetadata", metadata);

  const options = JSON.stringify({ cidVersion: 0 });
  formData.append("pinataOptions", options);

  return fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      pinata_api_key: PINATA_API_KEY!,
      pinata_secret_api_key: PINATA_SECRET_API_KEY!,
    },
    body: formData,
  })
    .then((res: Response) =>
      res.ok
        ? res.json()
        : Promise.reject(new Error(`Pinata upload failed: ${res.status}`)),
    )
    .then((data: unknown) => data as PinataUploadResponse);
};

const uploadFileToPinata = (
  filePath: string,
  fileName: string,
  projectTag: string,
): Promise<string> =>
  uploadToPinata(filePath, fileName, projectTag)
    .then((response) => `ipfs://${response.IpfsHash}`)
    .catch((error: unknown) =>
      Promise.reject(
        new Error(
          `Failed to upload ${fileName}: ${error instanceof Error ? error.message : String(error)}`,
        ),
      ),
    );

// ── WASM Hash ──────────────────────────────────────────────────────────

const calculateWasmHash = (wasmPath: string): Promise<string> =>
  checkFileExists(wasmPath).then(() => {
    const wasmBuffer = fs.readFileSync(wasmPath);
    const hash = createHash("sha256");
    hash.update(wasmBuffer);
    return `0x${hash.digest("hex")}`;
  });

// ── Client factory ─────────────────────────────────────────────────────

const createLemmaClient = (): LemmaClient =>
  create({ apiKey: LEMMA_API_KEY! });

// ── Schema registration ────────────────────────────────────────────────

const buildSchemaMeta = (
  wasmHash: string,
  wasmIpfsUrl: string,
  jsIpfsUrl: string,
): SchemaMeta => ({
  id: SCHEMA_ID,
  description:
    "Corporate IR financial data — quarterly report with revenue, profit, and attestation docHash",
  normalize: {
    artifact: {
      type: "ipfs" as const,
      wasm: wasmIpfsUrl,
      js: jsIpfsUrl,
    },
    hash: wasmHash,
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

const registerSchema = (client: LemmaClient, schemaMeta: SchemaMeta): Promise<SchemaMeta> => {
  console.log(`Registering schema: ${schemaMeta.id}`);
  return schemas.register(client, schemaMeta);
};

// ── Circuit registration ───────────────────────────────────────────────

const buildVerifier = (
  entry: Readonly<{ chainId: number; address: string }>,
): CircuitVerifier => ({
  type: "onchain" as const,
  address: entry.address,
  chainId: entry.chainId,
  alg: "groth16-bn254-snarkjs" as const,
});

const buildCircuitMeta = (
  wasmIpfsUrl: string,
  zkeyIpfsUrl: string,
  networks: ReadonlyArray<Readonly<{ chainId: number; address: string }>>,
): CircuitMeta => ({
  circuitId: CIRCUIT_ID,
  schema: SCHEMA_ID,
  description:
    "Financial data attestation circuit — proves hash(fields) == claimedDocHash using Poseidon",
  inputs: ["reportId", "company", "period", "revenue", "profit", "claimedDocHash"],
  verifiers: R.map(buildVerifier, networks),
  artifact: {
    location: {
      type: "ipfs" as const,
      wasm: wasmIpfsUrl,
      zkey: zkeyIpfsUrl,
    },
  },
});

const registerCircuit = (
  client: LemmaClient,
  circuitMeta: CircuitMeta,
): Promise<CircuitMeta> => {
  console.log(`Registering circuit: ${circuitMeta.circuitId}`);
  return circuits.register(client, circuitMeta);
};

// ── Artifact paths ─────────────────────────────────────────────────────

const normalizeBuildDir = path.join(DEMO_ROOT, "normalize", "pkg");
const circuitBuildDir = path.join(DEMO_ROOT, "circuit", "build");

const normalizeWasmPath = path.join(normalizeBuildDir, "trust402_demo_normalize_bg.wasm");
const normalizeJsPath = path.join(normalizeBuildDir, "trust402_demo_normalize.js");
const circuitWasmPath = path.join(circuitBuildDir, `${CIRCUIT_ID}_js`, `${CIRCUIT_ID}.wasm`);
const circuitZkeyPath = path.join(circuitBuildDir, `${CIRCUIT_ID}_final.zkey`);

// ── Main pipeline ──────────────────────────────────────────────────────

const main = async (): Promise<void> => {
  await validateEnvironment();
  const networks = [{ chainId: CHAIN_ID, address: DEMO_VERIFIER_ADDRESS }];
  const client = createLemmaClient();

  console.log("Starting financial-data registration with Lemma oracle...\n");

  // Step 1: Check artifact files
  console.log("1. Checking artifact files...");
  await Promise.all([
    checkFileExists(normalizeWasmPath),
    checkFileExists(normalizeJsPath),
    checkFileExists(circuitWasmPath),
    checkFileExists(circuitZkeyPath),
  ]);

  // Step 2: Calculate normalize WASM hash
  console.log("2. Calculating normalize WASM hash...");
  const wasmHash = await calculateWasmHash(normalizeWasmPath);

  // Step 3: Upload normalize artifacts to Pinata
  console.log("3. Uploading normalize artifacts to Pinata...");
  const [normalizeWasmIpfsUrl, normalizeJsIpfsUrl] = await Promise.all([
    uploadFileToPinata(normalizeWasmPath, "trust402_demo_normalize_bg.wasm", "trust402-demo"),
    uploadFileToPinata(normalizeJsPath, "trust402_demo_normalize.js", "trust402-demo"),
  ]);

  // Step 4: Upload circuit artifacts to Pinata
  console.log("4. Uploading circuit artifacts to Pinata...");
  const [circuitWasmIpfsUrl, circuitZkeyIpfsUrl] = await Promise.all([
    uploadFileToPinata(circuitWasmPath, `${CIRCUIT_ID}.wasm`, "trust402-demo"),
    uploadFileToPinata(circuitZkeyPath, `${CIRCUIT_ID}_final.zkey`, "trust402-demo"),
  ]);

  // Step 5: Register schema with IPFS URLs
  console.log("5. Registering schema...");
  const schemaMeta = buildSchemaMeta(wasmHash, normalizeWasmIpfsUrl, normalizeJsIpfsUrl);
  const registeredSchema = await registerSchema(client, schemaMeta);
  console.log(`Schema registered: ${registeredSchema.id}`);
  console.log(`  WASM IPFS: ${normalizeWasmIpfsUrl}`);
  console.log(`  JS IPFS: ${normalizeJsIpfsUrl}`);
  console.log(`  WASM Hash: ${wasmHash}\n`);

  // Step 6: Register circuit with IPFS URLs
  console.log("6. Registering circuit...");
  const circuitMeta = buildCircuitMeta(circuitWasmIpfsUrl, circuitZkeyIpfsUrl, networks);
  const registeredCircuit = await registerCircuit(client, circuitMeta);
  console.log(`Circuit registered: ${registeredCircuit.circuitId}`);
  console.log(`  Schema: ${registeredCircuit.schema}`);
  console.log(`  Verifier: ${DEMO_VERIFIER_ADDRESS} (Chain: ${CHAIN_ID})`);
  console.log(`  WASM IPFS: ${circuitWasmIpfsUrl}`);
  console.log(`  zKey IPFS: ${circuitZkeyIpfsUrl}`);

  console.log("\nRegistration complete!");
};

main().catch((error: unknown) => {
  console.error("Registration failed:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
