import { describe, it, expect } from 'vitest';
import { WorkspaceCreateSchema, AiSystemCreateSchema } from '@/lib/validation';

describe('Input Validation Schemas', () => {
  describe('WorkspaceCreateSchema', () => {
    it('accepts valid workspace data', () => {
      const valid = {
        companyName: 'Acme Corp',
        country: 'DE',
        industry: 'Technology',
      };
      const result = WorkspaceCreateSchema.parse(valid);
      expect(result.companyName).toBe('Acme Corp');
      expect(result.country).toBe('DE');
    });

    it('rejects missing required fields', () => {
      expect(() =>
        WorkspaceCreateSchema.parse({ country: 'DE' })
      ).toThrow();
    });

    it('enforces companyName max length (100 chars)', () => {
      const longName = 'a'.repeat(101);
      expect(() =>
        WorkspaceCreateSchema.parse({
          companyName: longName,
          country: 'DE',
          industry: 'Tech',
        })
      ).toThrow('must be at most 100 characters');
    });

    it('enforces description max length (500 chars)', () => {
      const longDesc = 'a'.repeat(501);
      expect(() =>
        WorkspaceCreateSchema.parse({
          companyName: 'Acme',
          country: 'DE',
          industry: 'Tech',
          description: longDesc,
        })
      ).toThrow('must be at most 500 characters');
    });

    it('validates website as URL when provided', () => {
      expect(() =>
        WorkspaceCreateSchema.parse({
          companyName: 'Acme',
          country: 'DE',
          industry: 'Tech',
          website: 'not-a-url',
        })
      ).toThrow('must be a valid URL');

      const valid = WorkspaceCreateSchema.parse({
        companyName: 'Acme',
        country: 'DE',
        industry: 'Tech',
        website: 'https://acme.example.com',
      });
      expect(valid.website).toBe('https://acme.example.com');
    });

    it('allows empty string for optional website field', () => {
      const result = WorkspaceCreateSchema.parse({
        companyName: 'Acme',
        country: 'DE',
        industry: 'Tech',
        website: '',
      });
      expect(result.website).toBeUndefined();
    });

    it('trims whitespace from string fields', () => {
      const result = WorkspaceCreateSchema.parse({
        companyName: '  Acme Corp  ',
        country: '  DE  ',
        industry: '  Tech  ',
      });
      expect(result.companyName).toBe('Acme Corp');
      expect(result.country).toBe('DE');
    });
  });

  describe('AiSystemCreateSchema', () => {
    it('accepts valid AI system data', () => {
      const valid = {
        name: 'ChatGPT Integration',
        systemType: 'large_language_model',
        vendor: 'OpenAI',
        status: 'active',
      };
      const result = AiSystemCreateSchema.parse(valid);
      expect(result.name).toBe('ChatGPT Integration');
      expect(result.status).toBe('active');
    });

    it('rejects missing name', () => {
      expect(() =>
        AiSystemCreateSchema.parse({
          systemType: 'large_language_model',
        })
      ).toThrow();
    });

    it('enforces name max length (150 chars)', () => {
      const longName = 'a'.repeat(151);
      expect(() =>
        AiSystemCreateSchema.parse({
          name: longName,
        })
      ).toThrow('must be at most 150 characters');
    });

    it('enforces purpose max length (300 chars)', () => {
      const longPurpose = 'a'.repeat(301);
      expect(() =>
        AiSystemCreateSchema.parse({
          name: 'System',
          purpose: longPurpose,
        })
      ).toThrow('must be at most 300 characters');
    });

    it('rejects invalid systemType enum', () => {
      expect(() =>
        AiSystemCreateSchema.parse({
          name: 'System',
          systemType: 'quantum_oracle',
        })
      ).toThrow();
    });

    it('accepts valid systemType values', () => {
      const validTypes = [
        'large_language_model',
        'generative_ai',
        'classification_system',
        'recommendation_system',
        'computer_vision',
        'biometric_system',
        'decision_support',
        'other',
      ];
      for (const type of validTypes) {
        const result = AiSystemCreateSchema.parse({
          name: 'System',
          systemType: type as any,
        });
        expect(result.systemType).toBe(type);
      }
    });

    it('rejects invalid status enum', () => {
      expect(() =>
        AiSystemCreateSchema.parse({
          name: 'System',
          status: 'retired',
        })
      ).toThrow();
    });

    it('accepts valid status values', () => {
      for (const status of ['active', 'pilot', 'deprecated']) {
        const result = AiSystemCreateSchema.parse({
          name: 'System',
          status: status as 'active' | 'pilot' | 'deprecated',
        });
        expect(result.status).toBe(status);
      }
    });

    it('defaults status to active', () => {
      const result = AiSystemCreateSchema.parse({
        name: 'System',
      });
      expect(result.status).toBe('active');
    });

    it('enforces vendor max length (100 chars)', () => {
      const longVendor = 'a'.repeat(101);
      expect(() =>
        AiSystemCreateSchema.parse({
          name: 'System',
          vendor: longVendor,
        })
      ).toThrow('must be at most 100 characters');
    });

    it('trims whitespace from string fields', () => {
      const result = AiSystemCreateSchema.parse({
        name: '  My System  ',
        vendor: '  OpenAI  ',
        purpose: '  Support  ',
      });
      expect(result.name).toBe('My System');
      expect(result.vendor).toBe('OpenAI');
      expect(result.purpose).toBe('Support');
    });
  });
});
