import { describe, it, expect } from 'vitest';
import {
  validateWorkspaceBody,
  FIELD_LIMITS,
} from '@/lib/workspace-validation';

const valid = {
  companyName: 'Acme GmbH',
  country: 'Germany',
  industry: 'Manufacturing',
};

describe('validateWorkspaceBody', () => {
  it('accepts a minimal valid body and trims values', () => {
    const res = validateWorkspaceBody({
      companyName: '  Acme GmbH  ',
      country: 'Germany',
      industry: 'Manufacturing',
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.companyName).toBe('Acme GmbH');
      // Optional fields collapse to null.
      expect(res.value.legalName).toBeNull();
      expect(res.value.website).toBeNull();
      expect(res.value.description).toBeNull();
    }
  });

  it('normalizes all optional fields when provided', () => {
    const res = validateWorkspaceBody({
      ...valid,
      legalName: 'Acme Aktiengesellschaft',
      employees: '51-200',
      website: 'https://acme.example',
      description: 'EU AI Act readiness',
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.legalName).toBe('Acme Aktiengesellschaft');
      expect(res.value.employees).toBe('51-200');
      expect(res.value.website).toBe('https://acme.example');
    }
  });

  it.each(['companyName', 'country', 'industry'] as const)(
    'rejects missing required field: %s',
    (field) => {
      const body = { ...valid };
      delete (body as Record<string, unknown>)[field];
      const res = validateWorkspaceBody(body);
      expect(res.ok).toBe(false);
    }
  );

  it('rejects whitespace-only required fields', () => {
    const res = validateWorkspaceBody({ ...valid, companyName: '   ' });
    expect(res.ok).toBe(false);
  });

  it('rejects non-string field types', () => {
    expect(validateWorkspaceBody({ ...valid, companyName: 123 }).ok).toBe(false);
    expect(validateWorkspaceBody({ ...valid, website: { u: 1 } }).ok).toBe(false);
  });

  it('rejects non-object bodies', () => {
    expect(validateWorkspaceBody(null).ok).toBe(false);
    expect(validateWorkspaceBody('str').ok).toBe(false);
    expect(validateWorkspaceBody([valid]).ok).toBe(false);
  });

  it('enforces length caps (over the limit is rejected)', () => {
    const res = validateWorkspaceBody({
      ...valid,
      companyName: 'x'.repeat(FIELD_LIMITS.companyName + 1),
    });
    expect(res.ok).toBe(false);
  });

  it('accepts values exactly at the length cap', () => {
    const res = validateWorkspaceBody({
      ...valid,
      description: 'x'.repeat(FIELD_LIMITS.description),
    });
    expect(res.ok).toBe(true);
  });

  it('caps an oversized optional field (description) rather than silently storing it', () => {
    const res = validateWorkspaceBody({
      ...valid,
      description: 'x'.repeat(FIELD_LIMITS.description + 1),
    });
    expect(res.ok).toBe(false);
  });
});
