#!/usr/bin/env node
import { create, circuits } from "@lemmaoracle/sdk";
import type { LemmaClient, CircuitMeta } from "@lemmaoracle/spec";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(PKG_ROOT, "..", "..", ".env") });

const LEMMA_API_KEY = process.env.LEMMA_API_KEY;
const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_API_KEY = process.env.PINATA_SECRET_API_KEY;

const ROLES_VERIFIER_ADDRESS = process.env.ROLES_VERIFIER_ADDRESS ?? "0x0000000000000000000000000000000000000000";
const CHAIN_ID = Number(process.env.CHAIN_ID ?? 84532);

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

// ── Circuit meta ──────────────────────────────────────────────────────

const buildCircuitMeta = (wasmUrl: string, zkeyUrl: string): CircuitMeta => ({
  circuitId: "role-spend-limit-v1",
  schema: "passthrough-v1",
  description: "Combined hasRole + spendLimitBelow predicate with cross-proof correlation via credentialCommitment",
  inputs: ["requiredRoleHash", "maxSpend", "nowSec", "roleGateCommitment", "credentialCommitmentPublic"],
  verifiers: [{
    type: "onchain",
    address: ROLES_VERIFIER_ADDRESS,
    chainId: CHAIN_ID,
    alg: "groth16-bn254-snarkjs",
  }],
  artifact: {
    location: { type: "ipfs", wasm: wasmUrl, zkey: zkeyUrl },
  },
});

// ── Main ──────────────────────────────────────────────────────────────

const main = async (): Promise<void> => {
  const missing = [LEMMA_API_KEY, PINATA_API_KEY, PINATA_SECRET_API_KEY]
    .some(v => !v);
  if (missing) {
    return Promise.reject(new Error("Missing LEMMA_API_KEY, PINATA_API_KEY, or PINATA_SECRET_API_KEY"));
  }

  const wasmPath = path.join(PKG_ROOT, "circuits", "build", "role-spend-limit-v1_js", "role-spend-limit-v1.wasm");
  const zkeyPath = path.join(PKG_ROOT, "circuits", "build", "role-spend-limit-v1_final.zkey");

  const [wasmUrl, zkeyUrl] = await Promise.all([
    uploadToPinata(wasmPath, "role-spend-limit-v1.wasm"),
    uploadToPinata(zkeyPath, "role-spend-limit-v1_final.zkey"),
  ]);

  const client: LemmaClient = create({
    apiBase: "https://workers.lemma.workers.dev",
    apiKey: LEMMA_API_KEY!,
  });

  const circuitMeta = buildCircuitMeta(wasmUrl, zkeyUrl);
  const result = await circuits.register(client, circuitMeta);

  console.log("circuit registered:", result.circuitId);
};

main().catch(e => { console.error(e); process.exit(1); });
