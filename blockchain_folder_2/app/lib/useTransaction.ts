"use client";

// One transaction flow used by every escrow action, so each button shows
// the same visible states:
//   simulating → awaiting-signature → pending → confirmed | reverted
// plus rejected (user said no in MetaMask) and failed (simulation revert,
// wrong network, no wallet, RPC error).

import { useCallback, useState } from "react";
import type { Abi, Address, Hash, TransactionReceipt } from "viem";
import { DIDLAB_CHAIN_ID, isUserRejection, publicClient, revertReason } from "./chain";
import { walletClient } from "./useWallet";

export type TxPhase =
  | "idle"
  | "simulating"
  | "awaiting-signature"
  | "pending"
  | "confirmed"
  | "reverted"
  | "rejected"
  | "failed";

export type TxState = {
  phase: TxPhase;
  label: string;
  message: string;
  hash?: Hash;
  blockNumber?: bigint;
  gasUsed?: bigint;
  /** Milliseconds from signature to receipt, shown for performance evidence. */
  confirmMs?: number;
};

export type TxRequest = {
  label: string;
  address: Address;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
  /** Dev-only demo: send without simulating so the revert happens on chain. */
  skipSimulation?: boolean;
};

const IDLE: TxState = { phase: "idle", label: "", message: "" };

export function useTransaction() {
  const [tx, setTx] = useState<TxState>(IDLE);

  const send = useCallback(
    async (req: TxRequest): Promise<TransactionReceipt | null> => {
      const base = { label: req.label };
      try {
        const wallet = walletClient();
        const [account] = await wallet.requestAddresses();
        if (!account) {
          setTx({ ...base, phase: "failed", message: "No wallet account selected." });
          return null;
        }
        if ((await wallet.getChainId()) !== DIDLAB_CHAIN_ID) {
          setTx({ ...base, phase: "failed", message: "Wrong network. Switch MetaMask to DIDLab (chain 252501)." });
          return null;
        }

        let hash: Hash;
        if (req.skipSimulation) {
          setTx({ ...base, phase: "awaiting-signature", message: "Confirm in MetaMask (simulation skipped)…" });
          hash = await wallet.writeContract({
            address: req.address,
            abi: req.abi,
            functionName: req.functionName,
            args: req.args,
            value: req.value,
            account,
            chain: wallet.chain,
            gas: BigInt(120000),
          } as Parameters<typeof wallet.writeContract>[0]);
        } else {
          setTx({ ...base, phase: "simulating", message: "Checking the transaction against current chain state…" });
          const { request } = await publicClient.simulateContract({
            address: req.address,
            abi: req.abi,
            functionName: req.functionName,
            args: req.args,
            value: req.value,
            account,
          } as Parameters<typeof publicClient.simulateContract>[0]);

          setTx({ ...base, phase: "awaiting-signature", message: "Confirm the transaction in MetaMask…" });
          hash = await wallet.writeContract(request as Parameters<typeof wallet.writeContract>[0]);
        }

        const sentAt = performance.now();
        setTx({ ...base, phase: "pending", hash, message: "Submitted. Waiting for the block to confirm…" });

        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        const confirmMs = Math.round(performance.now() - sentAt);
        const details = { hash, blockNumber: receipt.blockNumber, gasUsed: receipt.gasUsed, confirmMs };

        if (receipt.status === "success") {
          setTx({ ...base, ...details, phase: "confirmed", message: "Confirmed on chain." });
        } else {
          setTx({ ...base, ...details, phase: "reverted", message: "Reverted on chain. Gas was spent and nothing changed." });
        }
        return receipt;
      } catch (error) {
        if (isUserRejection(error)) {
          setTx({ ...base, phase: "rejected", message: "You rejected the transaction in MetaMask. Nothing was sent." });
        } else {
          console.error(`${req.label} failed:`, error);
          setTx({ ...base, phase: "failed", message: revertReason(error) });
        }
        return null;
      }
    },
    []
  );

  const reset = useCallback(() => setTx(IDLE), []);
  const busy = tx.phase === "simulating" || tx.phase === "awaiting-signature" || tx.phase === "pending";

  return { tx, send, reset, busy };
}
