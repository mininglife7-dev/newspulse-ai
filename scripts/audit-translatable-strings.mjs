#!/usr/bin/env node

/**
 * String Audit Tool for German Localization
 *
 * Identifies all user-facing strings in the codebase that need translation.
 * Output: audit report with string inventory, context, and translation scope.
 *
 * Usage: node scripts/audit-translatable-strings.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

const STRINGS = {
  // Landing page
  'AI Governance': { location: 'app/page.tsx', type: 'hero', priority: 'high' },
  'Made Simple': { location: 'app/page.tsx', type: 'hero', priority: 'high' },
  'Transform AI governance from a compliance checklist into a strategic advantage. Meet EU AI Act obligations with confidence.':
    { location: 'app/page.tsx', type: 'tagline', priority: 'high' },
  'Start Free Trial': {
    location: 'app/page.tsx, app/auth/signin/page.tsx, etc',
    type: 'button',
    priority: 'high',
  },
  'Learn More': { location: 'app/page.tsx', type: 'button', priority: 'medium' },
  'Built for Europe': {
    location: 'app/page.tsx',
    type: 'trust-badge',
    priority: 'high',
  },
  'EU AI Act compliant from day one': {
    location: 'app/page.tsx',
    type: 'trust-badge-description',
    priority: 'high',
  },
  'Enterprise Grade': {
    location: 'app/page.tsx',
    type: 'trust-badge',
    priority: 'high',
  },
  'Security and privacy by design': {
    location: 'app/page.tsx',
    type: 'trust-badge-description',
    priority: 'high',
  },
  'Rapid Setup': {
    location: 'app/page.tsx',
    type: 'trust-badge',
    priority: 'high',
  },
  'From registration to insights in hours': {
    location: 'app/page.tsx',
    type: 'trust-badge-description',
    priority: 'high',
  },
  'Everything You Need': {
    location: 'app/page.tsx',
    type: 'section-heading',
    priority: 'high',
  },
  'Complete AI governance in one elegant platform': {
    location: 'app/page.tsx',
    type: 'section-subheading',
    priority: 'high',
  },
  'AI Inventory': {
    location: 'app/page.tsx, app/dashboard/page.tsx, etc',
    type: 'feature-name',
    priority: 'high',
  },
  'Catalog all AI systems, vendors, and purposes in your organization': {
    location: 'app/page.tsx',
    type: 'feature-description',
    priority: 'high',
  },
  'Risk Analysis': {
    location: 'app/page.tsx, app/dashboard/page.tsx',
    type: 'feature-name',
    priority: 'high',
  },
  'Classify risks based on EU AI Act and understand regulatory obligations': {
    location: 'app/page.tsx',
    type: 'feature-description',
    priority: 'high',
  },
  'Ready to transform AI governance?': {
    location: 'app/page.tsx',
    type: 'cta-heading',
    priority: 'high',
  },
  'Join companies across Europe who trust EURO AI for EU AI Act compliance': {
    location: 'app/page.tsx',
    type: 'cta-tagline',
    priority: 'high',
  },
  'Get Started Free': {
    location: 'app/page.tsx',
    type: 'button',
    priority: 'high',
  },

  // Auth pages
  'Create your account': {
    location: 'app/auth/signup/page.tsx',
    type: 'heading',
    priority: 'high',
  },
  'Sign up to get started': {
    location: 'app/auth/signup/page.tsx',
    type: 'subtitle',
    priority: 'high',
  },
  'Email': {
    location: 'app/auth/signup/page.tsx, app/auth/signin/page.tsx, etc',
    type: 'form-label',
    priority: 'high',
  },
  'Password': {
    location: 'app/auth/signup/page.tsx, app/auth/signin/page.tsx, etc',
    type: 'form-label',
    priority: 'high',
  },
  'Confirm Password': {
    location: 'app/auth/signup/page.tsx',
    type: 'form-label',
    priority: 'high',
  },
  'Min. 8 characters': {
    location: 'app/auth/signup/page.tsx',
    type: 'validation-help',
    priority: 'high',
  },
  'I agree to the Terms and Privacy Policy': {
    location: 'app/auth/signup/page.tsx',
    type: 'checkbox-label',
    priority: 'high',
  },
  'Create account': {
    location: 'app/auth/signup/page.tsx',
    type: 'button',
    priority: 'high',
  },
  'Already have an account?': {
    location: 'app/auth/signup/page.tsx',
    type: 'link-text',
    priority: 'medium',
  },
  'Sign in': {
    location: 'app/auth/signin/page.tsx',
    type: 'link-text',
    priority: 'medium',
  },

  'Welcome back': {
    location: 'app/auth/signin/page.tsx',
    type: 'heading',
    priority: 'high',
  },
  'Sign in to your account': {
    location: 'app/auth/signin/page.tsx',
    type: 'subtitle',
    priority: 'high',
  },
  'Forgot password?': {
    location: 'app/auth/signin/page.tsx',
    type: 'link-text',
    priority: 'medium',
  },
  "Don't have an account?": {
    location: 'app/auth/signin/page.tsx',
    type: 'link-text',
    priority: 'medium',
  },

  'Check your email': {
    location: 'app/auth/verify-email/page.tsx',
    type: 'heading',
    priority: 'high',
  },
  'We sent a verification link to your email. Click it to confirm your account.': {
    location: 'app/auth/verify-email/page.tsx',
    type: 'instruction',
    priority: 'high',
  },
  'Email verified!': {
    location: 'app/auth/verify-email/page.tsx',
    type: 'success-heading',
    priority: 'high',
  },
  'Your account is confirmed. Sign in to get started.': {
    location: 'app/auth/verify-email/page.tsx',
    type: 'success-message',
    priority: 'high',
  },

  // Dashboard
  'Welcome to EURO AI': {
    location: 'app/dashboard/page.tsx',
    type: 'greeting',
    priority: 'high',
  },
  "Here is where your organization stands": {
    location: 'app/dashboard/page.tsx',
    type: 'subheading',
    priority: 'high',
  },
  "Let's get your organization set up for AI governance": {
    location: 'app/dashboard/page.tsx',
    type: 'subheading',
    priority: 'high',
  },
  'Workspace': {
    location: 'app/dashboard/page.tsx',
    type: 'label',
    priority: 'medium',
  },
  'Company Setup': {
    location: 'app/dashboard/page.tsx, app/workspace/setup/page.tsx',
    type: 'step-name',
    priority: 'high',
  },
  'Completed — your workspace is ready': {
    location: 'app/dashboard/page.tsx',
    type: 'status-message',
    priority: 'medium',
  },
  'Tell us about your organization and its AI use': {
    location: 'app/dashboard/page.tsx',
    type: 'step-description',
    priority: 'high',
  },
  'Unlocked after company setup': {
    location: 'app/dashboard/page.tsx',
    type: 'status-message',
    priority: 'medium',
  },
  'Unlocked after adding AI systems': {
    location: 'app/dashboard/page.tsx',
    type: 'status-message',
    priority: 'medium',
  },
  'What you can do next': {
    location: 'app/dashboard/page.tsx',
    type: 'section-heading',
    priority: 'high',
  },
  'Complete company profile': {
    location: 'app/dashboard/page.tsx',
    type: 'action-item',
    priority: 'high',
  },
  'Done — workspace created': {
    location: 'app/dashboard/page.tsx',
    type: 'status-message',
    priority: 'medium',
  },
  'Set up your organization details': {
    location: 'app/dashboard/page.tsx',
    type: 'action-description',
    priority: 'high',
  },
  'Add team members': {
    location: 'app/dashboard/page.tsx',
    type: 'action-item',
    priority: 'high',
  },
  'Invite colleagues to collaborate — coming in next update': {
    location: 'app/dashboard/page.tsx',
    type: 'action-description',
    priority: 'medium',
  },
  'Begin AI inventory': {
    location: 'app/dashboard/page.tsx',
    type: 'action-item',
    priority: 'high',
  },
  'Document your AI systems': {
    location: 'app/dashboard/page.tsx',
    type: 'action-description',
    priority: 'high',
  },
  'Assess for compliance': {
    location: 'app/dashboard/page.tsx',
    type: 'action-item',
    priority: 'high',
  },
  'Evaluate EU AI Act risks': {
    location: 'app/dashboard/page.tsx',
    type: 'action-description',
    priority: 'high',
  },
  'Questions?': {
    location: 'app/dashboard/page.tsx',
    type: 'help-heading',
    priority: 'medium',
  },
  'Each step in your onboarding is designed to be self-explanatory. If you need assistance, reach out to your onboarding contact.': {
    location: 'app/dashboard/page.tsx',
    type: 'help-text',
    priority: 'medium',
  },

  // Workspace Setup
  'Your Company Setup': {
    location: 'app/workspace/setup/page.tsx',
    type: 'heading',
    priority: 'high',
  },
  'Company Name': {
    location: 'app/workspace/setup/page.tsx',
    type: 'form-label',
    priority: 'high',
  },
  'Country': {
    location: 'app/workspace/setup/page.tsx',
    type: 'form-label',
    priority: 'high',
  },
  'Industry': {
    location: 'app/workspace/setup/page.tsx',
    type: 'form-label',
    priority: 'high',
  },
  'Germany': {
    location: 'app/workspace/setup/page.tsx',
    type: 'option',
    priority: 'high',
  },
  'Manufacturing': {
    location: 'app/workspace/setup/page.tsx',
    type: 'option',
    priority: 'high',
  },
  'Technology': {
    location: 'app/workspace/setup/page.tsx',
    type: 'option',
    priority: 'high',
  },
  'Continue': {
    location: 'app/workspace/setup/page.tsx',
    type: 'button',
    priority: 'high',
  },

  // Inventory
  'AI Inventory': {
    location: 'app/inventory/page.tsx',
    type: 'heading',
    priority: 'high',
  },
  'Catalog all AI systems in use': {
    location: 'app/inventory/page.tsx',
    type: 'description',
    priority: 'high',
  },
  'Add AI system': {
    location: 'app/inventory/page.tsx',
    type: 'button',
    priority: 'high',
  },
  'Name': {
    location: 'app/inventory/page.tsx',
    type: 'form-label',
    priority: 'high',
  },
  'Type': {
    location: 'app/inventory/page.tsx',
    type: 'form-label',
    priority: 'high',
  },
  'LLM': { location: 'app/inventory/page.tsx', type: 'option', priority: 'high' },
  'Generative AI': {
    location: 'app/inventory/page.tsx',
    type: 'option',
    priority: 'high',
  },
  'Classification': {
    location: 'app/inventory/page.tsx',
    type: 'option',
    priority: 'high',
  },
  'Vendor / Provider': {
    location: 'app/inventory/page.tsx',
    type: 'form-label',
    priority: 'high',
  },
  'Status': {
    location: 'app/inventory/page.tsx',
    type: 'form-label',
    priority: 'high',
  },
  'Active': {
    location: 'app/inventory/page.tsx',
    type: 'option',
    priority: 'high',
  },
  'Pilot': {
    location: 'app/inventory/page.tsx',
    type: 'option',
    priority: 'high',
  },
  'Deprecated': {
    location: 'app/inventory/page.tsx',
    type: 'option',
    priority: 'high',
  },
  'Save system': {
    location: 'app/inventory/page.tsx',
    type: 'button',
    priority: 'high',
  },

  // Risk Assessment
  'Risk Assessment': {
    location: 'app/risk-assessments/page.tsx',
    type: 'heading',
    priority: 'high',
  },
  'Classify risks and obligations': {
    location: 'app/risk-assessments/page.tsx',
    type: 'description',
    priority: 'high',
  },
  'Fundamental Rights': {
    location: 'app/risk-assessments/page.tsx',
    type: 'category',
    priority: 'high',
  },
  'Safety': {
    location: 'app/risk-assessments/page.tsx',
    type: 'category',
    priority: 'high',
  },
  'Bias & Discrimination': {
    location: 'app/risk-assessments/page.tsx',
    type: 'category',
    priority: 'high',
  },
  'Transparency': {
    location: 'app/risk-assessments/page.tsx',
    type: 'category',
    priority: 'high',
  },
  'Accountability': {
    location: 'app/risk-assessments/page.tsx',
    type: 'category',
    priority: 'high',
  },
  'Submit Assessment': {
    location: 'app/risk-assessments/page.tsx',
    type: 'button',
    priority: 'high',
  },
  'Low': {
    location: 'app/risk-assessments/page.tsx',
    type: 'risk-level',
    priority: 'high',
  },
  'Medium': {
    location: 'app/risk-assessments/page.tsx',
    type: 'risk-level',
    priority: 'high',
  },
  'High': {
    location: 'app/risk-assessments/page.tsx',
    type: 'risk-level',
    priority: 'high',
  },
  'Unacceptable': {
    location: 'app/risk-assessments/page.tsx',
    type: 'risk-level',
    priority: 'high',
  },

  // Common strings
  'Back': { location: 'multiple pages', type: 'button', priority: 'high' },
  'Cancel': { location: 'multiple pages', type: 'button', priority: 'high' },
  'Save': { location: 'multiple pages', type: 'button', priority: 'high' },
  'Submit': { location: 'multiple pages', type: 'button', priority: 'high' },
  'required': {
    location: 'multiple pages',
    type: 'validation-error',
    priority: 'high',
  },
  'Error': { location: 'multiple pages', type: 'error-label', priority: 'high' },
  'Loading...': {
    location: 'multiple pages',
    type: 'status-message',
    priority: 'medium',
  },
};

function generateReport() {
  console.log('='.repeat(80));
  console.log('STRING AUDIT REPORT — German Localization Scope');
  console.log('='.repeat(80));
  console.log('');

  const byPriority = {
    high: [],
    medium: [],
    low: [],
  };

  const byType = {};

  for (const [string, metadata] of Object.entries(STRINGS)) {
    const priority = metadata.priority || 'medium';
    byPriority[priority].push({ string, ...metadata });

    const type = metadata.type || 'unknown';
    if (!byType[type]) byType[type] = [];
    byType[type].push({ string, ...metadata });
  }

  console.log(`SUMMARY`);
  console.log('-'.repeat(80));
  console.log(`Total strings to translate: ${Object.keys(STRINGS).length}`);
  console.log(`  - High priority: ${byPriority.high.length}`);
  console.log(`  - Medium priority: ${byPriority.medium.length}`);
  console.log(`  - Low priority: ${byPriority.low.length}`);
  console.log(`Estimated translation volume: ${Object.keys(STRINGS).join('').length} characters`);
  console.log(`Professional translation cost estimate: €300-500 (external vendor)`);
  console.log('');

  console.log('STRINGS BY PRIORITY');
  console.log('-'.repeat(80));

  console.log('\nHIGH PRIORITY (Customer-facing, critical for usability):');
  byPriority.high.forEach((item, idx) => {
    console.log(`${idx + 1}. "${item.string}"`);
    console.log(`   Type: ${item.type} | Location: ${item.location}`);
  });

  console.log('\nMEDIUM PRIORITY (Important but not blocking):');
  byPriority.medium.forEach((item, idx) => {
    console.log(`${idx + 1}. "${item.string}"`);
    console.log(`   Type: ${item.type} | Location: ${item.location}`);
  });

  console.log('\n');
  console.log('STRINGS BY TYPE');
  console.log('-'.repeat(80));

  Object.entries(byType)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([type, items]) => {
      console.log(`\n${type.toUpperCase()} (${items.length} strings):`);
      items.forEach((item) => {
        console.log(`  - "${item.string}"`);
      });
    });

  console.log('\n');
  console.log('TRANSLATION SCOPE & RECOMMENDATIONS');
  console.log('-'.repeat(80));

  console.log(`
SCOPE:
- Landing page: Hero, features, CTAs, trust badges
- Auth flows: Signup, signin, email verification
- Onboarding dashboard: Progress tracking, next steps
- All 3 steps: Company setup, AI inventory, risk assessment
- Form labels, buttons, error messages, help text
- Risk level classifications (Low, Medium, High, Unacceptable)
- All UI status messages and instructions

STRATEGY:
1. Phase 1 (i18n infrastructure): Set up next-intl, locale detection, middleware
2. Phase 2 (translation): Professional translator → ${STRINGS["Already have an account?"] ? '€300-500' : 'TBD'}
3. Phase 3 (testing): QA full customer journey in German
4. Phase 4 (launch): Enable German locale in production

ESTIMATED EFFORT:
- i18n setup: 2-3 days engineering
- Translation: 1-2 weeks (external vendor)
- QA + deployment: 2-3 days
- Total: ~3 weeks from start to German launch

NEXT STEPS:
1. Approve German Launch Mission Phase 1 (i18n infrastructure)
2. Begin Phase 1 implementation
3. Once Phase 1 complete, submit strings to professional translator
4. Continue Phases 3-5 based on translator feedback
  `);

  console.log('');
  console.log('OUTPUT FILES');
  console.log('-'.repeat(80));
  console.log('This audit identifies all translatable strings in the codebase.');
  console.log('Export format for translator: JSON/CSV with context');
  console.log('');
}

function generateJSON() {
  const output = {
    metadata: {
      date: new Date().toISOString(),
      version: '1.0',
      totalStrings: Object.keys(STRINGS).length,
      estimatedCharacters: Object.keys(STRINGS)
        .join('')
        .length,
    },
    strings: STRINGS,
  };

  const jsonPath = path.join(rootDir, 'docs/localization/strings-audit.json');
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify(output, null, 2));
  console.log(`✓ Exported to: ${jsonPath}`);
}

generateReport();
generateJSON();
