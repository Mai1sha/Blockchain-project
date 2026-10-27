"use client";

import { useEffect, useState } from "react";
import {
  BaseError,
  ContractFunctionRevertedError,
  createPublicClient,
  createWalletClient,
  custom,
  defineChain,
  http,
  isAddress,
  keccak256,
  parseEther,
  stringToHex,
  UserRejectedRequestError,
} from "viem";

import escrowAbi from "../../escrowAbi.json";
import { ESCROW_ADDRESS } from "../escrowConfig";

const didlab = defineChain({
  id: 252501,
  name: "DIDLab",
  nativeCurrency: {
    name: "TRUST",
    symbol: "TRUST",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://eth.didlab.org"],
    },
  },
});

// Contract allows 1 hour to 180 days for each period.
const DELIVERY_PERIOD = 7 * 24 * 60 * 60; // 7 days
const REVIEW_PERIOD = 3 * 24 * 60 * 60; // 3 days

// The skip-simulation demo is only offered under `npm run dev`;
// the deployed site always simulates before sending.
const IS_DEV = process.env.NODE_ENV === "development";

// MetaMask's event API, which viem's provider type leaves out.
type WalletEvents = {
  on?: (event: string, handler: (accounts: string[]) => void) => void;
  removeListener?: (event: string, handler: (accounts: string[]) => void) => void;
};

const publicClient = createPublicClient({
  chain: didlab,
  transport: http(),
});

// Pull the custom error name (e.g. ProviderNotVerified) out of a viem error.
function revertReason(error: unknown) {
  if (error instanceof BaseError) {
    const revert = error.walk(
      (e) => e instanceof ContractFunctionRevertedError
    );
    if (revert instanceof ContractFunctionRevertedError) {
      return revert.data?.errorName ?? revert.shortMessage;
    }
    return error.shortMessage;
  }
  return error instanceof Error ? error.message : "Unknown error";
}

