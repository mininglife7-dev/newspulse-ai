import { describe, it, expect } from 'vitest';
import {
  classify,
  SCREENING_QUESTIONS,
  QUESTION_IDS,
} from '@/lib/risk-assessment';

const allNo = Object.fromEntries(QUESTION_IDS.map((id) => [id, false]));

describe('EU AI Act screening classifier', () => {
  it('classifies all-no as minimal risk', () => {
    const r = classify(allNo);
    expect(r.riskLevel).toBe('low');
    expect(r.riskScore).toBe(10);
    expect(r.matched).toEqual([]);
    expect(r.obligations.length).toBeGreaterThan(0);
  });

  it('any prohibited answer dominates everything else', () => {
    const r = classify({ ...allNo, social_scoring: true, employment: true });
    expect(r.riskLevel).toBe('unacceptable');
    expect(r.riskScore).toBe(100);
    expect(r.matched).toEqual(['social_scoring']);
    expect(r.obligations.join(' ')).toContain('Article 5');
  });

  it('Annex III areas classify as high risk', () => {
    const r = classify({ ...allNo, employment: true, essential_services: true });
    expect(r.riskLevel).toBe('high');
    expect(r.matched).toEqual(['employment', 'essential_services']);
    expect(r.obligations.join(' ')).toContain('human oversight');
  });

  it('transparency-only systems classify as medium (limited risk)', () => {
    const r = classify({ ...allNo, interacts_humans: true });
    expect(r.riskLevel).toBe('medium');
    expect(r.obligations.join(' ')).toContain('interacting with an AI');
  });

  it('high beats transparency when both apply', () => {
    const r = classify({
      ...allNo,
      generates_content: true,
      critical_infrastructure: true,
    });
    expect(r.riskLevel).toBe('high');
  });

  it('ignores unknown answer keys', () => {
    const r = classify({ ...allNo, made_up_question: true } as any);
    expect(r.riskLevel).toBe('low');
  });

  it('treats missing answers as no', () => {
    const r = classify({});
    expect(r.riskLevel).toBe('low');
  });

  it('every question belongs to a known tier', () => {
    for (const q of SCREENING_QUESTIONS) {
      expect(['prohibited', 'high', 'transparency']).toContain(q.tier);
    }
  });
});
