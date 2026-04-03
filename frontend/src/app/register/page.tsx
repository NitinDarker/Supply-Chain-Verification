"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { ArrowLeft } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", email: "", password: "", role: "user" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.register(form);
      sessionStorage.setItem("verify-email", form.email);
      sessionStorage.setItem("verify-purpose", "verify");
      router.push("/verify-otp");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className='w-full max-w-md text-left mb-4'>
        <Link
          href='/'
          className='group inline-flex items-center gap-2 text-sm text-muted hover:text-primary transition-all duration-200'
        >
          <ArrowLeft
            size={16}
            className='group-hover:-translate-x-1 transition-transform'
          />
          <span>Back to Home</span>
        </Link>
      </div>
      <div className="w-full max-w-md bg-card rounded-2xl p-8 card-glow animate-in">
        <h1 className="text-2xl font-bold mb-1 gradient-text inline-block">Create Account</h1>
        <p className="text-muted text-sm mb-6">Join Velen to start tracking products on the blockchain</p>

        {error && (
          <div className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-lg p-3 mb-4 animate-scale-in">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="animate-in-delay-1">
            <label className="block text-sm text-muted mb-1.5">Username</label>
            <input
              type="text"
              required
              minLength={3}
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="input-field"
              placeholder="johndoe"
            />
          </div>

          <div className="animate-in-delay-1">
            <label className="block text-sm text-muted mb-1.5">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input-field"
              placeholder="john@example.com"
            />
          </div>

          <div className="animate-in-delay-2">
            <label className="block text-sm text-muted mb-1.5">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="input-field"
              placeholder="Min 6 characters"
            />
          </div>

          <div className="animate-in-delay-2">
            <label className="block text-sm text-muted mb-1.5">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="input-field"
            >
              <option value="user">User</option>
              <option value="manufacturer">Manufacturer</option>
              <option value="distributor">Distributor</option>
              <option value="retailer">Retailer</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 btn-gradient text-white rounded-lg font-medium mt-2 animate-in-delay-3"
          >
            {loading ? "Creating account..." : "Register"}
          </button>
        </form>

        <p className="text-muted text-sm text-center mt-6 animate-in-delay-4">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:text-primary-hover transition-colors">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
