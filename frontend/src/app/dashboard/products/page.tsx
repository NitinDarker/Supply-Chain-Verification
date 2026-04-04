"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api, ProductSummary, ProductEvent } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

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
  if (!addr || addr === "SYSTEM") return "SYSTEM";
  if (addr.length <= 16) return addr;
  return `${addr.slice(0, 10)}...${addr.slice(-6)}`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: "0.1rem 0.25rem", borderRadius: "0.25rem", display: "inline-flex", alignItems: "center" }}
      title="Copy"
    >
      {copied
        ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      }
    </button>
  );
}

/* ── Small inline form field ── */
function Field({
  label, value, onChange, placeholder, required = false, mono = false,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; mono?: boolean;
}) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "0.8rem", color: "var(--muted)", marginBottom: "0.4rem", fontWeight: 500 }}>
        {label}{required && <span style={{ color: "var(--danger)", marginLeft: "0.2rem" }}>*</span>}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="input-field"
        style={mono ? { fontFamily: "var(--font-mono), monospace" } : {}}
      />
    </div>
  );
}

/* ── Status badge ── */
function StatusBadge({ status }: { status: string }) {
  const isConfirmed = status === "CONFIRMED";
  return (
    <span style={{
      fontSize: "0.65rem", padding: "0.2rem 0.55rem", borderRadius: "999px",
      fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" as const,
      background: isConfirmed ? "rgba(74,222,128,0.1)"  : "rgba(251,191,36,0.1)",
      color:      isConfirmed ? "#4ade80"                : "#fbbf24",
      border:     isConfirmed ? "1px solid rgba(74,222,128,0.25)" : "1px solid rgba(251,191,36,0.25)",
    }}>
      {status}
    </span>
  );
}

/* ── Inline toast ── */
function Toast({ type, children }: { type: "success" | "error"; children: React.ReactNode }) {
  const isSuccess = type === "success";
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: "0.625rem",
      background: isSuccess ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)",
      border: `1px solid ${isSuccess ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.2)"}`,
      borderRadius: "0.75rem", padding: "0.875rem 1rem",
      fontSize: "0.85rem", color: isSuccess ? "#4ade80" : "var(--danger)",
      animation: "fade-in-up 0.3s ease both",
    }}>
      {isSuccess
        ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><polyline points="20 6 9 17 4 12"/></svg>
        : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      }
      <div>{children}</div>
    </div>
  );
}

