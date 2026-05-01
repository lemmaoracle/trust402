import * as R from "ramda";
import { witness, prove as proveRole, submit as submitRole } from "@trust402/roles";
import { submit as submitIdentity } from "@trust402/identity";
import type { CommitOutput } from "@trust402/identity";
import type { LemmaClient, ProveOutput } from "@lemmaoracle/sdk";
import type { PaymentGate } from "@trust402/roles";
import type { IdentityArtifact, ProveRoleResult } from "./types.js";

const logWarning = (err: unknown): undefined => {
  console.warn("Oracle submission failed:", err);
  return undefined;
};

const safeSubmit = (
  submitFn: (client: LemmaClient, docHash: string, proof: ProveOutput) => Promise<unknown>,
  client: LemmaClient,
  docHash: string,
  proof: ProveOutput,
): Promise<unknown> =>
  submitFn(client, docHash, proof).catch(R.pipe(logWarning, R.always(undefined)));

const rejectRoleFailure = (_err: unknown): Promise<never> =>
  Promise.reject(new Error("Role proof generation failed"));

export const proveRoleFromArtifact = (
  client: LemmaClient,
  artifact: IdentityArtifact,
  gate: PaymentGate,
): Promise<ProveRoleResult> => {
  const commitOutput: CommitOutput = artifact.commitOutput;
  const docHash: string = artifact.docHash;
  const circuitWitness = witness(gate, commitOutput);

  return proveRole(client, circuitWitness)
    .catch(rejectRoleFailure)
    .then((roleProof: ProveOutput) => {
      const identitySubmissionP = safeSubmit(submitIdentity, client, docHash, artifact.identityProof);
      const roleSubmissionP = safeSubmit(submitRole, client, docHash, roleProof);

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