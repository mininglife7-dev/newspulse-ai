#!/usr/bin/env node
/**
 * EURO AI Test Data Generator
 *
 * Generates realistic fictional German SME organizations for comprehensive
 * customer journey testing, scalability validation, and operational readiness.
 *
 * Usage: node scripts/test-data-generator.mjs [output-path] [count]
 *
 * This is an engineering-controlled test tool. No real customer data.
 */

import { randomInt, randomUUID } from 'crypto';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

const GERMAN_INDUSTRIES = [
  'Maschinenbau',
  'Automobilzulieferer',
  'Chemikalien & Kunststoffe',
  'Medizintechnik',
  'Elektrotechnik',
  'Lebensmittelverarbeitung',
  'Textilmanufaktur',
  'Metallbearbeitung',
  'Logistik & Transport',
  'Finanzdienstleistungen',
  'Versicherung',
  'Pharmazie',
  'Energie & Utilities',
  'Recycling & Entsorgung',
  'Holzbearbeitung',
  'Möbelherstellung',
  'Keramik & Glas',
  'Papierindustrie',
  'Verpackungsmaterial',
  'Schienenfahrzeuge',
  'Marineausrüstung',
  'Luftfahrtkomponenten',
  'Präzisionswerkzeuge',
  'Optik & Feinmechanik',
  'Landwirtschaftliche Geräte',
];

const GERMAN_CITIES = [
  'Berlin', 'Munich', 'Hamburg', 'Cologne', 'Frankfurt',
  'Stuttgart', 'Düsseldorf', 'Dortmund', 'Essen', 'Leipzig',
  'Hannover', 'Dresden', 'Nuremberg', 'Duisburg', 'Bochum',
  'Wuppertal', 'Bielefeld', 'Bonn', 'Münster', 'Karlsruhe',
  'Mannheim', 'Augsburg', 'Wiesbaden', 'Gelsenkirchen', 'Mönchengladbach',
  'Braunschweig', 'Chemnitz', 'Kiel', 'Aachen', 'Rostock',
  'Lübeck', 'Oldenburg', 'Leverkusen', 'Osnabrück', 'Heidelberg',
  'Göttingen', 'Recklinghausen', 'Freiburg', 'Mainz', 'Trierarch',
];

const DEPARTMENT_TEMPLATES = {
  'Maschinenbau': [
    'Forschung & Entwicklung',
    'Produktion',
    'Qualitätssicherung',
    'Konstruktion',
    'Fertigungsplanung',
    'Materialwirtschaft',
    'Vertrieb',
    'Kundenservice',
  ],
  'Finanzdienstleistungen': [
    'Compliance & Regulierung',
    'Risikomanagement',
    'Datenschutz',
    'Revision',
    'IT-Sicherheit',
    'Vertrieb',
    'Backoffice',
    'Kundendienst',
  ],
  'Pharmazie': [
    'Forschung & Entwicklung',
    'Klinische Studien',
    'Regulatory Affairs',
    'Qualitätssicherung',
    'Produktion',
    'Pharmacovigilance',
    'Vertrieb',
    'Medical Affairs',
  ],
  'default': [
    'Geschäftsführung',
    'Finanzen & Controlling',
    'Personal & Entwicklung',
    'IT & Digitalisierung',
    'Qualitätsmanagement',
    'Produktion/Betrieb',
    'Vertrieb & Marketing',
    'Kundenservice',
  ],
};

