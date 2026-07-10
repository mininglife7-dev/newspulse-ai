"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, ArrowRight } from "lucide-react";
import { resendVerification } from "@/lib/auth";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email");
  const email = emailParam || "your email";

  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleResend = async () => {
    if (!emailParam) return;
    setStatus("sending");
    setErrorMsg(null);
    try {
      await resendVerification(emailParam);
      setStatus("sent");
    } catch (err: any) {
      setErrorMsg(
        err?.message || "Couldn't resend right now. Please try again."
      );
      setStatus("error");
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
          <h1 className="text-3xl font-bold text-white">Verify your email</h1>
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
            Didn&apos;t receive the email? Check your spam folder
            {emailParam ? (
              <>
                {" "}
                or{" "}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={status === "sending" || status === "sent"}
                  className="text-blue-400 underline hover:text-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {status === "sending"
                    ? "resending…"
                    : "resend verification link"}
                </button>
              </>
            ) : null}
            .
          </p>
          {status === "sent" && (
            <p className="text-xs text-green-400">
              Sent — a fresh verification link is on its way to {email}.
            </p>
          )}
          {status === "error" && errorMsg && (
            <p className="text-xs text-red-400">{errorMsg}</p>
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
