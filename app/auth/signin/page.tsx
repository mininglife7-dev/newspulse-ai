"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { signIn } from "@/lib/auth";
import { safeRedirectPath } from "@/lib/routes";

export default function SignInPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(() => {
    // Surface errors handed over by the email-confirmation handler.
    if (typeof window === "undefined") return null;
    const code = new URLSearchParams(window.location.search).get("error");
    return code === "verification_failed"
      ? "We couldn't verify that link — it may have expired. Sign in, or request a new confirmation email."
      : null;
  });
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!formData.email || !formData.password) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    try {
      await signIn(formData.email, formData.password);
      // Honor ?redirect=/path set by the middleware, but only same-origin
      // paths — never absolute URLs (open-redirect guard).
      const redirect = new URLSearchParams(window.location.search).get(
        "redirect"
      );
      router.push(safeRedirectPath(redirect));
    } catch (err: any) {
      setError(
        err?.message || "Invalid email or password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <h1 className="text-3xl font-bold text-white">Welcome back</h1>
          <p className="text-slate-400">
            Sign in to your EURO AI account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-800 bg-red-950/30 p-4 flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-300 mb-1.5"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              placeholder="you@company.com"
              disabled={loading}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-300 mb-1.5"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          <div className="flex justify-end">
            <Link
              href="#"
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-cyan-600 py-2.5 font-semibold text-white transition hover:shadow-lg hover:shadow-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="text-center text-slate-400">
          Don't have an account?{" "}
          <Link
            href="/auth/signup"
            className="text-blue-400 hover:text-blue-300 font-medium"
          >
            Create one now
          </Link>
        </p>
      </div>
    </div>
  );
}