const AI_SYSTEM_TYPES = [
  { name: 'Document Classification', risk: 'Low', description: 'Automated categorization of incoming documents' },
  { name: 'Predictive Analytics', risk: 'Medium', description: 'Forecasting business metrics and trends' },
  { name: 'Customer Segmentation', risk: 'Medium', description: 'AI-driven customer clustering and profiling' },
  { name: 'Chatbot/Virtual Assistant', risk: 'Low', description: 'Customer-facing conversational AI' },
  { name: 'Process Automation', risk: 'Low', description: 'RPA and workflow automation' },
  { name: 'Computer Vision', risk: 'Medium', description: 'Image and video analysis for quality control' },
  { name: 'Recruitment Analytics', risk: 'High', description: 'AI-assisted hiring and candidate evaluation' },
  { name: 'Credit Risk Assessment', risk: 'High', description: 'Lending decision support' },
  { name: 'Employee Monitoring', risk: 'High', description: 'Workplace surveillance and productivity tracking' },
  { name: 'Price Optimization', risk: 'Medium', description: 'Dynamic pricing algorithms' },
  { name: 'Fraud Detection', risk: 'Medium', description: 'Transaction and behavior anomaly detection' },
  { name: 'Content Recommendation', risk: 'Low', description: 'Personalized content and product suggestions' },
];

const COMPLIANCE_RISKS = [
  { name: 'Biometric Processing', prohibition: true, article: '10(1)' },
  { name: 'Real-time Remote Biometric ID', prohibition: true, article: '5(1)(d)' },
  { name: 'Emotion Recognition', prohibition: true, article: '5(1)(e)' },
  { name: 'Social Scoring', prohibition: true, article: '5(1)(f)' },
  { name: 'Fundamental Rights Impact', prohibition: false, article: '6(1)' },
  { name: 'Critical Infrastructure', prohibition: false, article: '6(2)' },
  { name: 'Law Enforcement', prohibition: false, article: '6(2)(a)' },
  { name: 'Migration/Border Control', prohibition: false, article: '6(2)(b)' },
];

/**
 * Generate a single realistic German SME organization
 */
function generateOrganization(index) {
  const industry = GERMAN_INDUSTRIES[randomInt(GERMAN_INDUSTRIES.length)];
  const city = GERMAN_CITIES[randomInt(GERMAN_CITIES.length)];
  const name = `${generateGermanCompanyName()} ${industry === 'default' ? 'GmbH' : 'AG'}`;
  const headcount = randomInt(20, 500);
  const foundedYear = randomInt(1980, 2015);

  return {
    id: randomUUID(),
    name,
    industry,
    city,
    country: 'Germany',
    founded: foundedYear,
    employeeCount: headcount,
    annualRevenue: `€${randomInt(1, 50)}M`,
    registrationNumber: generateGermanCompanyNumber(),
    taxId: generateGermanTaxId(),
    complianceProfile: generateComplianceProfile(industry),
    departments: generateDepartments(industry, headcount),
    users: generateUsers(headcount),
    aiSystems: generateAISystems(industry, headcount),
    policies: generatePolicies(industry),
    risks: generateRisks(industry),
    workflows: generateWorkflows(industry),
    auditTrail: [],
  };
}

/**
 * Generate realistic German company name
 */
function generateGermanCompanyName() {
  const prefixes = ['Global', 'Advanced', 'Integrated', 'Smart', 'Digital', 'Pro', 'Innovative', 'Next', 'Euro', 'Tech'];
  const suffixes = ['Solutions', 'Systems', 'Technologies', 'Services', 'Group', 'Partners', 'Works', 'Industries'];
  const middle = ['', 'Data', 'Process', 'Automation', 'Intelligence', 'Analytics'];

  const pick = (arr) => arr[randomInt(arr.length)];

  const parts = [pick(prefixes)];
  if (randomInt(0, 1)) {
    parts.push(pick(middle));
  }
  parts.push(pick(suffixes));

  return parts.filter(p => p).join(' ');
}

/**
 * Generate German company number (HRB)
 */
function generateGermanCompanyNumber() {
  return `HRB ${randomInt(100000, 999999)}`;
}

/**
 * Generate German tax ID (Steuernummer)
 */
function generateGermanTaxId() {
  const state = randomInt(10, 99);
  const district = randomInt(100, 999);
  const sequence = randomInt(10000, 99999);
  return `${state}${district}${sequence}`;
}


/**
 * Generate departments
 */
function generateDepartments(industry, headcount) {
  const templates = DEPARTMENT_TEMPLATES[industry] || DEPARTMENT_TEMPLATES['default'];
  const count = Math.ceil(headcount / 25); // ~25 people per dept

  return templates.slice(0, count).map((name) => ({
    id: randomUUID(),
    name,
    headCount: randomInt(5, 50),
    manager: randomUUID(),
  }));
}