export default function ProductsPage() {
  const { user } = useAuth();

  const canRegister = ["admin", "manufacturer"].includes(user?.role ?? "");
  const canMove     = ["admin", "manufacturer", "distributor", "retailer"].includes(user?.role ?? "");

  /* ── Product list ── */
  const [products,    setProducts]    = useState<ProductSummary[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [search,      setSearch]      = useState("");

  /* ── Expanded product inline history ── */
  const [expandedId,      setExpandedId]      = useState<string | null>(null);
  const [expandedHistory, setExpandedHistory] = useState<ProductEvent[] | null>(null);
  const [expandLoading,   setExpandLoading]   = useState(false);

  /* ── Register form ── */
  const [regId,      setRegId]      = useState("");
  const [regName,    setRegName]    = useState("");
  const [regDesc,    setRegDesc]    = useState("");
  const [regLoc,     setRegLoc]     = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [regOk,      setRegOk]      = useState<string | null>(null);
  const [regErr,     setRegErr]     = useState<string | null>(null);

  /* ── Move form ── */
  const [moveId,      setMoveId]      = useState("");
  const [moveTo,      setMoveTo]      = useState("");
  const [moveLoc,     setMoveLoc]     = useState("");
  const [moveStatus,  setMoveStatus]  = useState("");
  const [moveLoading, setMoveLoading] = useState(false);
  const [moveOk,      setMoveOk]      = useState<string | null>(null);
  const [moveErr,     setMoveErr]     = useState<string | null>(null);

  const loadProducts = () => {
    setLoadingList(true);
    api.getAllProducts()
      .then((d) => setProducts(d.products))
      .catch(() => {})
      .finally(() => setLoadingList(false));
  };

  useEffect(() => { loadProducts(); }, []);

  const toggleExpand = async (productId: string) => {
    if (expandedId === productId) { setExpandedId(null); setExpandedHistory(null); return; }
    setExpandedId(productId);
    setExpandedHistory(null);
    setExpandLoading(true);
    try {
      const res = await api.getProductHistory(productId);
      setExpandedHistory(res.history);
    } catch { setExpandedHistory([]); }
    finally { setExpandLoading(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegErr(null); setRegOk(null); setRegLoading(true);
    try {
      const res = await api.registerProduct({ productId: regId, metadata: { name: regName, description: regDesc, location: regLoc } });
      setRegOk(res.txId);
      setRegId(""); setRegName(""); setRegDesc(""); setRegLoc("");
      loadProducts();
    } catch (err: unknown) {
      setRegErr(err instanceof Error ? err.message : "Registration failed.");
    } finally { setRegLoading(false); }
  };

  const handleMove = async (e: React.FormEvent) => {
    e.preventDefault();
    setMoveErr(null); setMoveOk(null); setMoveLoading(true);
    try {
      const res = await api.moveProduct({ productId: moveId, toAddress: moveTo, metadata: { location: moveLoc, status: moveStatus } });
      setMoveOk(res.txId);
      setMoveId(""); setMoveTo(""); setMoveLoc(""); setMoveStatus("");
      loadProducts();
    } catch (err: unknown) {
      setMoveErr(err instanceof Error ? err.message : "Move failed.");
    } finally { setMoveLoading(false); }
  };

  const filtered = products.filter((p) =>
    p.productId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .prod-page { display: flex; flex-direction: column; gap: 2.5rem; }

        /* ── Page header ── */
        .prod-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .prod-header-title {
          font-size: 1.6rem;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: var(--foreground);
          margin: 0 0 0.25rem;
        }

        .prod-header-sub {
          font-size: 0.875rem;
          color: var(--muted);
          margin: 0;
        }

        .prod-track-link {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.8rem;
          color: var(--primary);
          text-decoration: none;
          border: 1px solid rgba(99,102,241,0.25);
          border-radius: 0.5rem;
          padding: 0.4rem 0.875rem;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .prod-track-link:hover {
          background: rgba(99,102,241,0.08);
          border-color: var(--primary);
        }

        /* ── Section card ── */
        .prod-section {
          background: var(--card);
          border: 1px solid var(--card-border);
          border-radius: 1.125rem;
          overflow: hidden;
          animation: fade-in-up 0.4s ease both;
        }

        .prod-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--card-border);
        }

        .prod-section-title {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--foreground);
          margin: 0;
        }

        .prod-section-icon {
          width: 30px;
          height: 30px;
          border-radius: 0.5rem;
          background: rgba(99,102,241,0.1);
          border: 1px solid rgba(99,102,241,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary);
          flex-shrink: 0;
        }

        .prod-section-count {
          font-size: 0.72rem;
          background: rgba(99,102,241,0.1);
          color: var(--primary);
          border: 1px solid rgba(99,102,241,0.2);
          border-radius: 999px;
          padding: 0.15rem 0.55rem;
          font-weight: 700;
        }

        /* ── Search bar ── */
        .prod-search-wrap {
          padding: 1rem 1.5rem;
          border-bottom: 1px solid var(--card-border);
          background: rgba(0,0,0,0.1);
        }

        .prod-search {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          background: var(--input-bg);
          border: 1px solid var(--card-border);
          border-radius: 0.625rem;
          padding: 0 0.875rem;
          max-width: 360px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .prod-search:focus-within {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
        }

        .prod-search input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: var(--foreground);
          font-size: 0.85rem;
          padding: 0.55rem 0;
        }

        .prod-search input::placeholder { color: var(--muted); }

        /* ── Product rows ── */
        .prod-list { padding: 0.5rem 0; }

        .prod-row {
          border-bottom: 1px solid var(--card-border);
          transition: background 0.15s;
        }

        .prod-row:last-child { border-bottom: none; }
        .prod-row:hover { background: rgba(255,255,255,0.025); }

        .prod-row-main {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 0.875rem 1.5rem;
          cursor: pointer;
          user-select: none;
        }

        .prod-row-left { display: flex; align-items: center; gap: 0.875rem; }

        .prod-row-icon {
          width: 36px;
          height: 36px;
          border-radius: 0.5rem;
          background: rgba(99,102,241,0.07);
          border: 1px solid var(--card-border);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--muted);
          flex-shrink: 0;
        }

        .prod-row-id {
          font-family: var(--font-mono), monospace;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--foreground);
          margin-bottom: 0.2rem;
        }

        .prod-row-holder {
          font-size: 0.75rem;
          color: var(--muted);
        }

        .prod-row-right {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          flex-shrink: 0;
        }

        .prod-row-meta {
          text-align: right;
          font-size: 0.75rem;
          color: var(--muted);
        }

        .prod-row-moves {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--foreground);
        }

        .prod-chevron {
          color: var(--muted);
          transition: transform 0.2s ease;
          flex-shrink: 0;
        }

        .prod-chevron.open { transform: rotate(180deg); }

        /* ── Inline history ── */
        .prod-inline-history {
          padding: 0 1.5rem 1rem;
          border-top: 1px solid var(--card-border);
          background: rgba(0,0,0,0.08);
          animation: fade-in-up 0.25s ease both;
        }

        .prod-inline-history-inner {
          padding-top: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
        }

        .prod-inline-event {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          background: var(--card);
          border: 1px solid var(--card-border);
          border-radius: 0.75rem;
          font-size: 0.8rem;
        }

        .prod-inline-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
          margin-top: 4px;
        }

        .prod-inline-dot.confirmed { background: #4ade80; box-shadow: 0 0 6px rgba(74,222,128,0.4); }
        .prod-inline-dot.pending   { background: #fbbf24; box-shadow: 0 0 6px rgba(251,191,36,0.4); }

        .prod-inline-event-info { flex: 1; }

        .prod-inline-event-type {
          font-weight: 650;
          color: var(--foreground);
          margin-bottom: 0.2rem;
        }

        .prod-inline-event-addr {
          font-family: var(--font-mono), monospace;
          color: var(--muted);
          font-size: 0.75rem;
        }

        .prod-inline-event-right {
          text-align: right;
          color: var(--muted);
          font-size: 0.73rem;
          flex-shrink: 0;
        }

        .prod-full-link {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.78rem;
          color: var(--primary);
          text-decoration: none;
          margin-top: 0.5rem;
          padding: 0.3rem 0.5rem;
          border-radius: 0.4rem;
          transition: background 0.15s;
        }

        .prod-full-link:hover { background: rgba(99,102,241,0.08); }

        /* ── Forms ── */
        .prod-form-body {
          padding: 1.5rem;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .prod-form-full { grid-column: 1 / -1; }

        .prod-form-footer {
          padding: 0 1.5rem 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .prod-submit-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.625rem 1.5rem;
          background: linear-gradient(135deg, #4f46e5, #6366f1, #818cf8);
          background-size: 200% 200%;
          color: white;
          border: none;
          border-radius: 0.625rem;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s ease;
        }

        .prod-submit-btn:hover:not(:disabled) {
          box-shadow: 0 4px 20px rgba(99,102,241,0.4);
          transform: translateY(-1px);
        }

        .prod-submit-btn:disabled { opacity: 0.55; cursor: not-allowed; }

        .prod-empty {
          padding: 3rem 1.5rem;
          text-align: center;
          color: var(--muted);
          font-size: 0.875rem;
        }

        @media (max-width: 600px) {
          .prod-form-body { grid-template-columns: 1fr; }
          .prod-row-main  { padding: 0.75rem 1rem; }
          .prod-inline-history { padding: 0 1rem 1rem; }
        }
      `}</style>

      <div className="prod-page">

        {/* ── Page header ── */}
        <div className="prod-header animate-in">
          <div>
            <h1 className="prod-header-title">Products</h1>
            <p className="prod-header-sub">
              Supply chain product registry and custody management.
            </p>
          </div>
          <Link href="/track" className="prod-track-link">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            Public Tracker
          </Link>
        </div>

        {/* ══════════════════════════════════════
            SECTION 1 — All Products (everyone)
        ══════════════════════════════════════ */}
        <div className="prod-section" style={{ animationDelay: "0ms" }}>
          <div className="prod-section-header">
            <h2 className="prod-section-title">
              <div className="prod-section-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                </svg>
              </div>
              All Products
            </h2>
            {!loadingList && (
              <span className="prod-section-count">{products.length}</span>
            )}
          </div>

          {/* Search */}
          <div className="prod-search-wrap">
            <div className="prod-search">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--muted)", flexShrink: 0 }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                placeholder="Filter by product ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* List */}
          {loadingList ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "3rem 0" }}>
              <div className="spinner" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="prod-empty">
              {search ? "No products match your filter." : "No products registered yet."}
            </div>
          ) : (
            <div className="prod-list">
              {filtered.map((p) => (
                <div key={p.productId} className="prod-row">
                  {/* Row header — click to expand inline history */}
                  <div className="prod-row-main" onClick={() => toggleExpand(p.productId)}>
                    <div className="prod-row-left">
                      <div className="prod-row-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                        </svg>
                      </div>
                      <div>
                        <div className="prod-row-id">{p.productId}</div>
                        <div className="prod-row-holder">
                          Holder: {truncate(p.currentHolder ?? "—")}
                        </div>
                      </div>
                    </div>

                    <div className="prod-row-right">
                      <div className="prod-row-meta">
                        <div className="prod-row-moves">{p.totalMoves} move{p.totalMoves !== 1 ? "s" : ""}</div>
                        <div>Updated {timeAgo(p.lastUpdated)}</div>
                      </div>
                      <svg
                        className={`prod-chevron ${expandedId === p.productId ? "open" : ""}`}
                        width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      >
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </div>
                  </div>

                  {/* Inline expanded history */}
                  {expandedId === p.productId && (
                    <div className="prod-inline-history">
                      <div className="prod-inline-history-inner">
                        {expandLoading && (
                          <div style={{ display: "flex", justifyContent: "center", padding: "1rem" }}>
                            <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                          </div>
                        )}
                        {expandedHistory && expandedHistory.length === 0 && (
                          <p style={{ fontSize: "0.8rem", color: "var(--muted)", textAlign: "center", padding: "0.75rem" }}>
                            No events yet.
                          </p>
                        )}
                        {expandedHistory?.map((ev, i) => {
                          const status = ev.status.toLowerCase() as "confirmed" | "pending";
                          const label  = ev.type === "PRODUCT_REGISTERED" ? "Registered" : "Custody Transfer";
                          return (
                            <div key={ev.txId ?? i} className="prod-inline-event">
                              <div className={`prod-inline-dot ${status}`} />
                              <div className="prod-inline-event-info">
                                <div className="prod-inline-event-type">{label}</div>
                                <div className="prod-inline-event-addr">
                                  {truncate(ev.fromAddress)} → {truncate(ev.toAddress)}
                                </div>
                              </div>
                              <div className="prod-inline-event-right">
                                {ev.blockIndex !== null && <div>Block #{ev.blockIndex}</div>}
                                <div>{timeAgo(ev.timestamp)}</div>
                                <StatusBadge status={ev.status} />
                              </div>
                            </div>
                          );
                        })}
                        <Link href={`/track?id=${p.productId}`} className="prod-full-link">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                          </svg>
                          View full history on public tracker
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════
            SECTION 2 — Transfer Custody (canMove)
        ══════════════════════════════════════ */}
        {canMove && (
          <div className="prod-section" style={{ animationDelay: "60ms" }}>
            <div className="prod-section-header">
              <h2 className="prod-section-title">
                <div className="prod-section-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                  </svg>
                </div>
                Transfer Custody
              </h2>
              <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                You must be the current holder
              </span>
            </div>

            <form onSubmit={handleMove}>
              <div className="prod-form-body">
                <Field label="Product ID"        value={moveId}     onChange={setMoveId}     placeholder="PROD-001"             required mono />
                <Field label="Recipient Address"  value={moveTo}     onChange={setMoveTo}     placeholder="0x…"                  required mono />
                <Field label="New Location"       value={moveLoc}    onChange={setMoveLoc}    placeholder="Warehouse, Karachi" />
                <Field label="Status"             value={moveStatus} onChange={setMoveStatus} placeholder="IN_TRANSIT / DELIVERED" />
              </div>

              <div className="prod-form-footer">
                <button type="submit" className="prod-submit-btn" disabled={moveLoading}>
                  {moveLoading
                    ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Submitting…</>
                    : <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                        </svg>
                        Transfer Custody
                      </>
                  }
                </button>

                <div style={{ flex: 1 }}>
                  {moveErr && <Toast type="error">{moveErr}</Toast>}
                  {moveOk  && (
                    <Toast type="success">
                      <strong>Move submitted</strong> — pending block confirmation
                      <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: "0.75rem", marginTop: "0.25rem", opacity: 0.8 }}>
                        {moveOk}
                        <CopyButton text={moveOk} />
                      </div>
                    </Toast>
                  )}
                </div>
              </div>
            </form>
          </div>
        )}

        {/* ══════════════════════════════════════
            SECTION 3 — Register Product (canRegister)
        ══════════════════════════════════════ */}
        {canRegister && (
          <div className="prod-section" style={{ animationDelay: "120ms" }}>
            <div className="prod-section-header">
              <h2 className="prod-section-title">
                <div className="prod-section-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </div>
                Register New Product
              </h2>
              <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                Manufacturer · Admin only
              </span>
            </div>

            <form onSubmit={handleRegister}>
              <div className="prod-form-body">
                <Field label="Product ID"   value={regId}   onChange={setRegId}   placeholder="PROD-001"           required mono />
                <Field label="Name"         value={regName} onChange={setRegName} placeholder="Product name"       required />
                <Field label="Description"  value={regDesc} onChange={setRegDesc} placeholder="Optional description" />
                <Field label="Origin / Location" value={regLoc}  onChange={setRegLoc}  placeholder="Factory A, Karachi" />
              </div>

              <div className="prod-form-footer">
                <button type="submit" className="prod-submit-btn" disabled={regLoading}>
                  {regLoading
                    ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Registering…</>
                    : <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                        Register Product
                      </>
                  }
                </button>

                <div style={{ flex: 1 }}>
                  {regErr && <Toast type="error">{regErr}</Toast>}
                  {regOk  && (
                    <Toast type="success">
                      <strong>Registered</strong> — pending block confirmation
                      <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: "0.75rem", marginTop: "0.25rem", opacity: 0.8 }}>
                        {regOk}
                        <CopyButton text={regOk} />
                      </div>
                    </Toast>
                  )}
                </div>
              </div>
            </form>
          </div>
        )}

      </div>
    </>
  );
}