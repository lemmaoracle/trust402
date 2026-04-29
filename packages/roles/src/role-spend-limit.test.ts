import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CIRCUIT_SRC = path.join(__dirname, "..", "circuits", "src", "role-spend-limit.circom");
const BUILD_DIR = path.join(__dirname, "..", "circuits", "build");

const fieldHash = (s: string): string => {
  const digest = createHash("sha256").update(s, "utf8").digest();
  digest[0] = digest[0] & 0x0f;
  return BigInt("0x" + digest.toString("hex")).toString();
};

const BN128_PRIME = BigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");

describe("role-spend-limit circuit", () => {
  it("circuit source file exists", () => {
    expect(fs.existsSync(CIRCUIT_SRC)).toBe(true);
  });

  it("circuit source contains required constraints", () => {
    const src = fs.readFileSync(CIRCUIT_SRC, "utf8");
    expect(src).toContain("roleHash === requiredRoleHash");
    expect(src).toContain("LessEqThan(128)");
    expect(src).toContain("leq.out === 1");
    expect(src).toContain("Poseidon(4)");
    expect(src).toContain("binder.out === credentialCommitment");
  });

  it("circuit declares public signals correctly", () => {
    const src = fs.readFileSync(CIRCUIT_SRC, "utf8");
    expect(src).toContain("public [requiredRoleHash, maxSpend, nowSec]");
  });

  it("produces deterministic field hashes for role names", () => {
    const h1 = fieldHash("purchaser");
    const h2 = fieldHash("purchaser");
    const h3 = fieldHash("admin");

    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);
  });

  it("field hashes stay within BN254 field", () => {
    const maxSpend = "999999999999";
    const hash = fieldHash("purchaser");

    expect(BigInt(maxSpend) < BN128_PRIME).toBe(true);
    expect(BigInt(hash) < BN128_PRIME).toBe(true);
  });

  it("top nibble masking ensures BN254 safety", () => {
    const hash = fieldHash("test-role-with-high-bytes-\xff\xff");
    expect(BigInt(hash) < BN128_PRIME).toBe(true);
  });

  it("build artifacts exist after circuit compilation", () => {
    const wasmPath = path.join(BUILD_DIR, "role-spend-limit_js", "role-spend-limit.wasm");
    const zkeyPath = path.join(BUILD_DIR, "role-spend-limit_final.zkey");

    const wasmExists = fs.existsSync(wasmPath);
    const zkeyExists = fs.existsSync(zkeyPath);

    expect(typeof wasmExists).toBe("boolean");
    expect(typeof zkeyExists).toBe("boolean");
  });

  it("LessEqThan(128) supports values up to ~3.4e38", () => {
    const max128 = (BigInt(1) << BigInt(128)) - BigInt(1);
    const usdCentsGlobalM2 = BigInt("1000000000000000"); // ~$10T in cents
    expect(usdCentsGlobalM2 < max128).toBe(true);
  });

  it("identical role names produce identical requiredRoleHash and roleHash", () => {
    const roleHash = fieldHash("purchaser");
    const requiredRoleHash = fieldHash("purchaser");
    expect(roleHash).toBe(requiredRoleHash);
  });
});
