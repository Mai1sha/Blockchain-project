"use client";

// One shared view of the injected wallet (MetaMask) for the whole page:
// whether a wallet exists, the connected account, and the current chain.
// It follows accountsChanged / chainChanged so every component reacts
// immediately when the user switches account or network.

import { useEffect, useSyncExternalStore } from "react";
import { createWalletClient, custom, type Address } from "viem";
import { DIDLAB_CHAIN_ID, didlab, isUserRejection } from "./chain";

type Eip1193 = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (arg: unknown) => void) => void;
  removeListener?: (event: string, handler: (arg: unknown) => void) => void;
};

export type WalletState = {
  ready: boolean; // false until the first check has run in the browser
  hasWallet: boolean;
  account: Address | null;
  chainId: number | null;
  error: string;
};

let state: WalletState = {
  ready: false,
  hasWallet: false,
  account: null,
  chainId: null,
  error: "",
};

const SERVER_STATE = state;
const listeners = new Set<() => void>();
let started = false;

function setState(patch: Partial<WalletState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function getEthereum(): Eip1193 | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { ethereum?: Eip1193 }).ethereum;
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;

  const ethereum = getEthereum();
  if (!ethereum) {
    setState({ ready: true, hasWallet: false });
    return;
  }

  setState({ hasWallet: true });

  // Read without prompting: eth_accounts only returns already-approved accounts.
  Promise.all([
    ethereum.request({ method: "eth_accounts" }),
    ethereum.request({ method: "eth_chainId" }),
  ])
    .then(([accounts, chainId]) => {
      const list = accounts as string[];
      setState({
        ready: true,
        account: (list[0] as Address) ?? null,
        chainId: parseInt(chainId as string, 16),
      });
    })
    .catch(() => setState({ ready: true }));

  ethereum.on?.("accountsChanged", (accounts) => {
    const list = accounts as string[];
    setState({ account: (list[0] as Address) ?? null });
  });
  ethereum.on?.("chainChanged", (chainId) => {
    setState({ chainId: parseInt(chainId as string, 16) });
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function walletClient() {
  const ethereum = getEthereum();
  if (!ethereum) throw new Error("No wallet found. Install MetaMask to continue.");
  return createWalletClient({ chain: didlab, transport: custom(ethereum) });
}

/** Ask MetaMask to switch to DIDLab, adding the network first if it is unknown. */
export async function switchToDidlab(): Promise<boolean> {
  const client = walletClient();
  try {
    await client.switchChain({ id: DIDLAB_CHAIN_ID });
  } catch (error) {
    if ((error as { code?: number })?.code === 4902 ||
        String((error as Error)?.message).includes("Unrecognized chain")) {
      await client.addChain({ chain: didlab });
      await client.switchChain({ id: DIDLAB_CHAIN_ID });
    } else {
      throw error;
    }
  }
  const chainId = await client.getChainId();
  setState({ chainId });
  return chainId === DIDLAB_CHAIN_ID;
}

/** Request account access, then make sure the wallet is on DIDLab. */
export async function connectWallet() {
  setState({ error: "" });
  try {
    const client = walletClient();
    const [account] = await client.requestAddresses();
    const chainId = await client.getChainId();
    setState({ account: account ?? null, chainId });
    if (chainId !== DIDLAB_CHAIN_ID) await switchToDidlab();
  } catch (error) {
    setState({
      error: isUserRejection(error)
        ? "Connection request was rejected in MetaMask."
        : `Could not connect: ${(error as Error)?.message ?? "unknown error"}`,
    });
  }
}

export function useWallet() {
  useEffect(start, []);
  const snapshot = useSyncExternalStore(subscribe, () => state, () => SERVER_STATE);
  return {
    ...snapshot,
    onDidlab: snapshot.chainId === DIDLAB_CHAIN_ID,
    canTransact: snapshot.hasWallet && !!snapshot.account && snapshot.chainId === DIDLAB_CHAIN_ID,
  };
}
