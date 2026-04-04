'use client'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import StarField from '@/components/StarField'

interface ChainStats {
  height: number
  pendingTxCount: number
  totalProducts: number
  difficulty: number
}

function ThemeToggle ({
  theme,
  toggle
}: {
  theme: 'dark' | 'light'
  toggle: () => void
}) {
  return (
    <button
      onClick={toggle}
      aria-label='Toggle theme'
      className='theme-toggle-btn'
    >
      {theme === 'dark' ? (
        // Sun icon
        <svg
          width='18'
          height='18'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
        >
          <circle cx='12' cy='12' r='5' />
          <line x1='12' y1='1' x2='12' y2='3' />
          <line x1='12' y1='21' x2='12' y2='23' />
          <line x1='4.22' y1='4.22' x2='5.64' y2='5.64' />
          <line x1='18.36' y1='18.36' x2='19.78' y2='19.78' />
          <line x1='1' y1='12' x2='3' y2='12' />
          <line x1='21' y1='12' x2='23' y2='12' />
          <line x1='4.22' y1='19.78' x2='5.64' y2='18.36' />
          <line x1='18.36' y1='5.64' x2='19.78' y2='4.22' />
        </svg>
      ) : (
        // Moon icon
        <svg
          width='18'
          height='18'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
        >
          <path d='M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z' />
        </svg>
      )}
    </button>
  )
}

// ── Stat pill ────────────────────────────────────────────────────────────────
function StatPill ({
  label,
  value,
  icon
}: {
  label: string
  value: string | number
  icon: React.ReactNode
}) {
  return (
    <div className='stat-pill'>
      <span className='stat-icon'>{icon}</span>
      <div className='stat-text'>
        <span className='stat-value'>{value}</span>
        <span className='stat-label'>{label}</span>
      </div>
    </div>
  )
}

// ── Feature card ─────────────────────────────────────────────────────────────
function FeatureCard ({
  icon,
  title,
  desc,
  delay
}: {
  icon: React.ReactNode
  title: string
  desc: string
  delay: number
}) {
  return (
    <div className='feature-card' style={{ animationDelay: `${delay}ms` }}>
      <div className='feature-icon-wrap'>{icon}</div>
      <h3 className='feature-title'>{title}</h3>
      <p className='feature-desc'>{desc}</p>
    </div>
  )
}

