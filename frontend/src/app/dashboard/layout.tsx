"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

const navLinks = [
  { href: "/dashboard",              label: "Overview" },
  { href: "/dashboard/send",         label: "Send VEL" },
  { href: "/dashboard/transactions", label: "Transactions" },
  { href: "/dashboard/products",     label: "Products" },
  { href: "/dashboard/explorer",     label: "Explorer" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  if (loading || !user) return null;

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const visibleLinks = [
    ...navLinks,
    ...(user.role === "admin" ? [{ href: "/dashboard/admin", label: "Admin" }] : []),
  ];

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-card/80 backdrop-blur-md border-b border-card-border px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-8">
          <Link href="/dashboard">
            <h1 className="text-xl font-bold gradient-text">Velen</h1>
          </Link>
          <div className="hidden md:flex items-center gap-1">
            {visibleLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                  pathname === link.href
                    ? "bg-white/10 text-white"
                    : "text-muted hover:text-white hover:bg-white/5"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted hidden sm:block">{user.username}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-danger hover:text-red-300 transition-colors"
          >
            Logout
          </button>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}