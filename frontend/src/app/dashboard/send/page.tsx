"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

type TxStatus = "idle" | "pending" | "confirmed" | "error";

export default function SendPage() {
  const { user } = useAuth();
  const [toAddress, setToAddress]   = useState("");
  const [amount, setAmount]         = useState("");
  const [balance, setBalance]       = useState<number>(0);
  const [loading, setLoading]       = useState(false);
  const [status, setStatus]         = useState<TxStatus>("idle");
  const [txId, setTxId]             = useState<string | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [blockIndex, setBlockIndex] = useState<number | null>(null);

  useEffect(() => {
    api.walletMe().then((d) => setBalance(d.balance)).catch(() => {});
  }, []);

  // Poll for confirmation after tx submitted
  useEffect(() => {
    if (!txId || status !== "pending") return;
    const interval = setInterval(async () => {
      try {
        const res = await api.getTransaction(txId);
        if (res.blockIndex !== "PENDING" && typeof res.blockIndex === "number") {
          setBlockIndex(res.blockIndex);
          setStatus("confirmed");
          clearInterval(interval);
          api.walletMe().then((d) => setBalance(d.balance)).catch(() => {});
        }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [txId, status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const amt = parseFloat(amount);
    if (!toAddress.startsWith("0x")) { setError("Invalid wallet address."); return; }
    if (isNaN(amt) || amt <= 0)      { setError("Amount must be greater than 0."); return; }
    if (amt > balance)               { setError("Insufficient balance."); return; }
    if (toAddress === user?.walletAddress) { setError("Cannot send to yourself."); return; }

    setLoading(true);
    try {
      const res = await api.transfer({ toAddress, amount: amt });
      setTxId(res.txId);
      setStatus("pending");
      setToAddress("");
      setAmount("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transfer failed.");
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStatus("idle");
    setTxId(null);
    setError(null);
    setBlockIndex(null);
  };

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-2 animate-in">Send VEL</h2>
      <p className="text-muted text-sm mb-6 animate-in">Transfer tokens to another wallet address.</p>

      {/* Balance */}
      <div className="bg-card rounded-2xl p-4 mb-6 card-glow animate-in-delay-1 flex items-center justify-between">
        <span className="text-sm text-muted">Available balance</span>
        <span className="font-bold gradient-text">{balance.toFixed(2)} VEL</span>
      </div>

      {/* Success state */}
      {status === "confirmed" && (
        <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-6 mb-6 animate-in">
          <p className="text-emerald-400 font-semibold mb-1">Transaction confirmed</p>
          <p className="text-sm text-muted mb-1">Block #{blockIndex}</p>
          <p className="font-mono text-xs text-muted break-all">{txId}</p>
          <button onClick={reset} className="mt-4 text-sm text-primary hover:text-primary-hover transition-colors">
            Send another
          </button>
        </div>
      )}

      {/* Pending state */}
      {status === "pending" && (
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-6 mb-6 animate-in">
          <div className="flex items-center gap-3 mb-2">
            <div className="spinner" />
            <p className="text-amber-400 font-semibold">Waiting for confirmation...</p>
          </div>
          <p className="text-xs text-muted font-mono break-all">{txId}</p>
        </div>
      )}

      {/* Form */}
      {status !== "confirmed" && (
        <form onSubmit={handleSubmit} className="bg-card rounded-2xl p-6 card-glow animate-in-delay-2 space-y-4">
          <div>
            <label className="block text-sm text-muted mb-1.5">Recipient address</label>
            <input
              type="text"
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
              placeholder="0x..."
              className="w-full bg-input-bg border border-card-border rounded-lg px-4 py-2.5 font-mono text-sm focus:outline-none focus:border-primary transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-muted mb-1.5">Amount (VEL)</label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                min="0.01"
                step="0.01"
                className="w-full bg-input-bg border border-card-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setAmount(String(balance))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-primary hover:text-primary-hover transition-colors"
              >
                Max
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-danger bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || status === "pending"}
            className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg py-2.5 transition-colors"
          >
            {loading ? "Sending..." : "Send VEL"}
          </button>
        </form>
      )}
    </div>
  );
}