export default function CreateEngagementForm() {
  const [provider, setProvider] = useState("");
  const [amount, setAmount] = useState("0.01");
  const [spec, setSpec] = useState("");
  const [skipSimulation, setSkipSimulation] = useState(false);
  const [status, setStatus] = useState("Idle");
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);

  // Submit starts disabled and only unlocks once a wallet account is
  // connected (via the Connect MetaMask button above).
  useEffect(() => {
    const ethereum = window.ethereum;
    if (!ethereum) return;

    const onAccounts = (accounts: string[]) => setConnected(accounts.length > 0);

    ethereum
      .request({ method: "eth_accounts" })
      .then((accounts) => onAccounts(accounts as string[]))
      .catch(() => setConnected(false));

    const events = ethereum as WalletEvents;
    events.on?.("accountsChanged", onAccounts);
    return () => events.removeListener?.("accountsChanged", onAccounts);
  }, []);

  // Note: this does not reload the status panel. EngagementStatus
  // refreshes only when the chain emits EngagementCreated, so a
  // rejected or reverted transaction leaves the display unchanged.
  async function submitEngagement() {
    if (!isAddress(provider)) {
      setStatus("❌ Please enter a valid provider wallet address.");
      return;
    }

    if (!spec.trim()) {
      setStatus("❌ Please describe the service.");
      return;
    }

    let value: bigint;
    try {
      value = parseEther(amount);
    } catch {
      setStatus("❌ Please enter a valid TRUST amount.");
      return;
    }

    if (!window.ethereum) {
      setStatus("❌ MetaMask is not installed.");
      return;
    }

    setLoading(true);
    setStatus("⏳ Preparing engagement transaction...");

    try {
      const walletClient = createWalletClient({
        chain: didlab,
        transport: custom(window.ethereum),
      });

      const [account] = await walletClient.requestAddresses();

      if (!account) {
        setStatus("❌ No wallet account selected.");
        return;
      }

      const chainId = await walletClient.getChainId();

      if (chainId !== 252501) {
        setStatus("❌ Wrong network. Please switch to DIDLab.");
        return;
      }

      // Only the hash of the spec goes on-chain.
      // Never put personal information in the description.
      const specHash = keccak256(stringToHex(spec.trim()));

      const args = [provider, specHash, DELIVERY_PERIOD, REVIEW_PERIOD];

      let hash: `0x${string}`;

      if (IS_DEV && skipSimulation) {
        // Demo only: send without simulating, with fixed gas so
        // MetaMask doesn't refuse it, to show an on-chain revert.
        setStatus("🦊 Waiting for MetaMask approval (simulation skipped)...");

        hash = await walletClient.writeContract({
          address: ESCROW_ADDRESS,
          abi: escrowAbi,
          functionName: "createEngagement",
          args,
          value,
          account,
          gas: BigInt(120000),
        });
      } else {
        // 1. Simulate transaction before sending
        setStatus("⏳ Simulating transaction...");

        const { request } = await publicClient.simulateContract({
          address: ESCROW_ADDRESS,
          abi: escrowAbi,
          functionName: "createEngagement",
          args,
          value,
          account,
        });

        // 2. Request MetaMask approval
        setStatus("🦊 Waiting for MetaMask approval...");

        hash = await walletClient.writeContract(request);
      }

      // 3. Transaction submitted
      setStatus(`📤 Pending: ${hash}. Waiting for confirmation...`);

      // 4. Wait for blockchain confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      const details = `block ${receipt.blockNumber}, gas used ${receipt.gasUsed}`;

      if (receipt.status === "success") {
        setStatus(`✅ Engagement created! Transaction hash: ${hash} (${details})`);
        setSpec("");
      } else {
        setStatus(
          `❌ Transaction reverted on-chain. Gas was spent and nothing changed. Transaction hash: ${hash} (${details})`
        );
      }
    } catch (error: unknown) {
      // viem nests MetaMask's 4001 rejection inside its own errors.
      const rejected =
        error instanceof BaseError
          ? !!error.walk((e) => e instanceof UserRejectedRequestError)
          : (error as { code?: number }).code === 4001;

      if (rejected) {
        console.warn("Create engagement rejected by user.");
        setStatus("🚫 Transaction rejected by user in MetaMask.");
      } else {
        console.error("Create engagement error:", error);
        setStatus(`❌ Transaction failed: ${revertReason(error)}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-purple-300 bg-white p-6 shadow-md text-gray-900">
      <h2 className="mb-4 text-xl font-bold">Create an Engagement</h2>

      <p className="mb-4">
        Clients lock TRUST in escrow for a verified provider. Delivery period:
        7 days. Review period: 3 days.
      </p>

      <input
        type="text"
        value={provider}
        onChange={(e) => setProvider(e.target.value)}
        placeholder="Verified provider wallet address (0x...)"
        className="w-full rounded-lg border border-gray-300 p-3"
      />

      <input
        type="text"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount in TRUST"
        className="mt-3 w-full rounded-lg border border-gray-300 p-3"
      />

      <input
        type="text"
        value={spec}
        onChange={(e) => setSpec(e.target.value)}
        placeholder="Service description (no personal information)"
        className="mt-3 w-full rounded-lg border border-gray-300 p-3"
      />

      {IS_DEV && (
        <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={skipSimulation}
            onChange={(e) => setSkipSimulation(e.target.checked)}
          />
          Skip simulation (dev only: demo an on-chain revert)
        </label>
      )}

      <button
        onClick={submitEngagement}
        disabled={loading || !connected}
        className="mt-4 rounded-lg bg-green-600 px-5 py-3 text-white hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? "Working..." : "Create Engagement"}
      </button>

      {!connected && (
        <p className="mt-2 text-sm text-gray-600">
          Connect MetaMask above to create an engagement.
        </p>
      )}

      <p className="mt-4 break-words">
        <strong>Status:</strong> {status}
      </p>
    </div>
  );
}
