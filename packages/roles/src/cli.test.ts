import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import type { AgentCredential, ValidationResult, CommitOutput } from "@lemmaoracle/agent";

// ── Mocks ─────────────────────────────────────────────────────────────

const mockCredential = vi.fn();
const mockValidate = vi.fn();
const mockCommit = vi.fn();
const mockProve = vi.fn();
const mockSubmit = vi.fn();
const mockCreate = vi.fn().mockReturnValue({ apiKey: "test-key", apiBase: "https://workers.lemma.workers.dev" });

vi.mock("@lemmaoracle/agent", () => ({
  credential: mockCredential,
  validate: mockValidate,
  commit: mockCommit,
  computeCredentialCommitment: vi.fn(),
}));

vi.mock("@lemmaoracle/sdk", () => ({
  create: mockCreate,
  prover: { prove: mockProve },
  proofs: { submit: mockSubmit },
}));

// ── Fixtures ──────────────────────────────────────────────────────────

const validCredential: AgentCredential = {
  schema: "agent-identity-authority-v1",
  identity: {
    agentId: "agent-test",
    subjectId: "did:lemma:agent:test",
    controllerId: "did:lemma:org:acme",
    orgId: "acme",
  },
  authority: {
    roles: [{ name: "purchaser" }],
    scopes: [],
    permissions: [],
  },
  financial: {
    spendLimit: 50000,
    currency: "USD",
    paymentPolicy: "",
  },
  lifecycle: {
    issuedAt: 1745900000,
    expiresAt: 1777436000,
    revoked: false,
    revocationRef: "",
  },
  provenance: {
    issuerId: "did:lemma:org:trust-anchor",
    sourceSystem: "",
    generatorId: "",
    chainContext: {
      chainId: 1,
      network: "mainnet",
    },
  },
};

const validCommitResult: CommitOutput = {
  normalized: {} as any,
  root: "1234567890123456789012345678901234567890123456789012345678901234",
  sectionHashes: {
    identityHash: "100",
    authorityHash: "200",
    financialHash: "300",
    lifecycleHash: "400",
    provenanceHash: "500",
  },
  salt: "0x01",
};

// ── Helpers ───────────────────────────────────────────────────────────

const writeTempFile = async (content: string): Promise<string> => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "trust402-cli-"));
  const filePath = path.join(tmpDir, "credential.json");
  await fs.writeFile(filePath, content, "utf8");
  return filePath;
};

const cleanup = async (filePath: string): Promise<void> => {
  const dir = path.dirname(filePath);
  await fs.rm(dir, { recursive: true, force: true });
};

/** Capture stdout/stderr while running program.parseAsync */
const runCli = async (args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> => {
  const { program } = await import("./cli.js");
  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];

  const origStdoutWrite = process.stdout.write.bind(process.stdout);
  const origStderrWrite = process.stderr.write.bind(process.stderr);

  const mockStdout = (chunk: unknown) => {
    stdoutChunks.push(String(chunk));
    return true;
  };
  const mockStderr = (chunk: unknown) => {
    stderrChunks.push(String(chunk));
    return true;
  };

  process.stdout.write = mockStdout as typeof process.stdout.write;
  process.stderr.write = mockStderr as typeof process.stderr.write;

  let exitCode = 0;
  const origExit = process.exit;
  (process as any).exit = (code: number) => {
    exitCode = code ?? 1;
    throw new Error(`PROCESS_EXIT_${code}`);
  };

  try {
    await program.parseAsync(["node", "cli.js", ...args], { from: "node" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!msg.startsWith("PROCESS_EXIT_")) {
      throw e;
    }
  } finally {
    process.stdout.write = origStdoutWrite;
    process.stderr.write = origStderrWrite;
    (process as any).exit = origExit;
  }

  return {
    stdout: stdoutChunks.join(""),
    stderr: stderrChunks.join(""),
    exitCode,
  };
};

// ── Tests: Create command ─────────────────────────────────────────────

describe("CLI create command", () => {
  beforeEach(() => {
    mockCredential.mockReset();
  });

  it("outputs credential JSON for valid required fields", async () => {
    mockCredential.mockReturnValue({ valid: true, credential: validCredential });

    const result = await runCli([
      "create",
      "--agent-id", "agent-1",
      "--subject-id", "subject-1",
      "--roles", "admin",
      "--issuer-id", "issuer-1",
    ]);

    expect(result.exitCode).toBe(0);
    const output = JSON.parse(result.stdout);
    expect(output.schema).toBe("agent-identity-authority-v1");
    expect(output.identity.agentId).toBe("agent-test");
    expect(mockCredential).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: "agent-1",
        subjectId: "subject-1",
        roles: ["admin"],
        issuerId: "issuer-1",
      }),
    );
  });

  it("passes optional fields to credential()", async () => {
    mockCredential.mockReturnValue({ valid: true, credential: validCredential });

    await runCli([
      "create",
      "--agent-id", "agent-1",
      "--subject-id", "subject-1",
      "--roles", "admin,purchaser",
      "--issuer-id", "issuer-1",
      "--org-id", "org-1",
      "--spend-limit", "50000",
      "--currency", "USD",
      "--expires-at", "1735689600",
    ]);

    expect(mockCredential).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: "agent-1",
        roles: ["admin", "purchaser"],
        orgId: "org-1",
        spendLimit: 50000,
        currency: "USD",
        expiresAt: 1735689600,
      }),
    );
  });

  it("outputs errors and exits 1 on validation failure", async () => {
    mockCredential.mockReturnValue({
      valid: false,
      errors: [
        { kind: "EmptyAgentId", message: "identity.agentId must not be empty" },
        { kind: "EmptyRoles", message: "authority.roles must not be empty" },
      ],
    });

    const result = await runCli([
      "create",
      "--agent-id", "",
      "--subject-id", "s",
      "--roles", "admin",
      "--issuer-id", "i",
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("EmptyAgentId");
    expect(result.stderr).toContain("EmptyRoles");
  });

  it("exits with error when required option is missing", async () => {
    // Missing --agent-id — Commander throws via exitOverride
    const result = await runCli([
      "create",
      "--subject-id", "subject-1",
      "--roles", "admin",
      "--issuer-id", "issuer-1",
    ]);

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain("--agent-id");
  });
});