/**
 * Generate users
 */
function generateUsers(headcount) {
  const count = Math.min(headcount, randomInt(15, 100));
  const roles = ['Administrator', 'Compliance Officer', 'Risk Manager', 'Audit Lead', 'Data Officer', 'Technical Lead'];

  return Array.from({ length: count }, (_, i) => ({
    id: randomUUID(),
    email: `user-${i}@test-org.de`,
    name: generateGermanName(),
    role: roles[randomInt(roles.length)],
    department: randomUUID(),
    createdAt: new Date(Date.now() - randomInt(30, 365) * 24 * 60 * 60 * 1000).toISOString(),
  }));
}

/**
 * Generate German name
 */
function generateGermanName() {
  const firstNames = ['Anna', 'Klaus', 'Maria', 'Hans', 'Petra', 'Wolfgang', 'Brigitte', 'Werner', 'Inge', 'Dieter'];
  const lastNames = ['Schmidt', 'Mueller', 'Weber', 'Becker', 'Schroeder', 'Fischer', 'Klein', 'Wolf', 'Keller', 'Neumann'];

  return `${firstNames[randomInt(firstNames.length)]} ${lastNames[randomInt(lastNames.length)]}`;
}

/**
 * Generate AI systems for the organization
 */
function generateAISystems(industry, headcount) {
  const count = randomInt(2, 8);

  return Array.from({ length: count }, (_, i) => {
    const systemType = AI_SYSTEM_TYPES[randomInt(AI_SYSTEM_TYPES.length)];
    const hasRisk = Math.random() > 0.7;

    return {
      id: randomUUID(),
      name: `${systemType.name} - ${i + 1}`,
      type: systemType.name,
      description: systemType.description,
      riskLevel: systemType.risk,
      deploymentDate: new Date(Date.now() - randomInt(90, 730) * 24 * 60 * 60 * 1000).toISOString(),
      owner: randomUUID(),
      hasProhibitedPractices: hasRisk,
      prohibitedPractices: hasRisk ? [COMPLIANCE_RISKS[randomInt(COMPLIANCE_RISKS.length)]] : [],
      assessmentStatus: ['Not Started', 'In Progress', 'Completed', 'Remediation'][randomInt(4)],
      complianceScore: randomInt(30, 100),
    };
  });
}

/**
 * Generate company policies
 */
function generatePolicies(industry) {
  return [
    { id: randomUUID(), name: 'AI Governance Policy', version: '1.0', lastUpdated: new Date().toISOString() },
    { id: randomUUID(), name: 'Data Protection Policy', version: '2.1', lastUpdated: new Date().toISOString() },
    { id: randomUUID(), name: 'Risk Assessment Procedure', version: '1.5', lastUpdated: new Date().toISOString() },
    { id: randomUUID(), name: 'Incident Response Plan', version: '1.0', lastUpdated: new Date().toISOString() },
    { id: randomUUID(), name: 'Third-Party AI Provider Audit Procedure', version: '1.0', lastUpdated: new Date().toISOString() },
  ];
}

/**
 * Generate organization-specific risks
 */
function generateRisks(industry) {
  const baseRisks = [
    { category: 'Transparency Gap', severity: 'High', status: 'Open' },
    { category: 'Inadequate Documentation', severity: 'High', status: 'Open' },
    { category: 'Insufficient Testing', severity: 'Medium', status: 'Open' },
    { category: 'Limited Audit Trail', severity: 'Medium', status: 'Open' },
    { category: 'Third-Party Dependency Risk', severity: 'Medium', status: 'Open' },
  ];

  if (industry === 'Finanzdienstleistungen' || industry === 'Versicherung') {
    baseRisks.push({ category: 'Discrimination Risk', severity: 'High', status: 'Open' });
  }
  if (industry === 'Pharmazie') {
    baseRisks.push({ category: 'Clinical Transparency Gap', severity: 'High', status: 'Open' });
  }

  return baseRisks;
}

