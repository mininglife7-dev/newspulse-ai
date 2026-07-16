'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle, Loader } from 'lucide-react';

interface RiskQuestion {
  question_id: string;
  text: string;
  category: 'prohibited' | 'high_risk' | 'general';
}

interface AssessmentFormProps {
  workspaceId: string;
  aiSystemId: string;
  onSuccess?: () => void;
}

const RISK_QUESTIONS: RiskQuestion[] = [
  // Prohibited Systems (EU AI Act - Annex III)
  {
    question_id: 'prohibited_1',
    text: 'Does this system use subliminal techniques or manipulative methods to distort behavior or decision-making?',
    category: 'prohibited',
  },
  {
    question_id: 'prohibited_2',
    text: 'Is this system designed to exploit vulnerabilities of vulnerable persons based on age, physical or mental disability?',
    category: 'prohibited',
  },
  {
    question_id: 'prohibited_3',
    text: 'Does this system perform real-time remote biometric identification in public spaces for law enforcement?',
    category: 'prohibited',
  },
  {
    question_id: 'prohibited_4',
    text: 'Does this system use biometric categorization based on sensitive characteristics (race, ethnicity, political views, etc.)?',
    category: 'prohibited',
  },

  // High-Risk Systems
  {
    question_id: 'high_risk_1',
    text: 'Does this system make decisions that affect legal rights, safety, or opportunities of individuals?',
    category: 'high_risk',
  },
  {
    question_id: 'high_risk_2',
    text: 'Is this system used for critical infrastructure management (energy, transport, water, electricity)?',
    category: 'high_risk',
  },
  {
    question_id: 'high_risk_3',
    text: 'Does this system determine access to or denying access to education or vocational training?',
    category: 'high_risk',
  },
  {
    question_id: 'high_risk_4',
    text: 'Is this system used for employment-related decisions (recruitment, promotion, termination)?',
    category: 'high_risk',
  },
  {
    question_id: 'high_risk_5',
    text: 'Does this system assess creditworthiness or determine loan/insurance eligibility?',
    category: 'high_risk',
  },
  {
    question_id: 'high_risk_6',
    text: 'Is this system used in law enforcement for predicting crime or criminal behavior?',
    category: 'high_risk',
  },

  // General Risk
  {
    question_id: 'general_1',
    text: 'Does this system collect or process personal data?',
    category: 'general',
  },
  {
    question_id: 'general_2',
    text: 'Is this system accessible to external users or the public?',
    category: 'general',
  },
  {
    question_id: 'general_3',
    text: 'Does this system generate predictions or recommendations that affect user experience?',
    category: 'general',
  },
  {
    question_id: 'general_4',
    text: 'Can errors or failures of this system cause operational disruption?',
    category: 'general',
  },
];

