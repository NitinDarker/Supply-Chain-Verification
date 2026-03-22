"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function VerifyOtpPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [walletSecrets, setWalletSecrets] = useState<{ mnemonic: string; privateKey: string } | null>(null);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const storedEmail = sessionStorage.getItem("verify-email");
    if (!storedEmail) {
      router.push("/register");
      return;
    }
    setEmail(storedEmail);
  }, [router]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newOtp = [...otp];
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i];
    }
    setOtp(newOtp);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleVerify = async () => {
    const otpString = otp.join("");
    if (otpString.length !== 6) {
      setError("Please enter the complete 6-digit code.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const data = await api.verifyOtp({ email, otp: otpString });
      setUser(data.user);

      if (data.walletSecrets) {
        setWalletSecrets(data.walletSecrets);
      } else {
        sessionStorage.removeItem("verify-email");
        sessionStorage.removeItem("verify-purpose");
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await api.resendOtp({ email, purpose: "verify" });
      setResendCooldown(30);
      setError("");
    } catch {
      setError("Failed to resend OTP.");
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleContinue = () => {
    sessionStorage.removeItem("verify-email");
    sessionStorage.removeItem("verify-purpose");
    router.push("/dashboard");
  };

  // Wallet secrets screen
  if (walletSecrets) {
    const words = walletSecrets.mnemonic.split(" ");

    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-lg bg-card rounded-2xl p-8 card-glow card-glow-pulse animate-in">
          <h1 className="text-2xl font-bold mb-1 gradient-text inline-block">Your Wallet is Ready</h1>
          <p className="text-danger text-sm mb-6 font-medium">
            Save your recovery phrase. You will NEVER see this again.
          </p>

          {/* Seed Phrase Grid */}
          <div className="mb-4 animate-in-delay-1">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm text-muted">Recovery Phrase</label>
              <button
                onClick={() => copyToClipboard(walletSecrets.mnemonic, "mnemonic")}
                className="text-xs text-primary hover:text-primary-hover transition-colors"
              >
                {copied === "mnemonic" ? "Copied!" : "Copy All"}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 bg-input-bg border border-card-border rounded-lg p-4">
              {words.map((word, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="text-muted w-5 text-right">{i + 1}.</span>
                  <span className="font-mono">{word}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Private Key */}
          <div className="mb-6 animate-in-delay-2">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm text-muted">Private Key</label>
              <button
                onClick={() => copyToClipboard(walletSecrets.privateKey, "privateKey")}
                className="text-xs text-primary hover:text-primary-hover transition-colors"
              >
                {copied === "privateKey" ? "Copied!" : "Copy"}
              </button>
            </div>
            <div className="bg-input-bg border border-card-border rounded-lg p-3">
              <p className="font-mono text-xs break-all">{walletSecrets.privateKey}</p>
            </div>
          </div>

          {/* Confirmation checkbox */}
          <label className="flex items-center gap-2 text-sm mb-4 cursor-pointer animate-in-delay-3">
            <input
              type="checkbox"
              checked={saved}
              onChange={(e) => setSaved(e.target.checked)}
              className="accent-primary"
            />
            I have saved my recovery phrase securely
          </label>

          <button
            onClick={handleContinue}
            disabled={!saved}
            className="w-full py-2.5 btn-gradient text-white rounded-lg font-medium animate-in-delay-3"
          >
            Continue to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // OTP input screen
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-card rounded-2xl p-8 card-glow animate-in">
        <h1 className="text-2xl font-bold mb-1 gradient-text inline-block">Verify Your Email</h1>
        <p className="text-muted text-sm mb-6">
          Enter the 6-digit code sent to <span className="text-foreground">{email}</span>
        </p>

        {error && (
          <div className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-lg p-3 mb-4 animate-scale-in">
            {error}
          </div>
        )}

        {/* OTP Inputs */}
        <div className="flex gap-3 justify-center mb-6 animate-in-delay-1" onPaste={handlePaste}>
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="w-12 h-14 text-center text-xl font-bold input-field !px-0"
            />
          ))}
        </div>

        <button
          onClick={handleVerify}
          disabled={loading}
          className="w-full py-2.5 btn-gradient text-white rounded-lg font-medium animate-in-delay-2"
        >
          {loading ? "Verifying..." : "Verify"}
        </button>

        <p className="text-muted text-sm text-center mt-4 animate-in-delay-3">
          {"Didn't receive the code? "}
          {resendCooldown > 0 ? (
            <span>Resend in {resendCooldown}s</span>
          ) : (
            <button onClick={handleResend} className="text-primary hover:text-primary-hover transition-colors">
              Resend OTP
            </button>
          )}
        </p>
      </div>
    </div>
  );
}