// ── Journey step ─────────────────────────────────────────────────────────────
function JourneyStep ({
  label,
  icon,
  isLast
}: {
  label: string
  icon: React.ReactNode
  isLast?: boolean
}) {
  return (
    <div className='journey-step'>
      <div className='journey-node'>{icon}</div>
      {!isLast && <div className='journey-line' />}
      <span className='journey-label'>{label}</span>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function Home () {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [stats, setStats] = useState<ChainStats | null>(null)

  // redirect if already logged in
  useEffect(() => {
    if (!loading && user) router.push('/dashboard')
  }, [user, loading, router])

  // apply theme to root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // fetch live chain stats
  useEffect(() => {
    fetch('/api/chain/stats')
      .then(r => r.json())
      .then(d => setStats(d))
      .catch(() => {})
  }, [])

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='spinner' />
      </div>
    )
  }

  return (
    <>
      {/* ── Inline styles (scoped to this page) ── */}
      <style>{`
        /* ── Theme variables ── */
        :root[data-theme="dark"], :root {
          --lp-bg:          #111525;
          --lp-card:        #161b2e;
          --lp-border:      #222845;
          --lp-primary:     #6366f1;
          --lp-primary-h:   #818cf8;
          --lp-fg:          #e0e4f0;
          --lp-muted:       #7683a3;
          --lp-input:       #1a2038;
          --lp-glow:        rgba(99,102,241,0.15);
          --lp-stat-bg:     rgba(22,27,46,0.85);
          --lp-mesh1:       rgba(99,102,241,0.08);
          --lp-mesh2:       rgba(96,165,250,0.06);
          --lp-hero-sub:    rgba(255,255,255,0.06);
        }

        :root[data-theme="light"] {
          --lp-bg:          #f4f3ff;
          --lp-card:        #ffffff;
          --lp-border:      #ddd9f7;
          --lp-primary:     #6366f1;
          --lp-primary-h:   #4f46e5;
          --lp-fg:          #1e1b4b;
          --lp-muted:       #6b7280;
          --lp-input:       #ede9fe;
          --lp-glow:        rgba(99,102,241,0.12);
          --lp-stat-bg:     rgba(255,255,255,0.9);
          --lp-mesh1:       rgba(99,102,241,0.07);
          --lp-mesh2:       rgba(167,139,250,0.08);
          --lp-hero-sub:    rgba(99,102,241,0.06);
        }

        /* ── Base ── */
        .lp-root {
          min-height: 100vh;
          background: var(--lp-bg);
          color: var(--lp-fg);
          font-family: var(--font-sans), Arial, sans-serif;
          position: relative;
          overflow-x: hidden;
          transition: background 0.35s ease, color 0.35s ease;
        }

        /* ── Background mesh ── */
        .lp-mesh {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background:
            radial-gradient(ellipse at 15% 50%, var(--lp-mesh1) 0%, transparent 55%),
            radial-gradient(ellipse at 85% 15%, var(--lp-mesh2) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 90%, var(--lp-mesh1) 0%, transparent 50%);
          transition: background 0.35s ease;
        }

        .lp-content { position: relative; z-index: 1; }

        /* ── Navbar ── */
        .lp-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 2.5rem;
          border-bottom: 1px solid var(--lp-border);
          background: rgba(0,0,0,0.0);
          backdrop-filter: blur(12px);
          position: sticky;
          top: 0;
          z-index: 50;
          transition: border-color 0.35s ease;
        }

        [data-theme="light"] .lp-nav {
          background: rgba(244,243,255,0.85);
          border-bottom-color: var(--lp-border);
        }

        .lp-nav-logo {
          font-size: 1.35rem;
          font-weight: 700;
          background: linear-gradient(135deg, #818cf8, #6366f1, #60a5fa);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -0.02em;
        }

        .lp-nav-links {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .lp-nav-link {
          color: var(--lp-muted);
          font-size: 0.875rem;
          padding: 0.4rem 0.9rem;
          border-radius: 0.5rem;
          transition: color 0.2s, background 0.2s;
          text-decoration: none;
        }

        .lp-nav-link:hover {
          color: var(--lp-fg);
          background: var(--lp-hero-sub);
        }

        .theme-toggle-btn {
          background: var(--lp-card);
          border: 1px solid var(--lp-border);
          color: var(--lp-muted);
          border-radius: 0.5rem;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .theme-toggle-btn:hover {
          color: var(--lp-primary);
          border-color: var(--lp-primary);
          background: var(--lp-glow);
        }

        /* ── Hero ── */
        .lp-hero {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 6rem 1.5rem 4rem;
          gap: 2rem;
        }

        .lp-hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: var(--lp-hero-sub);
          border: 1px solid var(--lp-border);
          border-radius: 999px;
          padding: 0.35rem 1rem;
          font-size: 0.78rem;
          color: var(--lp-muted);
          animation: fade-in-up 0.5s cubic-bezier(0.16,1,0.3,1) both;
        }

        .lp-badge-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #4ade80;
          box-shadow: 0 0 6px #4ade80;
          animation: pulse-dot 2s ease-in-out infinite;
        }

        @keyframes pulse-dot {
          0%,100% { opacity:1; transform:scale(1); }
          50%      { opacity:0.6; transform:scale(1.3); }
        }

        .lp-hero-title {
          font-size: clamp(3.5rem, 9vw, 7rem);
          font-weight: 800;
          letter-spacing: -0.04em;
          line-height: 1;
          background: linear-gradient(135deg, #818cf8, #6366f1, #60a5fa, #818cf8);
          background-size: 300% 300%;
          animation: gradient-shift 4s ease infinite, fade-in-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.05s both;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0;
        }

        [data-theme="light"] .lp-hero-title {
          background: linear-gradient(135deg, #6366f1, #4f46e5, #7c3aed, #6366f1);
          background-size: 300% 300%;
          animation: gradient-shift 4s ease infinite, fade-in-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.05s both;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .lp-hero-sub {
          font-size: 1.125rem;
          color: var(--lp-muted);
          max-width: 480px;
          line-height: 1.65;
          animation: fade-in-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.12s both;
        }

        .lp-hero-ctas {
          display: flex;
          gap: 0.875rem;
          flex-wrap: wrap;
          justify-content: center;
          animation: fade-in-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.2s both;
        }

        .lp-btn-primary {
          padding: 0.75rem 2rem;
          background: linear-gradient(135deg, #4f46e5, #6366f1, #818cf8);
          background-size: 200% 200%;
          animation: gradient-shift 3s ease infinite;
          color: #fff;
          border-radius: 0.625rem;
          font-weight: 600;
          font-size: 0.95rem;
          text-decoration: none;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
        }

        .lp-btn-primary:hover {
          box-shadow: 0 6px 32px rgba(99,102,241,0.5);
          transform: translateY(-2px);
        }

        .lp-btn-secondary {
          padding: 0.75rem 2rem;
          border: 1px solid var(--lp-border);
          color: var(--lp-fg);
          border-radius: 0.625rem;
          font-weight: 600;
          font-size: 0.95rem;
          text-decoration: none;
          background: transparent;
          transition: all 0.3s ease;
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
        }

        .lp-btn-secondary:hover {
          border-color: var(--lp-primary);
          background: var(--lp-glow);
          transform: translateY(-2px);
        }

        .lp-btn-ghost {
          padding: 0.75rem 1.5rem;
          color: var(--lp-muted);
          border-radius: 0.625rem;
          font-weight: 500;
          font-size: 0.95rem;
          text-decoration: none;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
        }

        .lp-btn-ghost:hover {
          color: var(--lp-fg);
          background: var(--lp-hero-sub);
        }

        /* ── Stats bar ── */
        .lp-stats-bar {
          display: flex;
          justify-content: center;
          gap: 1rem;
          flex-wrap: wrap;
          padding: 0 1.5rem 4rem;
          animation: fade-in-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.28s both;
        }

        .stat-pill {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: var(--lp-stat-bg);
          border: 1px solid var(--lp-border);
          border-radius: 0.75rem;
          padding: 0.75rem 1.25rem;
          backdrop-filter: blur(8px);
          transition: all 0.3s ease;
          min-width: 150px;
        }

        .stat-pill:hover {
          border-color: var(--lp-primary);
          box-shadow: 0 4px 24px var(--lp-glow);
          transform: translateY(-2px);
        }

        .stat-icon {
          color: var(--lp-primary);
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }

        .stat-text {
          display: flex;
          flex-direction: column;
        }

        .stat-value {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--lp-fg);
          font-variant-numeric: tabular-nums;
          line-height: 1.2;
        }

        .stat-label {
          font-size: 0.7rem;
          color: var(--lp-muted);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        /* ── Section ── */
        .lp-section {
          max-width: 1100px;
          margin: 0 auto;
          padding: 4rem 1.5rem;
        }

        .lp-section-label {
          display: inline-block;
          font-size: 0.72rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--lp-primary);
          margin-bottom: 0.75rem;
        }

        .lp-section-title {
          font-size: clamp(1.6rem, 3.5vw, 2.25rem);
          font-weight: 700;
          letter-spacing: -0.02em;
          color: var(--lp-fg);
          margin: 0 0 0.75rem;
        }

        .lp-section-desc {
          font-size: 1rem;
          color: var(--lp-muted);
          max-width: 500px;
          line-height: 1.65;
        }

        .lp-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--lp-border), transparent);
          margin: 0 1.5rem;
        }

        /* ── Features grid ── */
        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 1.25rem;
          margin-top: 2.5rem;
        }

        .feature-card {
          background: var(--lp-card);
          border: 1px solid var(--lp-border);
          border-radius: 1rem;
          padding: 1.75rem;
          animation: fade-in-up 0.5s cubic-bezier(0.16,1,0.3,1) both;
          transition: all 0.35s ease;
          position: relative;
          overflow: hidden;
        }

        .feature-card::before {
          content: "";
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, var(--lp-primary), transparent);
          opacity: 0;
          transition: opacity 0.35s ease;
        }

        .feature-card:hover {
          border-color: rgba(99,102,241,0.3);
          box-shadow: 0 8px 40px var(--lp-glow);
          transform: translateY(-4px);
        }

        .feature-card:hover::before { opacity: 1; }

        .feature-icon-wrap {
          width: 42px;
          height: 42px;
          border-radius: 0.625rem;
          background: var(--lp-glow);
          border: 1px solid rgba(99,102,241,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--lp-primary);
          margin-bottom: 1.1rem;
        }

        .feature-title {
          font-size: 1rem;
          font-weight: 650;
          color: var(--lp-fg);
          margin: 0 0 0.5rem;
          letter-spacing: -0.01em;
        }

        .feature-desc {
          font-size: 0.875rem;
          color: var(--lp-muted);
          line-height: 1.6;
          margin: 0;
        }

        /* ── Supply chain journey ── */
        .journey-wrap {
          display: flex;
          align-items: flex-start;
          justify-content: center;
          gap: 0;
          margin-top: 2.5rem;
          flex-wrap: wrap;
          padding: 2rem;
          background: var(--lp-card);
          border: 1px solid var(--lp-border);
          border-radius: 1.25rem;
          position: relative;
          overflow: hidden;
        }

        .journey-wrap::before {
          content: "";
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at 50% 50%, var(--lp-glow) 0%, transparent 70%);
          pointer-events: none;
        }

        .journey-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          flex: 1;
          min-width: 100px;
        }

        .journey-node {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: var(--lp-input);
          border: 2px solid var(--lp-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--lp-primary);
          position: relative;
          z-index: 2;
          transition: all 0.3s ease;
          box-shadow: 0 0 16px var(--lp-glow);
        }

        .journey-step:hover .journey-node {
          background: var(--lp-primary);
          color: white;
          box-shadow: 0 0 28px rgba(99,102,241,0.45);
          transform: scale(1.08);
        }

        .journey-line {
          position: absolute;
          top: 26px;
          left: calc(50% + 26px);
          right: calc(-50% + 26px);
          height: 2px;
          background: linear-gradient(90deg, var(--lp-primary), rgba(99,102,241,0.3));
          z-index: 1;
        }

        .journey-label {
          font-size: 0.75rem;
          color: var(--lp-muted);
          margin-top: 0.75rem;
          font-weight: 500;
          letter-spacing: 0.02em;
          text-align: center;
        }

        /* ── Product tracker preview ── */
        .tracker-preview {
          background: var(--lp-card);
          border: 1px solid var(--lp-border);
          border-radius: 1.25rem;
          padding: 1.75rem;
          margin-top: 2.5rem;
        }

        .tracker-search {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }

        .tracker-input {
          flex: 1;
          background: var(--lp-input);
          border: 1px solid var(--lp-border);
          border-radius: 0.625rem;
          padding: 0.625rem 1rem;
          color: var(--lp-fg);
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          font-family: var(--font-mono), monospace;
        }

        .tracker-input::placeholder { color: var(--lp-muted); }

        .tracker-input:focus {
          border-color: var(--lp-primary);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
        }

        .tracker-btn {
          padding: 0.625rem 1.25rem;
          background: linear-gradient(135deg, #4f46e5, #6366f1);
          color: white;
          border-radius: 0.625rem;
          font-size: 0.875rem;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s ease;
          white-space: nowrap;
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
        }

        .tracker-btn:hover {
          box-shadow: 0 4px 20px rgba(99,102,241,0.4);
          transform: translateY(-1px);
        }

        .tracker-events {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .tracker-event {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1rem 0;
          border-bottom: 1px solid var(--lp-border);
          position: relative;
        }

        .tracker-event:last-child { border-bottom: none; }

        .tracker-event-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          margin-top: 4px;
          flex-shrink: 0;
          position: relative;
          z-index: 2;
        }

        .tracker-event-dot.confirmed {
          background: #4ade80;
          box-shadow: 0 0 8px rgba(74,222,128,0.5);
        }

        .tracker-event-dot.pending {
          background: #fbbf24;
          box-shadow: 0 0 8px rgba(251,191,36,0.5);
          animation: pulse-dot 1.5s ease-in-out infinite;
        }

        .tracker-event-line {
          position: absolute;
          left: 4px;
          top: 22px;
          bottom: -12px;
          width: 2px;
          background: var(--lp-border);
        }

        .tracker-event:last-child .tracker-event-line { display: none; }

        .tracker-event-info { flex: 1; }

        .tracker-event-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--lp-fg);
          margin-bottom: 0.2rem;
        }

        .tracker-event-meta {
          font-size: 0.78rem;
          color: var(--lp-muted);
          font-family: var(--font-mono), monospace;
        }

        .tracker-badge {
          font-size: 0.68rem;
          padding: 0.2rem 0.55rem;
          border-radius: 999px;
          font-weight: 600;
          letter-spacing: 0.04em;
        }

        .tracker-badge.confirmed {
          background: rgba(74,222,128,0.12);
          color: #4ade80;
          border: 1px solid rgba(74,222,128,0.25);
        }

        .tracker-badge.pending {
          background: rgba(251,191,36,0.12);
          color: #fbbf24;
          border: 1px solid rgba(251,191,36,0.25);
        }

        /* ── Footer ── */
        .lp-footer {
          border-top: 1px solid var(--lp-border);
          padding: 2rem 2.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: gap;
          gap: 1rem;
        }

        .lp-footer-logo {
          font-weight: 700;
          background: linear-gradient(135deg, #818cf8, #6366f1);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .lp-footer-links {
          display: flex;
          gap: 1.5rem;
          flex-wrap: wrap;
        }

        .lp-footer-link {
          font-size: 0.8rem;
          color: var(--lp-muted);
          text-decoration: none;
          transition: color 0.2s;
        }

        .lp-footer-link:hover { color: var(--lp-fg); }

        .lp-footer-copy {
          font-size: 0.78rem;
          color: var(--lp-muted);
        }

        /* ── Dark-only star field ── */
        [data-theme="light"] .dark-only { display: none !important; }

        /* ── Twinkle for stars ── */
        @keyframes twinkle {
          0%,100% { opacity: var(--op,0.2); }
          50%      { opacity: calc(var(--op,0.2) * 0.3); }
        }

        @keyframes gradient-shift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── Responsive ── */
        @media (max-width: 640px) {
          .lp-nav { padding: 1rem 1.25rem; }
          .lp-hero { padding: 4rem 1.25rem 2.5rem; }
          .lp-stats-bar { gap: 0.75rem; }
          .stat-pill { min-width: 130px; }
          .journey-wrap { flex-direction: column; align-items: center; gap: 1rem; }
          .journey-line { display: none; }
          .lp-footer { flex-direction: column; text-align: center; }
        }
      `}</style>

      <div className='lp-root' data-theme={theme}>
        {/* Star field (dark only) */}
        <StarField />
        <div className='lp-mesh' />

        <div className='lp-content'>
          {/* ── Navbar ── */}
          <nav className='lp-nav'>
            <span className='lp-nav-logo'>Velen</span>

            <div className='lp-nav-links'>
              <Link href='/explorer' className='lp-nav-link'>
                Explorer
              </Link>
              <Link href='/track' className='lp-nav-link'>
                Track Product
              </Link>
              <ThemeToggle
                theme={theme}
                toggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              />
              <Link
                href='/login'
                className='lp-btn-primary'
                style={{ padding: '0.45rem 1.1rem', fontSize: '0.85rem' }}
              >
                Login
              </Link>
            </div>
          </nav>

          {/* ── Hero ── */}
          <section className='lp-hero'>
            <h1 className='lp-hero-title'>Velen</h1>

            <p className='lp-hero-sub'>
              <p>Private blockchain-based digital wallet </p>
              <p>and supply chain verification. </p>
            </p>

            <div className='lp-hero-ctas'>
              <Link href='/register' className='lp-btn-primary'>
                <svg
                  width='16'
                  height='16'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2.5'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                >
                  <path d='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' />
                  <circle cx='9' cy='7' r='4' />
                  <line x1='19' y1='8' x2='19' y2='14' />
                  <line x1='22' y1='11' x2='16' y2='11' />
                </svg>
                Create Wallet
              </Link>
              <Link href='/track' className='lp-btn-secondary'>
                <svg
                  width='16'
                  height='16'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2.5'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                >
                  <circle cx='11' cy='11' r='8' />
                  <line x1='21' y1='21' x2='16.65' y2='16.65' />
                </svg>
                Track a Product
              </Link>
              <Link href='/explorer' className='lp-btn-ghost'>
                View Explorer →
              </Link>
            </div>
          </section>

          {/* ── Live Chain Stats ── */}
          <div className='lp-stats-bar'>
            <StatPill
              label='Block Height'
              value={stats ? `#${stats.height.toLocaleString()}` : '—'}
              icon={
                <svg
                  width='18'
                  height='18'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                >
                  <rect x='2' y='7' width='20' height='14' rx='2' />
                  <path d='M16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z' />
                </svg>
              }
            />
            <StatPill
              label='Pending Txns'
              value={stats ? stats.pendingTxCount : '—'}
              icon={
                <svg
                  width='18'
                  height='18'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                >
                  <polyline points='23 6 13.5 15.5 8.5 10.5 1 18' />
                  <polyline points='17 6 23 6 23 12' />
                </svg>
              }
            />
            <StatPill
              label='Products Tracked'
              value={stats ? stats.totalProducts.toLocaleString() : '—'}
              icon={
                <svg
                  width='18'
                  height='18'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                >
                  <path d='M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z' />
                </svg>
              }
            />
            <StatPill
              label='Chain Integrity'
              value='✓ Valid'
              icon={
                <svg
                  width='18'
                  height='18'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                >
                  <path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' />
                </svg>
              }
            />
          </div>

          <div className='lp-divider' />

          {/* ── Supply chain journey ── */}
          <section className='lp-section'>
            <span className='lp-section-label'>Supply Chain</span>
            <h2 className='lp-section-title'>
              Full product traceability, end-to-end
            </h2>
            <p className='lp-section-desc'>
              Every custody transfer is a signed transaction recorded on-chain.
              Scan any product ID to see its complete, tamper-proof journey.
            </p>

            <div className='journey-wrap'>
              <JourneyStep
                label='Manufacturer'
                icon={
                  <svg
                    width='22'
                    height='22'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  >
                    <rect x='2' y='7' width='20' height='14' rx='2' />
                    <path d='M16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z' />
                  </svg>
                }
              />
              <JourneyStep
                label='Warehouse'
                icon={
                  <svg
                    width='22'
                    height='22'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  >
                    <path d='M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' />
                    <polyline points='9 22 9 12 15 12 15 22' />
                  </svg>
                }
              />
              <JourneyStep
                label='Distributor'
                icon={
                  <svg
                    width='22'
                    height='22'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  >
                    <rect x='1' y='3' width='15' height='13' rx='1' />
                    <path d='M16 8h4l3 3v5h-7V8z' />
                    <circle cx='5.5' cy='18.5' r='2.5' />
                    <circle cx='18.5' cy='18.5' r='2.5' />
                  </svg>
                }
              />
              <JourneyStep
                label='Customs'
                icon={
                  <svg
                    width='22'
                    height='22'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  >
                    <path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' />
                  </svg>
                }
              />
              <JourneyStep
                label='Retailer'
                isLast
                icon={
                  <svg
                    width='22'
                    height='22'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  >
                    <path d='M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z' />
                    <line x1='3' y1='6' x2='21' y2='6' />
                    <path d='M16 10a4 4 0 0 1-8 0' />
                  </svg>
                }
              />
            </div>
          </section>

          <div className='lp-divider' />

          {/* ── Product tracker preview ── */}
          <section className='lp-section'>
            <span className='lp-section-label'>Public Tracker</span>
            <h2 className='lp-section-title'>Verify any product, instantly</h2>
            <p className='lp-section-desc'>
              No account needed. Enter a Product ID to see its full on-chain
              history — confirmed blocks and pending movements.
            </p>

            <div className='tracker-preview'>
              <div className='tracker-search'>
                <input
                  className='tracker-input'
                  placeholder='Enter Product ID, e.g. PROD-8f3a2c...'
                  readOnly
                />
                <Link href='/track' className='tracker-btn'>
                  <svg
                    width='14'
                    height='14'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2.5'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  >
                    <circle cx='11' cy='11' r='8' />
                    <line x1='21' y1='21' x2='16.65' y2='16.65' />
                  </svg>
                  Track
                </Link>
              </div>

              {/* Mock timeline */}
              <div className='tracker-events'>
                {[
                  {
                    title: 'Product Registered',
                    meta: '0x1a2b…9f0e · Block #142 · Jan 12, 2026 09:14',
                    status: 'confirmed'
                  },
                  {
                    title: 'Custody Transfer → Warehouse',
                    meta: '0x3c4d…1a2b · Block #189 · Jan 14, 2026 14:32',
                    status: 'confirmed'
                  },
                  {
                    title: 'Custody Transfer → Distributor',
                    meta: '0x5e6f…3c4d · Block #231 · Jan 19, 2026 11:05',
                    status: 'confirmed'
                  },
                  {
                    title: 'Custody Transfer → Retailer',
                    meta: 'Pending · Awaiting block confirmation…',
                    status: 'pending'
                  }
                ].map((ev, i) => (
                  <div key={i} className='tracker-event'>
                    <div style={{ position: 'relative', paddingTop: '4px' }}>
                      <div className={`tracker-event-dot ${ev.status}`} />
                      {i < 3 && <div className='tracker-event-line' />}
                    </div>
                    <div className='tracker-event-info'>
                      <div className='tracker-event-title'>{ev.title}</div>
                      <div className='tracker-event-meta'>{ev.meta}</div>
                    </div>
                    <span className={`tracker-badge ${ev.status}`}>
                      {ev.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── CTA Banner ── */}
          <section className='lp-section' style={{ paddingTop: '2rem' }}>
            <div
              style={{
                background:
                  'linear-gradient(135deg, rgba(79,70,229,0.15), rgba(99,102,241,0.08))',
                border: '1px solid rgba(99,102,241,0.25)',
                borderRadius: '1.25rem',
                padding: '3rem 2rem',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.12) 0%, transparent 70%)',
                  pointerEvents: 'none'
                }}
              />
              <h2
                style={{
                  fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  marginBottom: '0.75rem',
                  color: 'var(--lp-fg)',
                  position: 'relative'
                }}
              >
                Ready to join the chain?
              </h2>
              <p
                style={{
                  color: 'var(--lp-muted)',
                  marginBottom: '1.75rem',
                  fontSize: '1rem',
                  position: 'relative'
                }}
              >
                Create your wallet in seconds. Your keys, your assets, your
                supply chain.
              </p>
              <div
                style={{
                  display: 'flex',
                  gap: '0.875rem',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                  position: 'relative'
                }}
              >
                <Link href='/register' className='lp-btn-primary'>
                  Get Started Free
                </Link>
                <Link href='/login' className='lp-btn-secondary'>
                  Sign In
                </Link>
              </div>
            </div>
          </section>

          {/* ── Footer ── */}
          <footer className='lp-footer'>
            <span className='lp-footer-logo'>Velen</span>
            <div className='lp-footer-links'>
              <Link href='/explorer' className='lp-footer-link'>
                Explorer
              </Link>
              <Link href='/track' className='lp-footer-link'>
                Track Product
              </Link>
              <Link href='/login' className='lp-footer-link'>
                Login
              </Link>
              <Link href='/register' className='lp-footer-link'>
                Register
              </Link>
            </div>
            <span className='lp-footer-copy'>
              Private Blockchain · SHA-256 · ECDSA
            </span>
          </footer>
        </div>
      </div>
    </>
  )
}
