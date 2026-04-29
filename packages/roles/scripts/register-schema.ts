#!/usr/bin/env node
import { create, schemas } from "@lemmaoracle/sdk";
import type { LemmaClient, SchemaMeta } from "@lemmaoracle/spec";
import dotenv from "dotenv";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(PKG_ROOT, "..", "..", ".env") });

const LEMMA_API_KEY = process.env.LEMMA_API_KEY;
const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_API_KEY = process.env.PINATA_SECRET_API_KEY;

// ── Pinata ────────────────────────────────────────────────────────────

type PinataResponse = Readonly<{
  IpfsHash: string;
  PinSize: number;
}>;

const uploadToPinata = (filePath: string, fileName: string): Promise<string> => {
  const formData = new FormData();
  const blob = new Blob([fs.readFileSync(filePath)]);
  formData.append("file", blob, fileName);
  formData.append("pinataMetadata", JSON.stringify({ name: fileName, keyvalues: { project: "trust402-roles" } }));
  formData.append("pinataOptions", JSON.stringify({ cidVersion: 0 }));

  return fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { pinata_api_key: PINATA_API_KEY!, pinata_secret_api_key: PINATA_SECRET_API_KEY! },
    body: formData,
  })
    .then(res => res.ok ? res.json() : Promise.reject(new Error(`Pinata upload failed: ${res.status}`)))
    .then((data: PinataResponse) => `ipfs://${data.IpfsHash}`);
};

const calculateHash = (filePath: string): string => {
  const buf = fs.readFileSync(filePath);
  return `0x${createHash("sha256").update(buf).digest("hex")}`;
};

// ── Schema meta ───────────────────────────────────────────────────────

const buildSchemaMeta = (wasmHash: string, wasmUrl: string, jsUrl: string): SchemaMeta => ({
  id: "role-spend-limit-v1",
  description: "Role-based spend authority for autonomous agent payments — combines hasRole and spendLimitBelow into a single ZK predicate",
  normalize: {
    artifact: { type: "ipfs", wasm: wasmUrl, js: jsUrl },
    hash: wasmHash,
    abi: {
      raw: {
        identity: "object",
        authority: "object",
        financial: "object",
        lifecycle: "object",
        provenance: "object",
      },
      norm: {
        "identity.agentId": "string",
        "identity.subjectId": "string",
        "authority.roles": "string",
        "authority.scopes": "string",
        "financial.spendLimit": "string",
        "financial.currency": "string",
        "lifecycle.issuedAt": "string",
        "lifecycle.expiresAt": "string",
        "lifecycle.revoked": "string",
        "provenance.issuerId": "string",
      },
    },
  },
});

// ── Main ──────────────────────────────────────────────────────────────

const main = async (): Promise<void> => {
  const missing = [LEMMA_API_KEY, PINATA_API_KEY, PINATA_SECRET_API_KEY]
    .some(v => !v);
  if (missing) {
    return Promise.reject(new Error("Missing LEMMA_API_KEY, PINATA_API_KEY, or PINATA_SECRET_API_KEY"));
  }

  const wasmPath = path.join(PKG_ROOT, "circuits", "build", "role-spend-limit_js", "role-spend-limit.wasm");
  const jsPath = path.join(PKG_ROOT, "circuits", "build", "role-spend-limit_js", "role-spend-limit.js");

  const wasmHash = calculateHash(wasmPath);
  const [wasmUrl, jsUrl] = await Promise.all([
    uploadToPinata(wasmPath, "role-spend-limit.wasm"),
    uploadToPinata(jsPath, "role-spend-limit.js"),
  ]);

  const client: LemmaClient = create({
    apiBase: "https://workers.lemma.workers.dev",
    apiKey: LEMMA_API_KEY!,
  });

  const schemaMeta = buildSchemaMeta(wasmHash, wasmUrl, jsUrl);
  const result = await schemas.register(client, schemaMeta);

  console.log("schema registered:", result.id);
};

main().catch(e => { console.error(e); process.exit(1); });
