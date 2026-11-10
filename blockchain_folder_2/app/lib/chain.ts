// Shared DIDLab chain setup and error helpers for every component that
// reads from or writes to the contracts.

import {
  BaseError,
  ContractFunctionRevertedError,
  createPublicClient,
  defineChain,
  http,
  UserRejectedRequestError,
} from "viem";

export const DIDLAB_CHAIN_ID = 252501;
export const EXPLORER_URL = "https://explorer.didlab.org";

export const didlab = defineChain({
  id: DIDLAB_CHAIN_ID,
  name: "DIDLab",
  nativeCurrency: { name: "TRUST", symbol: "TRUST", decimals: 18 },
  rpcUrls: { default: { http: ["https://eth.didlab.org"] } },
  blockExplorers: { default: { name: "DIDLab Explorer", url: EXPLORER_URL } },
});

export const publicClient = createPublicClient({
  chain: didlab,
  transport: http(),
});

export function txUrl(hash: string) {
  return `${EXPLORER_URL}/tx/${hash}`;
}

export function shortHex(value: string, chars = 6) {
  return value.length <= chars * 2 + 2
    ? value
    : `${value.slice(0, chars + 2)}…${value.slice(-chars)}`;
}

// Plain-language explanations of the contracts' custom errors.
const ERROR_HELP: Record<string, string> = {
  Unauthorized: "This wallet is not allowed to take this action on this engagement.",
  InvalidState: "The engagement is not in the right state for this action (it may have changed already).",
  InvalidEngagement: "No engagement exists with that ID.",
  DeadlinePassed: "The deadline for this action has passed.",
  DeadlineNotReached: "The deadline for this action has not been reached yet.",
  ProviderNotVerified: "The provider wallet is not currently verified.",
  InvalidParties: "Client and provider must be different wallets.",
  InvalidAmount: "The escrow amount must be greater than zero.",
  InvalidHash: "A non-empty description is required.",
  InvalidPeriod: "Periods must be between 1 hour and 180 days.",
  ZeroAddress: "The zero address is not allowed.",
  TransferFailed: "The TRUST transfer to your wallet failed.",
  ReentrancyGuardReentrantCall: "Reentrant call blocked.",
};

/** Custom error name (e.g. "ProviderNotVerified") or viem's short message. */
export function revertReason(error: unknown): string {
  if (error instanceof BaseError) {
    const revert = error.walk((e) => e instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError) {
      const name = revert.data?.errorName;
      if (name) return ERROR_HELP[name] ? `${name}: ${ERROR_HELP[name]}` : name;
      return revert.shortMessage;
    }
    return error.shortMessage;
  }
  return error instanceof Error ? error.message : "Unknown error";
}

/** True when the user rejected the request in MetaMask (viem nests the 4001 error). */
export function isUserRejection(error: unknown): boolean {
  if (error instanceof BaseError) {
    return !!error.walk((e) => e instanceof UserRejectedRequestError);
  }
  return (error as { code?: number } | null)?.code === 4001;
}
