
"use client";

import { useState } from "react";
import {
  connectWallet,
  switchToDidlab,
  useWallet,
  getEthereum,
} from "../lib/useWallet";

export default function WalletConnect() {
  const wallet = useWallet();
  const [working, setWorking] = useState(false);
  const [switchError, setSwitchError] = useState("");

  async function onConnect() {
    setWorking(true);
    try {
      await connectWallet();
    } finally {
      setWorking(false);
    }
  }

  async function onSwitch() {
    setSwitchError("");
    setWorking(true);

    try {
      await switchToDidlab();
    } catch {
      setSwitchError(
        "The network switch was rejected or failed. Select DIDLab in MetaMask manually."
      );
    } finally {
      setWorking(false);
    }
  }

  async function onSwitchAccount() {
    setSwitchError("");
    setWorking(true);

    try {
      const ethereum = getEthereum();

      if (!ethereum) {
        throw new Error("MetaMask not detected.");
      }

      // Ask MetaMask to review the accounts authorized for this site.
      await ethereum.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
      });

      // Refresh the account selected by MetaMask.
      await connectWallet();
    } catch {
      setSwitchError(
        "Account switching was cancelled or failed. You can also switch accounts directly in MetaMask."
      );
    } finally {
      setWorking(false);
    }
  }

  let status = "Checking for a wallet…";

  if (wallet.ready && !wallet.hasWallet) {
    status = "MetaMask not detected";
  } else if (wallet.hasWallet && !wallet.account) {
    status = "Wallet not connected";
  } else if (wallet.account && !wallet.onDidlab) {
    status = `Wrong network (chain ${wallet.chainId ?? "unknown"})`;
  } else if (wallet.account && wallet.onDidlab) {
    status = "Connected to DIDLab";
  }

  return (
    <div className="rounded-xl border border-purple-300 bg-white p-6 text-gray-900 shadow-md">
      <h2 className="mb-4 text-xl font-bold">MetaMask Wallet</h2>

      <div className="flex flex-wrap gap-3">
        {wallet.hasWallet && !wallet.account && (
          <button
            onClick={onConnect}
            disabled={working}
            className="rounded-lg bg-purple-600 px-5 py-3 text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {working ? "Connecting…" : "Connect MetaMask"}
          </button>
        )}

        {wallet.hasWallet && wallet.account && (
          <button
            onClick={onSwitchAccount}
            disabled={working}
            className="rounded-lg bg-purple-600 px-5 py-3 text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {working ? "Switching…" : "Switch Wallet"}
          </button>
        )}

        {wallet.account && !wallet.onDidlab && (
          <button
            onClick={onSwitch}
            disabled={working}
            className="rounded-lg bg-red-600 px-5 py-3 text-white hover:bg-red-700 disabled:opacity-50"
          >
            Switch to DIDLab
          </button>
        )}
      </div>

      <p className="mt-4">
        <strong>Status:</strong> {status}
      </p>

      {wallet.account && (
        <p className="mt-2 break-all">
          <strong>Wallet Address:</strong> {wallet.account}
        </p>
      )}

      {wallet.error && (
        <p className="mt-2 text-sm text-red-600">{wallet.error}</p>
      )}

      {switchError && (
        <p className="mt-2 text-sm text-red-600">{switchError}</p>
      )}
    </div>
  );
}
