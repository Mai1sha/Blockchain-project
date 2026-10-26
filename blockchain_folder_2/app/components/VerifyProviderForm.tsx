"use client";

import { useState } from "react";
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  defineChain,
  isAddress,
  keccak256,
  stringToHex,
} from "viem";

import abi from "../../abi.json";

// MetaMask injects an EIP-1193 provider into the browser window.
declare global {
  interface Window {
    ethereum?: Parameters<typeof custom>[0];
  }
}

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

const CONTRACT_ADDRESS =
  "0x74483FA46Fc8ee453E0fE03485254dB6D24B1080";

const publicClient = createPublicClient({
  chain: didlab,
  transport: http(),
});

export default function VerifyProviderForm() {
  const [provider, setProvider] = useState("");
  const [status, setStatus] = useState("Idle");
  const [loading, setLoading] = useState(false);

  async function simulateVerification() {
    if (!isAddress(provider)) {
      setStatus("Please enter a valid provider wallet address.");
      return;
    }

    if (!window.ethereum) {
      setStatus("MetaMask is not installed.");
      return;
    }

    setLoading(true);
    setStatus("Checking transaction...");

    try {
      const walletClient = createWalletClient({
        chain: didlab,
        transport: custom(window.ethereum),
      });

      const [account] = await walletClient.requestAddresses();

      const chainId = await walletClient.getChainId();

      if (chainId !== 252501) {
        setStatus("Wrong network. Please switch to DIDLab.");
        return;
      }

      // Verification expires in 30 days.
      const expiresAt = BigInt(
        Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
      );

      // Demonstration-only credential commitment.
      // Never hash or publish real personal identity information here.
      const credentialHash = keccak256(
        stringToHex("serviceportal-demo-credential")
      );

      const { request } = await publicClient.simulateContract({
        address: CONTRACT_ADDRESS,
        abi,
        functionName: "verifyProvider",
        args: [provider, expiresAt, credentialHash],
        account,
      });

      console.log("Simulation successful:", request);

      setStatus(
        "Simulation successful! Transaction would succeed. Nothing has been sent."
      );
    } catch (error) {
      console.error(error);
      setStatus(
        error instanceof Error
          ? `Simulation failed: ${error.message}`
          : "Simulation failed."
      );
    } finally {
      setLoading(false);
    }
  }
  async function submitVerification() {
  if (!isAddress(provider)) {
    setStatus("❌ Please enter a valid provider wallet address.");
    return;
  }

  if (!window.ethereum) {
    setStatus("❌ MetaMask is not installed.");
    return;
  }

  setLoading(true);
  setStatus("⏳ Preparing verification transaction...");

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

    const expiresAt = BigInt(
      Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
    );

    const credentialHash = keccak256(
      stringToHex("serviceportal-demo-credential")
    );

    // 1. Simulate transaction before sending
    setStatus("⏳ Simulating transaction...");

    const { request } = await publicClient.simulateContract({
      address: CONTRACT_ADDRESS,
      abi,
      functionName: "verifyProvider",
      args: [provider, expiresAt, credentialHash],
      account,
    });

    // 2. Request MetaMask approval
    setStatus("🦊 Waiting for MetaMask approval...");

    const hash = await walletClient.writeContract(request);

    // 3. Transaction submitted
    setStatus(`📤 Transaction submitted: ${hash}. Waiting for confirmation...`);

    // 4. Wait for blockchain confirmation
    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
    });

    if (receipt.status === "success") {
      setStatus(`✅ Verification confirmed! Transaction hash: ${hash}`);
    } else {
      setStatus(`❌ Transaction reverted. Transaction hash: ${hash}`);
    }
  } catch (error: unknown) {
    console.error("Verification transaction error:", error);

    // MetaMask rejects commonly use error code 4001.
    const err = error as {
      code?: number;
      cause?: { code?: number };
      shortMessage?: string;
      message?: string;
    };

    if (err.code === 4001 || err.cause?.code === 4001) {
      setStatus("🚫 Transaction rejected by user in MetaMask.");
    } else {
      setStatus(
        `❌ Transaction failed: ${
          err.shortMessage || err.message || "Unknown error"
        }`
      );
    }
  } finally {
    setLoading(false);
  }}

  return (
    <div className="rounded-xl border border-purple-300 bg-white p-6 shadow-md text-gray-900">
      <h2 className="mb-4 text-xl font-bold">
        Verify a Service Provider
      </h2>

      <p className="mb-4">
        Authorized verifiers can simulate a provider verification
        transaction before submitting it to the blockchain.
      </p>

      <input
        type="text"
        value={provider}
        onChange={(e) => setProvider(e.target.value)}
        placeholder="Provider wallet address (0x...)"
        className="w-full rounded-lg border border-gray-300 p-3"
      />

      <button
        onClick={simulateVerification}
        disabled={loading}
        className="mt-4 rounded-lg bg-purple-600 px-5 py-3 text-white hover:bg-purple-700 disabled:opacity-50"
      >
        {loading ? "Simulating..." : "Simulate Verification"}
      </button>
      <button
        onClick={submitVerification}
        disabled={loading}
        className="mt-4 ml-3 rounded-lg bg-green-600 px-5 py-3 text-white hover:bg-green-700 disabled:opacity-50"
     >
     Submit Verification
</button>
      <p className="mt-4 break-words">
        <strong>Status:</strong> {status}
      </p>
    </div>
  );
}