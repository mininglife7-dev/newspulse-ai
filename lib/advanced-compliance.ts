/**
 * DNA-GOV-016: Advanced Compliance Features
 *
 * Custom templates, workflow automation, multi-language support, external integrations.
 *
 * Purpose: Extend platform capabilities for enterprise customers.
 */

export type TriggerType = 'evidence_uploaded' | 'assessment_status_changed' | 'obligation_created';
export type ActionType = 'categorize' | 'validate' | 'notify' | 'escalate';
export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';

export interface ComplianceTemplate {
  id: string;
  workspace_id: string;
  framework_id: string;
  name: string;
  description?: string;
  is_system_template: boolean;
  version: number;
  obligations: TemplateObligation[];
  created_at: string;
  updated_at: string;
}

export interface TemplateObligation {
  id: string;
  title: string;
  description: string;
  category: string;
  required_evidence_types: string[];
  estimated_effort_hours: number;
}

export interface AutomationRule {
  id: string;
  workspace_id: string;
  name: string;
  trigger_type: TriggerType;
  trigger_config: Record<string, any>;
  actions: AutomationAction[];
  enabled: boolean;
  created_at: string;
}

export interface AutomationAction {
  type: ActionType;
  config: Record<string, any>;
}

export interface AutomationExecution {
  id: string;
  rule_id: string;
  triggered_by: string;
  status: 'success' | 'failure';
  error_message?: string;
  executed_at: string;
}

export interface LocalizationConfig {
  language: string; // e.g., 'en', 'es', 'fr', 'de', 'ja', 'zh'
  region?: string; // e.g., 'US', 'EU', 'UK', 'APAC'
  compliance_nuances: Record<string, string>; // Framework-specific localization
}

/**
 * Create custom compliance template
 */
export async function createComplianceTemplate(
  workspaceId: string,
  frameworkId: string,
  template: Omit<ComplianceTemplate, 'id' | 'workspace_id' | 'framework_id' | 'version' | 'created_at' | 'updated_at'>
): Promise<ComplianceTemplate | null> {
  try {
    const response = await fetch('/api/compliance/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspace_id: workspaceId,
        framework_id: frameworkId,
        ...template,
      }),
    });

    if (!response.ok) return null;

    return response.json();
  } catch (err) {
    console.error('[advanced-compliance] Failed to create template:', err);
    return null;
  }
}

/**
 * Get compliance template
 */
export async function getComplianceTemplate(
  templateId: string
): Promise<ComplianceTemplate | null> {
  try {
    const response = await fetch(`/api/compliance/templates/${templateId}`);

    if (!response.ok) return null;

    return response.json();
  } catch (err) {
    console.error('[advanced-compliance] Failed to get template:', err);
    return null;
  }
}

/**
 * List templates for workspace
 */
export async function listComplianceTemplates(
  workspaceId: string
): Promise<ComplianceTemplate[]> {
  try {
    const response = await fetch(`/api/compliance/templates?workspace_id=${workspaceId}`);

    if (!response.ok) return [];

    return response.json();
  } catch (err) {
    console.error('[advanced-compliance] Failed to list templates:', err);
    return [];
  }
}

/**
 * Create automation rule
 */
export async function createAutomationRule(
  workspaceId: string,
  rule: Omit<AutomationRule, 'id' | 'workspace_id' | 'created_at'>
): Promise<AutomationRule | null> {
  try {
    const response = await fetch('/api/compliance/automation-rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspace_id: workspaceId,
        ...rule,
      }),
    });

    if (!response.ok) return null;

    return response.json();
  } catch (err) {
    console.error('[advanced-compliance] Failed to create automation rule:', err);
    return null;
  }
}

/**
 * Get automation rule
 */
export async function getAutomationRule(ruleId: string): Promise<AutomationRule | null> {
  try {
    const response = await fetch(`/api/compliance/automation-rules/${ruleId}`);

    if (!response.ok) return null;

    return response.json();
  } catch (err) {
    console.error('[advanced-compliance] Failed to get automation rule:', err);
    return null;
  }
}

/**
 * List automation rules for workspace
 */
