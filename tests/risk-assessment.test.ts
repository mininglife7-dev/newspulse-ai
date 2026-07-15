import { describe, it, expect } from 'vitest';
import { classifyRisk, getRiskLevelLabel } from '../lib/risk-assessment';

describe('Risk Assessment Classification', () => {
  describe('Prohibited uses detection', () => {
    it('should classify as unacceptable for real-time biometric identification', () => {
      const answers = new Map([['q1-prohibited-biometric', true]]);
      const result = classifyRisk(answers);

      expect(result.riskLevel).toBe('unacceptable');
      expect(result.riskScore).toBe(100);
      expect(result.score.prohibitedIndicators).toBeGreaterThan(0);
    });

    it('should classify as unacceptable for emotion recognition', () => {
      const answers = new Map([['q2-emotion-recognition', true]]);
      const result = classifyRisk(answers);

      expect(result.riskLevel).toBe('unacceptable');
      expect(result.riskScore).toBe(100);
    });

    it('should classify as unacceptable for social scoring', () => {
      const answers = new Map([['q3-social-scoring', true]]);
      const result = classifyRisk(answers);

      expect(result.riskLevel).toBe('unacceptable');
      expect(result.riskScore).toBe(100);
    });
  });

  describe('High-risk indicators', () => {
    it('should classify as high-risk for credit decision system', () => {
      const answers = new Map([
        ['q4-credit-decision', true],
        ['q15-transparency', false],
        ['q16-oversight', false],
      ]);
      const result = classifyRisk(answers);

      expect(result.riskLevel).toBe('high');
      expect(result.score.highRiskIndicators).toBeGreaterThan(0);
      expect(result.riskScore).toBeGreaterThan(40);
    });

    it('should classify as high-risk for recruitment screening', () => {
      const answers = new Map([
        ['q5-recruitment', true],
        ['q15-transparency', false],
      ]);
      const result = classifyRisk(answers);

      expect(result.riskLevel).toBe('high');
      expect(result.affectedCategories).toContain('recruitment');
    });

    it('should classify as high-risk for law enforcement profiling', () => {
      const answers = new Map([['q7-law-enforcement', true]]);
      const result = classifyRisk(answers);

      expect(result.riskLevel).toBe('high');
      expect(result.affectedCategories).toContain('law-enforcement');
    });

    it('should classify as high-risk for educational decisions', () => {
      const answers = new Map([['q6-education', true]]);
      const result = classifyRisk(answers);

      expect(result.riskLevel).toBe('high');
      expect(result.affectedCategories).toContain('education');
    });

    it('should classify as high-risk for critical infrastructure', () => {
      const answers = new Map([['q8-critical-infrastructure', true]]);
      const result = classifyRisk(answers);

      expect(result.riskLevel).toBe('high');
      expect(result.affectedCategories).toContain('critical-infrastructure');
    });
  });

  describe('Medium-risk indicators', () => {
    it('should classify as medium-risk for personal data processing', () => {
      const answers = new Map([
        ['q10-personal-data', true],
        ['q11-sensitive-data', false],
      ]);
      const result = classifyRisk(answers);

      expect(result.riskLevel).toBe('medium');
      expect(result.riskScore).toBeGreaterThan(15);
    });

    it('should increase risk for sensitive data categories', () => {
      const answers = new Map([
        ['q10-personal-data', true],
        ['q11-sensitive-data', true],
      ]);
      const result = classifyRisk(answers);

      expect(result.riskLevel).toBe('medium');
      expect(result.score.mediumRiskIndicators).toBeGreaterThan(0);
    });

    it('should increase risk for vulnerable groups', () => {
      const answers = new Map([
        ['q10-personal-data', true],
        ['q12-vulnerable-groups', true],
      ]);
      const result = classifyRisk(answers);

      expect(result.score.mediumRiskIndicators).toBeGreaterThan(0);
    });
  });

  describe('Scale impact on risk', () => {
    it('should increase risk score for large-scale deployment', () => {
      const smallScale = classifyRisk(
        new Map([['q13-scale', 'Fewer than 100']])
      );
      const largeScale = classifyRisk(
        new Map([['q13-scale', 'More than 100,000']])
      );

      expect(largeScale.riskScore).toBeGreaterThan(smallScale.riskScore);
    });
  });

  describe('Mitigating factors', () => {
    it('should reduce risk for systems with transparency', () => {
      const withoutTransparency = classifyRisk(
        new Map([
          ['q4-credit-decision', true],
          ['q15-transparency', false],
        ])
      );
      const withTransparency = classifyRisk(
        new Map([
          ['q4-credit-decision', true],
          ['q15-transparency', true],
        ])
      );

      expect(withTransparency.riskScore).toBeLessThan(
        withoutTransparency.riskScore
      );
    });

    it('should reduce risk for systems with human oversight', () => {
      const withoutOversight = classifyRisk(
        new Map([
          ['q4-credit-decision', true],
          ['q16-oversight', false],
        ])
      );
      const withOversight = classifyRisk(
        new Map([
          ['q4-credit-decision', true],
          ['q16-oversight', true],
        ])
      );

      expect(withOversight.riskScore).toBeLessThan(withoutOversight.riskScore);
    });

    it('should reduce risk for systems with testing and monitoring', () => {
      const noTesting = classifyRisk(
        new Map([
          ['q4-credit-decision', true],
          ['q17-testing', false],
          ['q18-monitoring', false],
        ])
      );
      const withTesting = classifyRisk(
        new Map([
          ['q4-credit-decision', true],
          ['q17-testing', true],
          ['q18-monitoring', true],
        ])
      );

      expect(withTesting.riskScore).toBeLessThan(noTesting.riskScore);
    });
  });

  describe('Low-risk classification', () => {
    it('should classify as low-risk for general-purpose systems', () => {
      const answers = new Map([
        ['q1-prohibited-biometric', false],
        ['q4-credit-decision', false],
        ['q5-recruitment', false],
        ['q10-personal-data', false],
      ]);
      const result = classifyRisk(answers);

      expect(result.riskLevel).toBe('low');
      expect(result.riskScore).toBeLessThan(40);
    });

    it('should include recommendations for low-risk systems', () => {
      const answers = new Map([['q10-personal-data', false]]);
      const result = classifyRisk(answers);

      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Complex scenarios', () => {
    it('should correctly evaluate multi-factor high-risk scenario', () => {
      const answers = new Map<string, any>([
        ['q5-recruitment', true],
        ['q10-personal-data', true],
        ['q11-sensitive-data', true],
        ['q13-scale', 'More than 100,000'],
        ['q15-transparency', false],
        ['q16-oversight', false],
      ]);
      const result = classifyRisk(answers);

      expect(result.riskLevel).toBe('high');
      expect(result.riskScore).toBeGreaterThan(70);
      expect(result.reasoning.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should correctly evaluate mitigated high-risk scenario', () => {
      const answers = new Map([
        ['q4-credit-decision', true],
        ['q15-transparency', true],
        ['q16-oversight', true],
        ['q17-testing', true],
        ['q18-monitoring', true],
      ]);
      const result = classifyRisk(answers);

      expect(result.riskLevel).toBe('high');
      // Risk score should be lower due to mitigating factors
      expect(result.riskScore).toBeLessThan(70);
    });
  });

  describe('Label generation', () => {
    it('should generate correct labels for all risk levels', () => {
      expect(getRiskLevelLabel('unacceptable')).toBe('Prohibited');
      expect(getRiskLevelLabel('high')).toBe('High-Risk');
      expect(getRiskLevelLabel('medium')).toBe('Medium-Risk');
      expect(getRiskLevelLabel('low')).toBe('Low-Risk');
    });
  });

  describe('Result structure', () => {
    it('should always return complete result structure', () => {
      const result = classifyRisk(new Map());

      expect(result).toHaveProperty('riskLevel');
      expect(result).toHaveProperty('riskScore');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('reasoning');
      expect(result).toHaveProperty('affectedCategories');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('timestamp');

      expect(typeof result.riskLevel).toBe('string');
      expect(typeof result.riskScore).toBe('number');
      expect(Array.isArray(result.reasoning)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(Array.isArray(result.affectedCategories)).toBe(true);
    });

    it('should clamp risk score between 0-100', () => {
      const answers = new Map([['q1-prohibited-biometric', true]]);
      const result = classifyRisk(answers);

      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(100);
    });
  });
});
