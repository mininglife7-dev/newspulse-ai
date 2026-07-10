import { describe, it, expect } from 'vitest';
import {
  healthItems,
  healthScores,
  deploymentReality,
  explainers,
  architectureGaps,
  decisionRecords,
  executiveSummary,
} from '@/lib/founder/dashboard-data';

const CONFIDENCE = ['Verified', 'Estimated', 'Unknown'];
const RISK = ['Low', 'Medium', 'High', 'Critical'];

describe('Founder dashboard data invariants', () => {
  it('every health score is null (UNKNOWN) or within 0–100 — never inflated past 100', () => {
    for (const s of healthScores) {
      if (s.score === null) continue;
      expect(s.score).toBeGreaterThanOrEqual(0);
      expect(s.score).toBeLessThanOrEqual(100);
      expect(CONFIDENCE).toContain(s.confidence);
      expect(s.rationale.length).toBeGreaterThan(0);
    }
  });

  it('includes an Overall Launch Readiness score', () => {
    const overall = healthScores.find((s) => s.label === 'Overall Launch Readiness');
    expect(overall).toBeDefined();
  });

  it('every infrastructure item carries the required Founder fields', () => {
    expect(healthItems.length).toBeGreaterThan(0);
    for (const item of healthItems) {
      expect(item.name).toBeTruthy();
      expect(CONFIDENCE).toContain(item.confidence);
      expect(RISK).toContain(item.risk);
      expect(item.businessImpact.length).toBeGreaterThan(0);
      expect(item.recommendedAction.length).toBeGreaterThan(0);
    }
  });

  it('every "Explain Like a Founder" entry stays within 150 words per field', () => {
    for (const e of explainers) {
      for (const value of Object.values(e)) {
        const words = String(value).trim().split(/\s+/).length;
        expect(words).toBeLessThanOrEqual(150);
      }
    }
  });

  it('deployment reality and ADRs are present and labelled', () => {
    expect(deploymentReality.length).toBeGreaterThan(0);
    for (const f of deploymentReality) expect(CONFIDENCE).toContain(f.confidence);
    expect(architectureGaps.length).toBeGreaterThan(0);
    expect(decisionRecords.length).toBeGreaterThan(0);
  });

  it('executive summary carries a valid GO / GO WITH CONDITIONS / NO-GO decision', () => {
    expect(['GO', 'GO WITH CONDITIONS', 'NO-GO']).toContain(
      executiveSummary.decision
    );
    expect(executiveSummary.recommendedNextActions.length).toBeGreaterThan(0);
  });
});
