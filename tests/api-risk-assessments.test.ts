import { describe, it, expect } from 'vitest';
import {
  calculateRiskScore,
  getProgressSummary,
  EU_AI_ACT_QUESTIONS,
  type AssessmentResponse,
} from '@/lib/risk-assessment';

describe('Risk Assessment', () => {
  describe('calculateRiskScore', () => {
    it('returns low risk for empty responses', () => {
      const { score, level } = calculateRiskScore([]);
      expect(score).toBe(0);
      expect(level).toBe('low');
    });

    it('returns low risk for all "no" answers to prohibited practices', () => {
      const responses: AssessmentResponse[] = [
        {
          question_id: 'prohibited_1',
          answer: 'no',
          answered_at: new Date().toISOString(),
        },
        {
          question_id: 'prohibited_2',
          answer: 'no',
          answered_at: new Date().toISOString(),
        },
        {
          question_id: 'prohibited_3',
          answer: 'no',
          answered_at: new Date().toISOString(),
        },
      ];

      const { score, level } = calculateRiskScore(responses);
      expect(level).toBe('low');
      expect(score).toBe(0);
    });

    it('calculates medium risk from mixed responses', () => {
      const responses: AssessmentResponse[] = [
        {
          question_id: 'prohibited_1',
          answer: 'no',
          answered_at: new Date().toISOString(),
        },
        {
          question_id: 'high_risk_1',
          answer: 'yes',
          answered_at: new Date().toISOString(),
        },
        {
          question_id: 'transparency_1',
          answer: '1',
          answered_at: new Date().toISOString(),
        },
      ];

      const { score, level } = calculateRiskScore(responses);
      // (0 + 75 + 80) / 3 = 51.67 -> 52 (rounded)
      expect(score).toBe(52);
      expect(level).toBe('medium');
    });

    it('calculates high risk correctly', () => {
      const responses: AssessmentResponse[] = [
        {
          question_id: 'high_risk_2',
          answer: 'yes',
          answered_at: new Date().toISOString(),
        },
        {
          question_id: 'transparency_1',
          answer: '2',
          answered_at: new Date().toISOString(),
        },
      ];

      const { score, level } = calculateRiskScore(responses);
      // (80 + 60) / 2 = 70 (rounded)
      expect(score).toBe(70);
      expect(level).toBe('high');
    });

    it('calculates unacceptable risk for prohibited practices', () => {
      const responses: AssessmentResponse[] = [
        {
          question_id: 'prohibited_1',
          answer: 'yes',
          answered_at: new Date().toISOString(),
        },
        {
          question_id: 'prohibited_2',
          answer: 'yes',
          answered_at: new Date().toISOString(),
        },
        {
          question_id: 'prohibited_3',
          answer: 'yes',
          answered_at: new Date().toISOString(),
        },
      ];

      const { score, level } = calculateRiskScore(responses);
      expect(score).toBe(100);
      expect(level).toBe('unacceptable');
    });

    it('assigns correct score boundaries', () => {
      // Test boundary at 30 (low -> medium)
      const responses30: AssessmentResponse[] = [
        {
          question_id: 'transparency_1',
          answer: '3',
          answered_at: new Date().toISOString(),
        },
      ];
      const { level: level30 } = calculateRiskScore(responses30);
      expect(level30).toBe('medium');

      // Test boundary at 60 (medium -> high)
      const responses60: AssessmentResponse[] = [
        {
          question_id: 'governance_1',
          answer: 'financial_data',
          answered_at: new Date().toISOString(),
        },
        {
          question_id: 'high_risk_1',
          answer: 'yes',
          answered_at: new Date().toISOString(),
        },
      ];
      const { score: score60, level: level60 } = calculateRiskScore(responses60);
      // (50 + 75) / 2 = 62.5 -> 63
      expect(score60).toBe(63);
      expect(level60).toBe('high');

      // Test boundary at 75 (high -> unacceptable)
      const responses75: AssessmentResponse[] = [
        {
          question_id: 'high_risk_1',
          answer: 'yes',
          answered_at: new Date().toISOString(),
        },
        {
          question_id: 'high_risk_2',
          answer: 'yes',
          answered_at: new Date().toISOString(),
        },
      ];
      const { score: score75, level: level75 } = calculateRiskScore(responses75);
      // (75 + 80) / 2 = 77.5 -> 78
      expect(score75).toBe(78);
      expect(level75).toBe('unacceptable');
    });

    it('ignores unknown question IDs', () => {
      const responses: AssessmentResponse[] = [
        {
          question_id: 'unknown_question',
          answer: 'yes',
          answered_at: new Date().toISOString(),
        },
      ];

      const { score, level } = calculateRiskScore(responses);
      expect(score).toBe(0);
      expect(level).toBe('low');
    });

    it('handles scale responses correctly', () => {
      // transparency_1: scale_1_5 with scoring { '1': 80, '2': 60, '3': 40, '4': 20, '5': 0 }
      const response1: AssessmentResponse[] = [
        {
          question_id: 'transparency_1',
          answer: '1',
          answered_at: new Date().toISOString(),
        },
      ];
      const { score: score1 } = calculateRiskScore(response1);
      expect(score1).toBe(80);

      const response5: AssessmentResponse[] = [
        {
          question_id: 'transparency_1',
          answer: '5',
          answered_at: new Date().toISOString(),
        },
      ];
      const { score: score5 } = calculateRiskScore(response5);
      expect(score5).toBe(0);
    });

    it('handles multiple choice responses correctly', () => {
      // governance_1: multiple_choice with different scores
      const responseHealth: AssessmentResponse[] = [
        {
          question_id: 'governance_1',
          answer: 'health_data',
          answered_at: new Date().toISOString(),
        },
      ];
      const { score: scoreHealth } = calculateRiskScore(responseHealth);
      expect(scoreHealth).toBe(80);

      const responsePublic: AssessmentResponse[] = [
        {
          question_id: 'governance_1',
          answer: 'public_data',
          answered_at: new Date().toISOString(),
        },
      ];
      const { score: scorePublic } = calculateRiskScore(responsePublic);
      expect(scorePublic).toBe(10);
    });
  });

  describe('getProgressSummary', () => {
    it('returns 0% progress for empty responses', () => {
      const summary = getProgressSummary([]);
      expect(summary.answered_questions).toBe(0);
      expect(summary.total_questions).toBe(EU_AI_ACT_QUESTIONS.length);
      expect(summary.progress_percentage).toBe(0);
      expect(summary.next_unanswered_question_id).toBe('prohibited_1');
    });

    it('returns correct progress for partial answers', () => {
      const responses: AssessmentResponse[] = [
        {
          question_id: 'prohibited_1',
          answer: 'no',
          answered_at: new Date().toISOString(),
        },
        {
          question_id: 'prohibited_2',
          answer: 'yes',
          answered_at: new Date().toISOString(),
        },
      ];

      const summary = getProgressSummary(responses);
      expect(summary.answered_questions).toBe(2);
      expect(summary.total_questions).toBe(EU_AI_ACT_QUESTIONS.length);
      expect(summary.progress_percentage).toBe(
        Math.round((2 / EU_AI_ACT_QUESTIONS.length) * 100)
      );
      expect(summary.next_unanswered_question_id).toBe('prohibited_3');
    });

    it('returns 100% progress when all questions answered', () => {
      const responses = EU_AI_ACT_QUESTIONS.map((q) => ({
        question_id: q.id,
        answer: 'no',
        answered_at: new Date().toISOString(),
      }));

      const summary = getProgressSummary(responses);
      expect(summary.answered_questions).toBe(EU_AI_ACT_QUESTIONS.length);
      expect(summary.progress_percentage).toBe(100);
      expect(summary.next_unanswered_question_id).toBeUndefined();
    });

    it('handles duplicate responses by counting unique question IDs', () => {
      const responses: AssessmentResponse[] = [
        {
          question_id: 'prohibited_1',
          answer: 'no',
          answered_at: new Date().toISOString(),
        },
        {
          question_id: 'prohibited_1',
          answer: 'yes', // Same question, different answer
          answered_at: new Date().toISOString(),
        },
      ];

      const summary = getProgressSummary(responses);
      expect(summary.answered_questions).toBe(1);
    });
  });

  describe('Question definitions', () => {
    it('has correct number of questions', () => {
      expect(EU_AI_ACT_QUESTIONS.length).toBe(13);
    });

    it('all questions have required fields', () => {
      for (const question of EU_AI_ACT_QUESTIONS) {
        expect(question.id).toBeDefined();
        expect(question.category).toBeDefined();
        expect(question.question_text).toBeDefined();
        expect(question.question_type).toBeDefined();
        expect(question.required).toBe(true);
        expect(question.scoring).toBeDefined();
      }
    });

    it('all prohibited_practice questions are yes_no type', () => {
      const prohibited = EU_AI_ACT_QUESTIONS.filter((q) => q.category === 'prohibited_practices');
      expect(prohibited.length).toBe(3);
      for (const q of prohibited) {
        expect(q.question_type).toBe('yes_no');
      }
    });

    it('high_risk questions are yes_no type', () => {
      const highRisk = EU_AI_ACT_QUESTIONS.filter((q) => q.category === 'high_risk');
      expect(highRisk.length).toBe(5);
      for (const q of highRisk) {
        expect(q.question_type).toBe('yes_no');
      }
    });

    it('transparency questions include scale and yes_no types', () => {
      const transparency = EU_AI_ACT_QUESTIONS.filter((q) => q.category === 'transparency');
      expect(transparency.length).toBe(2);
      const types = new Set(transparency.map((q) => q.question_type));
      expect(types.has('scale_1_5')).toBe(true);
      expect(types.has('yes_no')).toBe(true);
    });

    it('general category includes multiple_choice', () => {
      const general = EU_AI_ACT_QUESTIONS.filter((q) => q.category === 'general');
      expect(general.length).toBe(3);
      const hasMultipleChoice = general.some((q) => q.question_type === 'multiple_choice');
      expect(hasMultipleChoice).toBe(true);
    });
  });
});
