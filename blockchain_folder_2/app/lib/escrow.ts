// EngagementEscrow types, reads and event decoding shared by the escrow UI.

import { decodeEventLog, type Abi, type Address, type Hash, type Log } from "viem";
import escrowAbiJson from "../../escrowAbi.json";
import { ESCROW_ADDRESS } from "../escrowConfig";
import { publicClient } from "./chain";

export const escrowAbi = escrowAbiJson as Abi;
export const ESCROW = ESCROW_ADDRESS as Address;
/** Block the escrow was deployed in (deployments/didlab-252501.json). */
export const ESCROW_DEPLOY_BLOCK = BigInt(6682519);

// Matches `enum Status` in EngagementEscrow.sol.
export const STATUS = [
  "None",
  "Requested",
  "Accepted",
  "Delivered",
  "Completed",
  "Settled",
  "Cancelled",
  "Refunded",
] as const;
export const CANCEL_REASON = ["Client cancelled", "Provider declined", "Delivery overdue"];

export const Status = {
  Requested: 1,
  Accepted: 2,
  Delivered: 3,
  Completed: 4,
  Settled: 5,
  Cancelled: 6,
  Refunded: 7,
} as const;

export type Engagement = {
  client: Address;
  status: number;
  clientConfirmed: boolean;
  createdAt: number;
  provider: Address;
  acceptBy: number;
  deliveryPeriod: number;
  deliverBy: number;
  reviewBy: number;
  completedAt: number;
  reviewPeriod: number;
  amount: bigint;
  specHash: Hash;
  deliverableHash: Hash;
};

export async function readLastId(): Promise<bigint> {
  return (await publicClient.readContract({
    address: ESCROW,
    abi: escrowAbi,
    functionName: "lastEngagementId",
  })) as bigint;
}

export async function readEngagement(id: bigint): Promise<Engagement> {
  return (await publicClient.readContract({
    address: ESCROW,
    abi: escrowAbi,
    functionName: "getEngagement",
    args: [id],
  })) as Engagement;
}

export type DecodedEvent = {
  name: string;
  engagementId: bigint;
  args: Record<string, unknown>;
  blockNumber: bigint | null;
  txHash: Hash | null;
};

export function decodeEscrowLog(log: Log): DecodedEvent | null {
  try {
    const decoded = decodeEventLog({ abi: escrowAbi, data: log.data, topics: log.topics });
    const args = (decoded.args ?? {}) as Record<string, unknown>;
    return {
      name: String(decoded.eventName),
      engagementId: args.engagementId as bigint,
      args,
      blockNumber: log.blockNumber,
      txHash: log.transactionHash,
    };
  } catch {
    return null;
  }
}

/** Every escrow event for one engagement (engagementId is indexed in all events). */

/** Read escrow events in small batches to respect DIDLab RPC limits. */

export async function readHistory(id: bigint): Promise<DecodedEvent[]> {
  const latestBlock = await publicClient.getBlockNumber();
  const batchSize = BigInt(500);
  const events: DecodedEvent[] = [];

  const idTopic = `0x${id.toString(16).padStart(64, "0")}`;

  for (
    let fromBlock = ESCROW_DEPLOY_BLOCK;
    fromBlock <= latestBlock;
    fromBlock += batchSize
  ) {
    const toBlock =
      fromBlock + batchSize - BigInt(1) > latestBlock
        ? latestBlock
        : fromBlock + batchSize - BigInt(1);

    const logs = await publicClient.getLogs({
      address: ESCROW,
      fromBlock,
      toBlock,
      topics: [null, idTopic],
    } as Parameters<typeof publicClient.getLogs>[0]);

    for (const log of logs) {
      const event = decodeEscrowLog(log as Log);

      if (event && event.engagementId === id) {
        events.push(event);
      }
    }
  }

  return events.sort((a, b) => {
    const blockA = a.blockNumber ?? BigInt(0);
    const blockB = b.blockNumber ?? BigInt(0);

    return blockA < blockB ? -1 : blockA > blockB ? 1 : 0;
  });
}


/** One-line, human description of an escrow event. */
export function describeEvent(e: DecodedEvent, fmtEther: (v: bigint) => string): string {
  const a = e.args;
  switch (e.name) {
    case "EngagementCreated":
      return `Created and funded with ${fmtEther(a.amount as bigint)} TRUST`;
    case "EngagementAccepted":
      return `Provider accepted; deliver by ${fmtTime(Number(a.deliverBy))}`;
    case "DeliverySubmitted":
      return `Delivery submitted; review by ${fmtTime(Number(a.reviewBy))}`;
    case "EngagementCompleted":
      return a.clientConfirmed ? "Client accepted the delivery" : "Completed after the review window";
    case "EngagementCancelled":
      return `Cancelled (${CANCEL_REASON[Number(a.reason)] ?? "unknown reason"})`;
    case "PaymentWithdrawn":
      return `Provider withdrew ${fmtEther(a.amount as bigint)} TRUST`;
    case "RefundWithdrawn":
      return `Client withdrew a refund of ${fmtEther(a.amount as bigint)} TRUST`;
    default:
      return e.name;
  }
}

export function fmtTime(seconds: number) {
  return seconds === 0 ? "—" : new Date(seconds * 1000).toLocaleString();
}

export const sameAddress = (a?: string | null, b?: string | null) =>
  !!a && !!b && a.toLowerCase() === b.toLowerCase();
