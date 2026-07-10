"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, ArrowRight } from "lucide-react";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "your email";

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
          <p className="text-slate-300">
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
            <Link href="#" className="text-blue-400 hover:text-blue-300">
              resend verification link
            </Link>
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
