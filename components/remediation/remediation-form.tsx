'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle, Loader } from 'lucide-react';

interface RemediationFormProps {
  workspaceId: string;
  obligationId?: string;
  obligations?: Array<{ id: string; title: string }>;
  onSuccess?: () => void;
}

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

export function RemediationForm({
  workspaceId,
  obligationId,
  obligations,
  onSuccess,
}: RemediationFormProps) {
  const [formData, setFormData] = useState({
    obligation_id: obligationId || '',
    title: '',
    description: '',
    priority: 'medium',
    target_completion_date: '',
    assigned_to: '',
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
      if (!formData.obligation_id) {
        throw new Error('Obligation is required');
      }

      if (!formData.title) {
        throw new Error('Title is required');
      }

      const response = await fetch('/api/remediation/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          obligation_id: formData.obligation_id,
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          target_completion_date: formData.target_completion_date || undefined,
          assigned_to: formData.assigned_to || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create remediation');
      }

      setSuccess(true);
      setFormData({
        obligation_id: obligationId || '',
        title: '',
        description: '',
        priority: 'medium',
        target_completion_date: '',
        assigned_to: '',
      });

      setTimeout(() => {
        setSuccess(false);
        onSuccess?.();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Obligation Selection */}
      {!obligationId && (
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Obligation *
          </label>
          <select
            name="obligation_id"
            value={formData.obligation_id}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
          >
            <option value="">Select an obligation</option>
            {obligations?.map((ob) => (
              <option key={ob.id} value={ob.id}>
                {ob.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Action Title *
        </label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="e.g., Implement data encryption"
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
          placeholder="Detailed description of the remediation action"
          rows={3}
          className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition resize-none"
        />
      </div>

      {/* Priority and Target Date */}
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Priority *
          </label>
          <select
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
          >
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Target Completion Date
          </label>
          <input
            type="date"
            name="target_completion_date"
            value={formData.target_completion_date}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
          />
        </div>
      </div>

      {/* Assigned To */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Assigned To
        </label>
        <input
          type="text"
          name="assigned_to"
          value={formData.assigned_to}
          onChange={handleChange}
          placeholder="Team member name or email"
          className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
        />
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
            Remediation action created successfully!
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
        {loading ? 'Creating...' : 'Create Remediation Action'}
      </button>
    </form>
  );
}
