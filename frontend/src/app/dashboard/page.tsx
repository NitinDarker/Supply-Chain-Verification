"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  const copyAddress = () => {
    navigator.clipboard.writeText(user.walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const roleBadgeColor: Record<string, string> = {
    admin: "bg-red-500/15 text-red-400 border border-red-500/25",
    manufacturer: "bg-blue-500/15 text-blue-400 border border-blue-500/25",
    distributor: "bg-amber-500/15 text-amber-400 border border-amber-500/25",
    retailer: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",
    user: "bg-indigo-500/15 text-indigo-400 border border-indigo-500/25",
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="bg-card/80 backdrop-blur-md border-b border-card-border px-6 py-4 flex items-center justify-between animate-in">
        <h1 className="text-xl font-bold gradient-text">Velen</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted">{user.username}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-danger hover:text-red-300 transition-colors"
          >
            Logout
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold mb-6 animate-in">Dashboard</h2>

        {/* Wallet Card */}
        <div className="bg-gradient-to-br from-[#1a2040] via-card to-[#161d3a] rounded-2xl p-6 mb-6 card-glow-pulse animate-in-delay-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Wallet</h3>
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${roleBadgeColor[user.role] || roleBadgeColor.user}`}>
              {user.role}
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted mb-1">Balance</p>
              <p className="text-3xl font-bold gradient-text inline-block">0.00 <span className="text-lg text-muted">VEL</span></p>
            </div>

            <div>
              <p className="text-sm text-muted mb-1">Wallet Address</p>
              <div className="flex items-center gap-2 bg-input-bg border border-card-border rounded-lg px-4 py-2.5">
                <p className="font-mono text-sm flex-1 truncate">{user.walletAddress}</p>
                <button
                  onClick={copyAddress}
                  className="text-xs text-primary hover:text-primary-hover shrink-0 transition-colors"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            { title: "Send VEL", desc: "Transfer coins to another wallet", delay: "animate-in-delay-2" },
            { title: "Track Product", desc: "Register or transfer a product", delay: "animate-in-delay-3" },
            { title: "Explorer", desc: "Browse the blockchain", delay: "animate-in-delay-4" },
          ].map((action) => (
            <button
              key={action.title}
              className={`bg-card rounded-2xl p-4 text-left card-glow transition-all duration-300 opacity-50 cursor-not-allowed ${action.delay}`}
            >
              <p className="font-medium mb-1">{action.title}</p>
              <p className="text-sm text-muted">{action.desc}</p>
            </button>
          ))}
        </div>

        {/* Account Info */}
        <div className="bg-card rounded-2xl p-6 card-glow animate-in-delay-4">
          <h3 className="text-lg font-semibold mb-4">Account Info</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted">Username</p>
              <p>{user.username}</p>
            </div>
            <div>
              <p className="text-muted">Email</p>
              <p>{user.email}</p>
            </div>
            <div>
              <p className="text-muted">Role</p>
              <p className="capitalize">{user.role}</p>
            </div>
            <div>
              <p className="text-muted">Status</p>
              <p className="capitalize">{user.status || "verified"}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
