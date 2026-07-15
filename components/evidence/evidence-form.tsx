"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle, Loader, Upload, X } from "lucide-react";

interface EvidenceFormProps {
  workspaceId: string;
  aiSystemId?: string;
  obligationId?: string;
  onSuccess?: () => void;
}

const EVIDENCE_TYPES = [
  { value: "file", label: "File Upload" },
  { value: "url", label: "URL Reference" },
  { value: "note", label: "Text Note" },
  { value: "attestation", label: "Attestation" },
];

const CATEGORIES = [
  { value: "policy", label: "Policy Document" },
  { value: "audit", label: "Audit Report" },
  { value: "test_result", label: "Test Result" },
  { value: "certification", label: "Certification" },
  { value: "training", label: "Training Record" },
  { value: "consent", label: "Consent Form" },
  { value: "impact_assessment", label: "Impact Assessment" },
  { value: "other", label: "Other" },
];

export function EvidenceForm({
  workspaceId,
  aiSystemId,
  obligationId,
  onSuccess,
}: EvidenceFormProps) {
  const [formData, setFormData] = useState({
    title: "",
    category: "policy",
    evidence_type: "file",
    description: "",
    external_url: "",
    content: "",
    file: null as File | null,
    tags: [] as string[],
  });

  const [tagInput, setTagInput] = useState("");
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData((prev) => ({ ...prev, file }));
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Validate required fields
      if (!formData.title) {
        throw new Error("Title is required");
      }

      if (
        formData.evidence_type === "file" &&
        !formData.file
      ) {
        throw new Error("File is required for file upload type");
      }

      if (formData.evidence_type === "url" && !formData.external_url) {
        throw new Error("URL is required for URL reference type");
      }

      if (formData.evidence_type === "note" && !formData.content) {
        throw new Error("Content is required for text note type");
      }

      const response = await fetch("/api/evidence/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspaceId,
          title: formData.title,
          category: formData.category,
          evidence_type: formData.evidence_type,
          description: formData.description,
          external_url: formData.external_url || undefined,
          content: formData.content || undefined,
          ai_system_id: aiSystemId || undefined,
          obligation_id: obligationId || undefined,
          tags: formData.tags,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create evidence");
      }

      setSuccess(true);
      setFormData({
        title: "",
        category: "policy",
        evidence_type: "file",
        description: "",
        external_url: "",
        content: "",
        file: null,
        tags: [],
      });
      setTagInput("");

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
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Evidence Title *
        </label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="e.g., Data Processing Agreement"
          required
          className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
        />
      </div>

      {/* Evidence Type */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Evidence Type *
        </label>
        <select
          name="evidence_type"
          value={formData.evidence_type}
          onChange={handleChange}
          className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
        >
          {EVIDENCE_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {/* Evidence Input Based on Type */}
      {formData.evidence_type === "file" && (
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Upload File *
          </label>
          <div className="border-2 border-dashed border-slate-700 rounded-lg p-6 text-center hover:border-blue-500 transition">
            <input
              type="file"
              onChange={handleFileChange}
              className="hidden"
              id="file-input"
            />
            <label htmlFor="file-input" className="cursor-pointer">
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-white font-medium">
                {formData.file ? formData.file.name : "Click to upload or drag file"}
              </p>
              <p className="text-xs text-slate-500">
                PDF, DOC, DOCX, or other document files
              </p>
            </label>
          </div>
        </div>
      )}

      {formData.evidence_type === "url" && (
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            URL *
          </label>
          <input
            type="url"
            name="external_url"
            value={formData.external_url}
            onChange={handleChange}
            placeholder="https://example.com/evidence"
            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
          />
        </div>
      )}

      {formData.evidence_type === "note" && (
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Note Content *
          </label>
          <textarea
            name="content"
            value={formData.content}
            onChange={handleChange}
            placeholder="Enter your compliance note or evidence description"
            rows={4}
            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition resize-none"
          />
        </div>
      )}

      {formData.evidence_type === "attestation" && (
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Attestation Statement *
          </label>
          <textarea
            name="content"
            value={formData.content}
            onChange={handleChange}
            placeholder="I hereby attest that..."
            rows={4}
            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition resize-none"
          />
        </div>
      )}

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Category
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

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Description
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Additional context or notes about this evidence"
          rows={3}
          className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition resize-none"
        />
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Tags
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
            placeholder="Add tags and press Enter"
            className="flex-1 px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
          />
          <button
            type="button"
            onClick={handleAddTag}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
          >
            Add
          </button>
        </div>
        {formData.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {formData.tags.map((tag) => (
              <div
                key={tag}
                className="inline-flex items-center gap-2 px-3 py-1 bg-blue-900/30 border border-blue-800 rounded-full text-sm text-blue-300"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-blue-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
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
            Evidence submitted successfully!
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
        {loading ? "Submitting..." : "Submit Evidence"}
      </button>
    </form>
  );
}
