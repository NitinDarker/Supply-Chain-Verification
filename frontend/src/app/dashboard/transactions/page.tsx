"use client";

import { useEffect, useState } from "react";
import { api, TransactionDTO } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

function truncate(addr: string) {
  return addr === "SYSTEM" ? "SYSTEM" : `${addr.slice(0, 10)}...${addr.slice(-6)}`;
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (days  > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins  > 0) return `${mins}m ago`;
  return "just now";
}

const typeBadge: Record<string, string> = {
  TRANSFER:       "bg-blue-500/15 text-blue-400 border border-blue-500/25",
  PRODUCT_CREATE: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",
  PRODUCT_MOVE:   "bg-amber-500/15 text-amber-400 border border-amber-500/25",
  GENESIS:        "bg-purple-500/15 text-purple-400 border border-purple-500/25",
};

export default function TransactionsPage() {
  const { user } = useAuth();
  const [txs, setTxs]         = useState<TransactionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [selected, setSelected] = useState<TransactionDTO | null>(null);

  useEffect(() => {
    api.walletTransactions()
      .then((d) => setTxs(d.transactions))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2 animate-in">Transactions</h2>
      <p className="text-muted text-sm mb-6 animate-in">Your full confirmed transaction history.</p>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="spinner" />
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {!loading && !error && txs.length === 0 && (
        <div className="bg-card rounded-2xl p-12 text-center card-glow">
          <p className="text-muted">No transactions yet.</p>
        </div>
      )}

      {!loading && txs.length > 0 && (
        <div className="space-y-2 animate-in-delay-1">
          {txs.map((tx) => {
            const isSent = tx.fromAddress === user?.walletAddress;
            const isGenesis = tx.type === "GENESIS";
            return (
              <button
                key={tx.txId}
                onClick={() => setSelected(tx)}
                className="w-full bg-card rounded-xl px-5 py-4 card-glow hover:scale-[1.01] transition-all duration-200 text-left"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${typeBadge[tx.type] ?? typeBadge.TRANSFER}`}>
                      {tx.type.replace("_", " ")}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-mono truncate text-muted">
                        {isSent ? `→ ${truncate(tx.toAddress)}` : `← ${truncate(tx.fromAddress)}`}
                      </p>
                      {tx.productId && (
                        <p className="text-xs text-muted truncate">{tx.productId}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {tx.amount > 0 && (
                      <p className={`font-semibold text-sm ${isSent && !isGenesis ? "text-danger" : "text-emerald-400"}`}>
                        {isSent && !isGenesis ? "-" : "+"}{tx.amount} VEL
                      </p>
                    )}
                    <p className="text-xs text-muted mt-0.5">
                      Block #{tx.blockIndex} · {timeAgo(tx.timestamp)}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-card border border-card-border rounded-2xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Transaction detail</h3>
              <button onClick={() => setSelected(null)} className="text-muted hover:text-white transition-colors">✕</button>
            </div>
            <div className="space-y-3 text-sm">
              {[
                ["Type",    selected.type],
                ["Tx ID",   selected.txId ?? "—"],
                ["From",    selected.fromAddress],
                ["To",      selected.toAddress],
                ["Amount",  `${selected.amount} VEL`],
                ["Block",   `#${selected.blockIndex}`],
                ["Time",    new Date(selected.timestamp).toLocaleString()],
                ...(selected.productId ? [["Product", selected.productId]] : []),
              ].map(([label, value]) => (
                <div key={label} className="flex gap-3">
                  <span className="text-muted w-16 shrink-0">{label}</span>
                  <span className="font-mono text-xs break-all">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}