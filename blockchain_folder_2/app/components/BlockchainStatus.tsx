"use client";

import { useEffect, useState } from "react";
import { createPublicClient, http } from "viem";

const client = createPublicClient({
  transport: http("https://eth.didlab.org"),
});

export default function BlockchainStatus() {
  const [chainId, setChainId] = useState<number | null>(null);
  const [blockNumber, setBlockNumber] = useState<string>("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadBlockchainData() {
      try {
        const [id, block] = await Promise.all([
          client.getChainId(),
          client.getBlockNumber(),
        ]);

        setChainId(id);
        setBlockNumber(block.toString());
        setError("");
      } catch {
        setError("Unable to connect to DIDLab blockchain");
      }
    }

    loadBlockchainData();
  }, []);

  return (
    <section className="bg-indigo-50 px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-6 text-3xl font-bold text-slate-900">
          Live Blockchain Status
        </h2>

        {error ? (
          <p className="text-red-600">{error}</p>
        ) : (
          <div className="rounded-xl border border-indigo-200 bg-white p-6">
            <p className="mb-3">
              <strong>Network:</strong> DIDLab
            </p>

            <p className="mb-3">
              <strong>Chain ID:</strong> {chainId ?? "Loading..."}
            </p>

            <p className="mb-3">
              <strong>Latest Block:</strong> {blockNumber || "Loading..."}
            </p>

            <p className="break-all">
              <strong>ProviderVerify Contract:</strong>{" "}
              0x74483FA46Fc8ee453E0fE03485254dB6D24B1080
            </p>
          </div>
        )}
      </div>
    </section>
  );
}