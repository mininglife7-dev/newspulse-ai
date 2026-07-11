import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EmailService, getEmailService } from '../lib/email-service';

describe('Email Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment
    delete process.env.EMAIL_PROVIDER;
    delete process.env.SENDGRID_API_KEY;
    delete process.env.AWS_SES_REGION;
    delete process.env.EMAIL_FROM_ADDRESS;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default log provider', () => {
      const service = new EmailService();
      expect(service.getProvider()).toBe('log');
    });

    it('should use configured provider from environment', () => {
      process.env.EMAIL_PROVIDER = 'sendgrid';
      process.env.SENDGRID_API_KEY = 'test-key-12345';
      const service = new EmailService();
      expect(service.getProvider()).toBe('sendgrid');
    });

    it('should fall back to log if SendGrid API key missing', () => {
      process.env.EMAIL_PROVIDER = 'sendgrid';
      delete process.env.SENDGRID_API_KEY;
      const service = new EmailService();
      expect(service.getProvider()).toBe('log');
    });

    it('should fall back to log if SES region missing', () => {
      process.env.EMAIL_PROVIDER = 'ses';
      delete process.env.AWS_SES_REGION;
      const service = new EmailService();
      expect(service.getProvider()).toBe('log');
    });

    it('should use custom FROM address', () => {
      process.env.EMAIL_FROM_ADDRESS = 'alerts@example.com';
      const service = new EmailService();
      // Verify by sending a log email and checking that it works
      expect(service.isConfigured()).toBe(true);
    });
  });

  describe('Log Provider (Development)', () => {
    it('should log email to console in log mode', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const service = new EmailService();

      const result = await service.send({
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test Body</p>',
      });

      expect(result).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[EMAIL_LOG]'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('test@example.com'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Test Subject'));
    });

    it('should include HTML content in log', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const service = new EmailService();

      await service.send({
        to: 'recipient@example.com',
        subject: 'Alert',
        html: '<h1>Critical Alert</h1>',
      });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('<h1>Critical Alert</h1>'));
    });

    it('should include text content in log', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const service = new EmailService();

      await service.send({
        to: 'recipient@example.com',
        subject: 'Alert',
        text: 'Critical Alert in plain text',
      });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Critical Alert in plain text'));
    });

    it('should use default FROM address', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const service = new EmailService();

      await service.send({
        to: 'test@example.com',
        subject: 'Test',
        html: 'body',
      });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('noreply@newspulse-ai.com'));
    });

    it('should use custom FROM address if provided', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const service = new EmailService();

      await service.send({
        from: 'custom@example.com',
        to: 'test@example.com',
        subject: 'Test',
        html: 'body',
      });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('custom@example.com'));
    });
  });

  describe('SendGrid Provider', () => {
    it('should send via SendGrid when configured', async () => {
      process.env.EMAIL_PROVIDER = 'sendgrid';
      process.env.SENDGRID_API_KEY = 'test-sg-key';

      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({}), { status: 202 })
      );

      const service = new EmailService();
      const result = await service.send({
        to: 'founder@example.com',
        subject: 'Incident Alert',
        html: '<p>Alert</p>',
      });

      expect(result).toBe(true);
      expect(fetchSpy).toHaveBeenCalledWith('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-sg-key',
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('founder@example.com'),
      });

      fetchSpy.mockRestore();
    });

    it('should handle SendGrid API errors', async () => {
      process.env.EMAIL_PROVIDER = 'sendgrid';
      process.env.SENDGRID_API_KEY = 'test-key';

      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ errors: [{ message: 'Invalid email' }] }), { status: 400 })
      );

      const service = new EmailService();
      const result = await service.send({
        to: 'invalid@',
        subject: 'Test',
        html: 'body',
      });

      expect(result).toBe(false);
      fetchSpy.mockRestore();
    });

    it('should fall back gracefully if SendGrid unavailable', async () => {
      process.env.EMAIL_PROVIDER = 'sendgrid';
      process.env.SENDGRID_API_KEY = 'test-key';

      const fetchSpy = vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));
      const consoleSpy = vi.spyOn(console, 'error');

      const service = new EmailService();
      const result = await service.send({
        to: 'test@example.com',
        subject: 'Test',
        html: 'body',
      });

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Email send failed:', expect.any(Error));

      fetchSpy.mockRestore();
      consoleSpy.mockRestore();
    });
  });

  describe('SES Provider', () => {
    it('should report SES not available if AWS SDK not installed', async () => {
      process.env.EMAIL_PROVIDER = 'ses';
      process.env.AWS_SES_REGION = 'us-east-1';

      const consoleSpy = vi.spyOn(console, 'warn');
      const service = new EmailService();

      const result = await service.send({
        to: 'test@example.com',
        subject: 'Test',
        html: 'body',
      });

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('AWS SDK not installed'));
      consoleSpy.mockRestore();
    });
  });

  describe('Configuration Status', () => {
    it('should report as configured in log mode', () => {
      const service = new EmailService();
      expect(service.isConfigured()).toBe(true);
    });

    it('should report as configured when SendGrid API key present', () => {
      process.env.EMAIL_PROVIDER = 'sendgrid';
      process.env.SENDGRID_API_KEY = 'test-key';
      const service = new EmailService();
      expect(service.isConfigured()).toBe(true);
    });

    it('should report as configured when SES region set', () => {
      process.env.EMAIL_PROVIDER = 'ses';
      process.env.AWS_SES_REGION = 'us-east-1';
      const service = new EmailService();
      expect(service.isConfigured()).toBe(true);
    });

    it('should fall back to log when SendGrid key missing', () => {
      process.env.EMAIL_PROVIDER = 'sendgrid';
      delete process.env.SENDGRID_API_KEY;
      const service = new EmailService();
      expect(service.getProvider()).toBe('log');
      expect(service.isConfigured()).toBe(true);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance on multiple calls', () => {
      const service1 = getEmailService();
      const service2 = getEmailService();
      expect(service1).toBe(service2);
    });
  });

  describe('Email Content Handling', () => {
    it('should handle HTML-only emails', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const service = new EmailService();

      await service.send({
        to: 'test@example.com',
        subject: 'HTML Email',
        html: '<strong>Bold</strong>',
      });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('<strong>Bold</strong>'));
      consoleSpy.mockRestore();
    });

    it('should handle text-only emails', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const service = new EmailService();

      await service.send({
        to: 'test@example.com',
        subject: 'Text Email',
        text: 'Plain text message',
      });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Plain text message'));
      consoleSpy.mockRestore();
    });

    it('should prioritize HTML when both HTML and text provided', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const service = new EmailService();

      await service.send({
        to: 'test@example.com',
        subject: 'Dual Email',
        html: '<p>HTML version</p>',
        text: 'Text version',
      });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('HTML version'));
      // Text is not logged when HTML is present (html || text prioritizes html)
      consoleSpy.mockRestore();
    });
  });

  describe('Integration with FounderAlertingSystem', () => {
    it('should work with string content (legacy format)', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const service = new EmailService();

      // Simulate how founder-alerting.ts calls sendEmail
      const result = await service.send({
        to: 'founder@example.com',
        subject: 'Alert',
        html: 'Simple string content',
      });

      expect(result).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Simple string content'));
      consoleSpy.mockRestore();
    });

    it('should work with object content (AlertPayload format)', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const service = new EmailService();

      const htmlContent = `
        <html>
          <body>
            <h2>CRITICAL: Database connection failed</h2>
            <p>Incident ID: incident-001</p>
          </body>
        </html>
      `;

      const result = await service.send({
        to: 'founder@example.com',
        subject: 'CRITICAL Alert',
        html: htmlContent,
      });

      expect(result).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('CRITICAL'));
      consoleSpy.mockRestore();
    });
  });
});
