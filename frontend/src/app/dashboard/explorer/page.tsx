"use client";

import { useState, useEffect } from "react";
import { api, BlockDTO, ChainStats } from "@/lib/api";

function truncate(hash: string) {
  return `${hash.slice(0, 14)}...${hash.slice(-8)}`;
}

function timeAgo(ts: number) {
  const diff  = Date.now() - ts;
  const secs  = Math.floor(diff / 1000);
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  if (hours > 0) return `${hours}h ago`;
  if (mins  > 0) return `${mins}m ago`;
  return `${secs}s ago`;
}

export default function ExplorerPage() {
  const [stats, setStats]       = useState<ChainStats | null>(null);
  const [blocks, setBlocks]     = useState<BlockDTO[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<BlockDTO | null>(null);
  const [valid, setValid]       = useState<boolean | null>(null);
  const LIMIT = 10;

  const loadPage = (p: number) => {
    setLoading(true);
    Promise.all([
      api.getChain(p, LIMIT),
      p === 1 ? api.getChainStats() : Promise.resolve(null),
    ])
      .then(([chain, chainStats]) => {
        // Show newest blocks first
        setBlocks([...chain.blocks].reverse());
        setTotal(chain.total);
        setPage(p);
        if (chainStats) setStats(chainStats);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPage(1);
    api.validateChain().then((r) => setValid(r.valid)).catch(() => {});
  }, []);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-bold animate-in">Block Explorer</h2>
        {valid !== null && (
          <span className={`text-xs px-3 py-1 rounded-full font-medium border ${
            valid
              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
              : "bg-red-500/15 text-danger border-red-500/25"
          }`}>
            {valid ? "Chain valid" : "Chain invalid"}
          </span>
        )}
      </div>
      <p className="text-muted text-sm mb-6 animate-in">Browse the full blockchain.</p>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 animate-in-delay-1">
          {[
            { label: "Height",   value: stats.height },
            { label: "Products", value: stats.totalProducts },
            { label: "Pending",  value: stats.pendingTransactions },
            { label: "Difficulty", value: stats.difficulty },
          ].map(({ label, value }) => (
            <div key={label} className="bg-card rounded-xl p-4 card-glow text-center">
              <p className="text-2xl font-bold gradient-text">{value}</p>
              <p className="text-xs text-muted mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Latest block hash */}
      {stats && (
        <div className="bg-card rounded-xl px-4 py-3 mb-6 card-glow animate-in-delay-1 flex items-center gap-3">
          <span className="text-xs text-muted shrink-0">Latest hash</span>
          <span className="font-mono text-xs truncate">{stats.latestBlockHash}</span>
        </div>
      )}

      {/* Block list */}
      {loading && <div className="flex justify-center py-16"><div className="spinner" /></div>}

      {!loading && (
        <div className="space-y-2 animate-in-delay-2">
          {blocks.map((block) => (
            <button
              key={block.index}
              onClick={() => setSelected(block)}
              className="w-full bg-card rounded-xl px-5 py-4 card-glow hover:scale-[1.01] transition-all duration-200 text-left"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <span className="text-lg font-bold gradient-text shrink-0">#{block.index}</span>
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-muted truncate">{block.hash}</p>
                    <p className="text-xs text-muted mt-0.5">
                      prev: {truncate(block.previousHash)}
                    </p>
                  </div>
                </div>
                <div className="text-right text-xs text-muted shrink-0">
                  <p>{block.transactions.length} tx{block.transactions.length !== 1 ? "s" : ""}</p>
                  <p>{timeAgo(block.timestamp)}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={() => loadPage(page - 1)}
            disabled={page <= 1}
            className="text-sm px-4 py-2 bg-card rounded-lg card-glow disabled:opacity-40 hover:bg-white/10 transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-muted">{page} / {totalPages}</span>
          <button
            onClick={() => loadPage(page + 1)}
            disabled={page >= totalPages}
            className="text-sm px-4 py-2 bg-card rounded-lg card-glow disabled:opacity-40 hover:bg-white/10 transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {/* Block detail modal */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-card border border-card-border rounded-2xl p-6 w-full max-w-xl my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Block #{selected.index}</h3>
              <button onClick={() => setSelected(null)} className="text-muted hover:text-white transition-colors">✕</button>
            </div>

            <div className="space-y-2 text-sm mb-6">
              {[
                ["Hash",      selected.hash],
                ["Prev hash", selected.previousHash],
                ["Nonce",     String(selected.nonce)],
                ["Time",      new Date(selected.timestamp).toLocaleString()],
                ["Txs",       String(selected.transactions.length)],
              ].map(([label, value]) => (
                <div key={label} className="flex gap-3">
                  <span className="text-muted w-20 shrink-0">{label}</span>
                  <span className="font-mono text-xs break-all">{value}</span>
                </div>
              ))}
            </div>

            <h4 className="text-sm font-medium mb-3">Transactions</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {selected.transactions.map((tx, i) => (
                <div key={tx.txId ?? i} className="bg-input-bg rounded-lg px-3 py-2.5 text-xs">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-medium">{tx.type}</span>
                    {tx.amount > 0 && <span className="text-emerald-400">{tx.amount} VEL</span>}
                  </div>
                  <p className="font-mono text-muted truncate">{tx.txId ?? "—"}</p>
                  {tx.productId && <p className="text-muted mt-0.5">Product: {tx.productId}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}