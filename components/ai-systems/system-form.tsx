"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle, Loader } from "lucide-react";

interface SystemFormProps {
  workspaceId: string;
  onSuccess?: () => void;
}

const CATEGORIES = [
  { value: "large_language_model", label: "Large Language Model" },
  { value: "computer_vision", label: "Computer Vision" },
  { value: "recommendation", label: "Recommendation System" },
  { value: "autonomous", label: "Autonomous Agent" },
  { value: "biometric", label: "Biometric System" },
  { value: "other", label: "Other" },
];

const RISK_LEVELS = [
  { value: "low", label: "Low Risk" },
  { value: "medium", label: "Medium Risk" },
  { value: "high", label: "High Risk" },
];

export function SystemForm({ workspaceId, onSuccess }: SystemFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "large_language_model",
    risk_level: "medium",
    status: "in_development",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/ai-system/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspaceId,
          ...formData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create AI system");
      }

      setSuccess(true);
      setFormData({
        name: "",
        description: "",
        category: "large_language_model",
        risk_level: "medium",
        status: "in_development",
      });

      setTimeout(() => {
        setSuccess(false);
        onSuccess?.();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          System Name *
        </label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g., Customer Support Chatbot"
          required
          className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Description
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Describe the purpose and scope of this AI system"
          rows={4}
          className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition resize-none"
        />
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Category *
        </label>
        <select
          name="category"
          value={formData.category}
          onChange={handleChange}
          className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Risk Level */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Initial Risk Level *
        </label>
        <select
          name="risk_level"
          value={formData.risk_level}
          onChange={handleChange}
          className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
        >
          {RISK_LEVELS.map((level) => (
            <option key={level.value} value={level.value}>
              {level.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-400">
          This will be updated after risk assessment
        </p>
      </div>

      {/* Status */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Status
        </label>
        <select
          name="status"
          value={formData.status}
          onChange={handleChange}
          className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
        >
          <option value="in_development">In Development</option>
          <option value="pilot">Pilot</option>
          <option value="production">Production</option>
          <option value="deprecated">Deprecated</option>
        </select>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-800/50 bg-red-900/20 p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="rounded-lg border border-green-800/50 bg-green-900/20 p-4 flex gap-3">
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
          <p className="text-green-300 text-sm">
            AI system created successfully!
          </p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white font-medium rounded-lg transition flex items-center justify-center gap-2"
      >
        {loading && <Loader className="w-4 h-4 animate-spin" />}
        {loading ? "Creating..." : "Create AI System"}
      </button>
    </form>
  );
}
