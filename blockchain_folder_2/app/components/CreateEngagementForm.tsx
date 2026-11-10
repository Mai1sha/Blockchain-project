"use client";

import { useState } from "react";
import { isAddress, keccak256, parseEther, stringToHex, type Log } from "viem";
import { decodeEscrowLog, ESCROW, escrowAbi } from "../lib/escrow";
import { useTransaction } from "../lib/useTransaction";
import { useWallet } from "../lib/useWallet";
import TxStatus from "./TxStatus";

// Contract allows 1 hour to 180 days for each period.
const DELIVERY_PERIOD = 7 * 24 * 60 * 60; // 7 days
const REVIEW_PERIOD = 3 * 24 * 60 * 60; // 3 days

// The skip-simulation demo is only offered under `npm run dev`;
// the deployed site always simulates before sending.
const IS_DEV = process.env.NODE_ENV === "development";

export default function CreateEngagementForm() {
  const wallet = useWallet();
  const { tx, send, reset, busy } = useTransaction();
  const [provider, setProvider] = useState("");
  const [amount, setAmount] = useState("0.01");
  const [spec, setSpec] = useState("");
  const [skipSimulation, setSkipSimulation] = useState(false);
  const [inputError, setInputError] = useState("");
  const [createdId, setCreatedId] = useState<bigint | null>(null);

  // The status panels refresh only when the chain emits an escrow event,
  // so a rejected or reverted transaction leaves the display unchanged.
  async function submitEngagement() {
    reset();
    setCreatedId(null);

    if (!isAddress(provider.trim())) return setInputError("Please enter a valid provider wallet address.");
    if (!spec.trim()) return setInputError("Please describe the service.");

    let value: bigint;
    try {
      value = parseEther(amount.trim());
    } catch {
      return setInputError("Please enter a valid TRUST amount.");
    }
    if (value <= BigInt(0)) return setInputError("The amount must be greater than zero.");
    setInputError("");

    // Only the hash of the spec goes on chain.
    const specHash = keccak256(stringToHex(spec.trim()));

    const receipt = await send({
      label: "Create engagement",
      address: ESCROW,
      abi: escrowAbi,
      functionName: "createEngagement",
      args: [provider.trim(), specHash, DELIVERY_PERIOD, REVIEW_PERIOD],
      value,
      skipSimulation: IS_DEV && skipSimulation,
    });

    if (receipt?.status === "success") {
      const created = receipt.logs
        .map((l) => decodeEscrowLog(l as Log))
        .find((e) => e?.name === "EngagementCreated");
      if (created) {
        setCreatedId(created.engagementId);
        window.dispatchEvent(new CustomEvent("engagement:select", { detail: created.engagementId }));
      }
      setSpec("");
    }
  }

  return (
    <div className="rounded-xl border border-purple-300 bg-white p-6 text-gray-900 shadow-md">
      <h2 className="mb-4 text-xl font-bold">Create an Engagement</h2>

      <p className="mb-4">
        Clients lock TRUST in escrow for a verified provider. Delivery period: 7 days. Review period: 3 days.
      </p>

      <label htmlFor="ce-provider" className="block text-sm font-medium">
        Provider wallet
      </label>
      <input
        id="ce-provider"
        type="text"
        value={provider}
        onChange={(e) => setProvider(e.target.value)}
        placeholder="Verified provider wallet address (0x...)"
        className="mt-1 w-full rounded-lg border border-gray-300 p-3"
      />

      <label htmlFor="ce-amount" className="mt-3 block text-sm font-medium">
        Amount (TRUST)
      </label>
      <input
        id="ce-amount"
        type="text"
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount in TRUST"
        className="mt-1 w-full rounded-lg border border-gray-300 p-3"
      />

      <label htmlFor="ce-spec" className="mt-3 block text-sm font-medium">
        Service description
      </label>
      <input
        id="ce-spec"
        type="text"
        value={spec}
        onChange={(e) => setSpec(e.target.value)}
        placeholder="e.g. Logo design, 3 concepts, 2 revisions"
        className="mt-1 w-full rounded-lg border border-gray-300 p-3"
      />
      <p className="mt-1 text-xs text-gray-600">
        Do not include names, emails or other personal information. Only a hash of this text is stored on chain —
        keep a copy so you can verify it later.
      </p>

      {IS_DEV && (
        <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={skipSimulation} onChange={(e) => setSkipSimulation(e.target.checked)} />
          Skip simulation (dev only: demo an on-chain revert)
        </label>
      )}

      <button
        onClick={submitEngagement}
        disabled={busy || !wallet.canTransact}
        className="mt-4 rounded-lg bg-green-600 px-5 py-3 text-white hover:bg-green-700 disabled:opacity-50"
      >
        {busy ? "Working..." : "Create Engagement"}
      </button>

      {!wallet.canTransact && wallet.ready && (
        <p className="mt-2 text-sm text-gray-600">
          {!wallet.hasWallet
            ? "Install MetaMask to create an engagement."
            : !wallet.account
              ? "Connect MetaMask above to create an engagement."
              : "Switch MetaMask to DIDLab (chain 252501) to create an engagement."}
        </p>
      )}

      {inputError && <p className="mt-3 text-sm text-red-600">❌ {inputError}</p>}
      <TxStatus tx={tx} onDismiss={reset} />
      {createdId !== null && (
        <p className="mt-2 text-sm font-medium text-green-800">
          Engagement #{createdId.toString()} created — it is now open in “Manage an Engagement”. Share this ID with
          the provider so they can accept it.
        </p>
      )}
    </div>
  );
}
