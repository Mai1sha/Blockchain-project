"use client";

import { useEffect, useState } from "react";
import { createPublicClient, formatEther, http } from "viem";
import escrowAbi from "../../escrowAbi.json";
import { ESCROW_ADDRESS } from "../escrowConfig";

const publicClient = createPublicClient({
  transport: http("https://eth.didlab.org"),
});

// Matches the Status enum in EngagementEscrow.sol
const STATUS_NAMES = [
  "None",
  "Requested",
  "Accepted",
  "Delivered",
  "Completed",
  "Settled",
  "Cancelled",
  "Refunded",
];

type Engagement = {
  client: string;
  provider: string;
  status: number;
  amount: bigint;
  specHash: string;
  createdAt: number;
  acceptBy: number;
  deliveryPeriod: number;
  reviewPeriod: number;
};

function formatTime(seconds: number) {
  return seconds === 0 ? "—" : new Date(seconds * 1000).toLocaleString();
}

export default function EngagementStatus() {
  const [engagementId, setEngagementId] = useState<bigint | null>(null);
  const [engagement, setEngagement] = useState<Engagement | null>(null);
  const [error, setError] = useState("");
  const [events, setEvents] = useState<string[]>([]);

  // Read the newest engagement straight from the chain (no wallet needed).
  async function loadState() {
    try {
      const lastId = (await publicClient.readContract({
        address: ESCROW_ADDRESS,
        abi: escrowAbi,
        functionName: "lastEngagementId",
      })) as bigint;

      setEngagementId(lastId);

      if (lastId === BigInt(0)) {
        setEngagement(null);
        setError("");
        return;
      }

      const result = (await publicClient.readContract({
        address: ESCROW_ADDRESS,
        abi: escrowAbi,
        functionName: "getEngagement",
        args: [lastId],
      })) as Engagement;

      setEngagement(result);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Unable to read engagement state from the escrow contract.");
    }
  }

  useEffect(() => {
    loadState();

    // The display only changes when the chain says so: a new
    // EngagementCreated event triggers a fresh read.
    const unwatch = publicClient.watchContractEvent({
      address: ESCROW_ADDRESS,
      abi: escrowAbi,
      eventName: "EngagementCreated",
      onLogs: (logs) => {
        if (logs.length === 0) return;

        const lines = logs.map((log) => {
          const args = (log as unknown as {
            args: { engagementId: bigint; amount: bigint };
          }).args;
          return `EngagementCreated #${args.engagementId} · ${formatEther(
            args.amount
          )} TRUST · block ${log.blockNumber}`;
        });

        setEvents((prev) => [...lines, ...prev].slice(0, 10));
        loadState();
      },
      onError: (err) => {
        console.error("Event listener error:", err);
      },
    });

    return () => {
      unwatch();
    };
  }, []);

  return (
    <div className="rounded-xl border border-purple-300 bg-white p-6 shadow-md text-gray-900">
      <h2 className="mb-4 text-xl font-bold">Engagement Escrow Status</h2>

      <p className="mb-4 break-all text-sm text-gray-600">
        EngagementEscrow contract: {ESCROW_ADDRESS}
      </p>

      {error && <p className="mb-4 text-red-600">{error}</p>}

      {engagementId === null && !error && <p>Loading...</p>}

      {engagementId === BigInt(0) && <p>No engagements have been created yet.</p>}

      {engagement && engagementId !== null && (
        <div className="space-y-2 break-all">
          <p>
            <strong>Latest Engagement:</strong> #{engagementId.toString()}
          </p>
          <p>
            <strong>Status:</strong>{" "}
            {STATUS_NAMES[engagement.status] ?? engagement.status}
          </p>
          <p>
            <strong>Client:</strong> {engagement.client}
          </p>
          <p>
            <strong>Provider:</strong> {engagement.provider}
          </p>
          <p>
            <strong>Escrowed Amount:</strong> {formatEther(engagement.amount)}{" "}
            TRUST
          </p>
          <p>
            <strong>Created:</strong> {formatTime(engagement.createdAt)}
          </p>
          <p>
            <strong>Accept By:</strong> {formatTime(engagement.acceptBy)}
          </p>
          <p>
            <strong>Spec Hash:</strong> {engagement.specHash}
          </p>
        </div>
      )}

      <h3 className="mt-6 mb-2 font-semibold">Live Events</h3>
      {events.length === 0 ? (
        <p className="text-sm text-gray-600">
          Waiting for new EngagementCreated events...
        </p>
      ) : (
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {events.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
