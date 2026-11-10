"use client";

// Engagement workspace: load any engagement by ID, see its on-chain state
// and history, and take the next lifecycle step allowed for the connected
// wallet. Every display change comes from a chain read triggered by an
// escrow event or a confirmed receipt — never from optimistic local state.

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatEther, keccak256, stringToHex, type Log } from "viem";
import { publicClient, shortHex, txUrl } from "../lib/chain";
import {
  ESCROW,
  Status,
  STATUS,
  decodeEscrowLog,
  describeEvent,
  escrowAbi,
  fmtTime,
  readEngagement,
  readHistory,
  readLastId,
  sameAddress,
  type DecodedEvent,
  type Engagement,
} from "../lib/escrow";
import { useTransaction } from "../lib/useTransaction";
import { useWallet } from "../lib/useWallet";
import TxStatus from "./TxStatus";

type Action = {
  key: string;
  label: string;
  functionName: string;
  needsDeliverable?: boolean;
  tone: "primary" | "danger" | "neutral";
  /** Shown instead of the button when the action exists but is not allowed yet. */
  blockedReason?: string;
};

const STATUS_STYLE: Record<number, string> = {
  1: "bg-amber-100 text-amber-800",
  2: "bg-blue-100 text-blue-800",
  3: "bg-indigo-100 text-indigo-800",
  4: "bg-green-100 text-green-800",
  5: "bg-emerald-200 text-emerald-900",
  6: "bg-red-100 text-red-800",
  7: "bg-slate-200 text-slate-800",
};

const BUTTON: Record<Action["tone"], string> = {
  primary: "bg-indigo-600 hover:bg-indigo-700 text-white",
  danger: "bg-red-600 hover:bg-red-700 text-white",
  neutral: "bg-slate-700 hover:bg-slate-800 text-white",
};

/** The lifecycle steps this wallet can take on this engagement right now. */
function actionsFor(e: Engagement, account: string | null, now: number): Action[] {
  const isClient = sameAddress(account, e.client);
  const isProvider = sameAddress(account, e.provider);
  const out: Action[] = [];

  switch (e.status) {
    case Status.Requested:
      if (isProvider) {
        out.push({
          key: "accept",
          label: "Accept engagement",
          functionName: "acceptEngagement",
          tone: "primary",
          blockedReason: now > e.acceptBy ? "The 7-day acceptance window has closed." : undefined,
        });
        out.push({ key: "decline", label: "Decline", functionName: "declineEngagement", tone: "danger" });
      }
      if (isClient) {
        out.push({ key: "cancel", label: "Cancel engagement", functionName: "cancelEngagement", tone: "danger" });
      }
      break;
    case Status.Accepted:
      if (isProvider) {
        out.push({
          key: "deliver",
          label: "Submit delivery",
          functionName: "submitDelivery",
          needsDeliverable: true,
          tone: "primary",
          blockedReason: now > e.deliverBy ? "The delivery deadline has passed." : undefined,
        });
      }
      if (isClient) {
        out.push({
          key: "overdue",
          label: "Cancel (delivery overdue)",
          functionName: "cancelOverdue",
          tone: "danger",
          blockedReason:
            now <= e.deliverBy ? `Available after the delivery deadline (${fmtTime(e.deliverBy)}).` : undefined,
        });
      }
      break;
    case Status.Delivered:
      if (isClient) {
        out.push({ key: "approve", label: "Accept delivery", functionName: "acceptDelivery", tone: "primary" });
      }
      // Anyone may finalize once the client's review window has passed.
      if (account) {
        out.push({
          key: "timeout",
          label: "Complete after review window",
          functionName: "completeAfterReviewWindow",
          tone: "neutral",
          blockedReason:
            now <= e.reviewBy ? `Available after the review deadline (${fmtTime(e.reviewBy)}).` : undefined,
        });
      }
      break;
    case Status.Completed:
      if (isProvider) {
        out.push({ key: "withdraw", label: "Withdraw payment", functionName: "withdraw", tone: "primary" });
      }
      break;
    case Status.Cancelled:
      if (isClient) {
        out.push({ key: "refund", label: "Withdraw refund", functionName: "withdrawRefund", tone: "primary" });
      }
      break;
  }
  return out;
}

