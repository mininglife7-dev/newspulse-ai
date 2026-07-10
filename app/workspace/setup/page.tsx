"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, AlertCircle, CheckCircle } from "lucide-react";

export default function WorkspaceSetupPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    companyName: "",
    legalName: "",
    country: "",
    industry: "",
    employees: "",
    website: "",
    description: "",
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
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

    if (!formData.companyName || !formData.country || !formData.industry) {
      setError("Please fill in required fields");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/workspace/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create workspace');
      }

      setSuccess(true);
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 2000);
    } catch (err: any) {
      setError(err?.message || "Failed to save. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="rounded-lg border border-green-800 bg-green-950/30 p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-green-300 mb-2">
            Company profile created!
          </h2>
          <p className="text-green-200 mb-4">
            Redirecting to dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-12">
      <div className="mb-8 space-y-2">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <h1 className="text-4xl font-bold text-white">Set up your workspace</h1>
        <p className="text-slate-400">
          Tell us about your organization so we can tailor EURO AI for your
          needs
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950/30 p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">
              Basic Information
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="companyName"
                className="block text-sm font-medium text-slate-300 mb-1.5"
              >
                Company Name *
              </label>
              <input
                id="companyName"
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                placeholder="Acme Inc."
                disabled={loading}
              />
            </div>
            <div>
              <label
                htmlFor="legalName"
                className="block text-sm font-medium text-slate-300 mb-1.5"
              >
                Legal Name (optional)
              </label>
              <input
                id="legalName"
                type="text"
                name="legalName"
                value={formData.legalName}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                placeholder="Acme Inc. GmbH"
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="country"
                className="block text-sm font-medium text-slate-300 mb-1.5"
              >
                Country *
              </label>
              <select
                id="country"
                name="country"
                value={formData.country}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                disabled={loading}
              >
                <option value="">Select a country</option>
                <option value="DE">Germany</option>
                <option value="FR">France</option>
                <option value="IT">Italy</option>
                <option value="ES">Spain</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="industry"
                className="block text-sm font-medium text-slate-300 mb-1.5"
              >
                Industry *
              </label>
              <select
                id="industry"
                name="industry"
                value={formData.industry}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                disabled={loading}
              >
                <option value="">Select an industry</option>
                <option value="financial">Financial Services</option>
                <option value="healthcare">Healthcare</option>
                <option value="retail">Retail</option>
                <option value="technology">Technology</option>
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-slate-300 mb-1.5"
            >
              Tell us about your AI priorities (optional)
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none"
              placeholder="e.g., We're deploying LLMs and need to ensure compliance..."
              disabled={loading}
            />
          </div>
        </div>

        <div className="flex gap-4">
          <Link
            href="/dashboard"
            className="flex-1 rounded-lg border border-slate-700 px-6 py-3 font-semibold text-white transition hover:border-slate-600"
          >
            Skip for now
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-600 py-3 font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Saving..." : "Continue"}
          </button>
        </div>
      </form>
    </div>
  );
}
