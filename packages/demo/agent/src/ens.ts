import * as R from "ramda";
import { createPublicClient, http } from "viem";
import chalk from "chalk";
import type { EnvConfig } from "./env.js";

const ENS_CHAIN_ID = 84532;

export const resolveEnsName = async (
  rpcUrl: string,
  ensName: string,
): Promise<string | undefined> => {
  const client = createPublicClient({
    chain: {
      id: ENS_CHAIN_ID,
      name: "base-sepolia",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: [rpcUrl] } },
    },
    transport: http(rpcUrl),
  });

  const address = await client.getEnsAddress({ name: ensName });
  return address ?? undefined;
};

const logResolution = (ensName: string, address: string | undefined): void => {
  R.isNil(address)
    ? console.log(chalk.yellow(`  ⚠ Could not resolve ${ensName}`))
    : console.log(chalk.green(`  ✓ ${ensName} → ${address}`));
};

const resolveOne = async (
  rpcUrl: string,
  ensName: string,
): Promise<string | undefined> => {
  const address = await resolveEnsName(rpcUrl, ensName);
  logResolution(ensName, address);
  return address;
};

export const resolveEnsNames = async (env: EnvConfig): Promise<EnvConfig> => {
  const hasRpc = R.both(
    R.complement(R.isNil),
    R.isNotEmpty,
  )(env.baseSepoliaRpcUrl);

  const resolvedAgentAddress = hasRpc
    ? await resolveOne(env.baseSepoliaRpcUrl!, env.agentEnsName).catch(() => {
        logResolution(env.agentEnsName, undefined);
        return undefined;
      })
    : undefined;

  const resolvedIssuerAddress = hasRpc
    ? await resolveOne(env.baseSepoliaRpcUrl!, env.issuerEnsName).catch(() => {
        logResolution(env.issuerEnsName, undefined);
        return undefined;
      })
    : undefined;

  return R.mergeRight(env, { resolvedAgentAddress, resolvedIssuerAddress });
};
