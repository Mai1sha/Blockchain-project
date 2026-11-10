"use client";

import { useState } from "react";
import { switchToDidlab, useWallet } from "../lib/useWallet";

// Page-wide banner for the two states that block transactions:
// no wallet installed, and a wallet connected to the wrong network.
export default function NetworkBanner() {
  const wallet = useWallet();
  const [working, setWorking] = useState(false);

  async function onSwitch() {
    setWorking(true);
    try {
      await switchToDidlab();
    } catch {
      /* user rejected; the banner stays until the network changes */
    } finally {
      setWorking(false);
    }
  }

  return (
    <>
      {wallet.ready && !wallet.hasWallet && (
        <div role="alert" className="sticky top-0 z-20 border-b border-amber-300 bg-amber-100 px-6 py-3 text-center text-sm text-amber-900">
          No wallet detected. You can browse live contract data, but to create or act on an engagement install{" "}
          <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer" className="font-semibold underline">
            MetaMask
          </a>{" "}
          and reload this page.
        </div>
      )}
      {wallet.hasWallet && wallet.chainId !== null && !wallet.onDidlab && (
        <div role="alert" className="sticky top-0 z-20 flex flex-wrap items-center justify-center gap-3 border-b border-red-300 bg-red-100 px-6 py-3 text-sm text-red-900">
          <span>
            MetaMask is on chain {wallet.chainId ?? "unknown"}. This app runs on DIDLab (chain 252501); transactions are
            disabled until you switch.
          </span>
          <button onClick={onSwitch} disabled={working} className="rounded-md bg-red-700 px-3 py-1 font-semibold text-white hover:bg-red-800 disabled:opacity-50">
            Switch to DIDLab
          </button>
        </div>
      )}

    </>
  );
}