/**
 * Generate realistic workflows
 */
function generateWorkflows(industry) {
  const baseWorkflows = [
    'Quarterly Compliance Review',
    'Incident Response & Remediation',
    'Annual Risk Assessment',
    'Evidence Collection & Documentation',
    'Third-Party AI Vendor Audit',
    'Policy Update & Distribution',
    'Team Training on AI Governance',
  ];

  if (industry === 'Finanzdienstleistungen') {
    baseWorkflows.push('Regulatory Filing & Reporting');
    baseWorkflows.push('Credit Risk Review');
  }

  return baseWorkflows;
}

/**
 * Generate realistic compliance profile
 */
function generateComplianceProfile(industry) {
  const profiles = {
    'Finanzdienstleistungen': {
      regulations: ['MiFID II', 'GDPR', 'AML/KYC', 'EU AI Act'],
      riskLevel: 'High',
      requiresExternalAudit: true,
      auditFrequency: 'Annual',
    },
    'Pharmazie': {
      regulations: ['GMP', 'Clinical Trial Regulations', 'GDPR', 'EU AI Act'],
      riskLevel: 'High',
      requiresExternalAudit: true,
      auditFrequency: 'Annual',
    },
    'Versicherung': {
      regulations: ['IDD', 'GDPR', 'AML/KYC', 'EU AI Act'],
      riskLevel: 'High',
      requiresExternalAudit: true,
      auditFrequency: 'Annual',
    },
    'Energie & Utilities': {
      regulations: ['Critical Infrastructure', 'GDPR', 'NIS Directive', 'EU AI Act'],
      riskLevel: 'High',
      requiresExternalAudit: true,
      auditFrequency: 'Annual',
    },
    'Maschinenbau': {
      regulations: ['Machinery Directive', 'Product Liability', 'GDPR', 'EU AI Act'],
      riskLevel: 'Medium',
      requiresExternalAudit: false,
      auditFrequency: null,
    },
    'default': {
      regulations: ['GDPR', 'EU AI Act'],
      riskLevel: 'Medium',
      requiresExternalAudit: false,
      auditFrequency: null,
    },
  };

  return profiles[industry] || profiles['default'];
}

/**
 * Main generation function
 */
function main() {
  const outputPath = process.argv[2] || 'test-data/organizations.json';
  const count = parseInt(process.argv[3] || '50', 10);

  console.log(`🔧 Generating ${count} fictional German SME organizations...`);

  const organizations = Array.from({ length: count }, (_, i) => {
    process.stdout.write(`\r  ✓ Generated ${i + 1}/${count}`);
    return generateOrganization(i);
  });

  console.log(`\n✅ Generated ${organizations.length} organizations`);

  // Ensure directory exists
  const dir = dirname(outputPath);
  mkdirSync(dir, { recursive: true });

  // Write to file
  writeFileSync(outputPath, JSON.stringify({
    version: '1.0',
    timestamp: new Date().toISOString(),
    purpose: 'EURO AI Test Lab - German SME Simulation',
    disclaimer: 'All organizations and individuals are fictional. No real customer data.',
    count: organizations.length,
    organizations,
  }, null, 2));

  console.log(`📁 Written to: ${outputPath}`);
  console.log(`📊 Summary:`);
  console.log(`   - Total organizations: ${organizations.length}`);
  console.log(`   - Industries represented: ${new Set(organizations.map(o => o.industry)).size}`);
  console.log(`   - Total simulated employees: ${organizations.reduce((sum, o) => sum + o.employeeCount, 0)}`);
  console.log(`   - Total simulated AI systems: ${organizations.reduce((sum, o) => sum + o.aiSystems.length, 0)}`);
  console.log(`   - Avg compliance score: ${Math.round(organizations.reduce((sum, o) => sum + (o.aiSystems.reduce((s, a) => s + a.complianceScore, 0) / o.aiSystems.length), 0) / organizations.length)}%`);
}

main().catch(console.error);
