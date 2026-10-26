"use client";

import { useEffect, useState } from "react";
import { createPublicClient, http, isAddress } from "viem";
import abi from "../../abi.json";

const CONTRACT_ADDRESS =
  "0x74483FA46Fc8ee453E0fE03485254dB6D24B1080";

const publicClient = createPublicClient({
  transport: http("https://eth.didlab.org"),
});

export default function ProviderVerification() {
  const [address, setAddress] = useState("");
  const [verificationStatus, setVerificationStatus] = useState<
    boolean | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function checkVerification() {
    setError("");
    setVerificationStatus(null);

    if (!isAddress(address)) {
      setError("Please enter a valid Ethereum wallet address.");
      return;
    }

    try {
      setLoading(true);

      const result = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi,
        functionName: "isVerifiedProvider",
        args: [address],
      });

      setVerificationStatus(result as boolean);
    } catch (err) {
      console.error(err);
      setError("Unable to read provider verification status.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
  if (!isAddress(address)) return;

  const unwatch = publicClient.watchContractEvent({
    address: CONTRACT_ADDRESS,
    abi,
    eventName: "ProviderVerified",
    args: {
      provider: address,
    },

    onLogs: async (logs) => {
      if (logs.length === 0) return;

      console.log("ProviderVerified event detected:", logs);

      try {
        const result = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi,
          functionName: "isVerifiedProvider",
          args: [address],
        });

        setVerificationStatus(result as boolean);
        setError("");
      } catch (err) {
        console.error("Unable to refresh verification status:", err);
      }
    },

    onError: (error) => {
      console.error("Event listener error:", error);
    },
  });

  return () => {
    unwatch();
  };
}, [address]);


  return (
    <div className="rounded-xl border border-purple-300 bg-white p-6 shadow-md text-gray-900">
      <h2 className="mb-4 text-xl font-bold">
        Provider Verification
      </h2>

      <p className="mb-4">
        Enter a provider&apos;s wallet address to check their
        verification status directly from the blockchain.
      </p>

      <input
        type="text"
        value={address}
        onChange={(e) => {
          setAddress(e.target.value);
          setVerificationStatus(null);
          setError("");
        }}
        placeholder="Enter provider wallet address (0x...)"
        className="w-full rounded-lg border border-gray-300 p-3 text-gray-900"
      />

      <button
        onClick={checkVerification}
        disabled={loading}
        className="mt-4 rounded-lg bg-purple-600 px-5 py-3 text-white hover:bg-purple-700 disabled:opacity-50"
      >
        {loading ? "Checking..." : "Check Verification"}
      </button>

      {verificationStatus !== null && (
        <p className="mt-4 font-semibold">
          Status:{" "}
          {verificationStatus
            ? "Verified Provider"
            : "Not Verified"}
        </p>
      )}

      {error && (
        <p className="mt-4 text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}