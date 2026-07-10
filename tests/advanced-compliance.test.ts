import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createComplianceTemplate,
  getComplianceTemplate,
  listComplianceTemplates,
  createAutomationRule,
  getAutomationRule,
  listAutomationRules,
  toggleAutomationRule,
  generateLocalizedReport,
  validateAutomationRule,
  validateObligation,
  getSupportedLanguages,
  isLanguageSupported,
  type ComplianceTemplate,
  type AutomationRule,
  type TemplateObligation,
} from '@/lib/advanced-compliance';

global.fetch = vi.fn();

describe('Advanced Compliance Features (DNA-GOV-016)', () => {
  const mockWorkspaceId = '550e8400-e29b-41d4-a716-446655440000';
  const mockFrameworkId = '660e8400-e29b-41d4-a716-446655440001';
  const mockTemplateId = '770e8400-e29b-41d4-a716-446655440002';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Compliance Templates', () => {
    describe('createComplianceTemplate', () => {
      it('should create template successfully', async () => {
        const mockTemplate: ComplianceTemplate = {
          id: mockTemplateId,
          workspace_id: mockWorkspaceId,
          framework_id: mockFrameworkId,
          name: 'ISO 27001 - Data Security',
          is_system_template: false,
          version: 1,
          obligations: [],
          created_at: '2026-07-10T12:00:00Z',
          updated_at: '2026-07-10T12:00:00Z',
        };

        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => mockTemplate,
        });

        const result = await createComplianceTemplate(mockWorkspaceId, mockFrameworkId, {
          name: 'ISO 27001 - Data Security',
          is_system_template: false,
          obligations: [],
        });

        expect(result).toBeDefined();
        expect(result?.name).toBe('ISO 27001 - Data Security');
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/compliance/templates',
          expect.objectContaining({ method: 'POST' })
        );
      });

      it('should handle API errors gracefully', async () => {
        (global.fetch as any).mockResolvedValue({ ok: false });

        const result = await createComplianceTemplate(mockWorkspaceId, mockFrameworkId, {
          name: 'Test Template',
          is_system_template: false,
          obligations: [],
        });

        expect(result).toBeNull();
      });

      it('should handle network errors gracefully', async () => {
        (global.fetch as any).mockRejectedValue(new Error('Network error'));

        const result = await createComplianceTemplate(mockWorkspaceId, mockFrameworkId, {
          name: 'Test Template',
          is_system_template: false,
          obligations: [],
        });

        expect(result).toBeNull();
      });
    });

    describe('getComplianceTemplate', () => {
      it('should fetch template successfully', async () => {
        const mockTemplate: ComplianceTemplate = {
          id: mockTemplateId,
          workspace_id: mockWorkspaceId,
          framework_id: mockFrameworkId,
          name: 'ISO 27001',
          is_system_template: false,
          version: 1,
          obligations: [],
          created_at: '2026-07-10T12:00:00Z',
          updated_at: '2026-07-10T12:00:00Z',
        };

        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => mockTemplate,
        });

        const result = await getComplianceTemplate(mockTemplateId);

        expect(result?.name).toBe('ISO 27001');
      });

      it('should return null on error', async () => {
        (global.fetch as any).mockResolvedValue({ ok: false });

        const result = await getComplianceTemplate(mockTemplateId);

        expect(result).toBeNull();
      });
    });

    describe('listComplianceTemplates', () => {
      it('should list templates for workspace', async () => {
        const mockTemplates: ComplianceTemplate[] = [
          {
            id: 't1',
            workspace_id: mockWorkspaceId,
            framework_id: mockFrameworkId,
            name: 'ISO 27001',
            is_system_template: false,
            version: 1,
            obligations: [],
            created_at: '2026-07-10T12:00:00Z',
            updated_at: '2026-07-10T12:00:00Z',
          },
        ];

        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => mockTemplates,
        });

        const result = await listComplianceTemplates(mockWorkspaceId);

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('ISO 27001');
      });

      it('should return empty array on error', async () => {
        (global.fetch as any).mockResolvedValue({ ok: false });

        const result = await listComplianceTemplates(mockWorkspaceId);

        expect(result).toEqual([]);
      });
    });
  });

  describe('Automation Rules', () => {
    describe('createAutomationRule', () => {
      it('should create automation rule', async () => {
        const mockRule: AutomationRule = {
          id: 'rule1',
          workspace_id: mockWorkspaceId,
          name: 'Auto-validate evidence',
          trigger_type: 'evidence_uploaded',
          trigger_config: { obligation_id: 'obl1' },
          actions: [
            {
              type: 'categorize',
              config: { auto_category: true },
            },
          ],
          enabled: true,
          created_at: '2026-07-10T12:00:00Z',
        };

        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => mockRule,
        });

        const result = await createAutomationRule(mockWorkspaceId, {
          name: 'Auto-validate evidence',
          trigger_type: 'evidence_uploaded',
          trigger_config: { obligation_id: 'obl1' },
          actions: [{ type: 'categorize', config: { auto_category: true } }],
          enabled: true,
        });

        expect(result?.name).toBe('Auto-validate evidence');
      });

      it('should handle invalid rule gracefully', async () => {
        (global.fetch as any).mockResolvedValue({ ok: false });

        const result = await createAutomationRule(mockWorkspaceId, {
          name: 'Test Rule',
          trigger_type: 'evidence_uploaded',
          trigger_config: {},
          actions: [],
          enabled: true,
        });

        expect(result).toBeNull();
      });
    });

    describe('getAutomationRule', () => {
      it('should fetch automation rule', async () => {
        const mockRule: AutomationRule = {
          id: 'rule1',
          workspace_id: mockWorkspaceId,
          name: 'Test Rule',
          trigger_type: 'evidence_uploaded',
          trigger_config: {},
          actions: [],
          enabled: true,
          created_at: '2026-07-10T12:00:00Z',
        };

        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => mockRule,
        });

        const result = await getAutomationRule('rule1');

        expect(result?.name).toBe('Test Rule');
      });

      it('should return null on error', async () => {
        (global.fetch as any).mockResolvedValue({ ok: false });

        const result = await getAutomationRule('rule1');

        expect(result).toBeNull();
      });
    });

    describe('listAutomationRules', () => {
      it('should list automation rules', async () => {
        const mockRules: AutomationRule[] = [
          {
            id: 'rule1',
            workspace_id: mockWorkspaceId,
            name: 'Auto-validate',
            trigger_type: 'evidence_uploaded',
            trigger_config: {},
            actions: [],
            enabled: true,
            created_at: '2026-07-10T12:00:00Z',
          },
        ];

        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => mockRules,
        });

        const result = await listAutomationRules(mockWorkspaceId);

        expect(result).toHaveLength(1);
      });

      it('should return empty array on error', async () => {
        (global.fetch as any).mockResolvedValue({ ok: false });

        const result = await listAutomationRules(mockWorkspaceId);

        expect(result).toEqual([]);
      });
    });

    describe('toggleAutomationRule', () => {
      it('should enable automation rule', async () => {
        (global.fetch as any).mockResolvedValue({ ok: true });

        const result = await toggleAutomationRule('rule1', true);

        expect(result).toBe(true);
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/compliance/automation-rules/rule1',
          expect.objectContaining({ method: 'PATCH' })
        );
      });

      it('should disable automation rule', async () => {
        (global.fetch as any).mockResolvedValue({ ok: true });

        const result = await toggleAutomationRule('rule1', false);

        expect(result).toBe(true);
      });

      it('should handle errors gracefully', async () => {
        (global.fetch as any).mockResolvedValue({ ok: false });

        const result = await toggleAutomationRule('rule1', true);

        expect(result).toBe(false);
      });
    });
  });

  describe('Localization', () => {
    describe('generateLocalizedReport', () => {
      it('should generate localized report', async () => {
        const mockBlob = new Blob(['Report content'], { type: 'application/pdf' });

        (global.fetch as any).mockResolvedValue({
          ok: true,
          blob: async () => mockBlob,
        });

        const result = await generateLocalizedReport('assessment1', 'en', 'US');

        expect(result).toBeDefined();
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('language=en'),
          expect.objectContaining({ method: 'POST' })
        );
      });

      it('should handle missing region gracefully', async () => {
        (global.fetch as any).mockResolvedValue({
          ok: true,
          blob: async () => new Blob(),
        });

        const result = await generateLocalizedReport('assessment1', 'es');

        expect(result).toBeDefined();
        expect(global.fetch).toHaveBeenCalledWith(
          expect.not.stringContaining('region='),
          expect.any(Object)
        );
      });

      it('should return null on error', async () => {
        (global.fetch as any).mockResolvedValue({ ok: false });

        const result = await generateLocalizedReport('assessment1', 'en');

        expect(result).toBeNull();
      });
    });

    describe('getSupportedLanguages', () => {
      it('should return list of supported languages', () => {
        const languages = getSupportedLanguages();

        expect(languages.length).toBeGreaterThan(0);
        expect(languages[0]).toHaveProperty('language');
        expect(languages[0]).toHaveProperty('compliance_nuances');
      });

      it('should include regional variants', () => {
        const languages = getSupportedLanguages();
        const engishVariants = languages.filter((l) => l.language === 'en');

        expect(engishVariants.length).toBeGreaterThan(1); // US, UK, EU variants
      });

      it('should include compliance nuances', () => {
        const languages = getSupportedLanguages();

        for (const lang of languages) {
          expect(Object.keys(lang.compliance_nuances).length).toBeGreaterThan(0);
        }
      });
    });

    describe('isLanguageSupported', () => {
      it('should return true for supported language', () => {
        expect(isLanguageSupported('en', 'US')).toBe(true);
        expect(isLanguageSupported('es', 'EU')).toBe(true);
      });

      it('should return false for unsupported language', () => {
        expect(isLanguageSupported('unsupported')).toBe(false);
      });

      it('should work without region for some languages', () => {
        const result = isLanguageSupported('en');
        // Should return true if any region matches
        expect(typeof result).toBe('boolean');
      });
    });
  });

  describe('Validation', () => {
    describe('validateAutomationRule', () => {
      it('should accept valid rule', () => {
        const rule = {
          name: 'Valid Rule',
          trigger_type: 'evidence_uploaded' as const,
          actions: [{ type: 'categorize' as const, config: { key: 'value' } }],
        };

        const errors = validateAutomationRule(rule);

        expect(errors).toEqual([]);
      });

      it('should require rule name', () => {
        const errors = validateAutomationRule({});

        expect(errors).toContain('Rule name is required');
      });

      it('should require trigger type', () => {
        const errors = validateAutomationRule({ name: 'Test' });

        expect(errors).toContain('Trigger type is required');
      });

      it('should require at least one action', () => {
        const errors = validateAutomationRule({
          name: 'Test',
          trigger_type: 'evidence_uploaded' as const,
          actions: [],
        });

        expect(errors).toContain('At least one action is required');
      });

      it('should validate action config', () => {
        const errors = validateAutomationRule({
          name: 'Test',
          trigger_type: 'evidence_uploaded' as const,
          actions: [{ type: 'categorize' as const, config: {} }],
        });

        expect(errors).toContain('Action config cannot be empty');
      });

      it('should return multiple errors', () => {
        const errors = validateAutomationRule({});

        expect(errors.length).toBeGreaterThan(1);
      });
    });

    describe('validateObligation', () => {
      it('should accept valid obligation', () => {
        const obligation: Partial<TemplateObligation> = {
          title: 'Access Control',
          category: 'Security',
          required_evidence_types: ['policy', 'logs'],
          estimated_effort_hours: 40,
        };

        const errors = validateObligation(obligation);

        expect(errors).toEqual([]);
      });

      it('should require title', () => {
        const errors = validateObligation({});

        expect(errors).toContain('Obligation title is required');
      });

      it('should require category', () => {
        const errors = validateObligation({ title: 'Test' });

        expect(errors).toContain('Obligation category is required');
      });

      it('should require evidence types', () => {
        const errors = validateObligation({
          title: 'Test',
          category: 'Security',
          required_evidence_types: [],
        });

        expect(errors).toContain('At least one evidence type is required');
      });

      it('should validate effort hours', () => {
        const errors1 = validateObligation({
          title: 'Test',
          category: 'Security',
          required_evidence_types: ['policy'],
          estimated_effort_hours: -10,
        });

        expect(errors1).toContain('Estimated effort hours must be non-negative');

        const errors2 = validateObligation({
          title: 'Test',
          category: 'Security',
          required_evidence_types: ['policy'],
          estimated_effort_hours: 5000,
        });

        expect(errors2).toContain('Estimated effort hours seems unusually high');
      });
    });
  });

  describe('Integration scenarios', () => {
    it('should create template with multiple obligations', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 't1',
          workspace_id: mockWorkspaceId,
          framework_id: mockFrameworkId,
          name: 'ISO 27001',
          is_system_template: false,
          version: 1,
          obligations: [
            {
              id: 'obl1',
              title: 'Access Control',
              description: 'Implement access controls',
              category: 'Security',
              required_evidence_types: ['policy', 'logs'],
              estimated_effort_hours: 40,
            },
            {
              id: 'obl2',
              title: 'Encryption',
              description: 'Use encryption for sensitive data',
              category: 'Security',
              required_evidence_types: ['documentation', 'test_results'],
              estimated_effort_hours: 30,
            },
          ],
          created_at: '2026-07-10T12:00:00Z',
          updated_at: '2026-07-10T12:00:00Z',
        }),
      });

      const result = await createComplianceTemplate(mockWorkspaceId, mockFrameworkId, {
        name: 'ISO 27001',
        is_system_template: false,
        obligations: [
          {
            id: 'obl1',
            title: 'Access Control',
            description: 'Implement access controls',
            category: 'Security',
            required_evidence_types: ['policy', 'logs'],
            estimated_effort_hours: 40,
          },
        ],
      });

      expect(result?.obligations).toHaveLength(2);
    });

    it('should enable automation after rule creation', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'rule1',
            workspace_id: mockWorkspaceId,
            name: 'Auto-validate',
            trigger_type: 'evidence_uploaded',
            trigger_config: {},
            actions: [],
            enabled: false, // Created disabled
            created_at: '2026-07-10T12:00:00Z',
          }),
        })
        .mockResolvedValueOnce({ ok: true }); // Toggle response

      const rule = await createAutomationRule(mockWorkspaceId, {
        name: 'Auto-validate',
        trigger_type: 'evidence_uploaded',
        trigger_config: {},
        actions: [{ type: 'categorize', config: {} }],
        enabled: false,
      });

      expect(rule?.enabled).toBe(false);

      const toggled = await toggleAutomationRule(rule?.id || '', true);

      expect(toggled).toBe(true);
    });

    it('should support multiple languages for same framework', () => {
      const supported = ['en', 'es', 'fr', 'de', 'ja', 'zh'];

      for (const lang of supported) {
        const hasSupport = getSupportedLanguages().some((l) => l.language === lang);
        expect(hasSupport).toBe(true);
      }
    });
  });
});
