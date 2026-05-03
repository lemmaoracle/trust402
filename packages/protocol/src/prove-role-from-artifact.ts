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

export type ProveRoleFromArtifactOptions = Readonly<{
  chainId?: number;
  webhookUrl?: string;
  agentId?: string;
}>;

export const proveRoleFromArtifact = (
  client: LemmaClient,
  artifact: IdentityArtifact,
  gate: PaymentGate,
  options?: ProveRoleFromArtifactOptions,
): Promise<ProveRoleResult> => {
  const commitOutput: CommitOutput = artifact.commitOutput;
  const docHash: string = artifact.docHash;
  const circuitWitness = witness(gate, commitOutput);
  const chainId = options?.chainId;
  const webhookUrl = options?.webhookUrl;
  const agentId = options?.agentId;

  return proveRole(client, circuitWitness)
    .catch((err: unknown) => {
      if (isSpendLimitExceededError(err) && webhookUrl && agentId) {
        notifyKeeperHub(webhookUrl, agentId, gate.maxSpend, gate.maxSpend);
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
