import { describe, it, expect } from 'vitest';
import {
  classifyRiskLevel,
  getRiskAssessmentQuestionnaire,
  type RiskAssessmentAnswers,
} from '@/lib/risk-classifier';

describe('Risk Classifier', () => {
  describe('getRiskAssessmentQuestionnaire', () => {
    it('returns questionnaire with 12 questions', () => {
      const questions = getRiskAssessmentQuestionnaire();
      expect(questions).toHaveLength(12);
    });

    it('all questions have required fields', () => {
      const questions = getRiskAssessmentQuestionnaire();
      for (const q of questions) {
        expect(q.id).toBeDefined();
        expect(q.question).toBeDefined();
        expect(q.hint).toBeDefined();
        expect(q.type).toMatch(/^(yes_no|select)$/);
      }
    });

    it('select questions have options', () => {
      const questions = getRiskAssessmentQuestionnaire();
      const selectQuestions = questions.filter((q) => q.type === 'select');
      expect(selectQuestions.length).toBeGreaterThan(0);
      for (const q of selectQuestions) {
        expect(q.options).toBeDefined();
        expect(Array.isArray(q.options)).toBe(true);
        expect(q.options!.length).toBeGreaterThan(0);
      }
    });
  });

  describe('classifyRiskLevel - Prohibited Cases', () => {
    it('classifies social credit scoring as prohibited', () => {
      const answers: RiskAssessmentAnswers = {
        useCaseCategory: 'social_credit_scoring',
        isHighRiskUseCase: false,
        processesPersonalData: true,
        includesBiometricData: false,
        hasBiasMitigation: false,
        hasHumanOversight: false,
        humanCanOverride: false,
        usersAreInformed: false,
        systemIsExplainable: false,
        affectsLargePopulation: true,
        makesAutonomousDecisions: true,
        affectsVulnerableGroups: false,
      };

      const result = classifyRiskLevel(answers);
      expect(result.riskLevel).toBe('prohibited');
      expect(result.riskScore).toBe(100);
      expect(result.obligations).toContain('System must not be deployed');
      expect(result.applicableArticles).toContain('Article 5 - Prohibited AI Practices');
    });

    it('classifies mass surveillance as prohibited', () => {
      const answers: RiskAssessmentAnswers = {
        useCaseCategory: 'mass_surveillance_targeting',
        isHighRiskUseCase: false,
        processesPersonalData: true,
        includesBiometricData: false,
        hasBiasMitigation: false,
        hasHumanOversight: false,
        humanCanOverride: false,
        usersAreInformed: false,
        systemIsExplainable: false,
        affectsLargePopulation: true,
        makesAutonomousDecisions: true,
        affectsVulnerableGroups: false,
      };

      const result = classifyRiskLevel(answers);
      expect(result.riskLevel).toBe('prohibited');
      expect(result.riskScore).toBe(100);
    });
  });

  describe('classifyRiskLevel - High Risk Cases', () => {
    it('classifies criminal risk assessment as high risk', () => {
      const answers: RiskAssessmentAnswers = {
        useCaseCategory: 'criminal_risk_assessment',
        isHighRiskUseCase: true,
        processesPersonalData: true,
        includesBiometricData: false,
        hasBiasMitigation: false,
        hasHumanOversight: true,
        humanCanOverride: true,
        usersAreInformed: true,
        systemIsExplainable: true,
        affectsLargePopulation: true,
        makesAutonomousDecisions: false,
        affectsVulnerableGroups: false,
      };

      const result = classifyRiskLevel(answers);
      expect(result.riskLevel).toBe('high');
      expect(result.riskScore).toBeGreaterThan(65);
      expect(result.reviewSchedule).toBe('quarterly');
      expect(result.obligations.length).toBeGreaterThan(10);
      expect(result.applicableArticles).toContain('Article 6 - High-Risk AI Systems');
    });

    it('classifies biometric identification with no oversight as high risk', () => {
      const answers: RiskAssessmentAnswers = {
        useCaseCategory: 'biometric_identification',
        isHighRiskUseCase: true,
        processesPersonalData: true,
        includesBiometricData: true,
        hasBiasMitigation: false,
        hasHumanOversight: false,
        humanCanOverride: false,
        usersAreInformed: true,
        systemIsExplainable: false,
        affectsLargePopulation: true,
        makesAutonomousDecisions: true,
        affectsVulnerableGroups: false,
      };

      const result = classifyRiskLevel(answers);
      expect(result.riskLevel).toBe('high');
      expect(result.riskScore).toBeGreaterThan(70);
    });

    it('employment evaluation with bias mitigation and oversight is high risk', () => {
      const answers: RiskAssessmentAnswers = {
        useCaseCategory: 'employment_evaluation',
        isHighRiskUseCase: true,
        processesPersonalData: true,
        includesBiometricData: false,
        hasBiasMitigation: true,
        hasHumanOversight: true,
        humanCanOverride: true,
        usersAreInformed: true,
        systemIsExplainable: true,
        affectsLargePopulation: true,
        makesAutonomousDecisions: false,
        affectsVulnerableGroups: false,
      };

      const result = classifyRiskLevel(answers);
      expect(result.riskLevel).toBe('high');
      expect(result.riskScore).toBeGreaterThan(55);
      expect(result.controlsRequired).toContain('Risk management system');
      expect(result.controlsRequired).toContain('Audit logging system');
    });
  });

  describe('classifyRiskLevel - Limited Risk Cases', () => {
    it('classifies general recommendation system as limited/minimal risk', () => {
      const answers: RiskAssessmentAnswers = {
        useCaseCategory: 'recommendation_system',
        isHighRiskUseCase: false,
        processesPersonalData: true,
        includesBiometricData: false,
        hasBiasMitigation: true,
        hasHumanOversight: true,
        humanCanOverride: true,
        usersAreInformed: true,
        systemIsExplainable: true,
        affectsLargePopulation: false,
        makesAutonomousDecisions: false,
        affectsVulnerableGroups: false,
      };

      const result = classifyRiskLevel(answers);
      expect(['limited', 'minimal']).toContain(result.riskLevel);
      if (result.riskLevel === 'limited') {
        expect(result.reviewSchedule).toBe('biannual');
      } else {
        expect(result.reviewSchedule).toBe('annual');
      }
    });

    it('classifies content moderation as minimal or limited risk with mitigations', () => {
      const answers: RiskAssessmentAnswers = {
        useCaseCategory: 'content_moderation',
        isHighRiskUseCase: false,
        processesPersonalData: true, // Add personal data to trigger transparency requirements
        includesBiometricData: false,
        hasBiasMitigation: true,
        hasHumanOversight: true,
        humanCanOverride: true,
        usersAreInformed: true,
        systemIsExplainable: true,
        affectsLargePopulation: true,
        makesAutonomousDecisions: false,
        affectsVulnerableGroups: false,
      };

      const result = classifyRiskLevel(answers);
      expect(['limited', 'minimal']).toContain(result.riskLevel);
      // Limited risk includes transparency articles
      if (result.riskLevel === 'limited') {
        expect(result.applicableArticles).toContain('Article 52 - Transparency obligations');
      }
    });
  });

  describe('classifyRiskLevel - Minimal Risk Cases', () => {
    it('classifies general purpose system with no personal data as minimal risk', () => {
      const answers: RiskAssessmentAnswers = {
        useCaseCategory: 'general_purpose',
        isHighRiskUseCase: false,
        processesPersonalData: false,
        includesBiometricData: false,
        hasBiasMitigation: true,
        hasHumanOversight: true,
        humanCanOverride: true,
        usersAreInformed: true,
        systemIsExplainable: true,
        affectsLargePopulation: false,
        makesAutonomousDecisions: false,
        affectsVulnerableGroups: false,
      };

      const result = classifyRiskLevel(answers);
      expect(result.riskLevel).toBe('minimal');
      expect(result.riskScore).toBeLessThan(40);
      expect(result.reviewSchedule).toBe('annual');
    });

    it('minimal risk includes basic documentation obligations', () => {
      const answers: RiskAssessmentAnswers = {
        useCaseCategory: 'general_purpose',
        isHighRiskUseCase: false,
        processesPersonalData: false,
        includesBiometricData: false,
        hasBiasMitigation: true,
        hasHumanOversight: true,
        humanCanOverride: true,
        usersAreInformed: true,
        systemIsExplainable: true,
        affectsLargePopulation: false,
        makesAutonomousDecisions: false,
        affectsVulnerableGroups: false,
      };

      const result = classifyRiskLevel(answers);
      expect(result.obligations).toContain('Document AI system purpose and scope');
      expect(result.obligations).toContain('Maintain basic compliance records');
    });
  });

  describe('classifyRiskLevel - Score calculation', () => {
    it('score is between 0 and 100', () => {
      const testCases: RiskAssessmentAnswers[] = [
        {
          useCaseCategory: 'general_purpose',
          isHighRiskUseCase: false,
          processesPersonalData: false,
          includesBiometricData: false,
          hasBiasMitigation: true,
          hasHumanOversight: true,
          humanCanOverride: true,
          usersAreInformed: true,
          systemIsExplainable: true,
          affectsLargePopulation: false,
          makesAutonomousDecisions: false,
          affectsVulnerableGroups: false,
        },
        {
          useCaseCategory: 'biometric_identification',
          isHighRiskUseCase: true,
          processesPersonalData: true,
          includesBiometricData: true,
          hasBiasMitigation: false,
          hasHumanOversight: false,
          humanCanOverride: false,
          usersAreInformed: false,
          systemIsExplainable: false,
          affectsLargePopulation: true,
          makesAutonomousDecisions: true,
          affectsVulnerableGroups: true,
        },
      ];

      for (const answers of testCases) {
        const result = classifyRiskLevel(answers);
        expect(result.riskScore).toBeGreaterThanOrEqual(0);
        expect(result.riskScore).toBeLessThanOrEqual(100);
      }
    });

    it('rationale includes all risk factors', () => {
      const answers: RiskAssessmentAnswers = {
        useCaseCategory: 'recommendation_system',
        isHighRiskUseCase: false,
        processesPersonalData: true,
        includesBiometricData: false,
        hasBiasMitigation: false,
        hasHumanOversight: false,
        humanCanOverride: false,
        usersAreInformed: false,
        systemIsExplainable: false,
        affectsLargePopulation: true,
        makesAutonomousDecisions: true,
        affectsVulnerableGroups: false,
      };

      const result = classifyRiskLevel(answers);
      expect(result.rationale).toContain('Classification based on:');
      expect(result.rationale).toContain('Risk score:');
      expect(result.rationale.length).toBeGreaterThan(50);
    });
  });

  describe('classifyRiskLevel - Mitigations reduce risk', () => {
    it('bias mitigation reduces risk score', () => {
      const baseAnswers: RiskAssessmentAnswers = {
        useCaseCategory: 'employment_recruitment',
        isHighRiskUseCase: true,
        processesPersonalData: true,
        includesBiometricData: false,
        hasBiasMitigation: false,
        hasHumanOversight: true,
        humanCanOverride: true,
        usersAreInformed: true,
        systemIsExplainable: true,
        affectsLargePopulation: false,
        makesAutonomousDecisions: false,
        affectsVulnerableGroups: false,
      };

      const withMitigation = { ...baseAnswers, hasBiasMitigation: true };

      const baseResult = classifyRiskLevel(baseAnswers);
      const mitigatedResult = classifyRiskLevel(withMitigation);

      // Mitigated version has lower score
      expect(mitigatedResult.riskScore).toBeLessThan(baseResult.riskScore);
    });

    it('human oversight reduces risk score', () => {
      const baseAnswers: RiskAssessmentAnswers = {
        useCaseCategory: 'credit_assessment',
        isHighRiskUseCase: true,
        processesPersonalData: true,
        includesBiometricData: false,
        hasBiasMitigation: true,
        hasHumanOversight: false,
        humanCanOverride: false,
        usersAreInformed: true,
        systemIsExplainable: true,
        affectsLargePopulation: false,
        makesAutonomousDecisions: true,
        affectsVulnerableGroups: false,
      };

      const withOversight = { ...baseAnswers, hasHumanOversight: true };

      const baseResult = classifyRiskLevel(baseAnswers);
      const oversightResult = classifyRiskLevel(withOversight);

      expect(oversightResult.riskScore).toBeLessThan(baseResult.riskScore);
    });
  });

  describe('classifyRiskLevel - Articles mapping', () => {
    it('high risk includes data governance articles', () => {
      const answers: RiskAssessmentAnswers = {
        useCaseCategory: 'biometric_identification',
        isHighRiskUseCase: true,
        processesPersonalData: true,
        includesBiometricData: true,
        hasBiasMitigation: false,
        hasHumanOversight: false,
        humanCanOverride: false,
        usersAreInformed: false,
        systemIsExplainable: false,
        affectsLargePopulation: false,
        makesAutonomousDecisions: true,
        affectsVulnerableGroups: false,
      };

      const result = classifyRiskLevel(answers);
      expect(result.applicableArticles).toContain('Article 10 - Data governance');
      expect(result.applicableArticles).toContain('Article 12 - Human oversight');
      expect(result.applicableArticles).toContain('Article 15 - Transparency and information');
    });

    it('limited risk includes transparency articles', () => {
      const answers: RiskAssessmentAnswers = {
        useCaseCategory: 'recommendation_system',
        isHighRiskUseCase: false,
        processesPersonalData: true,
        includesBiometricData: false,
        hasBiasMitigation: true,
        hasHumanOversight: true,
        humanCanOverride: true,
        usersAreInformed: true,
        systemIsExplainable: true,
        affectsLargePopulation: true,
        makesAutonomousDecisions: false,
        affectsVulnerableGroups: false,
      };

      const result = classifyRiskLevel(answers);
      if (result.riskLevel === 'limited') {
        expect(result.applicableArticles).toContain('Article 52 - Transparency obligations');
      }
    });
  });
});