export async function listAutomationRules(workspaceId: string): Promise<AutomationRule[]> {
  try {
    const response = await fetch(`/api/compliance/automation-rules?workspace_id=${workspaceId}`);

    if (!response.ok) return [];

    return response.json();
  } catch (err) {
    console.error('[advanced-compliance] Failed to list automation rules:', err);
    return [];
  }
}

/**
 * Toggle automation rule enabled state
 */
export async function toggleAutomationRule(ruleId: string, enabled: boolean): Promise<boolean> {
  try {
    const response = await fetch(`/api/compliance/automation-rules/${ruleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });

    return response.ok;
  } catch (err) {
    console.error('[advanced-compliance] Failed to toggle automation rule:', err);
    return false;
  }
}

/**
 * Generate localized compliance report
 */
export async function generateLocalizedReport(
  assessmentId: string,
  language: string,
  region?: string
): Promise<Blob | null> {
  try {
    const params = new URLSearchParams({ language });
    if (region) params.append('region', region);

    const response = await fetch(
      `/api/compliance/reports/${assessmentId}/generate?${params}`,
      {
        method: 'POST',
      }
    );

    if (!response.ok) return null;

    return response.blob();
  } catch (err) {
    console.error('[advanced-compliance] Failed to generate report:', err);
    return null;
  }
}

/**
 * Validate automation rule configuration
 */
export function validateAutomationRule(rule: Partial<AutomationRule>): string[] {
  const errors: string[] = [];

  if (!rule.name || rule.name.trim() === '') {
    errors.push('Rule name is required');
  }

  if (!rule.trigger_type) {
    errors.push('Trigger type is required');
  }

  if (!rule.actions || rule.actions.length === 0) {
    errors.push('At least one action is required');
  }

  if (rule.actions) {
    for (const action of rule.actions) {
      if (!action.type) {
        errors.push('Action type is required');
      }
      if (!action.config || Object.keys(action.config).length === 0) {
        errors.push('Action config cannot be empty');
      }
    }
  }

  return errors;
}

/**
 * Validate template obligation
 */
export function validateObligation(obligation: Partial<TemplateObligation>): string[] {
  const errors: string[] = [];

  if (!obligation.title || obligation.title.trim() === '') {
    errors.push('Obligation title is required');
  }

  if (!obligation.category || obligation.category.trim() === '') {
    errors.push('Obligation category is required');
  }

  if (!obligation.required_evidence_types || obligation.required_evidence_types.length === 0) {
    errors.push('At least one evidence type is required');
  }

  if (obligation.estimated_effort_hours !== undefined) {
    if (obligation.estimated_effort_hours < 0) {
      errors.push('Estimated effort hours must be non-negative');
    }
    if (obligation.estimated_effort_hours > 1000) {
      errors.push('Estimated effort hours seems unusually high');
    }
  }

  return errors;
}

/**
 * Get supported languages for compliance reports
 */
export function getSupportedLanguages(): LocalizationConfig[] {
  return [
    { language: 'en', region: 'US', compliance_nuances: { gdpr_scope: 'N/A' } },
    { language: 'en', region: 'UK', compliance_nuances: { gdpr_scope: 'Applies to UK businesses' } },
    { language: 'en', region: 'EU', compliance_nuances: { gdpr_scope: 'Applies - full compliance required' } },
    { language: 'es', region: 'EU', compliance_nuances: { gdpr_scope: 'Applies - full compliance required' } },
    { language: 'fr', region: 'EU', compliance_nuances: { gdpr_scope: 'Applies - full compliance required' } },
    { language: 'de', region: 'EU', compliance_nuances: { gdpr_scope: 'Applies - full compliance required' } },
    { language: 'ja', region: 'APAC', compliance_nuances: { appi_scope: 'Applies if handling Japanese personal data' } },
    { language: 'zh', region: 'APAC', compliance_nuances: { pdpa_scope: 'Applies if handling APAC personal data' } },
  ];
}

/**
 * Check if language is supported
 */
export function isLanguageSupported(language: string, region?: string): boolean {
  const supportedLanguages = getSupportedLanguages();
  return supportedLanguages.some((l) => l.language === language && (!region || l.region === region));
}
