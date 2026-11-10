"use client";

import { txUrl } from "../lib/chain";
import type { TxState } from "../lib/useTransaction";

const STYLE: Record<string, { box: string; icon: string; title: string }> = {
  simulating: { box: "border-blue-300 bg-blue-50 text-blue-900", icon: "⏳", title: "Checking" },
  "awaiting-signature": { box: "border-amber-300 bg-amber-50 text-amber-900", icon: "🦊", title: "Waiting for signature" },
  pending: { box: "border-blue-300 bg-blue-50 text-blue-900", icon: "📤", title: "Pending" },
  confirmed: { box: "border-green-300 bg-green-50 text-green-900", icon: "✅", title: "Confirmed" },
  reverted: { box: "border-red-300 bg-red-50 text-red-900", icon: "⛔", title: "Reverted" },
  rejected: { box: "border-slate-300 bg-slate-100 text-slate-800", icon: "🚫", title: "Rejected by you" },
  failed: { box: "border-red-300 bg-red-50 text-red-900", icon: "❌", title: "Not sent" },
};

export default function TxStatus({ tx, onDismiss }: { tx: TxState; onDismiss?: () => void }) {
  if (tx.phase === "idle") return null;
  const s = STYLE[tx.phase];
  const done = !["simulating", "awaiting-signature", "pending"].includes(tx.phase);

  return (
    <div role="status" aria-live="polite" className={`mt-4 rounded-lg border p-3 text-sm ${s.box}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold">
          {s.icon} {tx.label}: {s.title}
        </p>
        {done && onDismiss && (
          <button onClick={onDismiss} className="text-xs underline opacity-70 hover:opacity-100">
            dismiss
          </button>
        )}
      </div>
      <p className="mt-1 break-words">{tx.message}</p>
      {tx.hash && (
        <p className="mt-1 break-all">
          Tx:{" "}
          <a href={txUrl(tx.hash)} target="_blank" rel="noopener noreferrer" className="underline">
            {tx.hash}
          </a>
        </p>
      )}
      {tx.blockNumber !== undefined && (
        <p className="mt-1">
          Block {tx.blockNumber.toString()} · gas used {tx.gasUsed?.toString()} · confirmed in{" "}
          {((tx.confirmMs ?? 0) / 1000).toFixed(1)} s
        </p>
      )}
    </div>
  );
}
