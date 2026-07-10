'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface Evidence {
  id: string;
  title: string;
  description: string | null;
  file_url: string | null;
  file_type: string | null;
  status: 'submitted' | 'under_review' | 'approved' | 'rejected';
  created_at: string;
  uploaded_by: string;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; icon: any }> = {
  submitted: {
    bg: 'bg-slate-900/30',
    text: 'text-slate-300',
    icon: Clock,
  },
  under_review: {
    bg: 'bg-blue-900/30',
    text: 'text-blue-300',
    icon: Clock,
  },
  approved: {
    bg: 'bg-green-900/30',
    text: 'text-green-300',
    icon: CheckCircle2,
  },
  rejected: {
    bg: 'bg-red-900/30',
    text: 'text-red-300',
    icon: XCircle,
  },
};

export default function EvidenceReviewPage() {
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewComments, setReviewComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  useEffect(() => {
    const loadEvidence = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch('/api/evidence');

        if (res.status === 401) {
          window.location.href = '/auth/signin?redirect=/evidence-review';
          return;
        }

        if (res.status === 409) {
          setLoadError('Complete workspace setup first');
          return;
        }

        if (!res.ok) {
          throw new Error(`Error: ${res.status}`);
        }

        const data = await res.json();
        if (!data.ok) {
          throw new Error(data.error || 'Failed to load evidence');
        }

        setEvidence(data.evidence || []);
      } catch (err: any) {
        setLoadError(err?.message || 'Could not load evidence');
      } finally {
        setLoading(false);
      }
    };

    loadEvidence();
  }, []);

  const handleReview = async (evidenceId: string, status: 'under_review' | 'approved' | 'rejected') => {
    setSubmitting(true);
    setReviewError(null);
    try {
      const res = await fetch(`/api/evidence/${evidenceId}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          review_comments: reviewComments || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to review evidence' }));
        throw new Error(data.error || `Error: ${res.status}`);
      }

      setReviewingId(null);
      setReviewComments('');

      // Reload evidence list
      const listRes = await fetch('/api/evidence');
      const listData = await listRes.json();
      if (listData.ok) {
        setEvidence(listData.evidence || []);
      }
    } catch (err: any) {
      setReviewError(err?.message || 'Failed to review evidence');
    } finally {
      setSubmitting(false);
    }
  };

  const pendingReview = evidence.filter((e) => e.status === 'submitted' || e.status === 'under_review');
  const reviewed = evidence.filter((e) => e.status === 'approved' || e.status === 'rejected');

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading evidence...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <h1 className="text-3xl font-bold text-white">Evidence Review</h1>
        <p className="text-slate-400">
          Review and approve evidence submitted for compliance verification
        </p>
      </div>

      {loadError && (
        <div className="flex items-start gap-3 rounded-lg border border-red-800/60 bg-red-950/30 p-5 text-red-200">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>{loadError}</div>
        </div>
      )}

      {/* Pending Review Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Pending Review ({pendingReview.length})</h2>
        </div>

        {pendingReview.length > 0 ? (
          <div className="space-y-3">
            {pendingReview.map((item) => {
              const statusColor = STATUS_COLORS[item.status];
              const StatusIcon = statusColor.icon;
              const isReviewing = reviewingId === item.id;

              return (
                <div key={item.id} className={`rounded-lg border ${statusColor.bg} p-4`}>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <StatusIcon className={`h-4 w-4 ${statusColor.text}`} />
                        <h3 className="font-semibold text-white">{item.title}</h3>
                      </div>
                      {item.description && (
                        <p className="text-sm text-slate-300 mt-1">{item.description}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-2">
                        Submitted: {new Date(item.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Review Form */}
                  {isReviewing ? (
                    <div className="mt-3 border-t border-slate-700/50 pt-3 space-y-3">
                      {reviewError && (
                        <div className="flex items-start gap-2 text-xs text-red-300">
                          <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <p>{reviewError}</p>
                        </div>
                      )}
                      <textarea
                        placeholder="Review comments (optional)"
                        value={reviewComments}
                        onChange={(e) => setReviewComments(e.target.value)}
                        className="w-full text-sm rounded px-3 py-2 bg-slate-700 border border-slate-600 text-white placeholder-slate-500 focus:outline-none"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setReviewingId(null);
                            setReviewComments('');
                            setReviewError(null);
                          }}
                          className="flex-1 text-sm px-3 py-1.5 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 transition"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleReview(item.id, 'rejected')}
                          disabled={submitting}
                          className="flex-1 text-sm px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition"
                        >
                          {submitting ? 'Processing...' : 'Reject'}
                        </button>
                        <button
                          onClick={() => handleReview(item.id, 'approved')}
                          disabled={submitting}
                          className="flex-1 text-sm px-3 py-1.5 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition"
                        >
                          {submitting ? 'Processing...' : 'Approve'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setReviewingId(item.id);
                        setReviewComments('');
                        setReviewError(null);
                      }}
                      className="w-full mt-3 px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 transition"
                    >
                      Review
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No evidence pending review</p>
        )}
      </div>

      {/* Reviewed Section */}
      {reviewed.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white">Reviewed ({reviewed.length})</h2>
          <div className="space-y-2">
            {reviewed.map((item) => {
              const statusColor = STATUS_COLORS[item.status];
              const StatusIcon = statusColor.icon;

              return (
                <div key={item.id} className={`rounded-lg border ${statusColor.bg} p-3`}>
                  <div className="flex items-start gap-3">
                    <StatusIcon className={`h-4 w-4 flex-shrink-0 mt-0.5 ${statusColor.text}`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-white capitalize">{item.title}</div>
                      <p className="text-xs text-slate-400 mt-1">{item.status}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