// ── Tests: Validate command ───────────────────────────────────────────

describe("CLI validate command", () => {
  let tmpFile: string;

  afterEach(async () => {
    if (tmpFile) {
      await cleanup(tmpFile);
      tmpFile = "" as string;
    }
  });

  it("prints Valid for a valid credential file", async () => {
    mockValidate.mockReturnValue({ valid: true, credential: validCredential });
    tmpFile = await writeTempFile(JSON.stringify(validCredential));

    const result = await runCli(["validate", tmpFile]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Valid");
    expect(mockValidate).toHaveBeenCalledWith(validCredential);
  });

  it("prints errors and exits 1 for invalid credential", async () => {
    const invalidCred = { ...validCredential, identity: { ...validCredential.identity, agentId: "" } };
    mockValidate.mockReturnValue({
      valid: false,
      errors: [{ kind: "EmptyAgentId", message: "identity.agentId must not be empty" }],
    });
    tmpFile = await writeTempFile(JSON.stringify(invalidCred));

    const result = await runCli(["validate", tmpFile]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("EmptyAgentId");
  });
});

// ── Tests: Prove command ──────────────────────────────────────────────

describe("CLI prove command", () => {
  let tmpFile: string;

  beforeEach(() => {
    mockValidate.mockReset();
    mockCommit.mockReset();
    mockProve.mockReset();
    mockSubmit.mockReset();
  });

  afterEach(async () => {
    if (tmpFile) {
      await cleanup(tmpFile);
      tmpFile = "" as string;
    }
  });

  it("executes commit → prove → submit pipeline", async () => {
    mockValidate.mockReturnValue({ valid: true, credential: validCredential });
    mockCommit.mockResolvedValue(validCommitResult);
    mockProve.mockResolvedValue({ proof: "proof-hex", inputs: ["111", "222"] });
    mockSubmit.mockResolvedValue({ txHash: "0xabc", status: "submitted" });

    tmpFile = await writeTempFile(JSON.stringify(validCredential));

    const result = await runCli([
      "prove",
      "--credential", tmpFile,
      "--api-key", "test-key",
    ]);

    expect(result.exitCode).toBe(0);
    expect(mockValidate).toHaveBeenCalledWith(validCredential);
    expect(mockCommit).toHaveBeenCalledWith(expect.objectContaining({ apiKey: "test-key" }), validCredential);
    expect(mockProve).toHaveBeenCalledWith(
      expect.anything(),
      { circuitId: "agent-identity-v1", witness: validCommitResult },
    );
    expect(mockSubmit).toHaveBeenCalled();

    const output = JSON.parse(result.stdout);
    expect(output).toHaveProperty("commit");
    expect(output).toHaveProperty("proof");
    expect(output).toHaveProperty("submission");
  });

  it("exits 1 on validation failure before commit", async () => {
    mockValidate.mockReturnValue({
      valid: false,
      errors: [{ kind: "EmptyAgentId", message: "identity.agentId must not be empty" }],
    });

    tmpFile = await writeTempFile(JSON.stringify({ schema: "bad" }));

    const result = await runCli([
      "prove",
      "--credential", tmpFile,
      "--api-key", "test-key",
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("EmptyAgentId");
    expect(mockCommit).not.toHaveBeenCalled();
  });

  it("exits with error when --api-key is missing", async () => {
    const result = await runCli([
      "prove",
      "--credential", "/tmp/nonexistent.json",
    ]);

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain("--api-key");
  });

  it("skips submit in dry-run mode", async () => {
    mockValidate.mockReturnValue({ valid: true, credential: validCredential });
    mockCommit.mockResolvedValue(validCommitResult);
    mockProve.mockResolvedValue({ proof: "proof-hex", inputs: ["111"] });

    tmpFile = await writeTempFile(JSON.stringify(validCredential));

    const result = await runCli([
      "prove",
      "--credential", tmpFile,
      "--api-key", "test-key",
      "--dry-run",
    ]);

    expect(result.exitCode).toBe(0);
    expect(mockCommit).toHaveBeenCalled();
    expect(mockProve).toHaveBeenCalled();
    expect(mockSubmit).not.toHaveBeenCalled();

    const output = JSON.parse(result.stdout);
    expect(output).toHaveProperty("commit");
    expect(output).toHaveProperty("proof");
    expect(output).not.toHaveProperty("submission");
  });
});