export function AssessmentForm({
  workspaceId,
  aiSystemId,
  onSuccess,
}: AssessmentFormProps) {
  const [responses, setResponses] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const answered = Object.keys(responses).length;
  const total = RISK_QUESTIONS.length;
  const answeredPercentage = Math.round((answered / total) * 100);

  const handleAnswer = (questionId: string, answer: boolean) => {
    setResponses((prev) => ({ ...prev, [questionId]: answer }));
  };

  const determineAssessmentType = ():
    'prohibited' | 'high_risk' | 'general' => {
    const prohibitedYes = RISK_QUESTIONS.filter(
      (q) => q.category === 'prohibited' && responses[q.question_id]
    ).length;
    const highRiskYes = RISK_QUESTIONS.filter(
      (q) => q.category === 'high_risk' && responses[q.question_id]
    ).length;

    if (prohibitedYes > 0) return 'prohibited';
    if (highRiskYes > 0) return 'high_risk';
    return 'general';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (answered < total) {
      setError('Please answer all questions before submitting');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const assessmentType = determineAssessmentType();
      const riskResponses = RISK_QUESTIONS.map((q) => ({
        question_id: q.question_id,
        answer: responses[q.question_id],
      }));

      const response = await fetch('/api/risk-assessment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          ai_system_id: aiSystemId,
          assessment_type: assessmentType,
          responses: riskResponses,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create risk assessment');
      }

      setSuccess(true);
      setResponses({});

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
      {/* Progress */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-400">Progress</span>
          <span className="text-sm font-medium text-white">
            {answered}/{total} questions
          </span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="bg-blue-500 transition-all duration-300"
            style={{ width: `${answeredPercentage}%` }}
          />
        </div>
      </div>

      {/* Prohibited Systems Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">
          Prohibited AI Systems
        </h3>
        <p className="text-sm text-slate-400">
          Does your system exhibit any of these prohibited characteristics?
        </p>
        {RISK_QUESTIONS.filter((q) => q.category === 'prohibited').map(
          (question) => (
            <div
              key={question.question_id}
              className="rounded-lg border border-red-800/30 bg-red-900/10 p-4"
            >
              <label className="flex items-start gap-4 cursor-pointer">
                <div className="flex gap-3 flex-1 pt-1">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white mb-2">
                      {question.text}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleAnswer(question.question_id, false)}
                    className={`px-3 py-1 rounded text-sm font-medium transition ${
                      responses[question.question_id] === false
                        ? 'bg-green-500 text-white'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    }`}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAnswer(question.question_id, true)}
                    className={`px-3 py-1 rounded text-sm font-medium transition ${
                      responses[question.question_id] === true
                        ? 'bg-red-500 text-white'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    }`}
                  >
                    Yes
                  </button>
                </div>
              </label>
            </div>
          )
        )}
      </div>

      {/* High-Risk Systems Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">
          High-Risk AI Systems
        </h3>
        <p className="text-sm text-slate-400">
          Does your system perform any of these high-risk activities?
        </p>
        {RISK_QUESTIONS.filter((q) => q.category === 'high_risk').map(
          (question) => (
            <div
              key={question.question_id}
              className="rounded-lg border border-yellow-800/30 bg-yellow-900/10 p-4"
            >
              <label className="flex items-start gap-4 cursor-pointer">
                <div className="flex gap-3 flex-1 pt-1">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white mb-2">
                      {question.text}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleAnswer(question.question_id, false)}
                    className={`px-3 py-1 rounded text-sm font-medium transition ${
                      responses[question.question_id] === false
                        ? 'bg-green-500 text-white'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    }`}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAnswer(question.question_id, true)}
                    className={`px-3 py-1 rounded text-sm font-medium transition ${
                      responses[question.question_id] === true
                        ? 'bg-yellow-500 text-white'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    }`}
                  >
                    Yes
                  </button>
                </div>
              </label>
            </div>
          )
        )}
      </div>

      {/* General Risk Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">
          General AI Characteristics
        </h3>
        <p className="text-sm text-slate-400">
          Does your system have these general characteristics?
        </p>
        {RISK_QUESTIONS.filter((q) => q.category === 'general').map(
          (question) => (
            <div
              key={question.question_id}
              className="rounded-lg border border-blue-800/30 bg-blue-900/10 p-4"
            >
              <label className="flex items-start gap-4 cursor-pointer">
                <div className="flex gap-3 flex-1 pt-1">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white mb-2">
                      {question.text}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleAnswer(question.question_id, false)}
                    className={`px-3 py-1 rounded text-sm font-medium transition ${
                      responses[question.question_id] === false
                        ? 'bg-green-500 text-white'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    }`}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAnswer(question.question_id, true)}
                    className={`px-3 py-1 rounded text-sm font-medium transition ${
                      responses[question.question_id] === true
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    }`}
                  >
                    Yes
                  </button>
                </div>
              </label>
            </div>
          )
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
            Risk assessment submitted successfully! Compliance obligations have
            been identified.
          </p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading || answered < total}
        className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white font-medium rounded-lg transition flex items-center justify-center gap-2"
      >
        {loading && <Loader className="w-4 h-4 animate-spin" />}
        {loading
          ? 'Submitting...'
          : `Submit Assessment (${answered}/${total} answered)`}
      </button>
    </form>
  );
}
