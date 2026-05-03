import * as R from "ramda";
import { witness, prove as proveRole, submit as submitRole } from "@trust402/roles";
import { submit as submitIdentity } from "@trust402/identity";
import type { CommitOutput } from "@trust402/identity";
import type { LemmaClient, ProveOutput } from "@lemmaoracle/sdk";
import type { PaymentGate } from "@trust402/roles";
import type { IdentityArtifact, ProveRoleResult } from "./types.js";
import { notifyKeeperHub } from "./keeperhub.js";

const logWarning = (err: unknown): undefined => {
  return undefined;
};

const safeSubmit = (
  submitFn: (client: LemmaClient, docHash: string, proof: ProveOutput, chainId?: number) => Promise<unknown>,
  client: LemmaClient,
  docHash: string,
  proof: ProveOutput,
  chainId?: number,
): Promise<unknown> =>
  submitFn(client, docHash, proof, chainId).catch(R.pipe(logWarning, R.always(undefined)));

const isSpendLimitExceededError = (err: unknown): boolean => {
  if (err instanceof Error) {
    const message = err.message.toLowerCase();
    return message.includes("spend") || message.includes("limit");
  }
  return false;
};

const rejectRoleFailure = (_err: unknown): Promise<never> =>
  Promise.reject(new Error("Role proof generation failed"));

const overrideSpendLimit = (
  commitOutput: CommitOutput,
  attemptedSpend: number | undefined,
): CommitOutput => {
  if (attemptedSpend === undefined) return commitOutput;

  return {
    ...commitOutput,
    normalized: {
      ...commitOutput.normalized,
      financial: {
        ...commitOutput.normalized.financial,
        spendLimit: attemptedSpend.toString(),
      },
    },
  };
};

export type ProveRoleFromArtifactOptions = Readonly<{
  chainId?: number;
  webhookUrl?: string;
  webhookApiKey?: string;
  agentId?: string;
  attemptedSpend?: number;
}>;

export const proveRoleFromArtifact = (
  client: LemmaClient,
  artifact: IdentityArtifact,
  gate: PaymentGate,
  options?: ProveRoleFromArtifactOptions,
): Promise<ProveRoleResult> => {
  const commitOutput = overrideSpendLimit(artifact.commitOutput, options?.attemptedSpend);
  const docHash: string = artifact.docHash;
  const circuitWitness = witness(gate, commitOutput);
  const chainId = options?.chainId;
  const webhookUrl = options?.webhookUrl;
  const webhookApiKey = options?.webhookApiKey;
  const agentId = options?.agentId;
  const attemptedSpend = options?.attemptedSpend;

  return proveRole(client, circuitWitness)
    .catch((err: unknown) => {
      if (isSpendLimitExceededError(err) && webhookUrl && agentId) {
        notifyKeeperHub(webhookUrl, agentId, gate.maxSpend, attemptedSpend ?? gate.maxSpend, webhookApiKey);
      }
      return rejectRoleFailure(err);
    })
    .then((roleProof: ProveOutput) => {
      const identitySubmissionP = safeSubmit(submitIdentity, client, docHash, artifact.identityProof, chainId);
      const roleSubmissionP = safeSubmit(submitRole, client, docHash, roleProof, chainId);

      return Promise.all([identitySubmissionP, roleSubmissionP]).then(
        ([identitySubmission, roleSubmission]) => ({
          identityProof: artifact.identityProof,
          roleProof,
          identitySubmission,
          roleSubmission,
        }),
      );
    });
};
