"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Mail, ArrowRight, AlertCircle, CheckCircle } from "lucide-react";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "your email";
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleResend = async () => {
    setError(null);
    setSuccess(false);
    setResending(true);

    try {
      const response = await fetch("/api/auth/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (response.status === 429) {
        const data = await response.json();
        setError(data.error || "Too many requests. Please wait 60 seconds.");
        setCooldown(60);
        setResending(false);
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to resend email");
        setResending(false);
        return;
      }

      setSuccess(true);
      setCooldown(60);
      setTimeout(() => setSuccess(false), 5000);
    } catch (err: any) {
      setError(err?.message || "Failed to resend email. Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-blue-950/50 p-4">
            <Mail className="h-12 w-12 text-blue-400" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white">
            Verify your email
          </h1>
          <p className="text-slate-400">
            We sent a verification link to{" "}
            <span className="text-white font-medium">{email}</span>
          </p>
        </div>

        <div className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/30 p-6">
          <p className="text-sm text-slate-300">
            Click the link in your email to verify your account and get started
            with EURO AI.
          </p>

          {error && (
            <div className="rounded-lg border border-red-800 bg-red-950/30 p-3 flex gap-2">
              <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-300">{error}</p>
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-green-800 bg-green-950/30 p-3 flex gap-2">
              <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-green-300">
                Verification email resent! Check your inbox.
              </p>
            </div>
          )}

          <p className="text-xs text-slate-500">
            Didn't receive the email? Check your spam folder or{" "}
            <button
              onClick={handleResend}
              disabled={resending || cooldown > 0}
              className={`${
                cooldown > 0
                  ? "text-slate-500 cursor-not-allowed"
                  : "text-blue-400 hover:text-blue-300"
              }`}
            >
              {cooldown > 0
                ? `resend in ${cooldown}s`
                : resending
                  ? "sending..."
                  : "resend verification link"}
            </button>
            .
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-6 py-2.5 font-semibold text-white transition hover:border-slate-600 hover:bg-slate-900"
        >
          Back to home
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
