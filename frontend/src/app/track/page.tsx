"use client";

import { useState } from "react";
import Link from "next/link";
import { api, ProductEvent } from "@/lib/api";

function timeAgo(ts: number | null) {
  if (!ts) return "—";
  const diff = Date.now() - ts;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor(diff / 60000);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
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
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="copy-btn"
      title="Copy"
    >
      {copied ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}

const STAGE_ICONS: Record<string, React.ReactNode> = {
  PRODUCT_REGISTERED: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z"/>
    </svg>
  ),
  CUSTODY_TRANSFER: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
    </svg>
  ),
};

export default function TrackPage() {
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState("");
  const [history, setHistory] = useState<ProductEvent[] | null>(null);
  const [holder, setHolder] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setError(null);
    setHistory(null);
    setHolder(null);
    setLoading(true);
    setSearched(query.trim());
    try {
      const [histRes, holderRes] = await Promise.all([
        api.getProductHistory(query.trim()),
        api.getProductHolder(query.trim()),
      ]);
      setHistory(histRes.history);
      setHolder(holderRes.currentHolder ?? null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Product not found.");
    } finally {
      setLoading(false);
    }
  };

  const confirmedCount = history?.filter((e) => e.status === "CONFIRMED").length ?? 0;
  const pendingCount   = history?.filter((e) => e.status === "PENDING").length ?? 0;

  return (
    <>
      <style>{`
        .track-root {
          min-height: 100vh;
          background: var(--background);
          color: var(--foreground);
        }

        /* ── Nav ── */
        .track-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.1rem 2rem;
          border-bottom: 1px solid var(--card-border);
          background: rgba(17, 21, 37, 0.85);
          backdrop-filter: blur(12px);
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .track-nav-logo {
          font-size: 1.2rem;
          font-weight: 700;
          background: linear-gradient(135deg, #818cf8, #6366f1, #60a5fa);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          text-decoration: none;
        }

        .track-nav-links {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .track-nav-link {
          color: var(--muted);
          font-size: 0.85rem;
          padding: 0.4rem 0.85rem;
          border-radius: 0.5rem;
          text-decoration: none;
          transition: color 0.2s, background 0.2s;
        }

        .track-nav-link:hover {
          color: var(--foreground);
          background: rgba(255,255,255,0.05);
        }

        .track-nav-btn {
          padding: 0.4rem 1rem;
          background: linear-gradient(135deg, #4f46e5, #6366f1);
          color: #fff;
          border-radius: 0.5rem;
          font-size: 0.85rem;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .track-nav-btn:hover {
          box-shadow: 0 4px 16px rgba(99,102,241,0.4);
          transform: translateY(-1px);
        }

        /* ── Hero ── */
        .track-hero {
          text-align: center;
          padding: 4rem 1.5rem 3rem;
          max-width: 640px;
          margin: 0 auto;
        }

        .track-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          background: rgba(255,255,255,0.04);
          border: 1px solid var(--card-border);
          border-radius: 999px;
          padding: 0.3rem 0.85rem;
          font-size: 0.75rem;
          color: var(--muted);
          margin-bottom: 1.5rem;
          animation: fade-in-up 0.4s ease both;
        }

        .track-hero-title {
          font-size: clamp(2rem, 5vw, 2.75rem);
          font-weight: 800;
          letter-spacing: -0.03em;
          color: var(--foreground);
          margin: 0 0 0.75rem;
          animation: fade-in-up 0.4s ease 0.05s both;
        }

        .track-hero-title span {
          background: linear-gradient(135deg, #818cf8, #6366f1, #60a5fa);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .track-hero-sub {
          font-size: 1rem;
          color: var(--muted);
          line-height: 1.65;
          margin: 0 0 2.5rem;
          animation: fade-in-up 0.4s ease 0.1s both;
        }

        /* ── Search bar ── */
        .track-search-wrap {
          animation: fade-in-up 0.4s ease 0.15s both;
        }

        .track-search-form {
          display: flex;
          gap: 0.625rem;
          background: var(--card);
          border: 1px solid var(--card-border);
          border-radius: 0.875rem;
          padding: 0.5rem;
          transition: border-color 0.2s, box-shadow 0.2s;
          max-width: 560px;
          margin: 0 auto;
        }

        .track-search-form:focus-within {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.15), 0 4px 24px rgba(99,102,241,0.1);
        }

        .track-search-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: var(--foreground);
          font-size: 0.9rem;
          padding: 0.4rem 0.75rem;
          font-family: var(--font-mono), monospace;
        }

        .track-search-input::placeholder {
          color: var(--muted);
          font-family: var(--font-sans), Arial, sans-serif;
        }

        .track-search-btn {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.55rem 1.25rem;
          background: linear-gradient(135deg, #4f46e5, #6366f1, #818cf8);
          background-size: 200% 200%;
          color: #fff;
          border: none;
          border-radius: 0.625rem;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s ease;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .track-search-btn:hover:not(:disabled) {
          box-shadow: 0 4px 20px rgba(99,102,241,0.45);
          transform: translateY(-1px);
        }

        .track-search-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* ── Main content ── */
        .track-content {
          max-width: 720px;
          margin: 0 auto;
          padding: 2rem 1.5rem 4rem;
        }

        /* ── Error ── */
        .track-error {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: rgba(248,113,113,0.08);
          border: 1px solid rgba(248,113,113,0.2);
          border-radius: 0.875rem;
          padding: 1rem 1.25rem;
          color: var(--danger);
          font-size: 0.875rem;
          animation: fade-in-up 0.3s ease both;
        }

        /* ── Result header ── */
        .track-result-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          background: var(--card);
          border: 1px solid var(--card-border);
          border-radius: 1rem;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          animation: fade-in-up 0.35s ease both;
          flex-wrap: wrap;
        }

        .track-product-id {
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--primary);
          margin-bottom: 0.35rem;
        }

        .track-product-name {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--foreground);
          letter-spacing: -0.01em;
          font-family: var(--font-mono), monospace;
          margin-bottom: 0.5rem;
        }

        .track-holder-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          color: var(--muted);
        }

        .track-holder-addr {
          font-family: var(--font-mono), monospace;
          color: var(--foreground);
          font-size: 0.8rem;
        }

        .track-stat-chips {
          display: flex;
          gap: 0.5rem;
          flex-shrink: 0;
          flex-wrap: wrap;
        }

        .track-chip {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0.5rem 0.875rem;
          border-radius: 0.625rem;
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .track-chip-val {
          font-size: 1.3rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          line-height: 1.1;
          margin-bottom: 0.15rem;
        }

        .track-chip.confirmed {
          background: rgba(74,222,128,0.1);
          border: 1px solid rgba(74,222,128,0.2);
          color: #4ade80;
        }

        .track-chip.pending {
          background: rgba(251,191,36,0.1);
          border: 1px solid rgba(251,191,36,0.2);
          color: #fbbf24;
        }

        .track-chip.total {
          background: rgba(99,102,241,0.1);
          border: 1px solid rgba(99,102,241,0.2);
          color: var(--primary);
        }

        /* ── Timeline ── */
        .track-timeline {
          position: relative;
          animation: fade-in-up 0.4s ease 0.05s both;
        }

        .track-timeline-line {
          position: absolute;
          left: 19px;
          top: 0;
          bottom: 0;
          width: 2px;
          background: linear-gradient(180deg, var(--primary) 0%, var(--card-border) 80%, transparent 100%);
          opacity: 0.4;
        }

        .track-event {
          display: flex;
          gap: 1.125rem;
          position: relative;
          padding-bottom: 1.25rem;
        }

        .track-event:last-child {
          padding-bottom: 0;
        }

        .track-event-left {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex-shrink: 0;
          width: 40px;
        }

        .track-event-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          position: relative;
          z-index: 2;
          transition: all 0.3s ease;
        }

        .track-event-icon.confirmed {
          background: rgba(74,222,128,0.12);
          border: 2px solid rgba(74,222,128,0.35);
          color: #4ade80;
        }

        .track-event-icon.pending {
          background: rgba(251,191,36,0.12);
          border: 2px solid rgba(251,191,36,0.35);
          color: #fbbf24;
          animation: glow-pulse-amber 2s ease-in-out infinite;
        }

        @keyframes glow-pulse-amber {
          0%,100% { box-shadow: 0 0 0 0 rgba(251,191,36,0.0); }
          50%      { box-shadow: 0 0 0 6px rgba(251,191,36,0.12); }
        }

        .track-event-card {
          flex: 1;
          background: var(--card);
          border: 1px solid var(--card-border);
          border-radius: 0.875rem;
          padding: 1rem 1.25rem;
          transition: all 0.25s ease;
          margin-bottom: 0;
        }

        .track-event-card:hover {
          border-color: rgba(99,102,241,0.25);
          box-shadow: 0 4px 24px rgba(99,102,241,0.08);
        }

        .track-event-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          margin-bottom: 0.625rem;
        }

        .track-event-type {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          font-weight: 650;
          color: var(--foreground);
        }

        .track-event-badge {
          font-size: 0.65rem;
          padding: 0.18rem 0.55rem;
          border-radius: 999px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .track-event-badge.confirmed {
          background: rgba(74,222,128,0.12);
          color: #4ade80;
          border: 1px solid rgba(74,222,128,0.25);
        }

        .track-event-badge.pending {
          background: rgba(251,191,36,0.12);
          color: #fbbf24;
          border: 1px solid rgba(251,191,36,0.25);
        }

        .track-event-meta {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.375rem 1rem;
        }

        .track-meta-row {
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
        }

        .track-meta-label {
          font-size: 0.67rem;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-weight: 600;
        }

        .track-meta-value {
          font-size: 0.78rem;
          color: var(--foreground);
          font-family: var(--font-mono), monospace;
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }

        .copy-btn {
          background: none;
          border: none;
          color: var(--muted);
          cursor: pointer;
          padding: 0.1rem;
          border-radius: 0.25rem;
          display: inline-flex;
          align-items: center;
          transition: color 0.15s;
          flex-shrink: 0;
        }

        .copy-btn:hover { color: var(--primary); }

        .track-meta-location {
          font-size: 0.78rem;
          color: var(--muted);
          display: flex;
          align-items: center;
          gap: 0.35rem;
          margin-top: 0.5rem;
          padding-top: 0.5rem;
          border-top: 1px solid var(--card-border);
          grid-column: 1 / -1;
        }

        /* ── Empty / loading ── */
        .track-empty {
          text-align: center;
          padding: 4rem 1.5rem;
          color: var(--muted);
          font-size: 0.9rem;
        }

        .track-spinner-wrap {
          display: flex;
          justify-content: center;
          padding: 4rem 0;
        }

        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 560px) {
          .track-nav { padding: 1rem 1.25rem; }
          .track-event-meta { grid-template-columns: 1fr; }
          .track-result-header { flex-direction: column; }
        }
      `}</style>

      <div className="track-root">
        {/* ── Nav ── */}
        <nav className="track-nav">
          <Link href="/" className="track-nav-logo">Velen</Link>
          <div className="track-nav-links">
            <Link href="/explorer" className="track-nav-link">Explorer</Link>
            <Link href="/login"    className="track-nav-link">Login</Link>
            <Link href="/register" className="track-nav-btn">Get Started</Link>
          </div>
        </nav>

        {/* ── Hero + search ── */}
        <div className="track-hero">
          <div className="track-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            Public · No account required
          </div>

          <h1 className="track-hero-title">
            Track any <span>product</span>
          </h1>
          <p className="track-hero-sub">
            Enter a Product ID to see its full on-chain journey — every custody
            transfer, timestamped and cryptographically verified.
          </p>

          <div className="track-search-wrap">
            <form className="track-search-form" onSubmit={handleSearch}>
              <input
                className="track-search-input"
                placeholder="Enter Product ID, e.g. PROD-8f3a2c…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                required
              />
              <button type="submit" className="track-search-btn" disabled={loading}>
                {loading ? (
                  <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    Track
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* ── Results ── */}
        <div className="track-content">

          {/* Error */}
          {error && (
            <div className="track-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          {/* No results yet */}
          {!loading && !error && !history && (
            <div className="track-empty">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 1rem", color: "var(--card-border)" }}>
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/>
              </svg>
              Enter a product ID above to view its supply chain history
            </div>
          )}

          {/* Results */}
          {history && (
            <>
              {/* Product header */}
              <div className="track-result-header">
                <div>
                  <div className="track-product-id">Product ID</div>
                  <div className="track-product-name">{searched}</div>
                  {holder && (
                    <div className="track-holder-row">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                      </svg>
                      Current holder:
                      <span className="track-holder-addr">{truncate(holder)}</span>
                      <CopyButton text={holder} />
                    </div>
                  )}
                </div>

                <div className="track-stat-chips">
                  <div className="track-chip total">
                    <span className="track-chip-val">{history.length}</span>
                    Events
                  </div>
                  <div className="track-chip confirmed">
                    <span className="track-chip-val">{confirmedCount}</span>
                    Confirmed
                  </div>
                  {pendingCount > 0 && (
                    <div className="track-chip pending">
                      <span className="track-chip-val">{pendingCount}</span>
                      Pending
                    </div>
                  )}
                </div>
              </div>

              {/* Timeline */}
              {history.length === 0 ? (
                <div className="track-empty">No events found for this product.</div>
              ) : (
                <div className="track-timeline">
                  <div className="track-timeline-line" />
                  {history.map((event, i) => {
                    const status = event.status.toLowerCase() as "confirmed" | "pending";
                    const meta = (event.metadata as Record<string, string>) ?? {};
                    const eventLabel =
                      event.type === "PRODUCT_REGISTERED" ? "Product Registered" : "Custody Transfer";

                    return (
                      <div key={event.txId ?? i} className="track-event">
                        <div className="track-event-left">
                          <div className={`track-event-icon ${status}`}>
                            {STAGE_ICONS[event.type] ?? STAGE_ICONS["CUSTODY_TRANSFER"]}
                          </div>
                        </div>

                        <div className="track-event-card">
                          <div className="track-event-top">
                            <div className="track-event-type">
                              {eventLabel}
                            </div>
                            <div className="flex items-center gap-2">
                              {event.blockIndex !== null && (
                                <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                                  Block #{event.blockIndex}
                                </span>
                              )}
                              <span className={`track-event-badge ${status}`}>
                                {event.status}
                              </span>
                            </div>
                          </div>

                          <div className="track-event-meta">
                            <div className="track-meta-row">
                              <span className="track-meta-label">From</span>
                              <span className="track-meta-value">
                                {truncate(event.fromAddress)}
                                {event.fromAddress !== "SYSTEM" && (
                                  <CopyButton text={event.fromAddress} />
                                )}
                              </span>
                            </div>
                            <div className="track-meta-row">
                              <span className="track-meta-label">To</span>
                              <span className="track-meta-value">
                                {truncate(event.toAddress)}
                                <CopyButton text={event.toAddress} />
                              </span>
                            </div>
                            <div className="track-meta-row">
                              <span className="track-meta-label">Timestamp</span>
                              <span className="track-meta-value">
                                {event.timestamp
                                  ? new Date(event.timestamp).toLocaleString()
                                  : "—"}
                              </span>
                            </div>
                            <div className="track-meta-row">
                              <span className="track-meta-label">Transaction ID</span>
                              <span className="track-meta-value" style={{ fontSize: "0.72rem" }}>
                                {event.txId ? truncate(event.txId) : "—"}
                                {event.txId && <CopyButton text={event.txId} />}
                              </span>
                            </div>
                            {meta.location && (
                              <div className="track-meta-location">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                                </svg>
                                {meta.location}
                                {meta.status && (
                                  <span style={{ marginLeft: "0.5rem", color: "var(--foreground)", fontWeight: 600 }}>
                                    · {meta.status}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}