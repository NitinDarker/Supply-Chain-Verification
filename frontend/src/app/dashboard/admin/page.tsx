"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { api, ChainStats, TransactionDTO } from "@/lib/api";

function truncate(addr: string) {
  return addr === "SYSTEM" ? "SYSTEM" : `${addr.slice(0, 10)}...${addr.slice(-6)}`;
}

export default function AdminPage() {
  const { user } = useAuth();
  const router   = useRouter();

  const [stats, setStats]       = useState<ChainStats | null>(null);
  const [pending, setPending]   = useState<TransactionDTO[]>([]);
  const [loading, setLoading]   = useState(true);
  const [mining, setMining]     = useState(false);
  const [mineResult, setMineResult] = useState<string | null>(null);
  const [mineError, setMineError]   = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [validResult, setValidResult] = useState<{ valid: boolean; errorAt?: number; reason?: string } | null>(null);

  useEffect(() => {
    if (user && user.role !== "admin") router.push("/dashboard");
  }, [user, router]);

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([api.getChainStats(), api.getPending()])
      .then(([s, p]) => {
        setStats(s);
        setPending(p.transactions);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleMine = async () => {
    setMining(true);
    setMineResult(null);
    setMineError(null);
    try {
      const res = await api.mineBlock();
      setMineResult(`Block #${res.block.index} mined. Chain height: ${res.chainHeight}`);
      loadData();
    } catch (err: unknown) {
      setMineError(err instanceof Error ? err.message : "Mining failed.");
    } finally {
      setMining(false);
    }
  };

  const handleValidate = async () => {
    setValidating(true);
    setValidResult(null);
    try {
      const res = await api.validateChain();
      setValidResult(res);
    } catch {
      setValidResult({ valid: false, reason: "Request failed" });
    } finally {
      setValidating(false);
    }
  };

  if (!user || user.role !== "admin") return null;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2 animate-in">Admin Panel</h2>
      <p className="text-muted text-sm mb-6 animate-in">Manage the blockchain network.</p>

      {/* Stats grid */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 animate-in-delay-1">
          {[
            { label: "Chain height",  value: stats.height },
            { label: "Pending txs",   value: stats.pendingTransactions },
            { label: "Total products",value: stats.totalProducts },
            { label: "Difficulty",    value: stats.difficulty },
          ].map(({ label, value }) => (
            <div key={label} className="bg-card rounded-xl p-4 card-glow text-center">
              <p className="text-2xl font-bold gradient-text">{value}</p>
              <p className="text-xs text-muted mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 animate-in-delay-2">
        {/* Mine */}
        <div className="bg-card rounded-2xl p-5 card-glow">
          <h3 className="font-semibold mb-1">Mine block</h3>
          <p className="text-sm text-muted mb-4">
            Bundle all pending transactions into a new sealed block.
          </p>

          {mineResult && (
            <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-lg px-4 py-2.5 text-sm text-emerald-400 mb-3">
              {mineResult}
            </div>
          )}
          {mineError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5 text-sm text-danger mb-3">
              {mineError}
            </div>
          )}

          <button
            onClick={handleMine}
            disabled={mining || pending.length === 0}
            className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg py-2.5 transition-colors text-sm"
          >
            {mining
              ? "Mining..."
              : pending.length === 0
              ? "No pending transactions"
              : `Mine (${pending.length} tx${pending.length !== 1 ? "s" : ""})`}
          </button>
        </div>

        {/* Validate */}
        <div className="bg-card rounded-2xl p-5 card-glow">
          <h3 className="font-semibold mb-1">Validate chain</h3>
          <p className="text-sm text-muted mb-4">
            Run a full integrity check on every block and transaction.
          </p>

          {validResult && (
            <div className={`rounded-lg px-4 py-2.5 text-sm mb-3 border ${
              validResult.valid
                ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                : "bg-red-500/10 border-red-500/20 text-danger"
            }`}>
              {validResult.valid
                ? "Chain is valid"
                : `Invalid at block #${validResult.errorAt}: ${validResult.reason}`}
            </div>
          )}

          <button
            onClick={handleValidate}
            disabled={validating}
            className="w-full bg-card border border-card-border hover:bg-white/5 disabled:opacity-50 text-white font-medium rounded-lg py-2.5 transition-colors text-sm"
          >
            {validating ? "Validating..." : "Validate chain"}
          </button>
        </div>
      </div>

      {/* Pending transactions */}
      <div className="animate-in-delay-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Mempool ({pending.length})</h3>
          <button onClick={loadData} className="text-xs text-primary hover:text-primary-hover transition-colors">
            Refresh
          </button>
        </div>

        {loading && <div className="flex justify-center py-10"><div className="spinner" /></div>}

        {!loading && pending.length === 0 && (
          <div className="bg-card rounded-2xl p-10 text-center card-glow">
            <p className="text-muted text-sm">Mempool is empty.</p>
          </div>
        )}

        {!loading && pending.length > 0 && (
          <div className="space-y-2">
            {pending.map((tx, i) => (
              <div key={tx.txId ?? i} className="bg-card rounded-xl px-5 py-3 card-glow">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs bg-amber-500/15 text-amber-400 border border-amber-500/25 px-2 py-0.5 rounded-full">
                        PENDING
                      </span>
                      <span className="text-xs text-muted">{tx.type}</span>
                    </div>
                    <p className="font-mono text-xs text-muted truncate">
                      {truncate(tx.fromAddress)} → {truncate(tx.toAddress)}
                    </p>
                    {tx.productId && (
                      <p className="text-xs text-muted">{tx.productId}</p>
                    )}
                  </div>
                  {tx.amount > 0 && (
                    <span className="text-sm font-semibold shrink-0">{tx.amount} VEL</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}