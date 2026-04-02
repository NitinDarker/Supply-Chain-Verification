"use client";

import { useState, useEffect } from "react";
import { api, ProductSummary, ProductEvent } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

type Tab = "list" | "register" | "move" | "history";

function timeAgo(ts: number | null) {
  if (!ts) return "—";
  const diff  = Date.now() - ts;
  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  const mins  = Math.floor(diff / 60000);
  if (days  > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins  > 0) return `${mins}m ago`;
  return "just now";
}

function truncate(addr: string) {
  return addr === "SYSTEM" ? "SYSTEM" : `${addr.slice(0, 10)}...${addr.slice(-6)}`;
}

const statusColor: Record<string, string> = {
  CONFIRMED: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",
  PENDING:   "bg-amber-500/15 text-amber-400 border border-amber-500/25",
};

export default function ProductsPage() {
  const { user } = useAuth();
  const [tab, setTab]             = useState<Tab>("list");
  const [products, setProducts]   = useState<ProductSummary[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  // Register form
  const [regId, setRegId]       = useState("");
  const [regName, setRegName]   = useState("");
  const [regDesc, setRegDesc]   = useState("");
  const [regLoc, setRegLoc]     = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [regResult, setRegResult]   = useState<string | null>(null);
  const [regError, setRegError]     = useState<string | null>(null);

  // Move form
  const [moveId, setMoveId]     = useState("");
  const [moveTo, setMoveTo]     = useState("");
  const [moveLoc, setMoveLoc]   = useState("");
  const [moveStatus, setMoveStatus] = useState("");
  const [moveLoading, setMoveLoading] = useState(false);
  const [moveResult, setMoveResult]   = useState<string | null>(null);
  const [moveError, setMoveError]     = useState<string | null>(null);

  // History
  const [histId, setHistId]           = useState("");
  const [history, setHistory]         = useState<ProductEvent[] | null>(null);
  const [histLoading, setHistLoading] = useState(false);
  const [histError, setHistError]     = useState<string | null>(null);

  const canRegister = ["admin", "manufacturer"].includes(user?.role ?? "");
  const canMove     = ["admin", "manufacturer", "distributor", "retailer"].includes(user?.role ?? "");

  const loadProducts = () => {
    setLoadingList(true);
    api.getAllProducts()
      .then((d) => setProducts(d.products))
      .catch(() => {})
      .finally(() => setLoadingList(false));
  };

  useEffect(() => { loadProducts(); }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null); setRegResult(null);
    setRegLoading(true);
    try {
      const res = await api.registerProduct({
        productId: regId,
        metadata: { name: regName, description: regDesc, location: regLoc },
      });
      setRegResult(res.txId);
      setRegId(""); setRegName(""); setRegDesc(""); setRegLoc("");
      loadProducts();
    } catch (err: unknown) {
      setRegError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setRegLoading(false);
    }
  };

  const handleMove = async (e: React.FormEvent) => {
    e.preventDefault();
    setMoveError(null); setMoveResult(null);
    setMoveLoading(true);
    try {
      const res = await api.moveProduct({
        productId: moveId,
        toAddress: moveTo,
        metadata: { location: moveLoc, status: moveStatus },
      });
      setMoveResult(res.txId);
      setMoveId(""); setMoveTo(""); setMoveLoc(""); setMoveStatus("");
    } catch (err: unknown) {
      setMoveError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setMoveLoading(false);
    }
  };

  const handleHistory = async (e: React.FormEvent) => {
    e.preventDefault();
    setHistError(null); setHistory(null);
    setHistLoading(true);
    try {
      const res = await api.getProductHistory(histId);
      setHistory(res.history);
    } catch (err: unknown) {
      setHistError(err instanceof Error ? err.message : "Not found.");
    } finally {
      setHistLoading(false);
    }
  };

  const tabs: { key: Tab; label: string; hidden?: boolean }[] = [
    { key: "list",     label: "All products" },
    { key: "history",  label: "Track product" },
    { key: "register", label: "Register",    hidden: !canRegister },
    { key: "move",     label: "Move",        hidden: !canMove },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2 animate-in">Products</h2>
      <p className="text-muted text-sm mb-6 animate-in">Supply chain product tracking on-chain.</p>

      {/* Tabs */}
      <div className="flex gap-1 bg-card rounded-xl p-1 mb-6 w-fit animate-in-delay-1">
        {tabs.filter((t) => !t.hidden).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`text-sm px-4 py-1.5 rounded-lg transition-colors ${
              tab === t.key ? "bg-white/10 text-white" : "text-muted hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* All products */}
      {tab === "list" && (
        <div className="space-y-2 animate-in-delay-2">
          {loadingList && <div className="flex justify-center py-12"><div className="spinner" /></div>}
          {!loadingList && products.length === 0 && (
            <div className="bg-card rounded-2xl p-12 text-center card-glow">
              <p className="text-muted">No products registered yet.</p>
            </div>
          )}
          {products.map((p) => (
            <div key={p.productId} className="bg-card rounded-xl px-5 py-4 card-glow">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-mono text-sm font-medium">{p.productId}</p>
                  <p className="text-xs text-muted mt-0.5">
                    Holder: {truncate(p.currentHolder ?? "—")}
                  </p>
                </div>
                <div className="text-right text-xs text-muted">
                  <p>{p.totalMoves} move{p.totalMoves !== 1 ? "s" : ""}</p>
                  <p>Updated {timeAgo(p.lastUpdated)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Track / history */}
      {tab === "history" && (
        <div className="animate-in-delay-2">
          <form onSubmit={handleHistory} className="flex gap-3 mb-6">
            <input
              value={histId}
              onChange={(e) => setHistId(e.target.value)}
              placeholder="Enter product ID"
              className="flex-1 bg-input-bg border border-card-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
              required
            />
            <button
              type="submit"
              disabled={histLoading}
              className="bg-primary hover:bg-primary-hover text-white text-sm font-medium px-5 rounded-lg transition-colors disabled:opacity-50"
            >
              {histLoading ? "..." : "Search"}
            </button>
          </form>

          {histError && (
            <p className="text-sm text-danger bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4">{histError}</p>
          )}

          {history && (
            <div className="space-y-3">
              {history.map((event, i) => (
                <div key={event.txId ?? i} className="bg-card rounded-xl px-5 py-4 card-glow">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[event.status]}`}>
                          {event.status}
                        </span>
                        <span className="text-xs text-muted">{event.type.replace("_", " ")}</span>
                      </div>
                      <p className="text-xs text-muted font-mono">
                        {truncate(event.fromAddress)} → {truncate(event.toAddress)}
                      </p>
                      {(event.metadata as Record<string, string>)?.location && (
                        <p className="text-xs text-muted mt-1">
                          {(event.metadata as Record<string, string>).location}
                        </p>
                      )}
                    </div>
                    <div className="text-right text-xs text-muted shrink-0">
                      {event.blockIndex !== null && <p>Block #{event.blockIndex}</p>}
                      <p>{timeAgo(event.timestamp)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Register */}
      {tab === "register" && canRegister && (
        <form onSubmit={handleRegister} className="bg-card rounded-2xl p-6 card-glow animate-in-delay-2 space-y-4 max-w-lg">
          {[
            { label: "Product ID",   value: regId,   set: setRegId,   ph: "PROD-001" },
            { label: "Name",         value: regName, set: setRegName, ph: "Product name" },
            { label: "Description",  value: regDesc, set: setRegDesc, ph: "Optional description" },
            { label: "Location",     value: regLoc,  set: setRegLoc,  ph: "Factory A, Karachi" },
          ].map(({ label, value, set, ph }) => (
            <div key={label}>
              <label className="block text-sm text-muted mb-1.5">{label}</label>
              <input
                value={value}
                onChange={(e) => set(e.target.value)}
                placeholder={ph}
                required={label === "Product ID"}
                className="w-full bg-input-bg border border-card-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          ))}

          {regError  && <p className="text-sm text-danger bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5">{regError}</p>}
          {regResult && (
            <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-lg px-4 py-3 text-sm">
              <p className="text-emerald-400 font-medium mb-1">Registered — pending confirmation</p>
              <p className="font-mono text-xs text-muted break-all">{regResult}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={regLoading}
            className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-medium rounded-lg py-2.5 transition-colors"
          >
            {regLoading ? "Registering..." : "Register product"}
          </button>
        </form>
      )}

      {/* Move */}
      {tab === "move" && canMove && (
        <form onSubmit={handleMove} className="bg-card rounded-2xl p-6 card-glow animate-in-delay-2 space-y-4 max-w-lg">
          {[
            { label: "Product ID",       value: moveId,     set: setMoveId,     ph: "PROD-001",     mono: true },
            { label: "Recipient address", value: moveTo,    set: setMoveTo,     ph: "0x...",        mono: true },
            { label: "New location",      value: moveLoc,   set: setMoveLoc,    ph: "Warehouse, Lahore" },
            { label: "Status",            value: moveStatus, set: setMoveStatus, ph: "IN_TRANSIT / DELIVERED" },
          ].map(({ label, value, set, ph, mono }) => (
            <div key={label}>
              <label className="block text-sm text-muted mb-1.5">{label}</label>
              <input
                value={value}
                onChange={(e) => set(e.target.value)}
                placeholder={ph}
                required={["Product ID", "Recipient address"].includes(label)}
                className={`w-full bg-input-bg border border-card-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors ${mono ? "font-mono" : ""}`}
              />
            </div>
          ))}

          {moveError  && <p className="text-sm text-danger bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5">{moveError}</p>}
          {moveResult && (
            <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-lg px-4 py-3 text-sm">
              <p className="text-emerald-400 font-medium mb-1">Move submitted — pending confirmation</p>
              <p className="font-mono text-xs text-muted break-all">{moveResult}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={moveLoading}
            className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-medium rounded-lg py-2.5 transition-colors"
          >
            {moveLoading ? "Submitting..." : "Move product"}
          </button>
        </form>
      )}
    </div>
  );
}