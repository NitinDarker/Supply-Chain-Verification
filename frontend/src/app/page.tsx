"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-10 px-4">
      <div className="text-center animate-in">
        <h1 className="text-6xl font-bold tracking-tight mb-4 gradient-text animate-float">
          Velen
        </h1>
        <p className="text-muted text-lg max-w-md animate-in-delay-1">
          Private blockchain-based digital wallet and supply chain verification
        </p>
      </div>

      <div className="flex gap-4 animate-in-delay-2">
        <Link
          href="/login"
          className="px-7 py-3 btn-gradient text-white rounded-lg font-medium"
        >
          Login
        </Link>
        <Link
          href="/register"
          className="px-7 py-3 btn-outline text-foreground rounded-lg font-medium"
        >
          Register
        </Link>
      </div>
    </div>
  );
}
