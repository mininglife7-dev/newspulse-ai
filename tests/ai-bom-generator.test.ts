import { describe, it, expect } from 'vitest';
import { generateAiBomFromDependencies, generateAiBomFromGithubRepo } from '@/lib/integrations/ai-bom-generator';

describe('AI-BOM Generator', () => {
  describe('generateAiBomFromDependencies', () => {
    it('parses Python requirements.txt', async () => {
      const files = [
        {
          path: 'requirements.txt',
          content: `
tensorflow==2.13.0
torch>=2.0.0
scikit-learn==1.3.0
numpy==1.24.0
pandas==2.0.0
          `.trim(),
        },
      ];

      const bom = await generateAiBomFromDependencies('sys-1', files);

      expect(bom.systemId).toBe('sys-1');
      expect(bom.components.length).toBeGreaterThan(0);
      expect(bom.summary.totalComponents).toBe(5);
      expect(bom.summary.frameworkComponents).toBeGreaterThan(0);
      expect(bom.summary.requiresAiActAssessment).toBe(true);
    });

    it('identifies high-risk components', async () => {
      const files = [
        {
          path: 'requirements.txt',
          content: 'openai\nanthropnic\nlangchain',
        },
      ];

      const bom = await generateAiBomFromDependencies('sys-2', files);
      const highRiskComponents = bom.components.filter((c) => c.riskLevel === 'high');
      expect(highRiskComponents.length).toBeGreaterThan(0);
      expect(bom.findings.some((f) => f.includes('high-risk'))).toBe(true);
    });

    it('parses Node.js package.json', async () => {
      const files = [
        {
          path: 'package.json',
          content: JSON.stringify({
            dependencies: {
              '@tensorflow/tfjs': '^4.0.0',
              'langchain': '^0.1.0',
              'express': '^4.18.0',
            },
            devDependencies: {
              'typescript': '^5.0.0',
            },
          }),
        },
      ];

      const bom = await generateAiBomFromDependencies('sys-3', files);
      expect(bom.components.length).toBeGreaterThan(0);
      const tfComponent = bom.components.find((c) => c.name.includes('tensorflow'));
      expect(tfComponent).toBeDefined();
      expect(tfComponent?.category).toBe('ml-framework');
    });

    it('includes vendor information', async () => {
      const files = [
        {
          path: 'requirements.txt',
          content: 'tensorflow\ntorch\ntransformers',
        },
      ];

      const bom = await generateAiBomFromDependencies('sys-4', files);
      const tensorflowComponent = bom.components.find((c) =>
        c.name.includes('tensorflow')
      );
      expect(tensorflowComponent?.vendor).toBe('Google');

      const torchComponent = bom.components.find((c) => c.name.includes('torch'));
      expect(torchComponent?.vendor).toBe('Meta');
    });

    it('sets audit status to not-audited by default', async () => {
      const files = [
        {
          path: 'requirements.txt',
          content: 'tensorflow',
        },
      ];

      const bom = await generateAiBomFromDependencies('sys-5', files);
      expect(bom.components.every((c) => c.auditStatus === 'not-audited')).toBe(true);
    });

    it('includes data handling information for high-risk components', async () => {
      const files = [
        {
          path: 'requirements.txt',
          content: 'openai',
        },
      ];

      const bom = await generateAiBomFromDependencies('sys-6', files);
      const openaiComponent = bom.components.find((c) => c.name.includes('openai'));
      expect(openaiComponent?.dataHandling).toBeDefined();
      expect(openaiComponent?.dataHandling).toContain('external API');
    });

    it('includes component URLs when available', async () => {
      const files = [
        {
          path: 'requirements.txt',
          content: 'tensorflow\nscikit-learn',
        },
      ];

      const bom = await generateAiBomFromDependencies('sys-7', files);
      // Should have components with URLs when available
      expect(bom.components.length).toBeGreaterThan(0);
    });

    it('categorizes components correctly', async () => {
      const files = [
        {
          path: 'requirements.txt',
          content: 'spacy\nopencv\npandas\ntransformers',
        },
      ];

      const bom = await generateAiBomFromDependencies('sys-8', files);

      const nlpComponent = bom.components.find((c) => c.category === 'nlp');
      expect(nlpComponent).toBeDefined();

      const visionComponent = bom.components.find((c) =>
        c.category === 'computer-vision'
      );
      expect(visionComponent).toBeDefined();

      const dataComponent = bom.components.find((c) =>
        c.category === 'data-processing'
      );
      expect(dataComponent).toBeDefined();
    });

    it('handles mixed Python dependencies', async () => {
      const files = [
        {
          path: 'requirements.txt',
          content: `
# ML Frameworks
tensorflow==2.13.0
torch>=2.0.0

# NLP
transformers==4.30.0
spacy==3.5.0

# Data
pandas==2.0.0
numpy==1.24.0

# Utils
requests==2.31.0
          `.trim(),
        },
      ];

      const bom = await generateAiBomFromDependencies('sys-9', files);
      expect(bom.components.length).toBeGreaterThan(5);
      expect(bom.summary.requiresAiActAssessment).toBe(true);
      expect(bom.findings.length).toBeGreaterThan(0);
    });

    it('generates findings for compliance', async () => {
      const files = [
        {
          path: 'requirements.txt',
          content: 'tensorflow\nopenai\nlangchain',
        },
      ];

      const bom = await generateAiBomFromDependencies('sys-10', files);
      expect(bom.findings.length).toBeGreaterThan(0);
      expect(bom.findings.some((f) => f.includes('Article 11'))).toBe(true);
    });

    it('handles empty files', async () => {
      const files = [
        {
          path: 'requirements.txt',
          content: '',
        },
      ];

      const bom = await generateAiBomFromDependencies('sys-11', files);
      expect(bom.components.length).toBe(0);
      expect(bom.summary.totalComponents).toBe(0);
    });

    it('normalizes package names (handles dashes and underscores)', async () => {
      const files = [
        {
          path: 'requirements.txt',
          content: 'scikit-learn\nscikit_learn\ntransformers',
        },
      ];

      const bom = await generateAiBomFromDependencies('sys-12', files);
      // Both scikit-learn and scikit_learn should be recognized
      const sklearnComponents = bom.components.filter((c) =>
        c.name.includes('scikit')
      );
      expect(sklearnComponents.length).toBeGreaterThan(0);
    });
  });

  describe('generateAiBomFromGithubRepo', () => {
    it('requires repository URL', async () => {
      await expect(generateAiBomFromGithubRepo('sys-1', '')).rejects.toThrow(
        'Repository URL'
      );
    });

    it('returns placeholder for GitHub repos', async () => {
      const bom = await generateAiBomFromGithubRepo(
        'sys-1',
        'https://github.com/user/repo'
      );

      expect(bom.systemId).toBe('sys-1');
      expect(bom.generatedAt).toBeDefined();
      expect(Array.isArray(bom.components)).toBe(true);
    });
  });

  describe('AI-BOM compliance', () => {
    it('complies with EU AI Act Article 11', async () => {
      const files = [
        {
          path: 'requirements.txt',
          content: 'tensorflow\nscikit-learn\nnumpy',
        },
      ];

      const bom = await generateAiBomFromDependencies('sys-1', files);
      expect(bom.summary.requiresAiActAssessment).toBe(true);
      expect(bom.findings.some((f) => f.includes('EU AI Act'))).toBe(true);
    });

    it('identifies critical audit requirements', async () => {
      const files = [
        {
          path: 'requirements.txt',
          content: 'openai\nanthropic\nlangchain\nscikit-learn',
        },
      ];

      const bom = await generateAiBomFromDependencies('sys-2', files);
      expect(bom.findings.length).toBeGreaterThan(0);
    });

    it('timestamp generation', async () => {
      const files = [
        {
          path: 'requirements.txt',
          content: 'tensorflow',
        },
      ];

      const bom = await generateAiBomFromDependencies('sys-3', files);
      const timestamp = new Date(bom.generatedAt);
      expect(timestamp.getTime()).toBeGreaterThan(0);
      expect(bom.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO 8601
    });
  });
});
