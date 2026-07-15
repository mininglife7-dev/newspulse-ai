"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, ArrowRight } from "lucide-react";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "your email";
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleResendEmail = async () => {
    if (email === "your email" || !email) {
      setResendMessage({ type: 'error', text: 'Email address not found. Please sign up again.' });
      return;
    }

    setIsResending(true);
    setResendMessage(null);

    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setResendMessage({ type: 'error', text: data.error || 'Failed to resend email. Please try again.' });
      } else {
        setResendMessage({ type: 'success', text: 'Verification email sent! Check your inbox.' });
      }
    } catch (error) {
      setResendMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setIsResending(false);
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
          <p className="text-xs text-slate-500">
            Didn't receive the email? Check your spam folder or{" "}
            <button
              onClick={handleResendEmail}
              disabled={isResending}
              className="text-blue-400 hover:text-blue-300 disabled:opacity-50 cursor-pointer"
            >
              {isResending ? 'Sending...' : 'resend verification link'}
            </button>
            .
          </p>
          {resendMessage && (
            <p
              className={`text-xs ${
                resendMessage.type === 'success'
                  ? 'text-green-400'
                  : 'text-red-400'
              }`}
            >
              {resendMessage.text}
            </p>
          )}
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