function nextStepHint(e: Engagement): string {
  switch (e.status) {
    case Status.Requested:
      return "Waiting for the provider to accept or decline. The client may cancel until then.";
    case Status.Accepted:
      return "Waiting for the provider to submit the delivery.";
    case Status.Delivered:
      return "Waiting for the client to accept the delivery (or for the review window to pass).";
    case Status.Completed:
      return "Payment is released. Waiting for the provider to withdraw it.";
    case Status.Settled:
      return "Finished: the provider has been paid.";
    case Status.Cancelled:
      return "Cancelled. Waiting for the client to withdraw the refund.";
    case Status.Refunded:
      return "Finished: the client has been refunded.";
    default:
      return "";
  }
}

export default function EngagementActions() {
  const wallet = useWallet();
  const { tx, send, reset, busy } = useTransaction();

  const [lastId, setLastId] = useState<bigint | null>(null);
  const [idInput, setIdInput] = useState("");
  const [id, setId] = useState<bigint | null>(null);
  const [engagement, setEngagement] = useState<Engagement | null>(null);
  const [history, setHistory] = useState<DecodedEvent[]>([]);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(false);
  const [deliverable, setDeliverable] = useState("");
  const [deliverableError, setDeliverableError] = useState("");
  const [checkText, setCheckText] = useState("");
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  // Keep deadline checks current without reloading the page.
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 15000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async (target: bigint) => {
    setLoading(true);
    setLoadError("");
    try {
      const [e, h] = await Promise.all([
        readEngagement(target),
        readHistory(target).catch((err) => {
          console.warn("History read failed:", err);
          return [] as DecodedEvent[];
        }),
      ]);
      setEngagement(e);
      setHistory(h);
    } catch (err) {
      console.error(err);
      setEngagement(null);
      setHistory([]);
      setLoadError(`Engagement #${target} does not exist or could not be read from the chain.`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Start on the newest engagement.
  useEffect(() => {
    readLastId()
      .then((last) => {
        setLastId(last);
        if (last > BigInt(0)) {
          setId(last);
          setIdInput(last.toString());
        }
      })
      .catch(() => setLoadError("Could not reach the DIDLab RPC to read the escrow contract."));
  }, []);

  useEffect(() => {
    if (id !== null) load(id);
  }, [id, load]);

  // Jump to an engagement created elsewhere on the page.
  useEffect(() => {
    const onSelect = (ev: Event) => {
      const newId = (ev as CustomEvent<bigint>).detail;
      setId(newId);
      setIdInput(newId.toString());
    };
    window.addEventListener("engagement:select", onSelect);
    return () => window.removeEventListener("engagement:select", onSelect);
  }, []);

  // Refresh from chain whenever any escrow event fires.
  useEffect(() => {
    const unwatch = publicClient.watchContractEvent({
      address: ESCROW,
      abi: escrowAbi,
      onLogs: (logs) => {
        const decoded = logs.map((l) => decodeEscrowLog(l as Log)).filter(Boolean) as DecodedEvent[];
        if (decoded.some((d) => d.name === "EngagementCreated")) {
          readLastId().then(setLastId).catch(() => {});
        }
        setId((current) => {
          if (current !== null && decoded.some((d) => d.engagementId === current)) load(current);
          return current;
        });
      },
      onError: (err) => console.error("Escrow event listener error:", err),
    });
    return () => unwatch();
  }, [load]);

  const actions = useMemo(
    () => (engagement ? actionsFor(engagement, wallet.account, now) : []),
    [engagement, wallet.account, now]
  );

  const role = engagement
    ? sameAddress(wallet.account, engagement.client)
      ? "client"
      : sameAddress(wallet.account, engagement.provider)
        ? "provider"
        : null
    : null;

  function openId(raw: string) {
    reset();
    if (!/^\d+$/.test(raw.trim()) || BigInt(raw.trim()) === BigInt(0)) {
      setLoadError("Enter a whole-number engagement ID (1 or higher).");
      return;
    }
    setId(BigInt(raw.trim()));
  }

  async function run(action: Action) {
    if (id === null) return;
    let args: unknown[] = [id];
    if (action.needsDeliverable) {
      if (!deliverable.trim()) {
        reset();
        setDeliverableError("Describe the delivery (for example a link or file name) before submitting.");
        return;
      }
      setDeliverableError("");
      // Only the hash goes on chain; the text stays with the parties.
      args = [id, keccak256(stringToHex(deliverable.trim()))];
    }
    const receipt = await send({
      label: action.label,
      address: ESCROW,
      abi: escrowAbi,
      functionName: action.functionName,
      args,
    });
    if (receipt?.status === "success") {
      if (action.needsDeliverable) setDeliverable("");
      load(id); // the event listener also triggers this; reading twice is harmless
    }
  }

  const checkResult = useMemo(() => {
    if (!engagement || !checkText.trim()) return null;
    const h = keccak256(stringToHex(checkText.trim()));
    if (h === engagement.specHash) return "✅ Matches the on-chain spec hash.";
    if (h === engagement.deliverableHash) return "✅ Matches the on-chain deliverable hash.";
    return "❌ Does not match the spec or deliverable hash.";
  }, [checkText, engagement]);

  return (
    <div className="rounded-xl border border-purple-300 bg-white p-6 text-gray-900 shadow-md">
      <h2 className="mb-1 text-xl font-bold">Manage an Engagement</h2>
      <p className="mb-4 text-sm text-gray-600">
        Clients and providers take each lifecycle step here. Buttons appear only for the wallet that is allowed
        to act, and only when the engagement is in the right state.
      </p>

      {/* Engagement picker */}
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="eng-id" className="text-sm font-medium">
          Engagement #
        </label>
        <input
          id="eng-id"
          inputMode="numeric"
          value={idInput}
          onChange={(e) => setIdInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && openId(idInput)}
          className="w-24 rounded-lg border border-gray-300 p-2"
        />
        <button onClick={() => openId(idInput)} className="rounded-lg bg-slate-200 px-3 py-2 text-sm hover:bg-slate-300">
          Open
        </button>
        <button
          onClick={() => id !== null && id > BigInt(1) && openId((id - BigInt(1)).toString())}
          disabled={id === null || id <= BigInt(1)}
          className="rounded-lg bg-slate-100 px-3 py-2 text-sm hover:bg-slate-200 disabled:opacity-40"
          aria-label="Previous engagement"
        >
          ←
        </button>
        <button
          onClick={() => id !== null && lastId !== null && id < lastId && openId((id + BigInt(1)).toString())}
          disabled={id === null || lastId === null || id >= lastId}
          className="rounded-lg bg-slate-100 px-3 py-2 text-sm hover:bg-slate-200 disabled:opacity-40"
          aria-label="Next engagement"
        >
          →
        </button>
        <button
          onClick={() => lastId && openId(lastId.toString())}
          disabled={!lastId}
          className="rounded-lg bg-slate-100 px-3 py-2 text-sm hover:bg-slate-200 disabled:opacity-40"
        >
          Latest{lastId ? ` (#${lastId})` : ""}
        </button>
        {loading && <span className="text-sm text-gray-500">Reading chain…</span>}
      </div>

      {lastId === BigInt(0) && <p className="mt-4">No engagements exist yet. Create one below.</p>}
      {loadError && <p className="mt-4 text-red-600">{loadError}</p>}

      {engagement && id !== null && (
        <>
          {/* State */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-sm font-semibold ${STATUS_STYLE[engagement.status] ?? ""}`}>
              {STATUS[engagement.status] ?? engagement.status}
            </span>
            <span className="text-sm text-gray-700">
              {role ? (
                <>
                  You are the <strong>{role}</strong> on this engagement.
                </>
              ) : wallet.account ? (
                "Your connected wallet is not a party to this engagement (read-only)."
              ) : (
                "Connect a wallet to act on this engagement."
              )}
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-600">{nextStepHint(engagement)}</p>

          <dl className="mt-4 grid gap-x-6 gap-y-2 break-all text-sm sm:grid-cols-2">
            <div>
              <dt className="font-semibold">Client</dt>
              <dd>{engagement.client}</dd>
            </div>
            <div>
              <dt className="font-semibold">Provider</dt>
              <dd>{engagement.provider}</dd>
            </div>
            <div>
              <dt className="font-semibold">Escrowed</dt>
              <dd>{formatEther(engagement.amount)} TRUST</dd>
            </div>
            <div>
              <dt className="font-semibold">Created</dt>
              <dd>{fmtTime(engagement.createdAt)}</dd>
            </div>
            <div>
              <dt className="font-semibold">Accept by</dt>
              <dd>{fmtTime(engagement.acceptBy)}</dd>
            </div>
            <div>
              <dt className="font-semibold">Deliver by</dt>
              <dd>
                {engagement.deliverBy
                  ? fmtTime(engagement.deliverBy)
                  : `${engagement.deliveryPeriod / 86400} days after acceptance`}
              </dd>
            </div>
            <div>
              <dt className="font-semibold">Review by</dt>
              <dd>
                {engagement.reviewBy
                  ? fmtTime(engagement.reviewBy)
                  : `${engagement.reviewPeriod / 86400} days after delivery`}
              </dd>
            </div>
            <div>
              <dt className="font-semibold">Completed</dt>
              <dd>
                {engagement.completedAt
                  ? `${fmtTime(engagement.completedAt)} (${engagement.clientConfirmed ? "client accepted" : "review window passed"})`
                  : "—"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="font-semibold">Spec hash</dt>
              <dd className="font-mono text-xs">{engagement.specHash}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="font-semibold">Deliverable hash</dt>
              <dd className="font-mono text-xs">
                {/^0x0+$/.test(engagement.deliverableHash) ? "— (not delivered yet)" : engagement.deliverableHash}
              </dd>
            </div>
          </dl>

          {/* Actions */}
          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h3 className="mb-3 font-semibold">Your next step</h3>

            {!wallet.hasWallet && wallet.ready && (
              <p className="text-sm text-gray-700">Install MetaMask to act on engagements. You can still read them.</p>
            )}
            {wallet.hasWallet && !wallet.account && (
              <p className="text-sm text-gray-700">Connect MetaMask (top of the page) to see your actions.</p>
            )}
            {wallet.account && !wallet.onDidlab && (
              <p className="text-sm text-red-700">Switch MetaMask to DIDLab (chain 252501) to act.</p>
            )}
            {wallet.account && wallet.onDidlab && actions.length === 0 && (
              <p className="text-sm text-gray-700">
                {role ? "Nothing for you to do right now." : "Only the client or provider of this engagement can act on it."}
              </p>
            )}

            {actions.some((a) => a.needsDeliverable && !a.blockedReason) && (
              <div className="mb-3">
                <label htmlFor="deliverable" className="mb-1 block text-sm font-medium">
                  Delivery reference (link, file name or summary — no personal information)
                </label>
                <input
                  id="deliverable"
                  value={deliverable}
                  onChange={(e) => setDeliverable(e.target.value)}
                  placeholder="e.g. final-logo-v3.zip, shared via the agreed channel"
                  className="w-full rounded-lg border border-gray-300 p-2"
                />
                {deliverableError && <p className="mt-1 text-sm text-red-600">{deliverableError}</p>}
                {deliverable.trim() && (
                  <p className="mt-1 break-all font-mono text-xs text-gray-600">
                    On-chain hash: {keccak256(stringToHex(deliverable.trim()))}
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {actions.map((a) =>
                a.blockedReason ? (
                  <div key={a.key} className="text-sm text-gray-600">
                    <button disabled className={`rounded-lg px-4 py-2 opacity-40 ${BUTTON[a.tone]}`}>
                      {a.label}
                    </button>
                    <p className="mt-1">{a.blockedReason}</p>
                  </div>
                ) : (
                  <button
                    key={a.key}
                    onClick={() => run(a)}
                    disabled={busy || !wallet.canTransact}
                    className={`rounded-lg px-4 py-2 disabled:opacity-50 ${BUTTON[a.tone]}`}
                  >
                    {busy && tx.label === a.label ? "Working…" : a.label}
                  </button>
                )
              )}
            </div>

            <TxStatus tx={tx} onDismiss={reset} />
          </div>

          {/* History from events */}
          <h3 className="mt-6 mb-2 font-semibold">On-chain history</h3>
          {history.length === 0 ? (
            <p className="text-sm text-gray-600">No events found for this engagement.</p>
          ) : (
            <ol className="space-y-2 border-l-2 border-indigo-200 pl-4 text-sm">
              {history.map((h, i) => (
                <li key={`${h.txHash}-${i}`}>
                  <span className="font-medium">{describeEvent(h, formatEther)}</span>
                  <span className="text-gray-500">
                    {" "}
                    · {h.name} · block {h.blockNumber?.toString()} ·{" "}
                    {h.txHash && (
                      <a href={txUrl(h.txHash)} target="_blank" rel="noopener noreferrer" className="underline">
                        {shortHex(h.txHash)}
                      </a>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          )}

          {/* Off-chain check */}
          <h3 className="mt-6 mb-2 font-semibold">Check a description against the chain</h3>
          <p className="mb-2 text-sm text-gray-600">
            Paste the agreed service description or the delivery reference. It is hashed in your browser and compared
            with the hashes stored on chain; nothing is sent anywhere.
          </p>
          <input
            value={checkText}
            onChange={(e) => setCheckText(e.target.value)}
            placeholder="Paste text to verify"
            className="w-full rounded-lg border border-gray-300 p-2"
          />
          {checkResult && <p className="mt-2 text-sm">{checkResult}</p>}
        </>
      )}
    </div>
  );
}
