import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — EURO AI',
  description: 'Terms of service for EURO AI',
};

export default function TermsPage() {
  return (
    <div className="prose prose-invert max-w-3xl">
      <h1>Terms of Service</h1>

      <p className="rounded-md border border-amber-700/60 bg-amber-950/30 px-4 py-3 text-amber-200">
        <strong>Draft.</strong> These terms are pending legal review and may
        change before general availability.
      </p>

      <p className="text-white/70 italic">
        Effective date:{' '}
        {new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </p>

      <h2>1. Acceptance of Terms</h2>
      <p>
        By accessing and using EURO AI (&quot;the Platform&quot;), you agree to
        be bound by these Terms of Service. If you do not agree to these terms,
        please do not use the Platform.
      </p>

      <h2>2. The Service</h2>
      <p>
        EURO AI provides tooling that helps organizations inventory AI systems,
        assess risk, and track compliance obligations, including those under
        the EU AI Act. The Platform supports your compliance work; it does not
        replace it.
      </p>

      <h2>3. Acceptable Use</h2>
      <ul>
        <li>Do not attempt to access another workspace's data</li>
        <li>Do not attempt to decompile or reverse engineer the Platform</li>
        <li>
          Do not access the Platform via automated means (scraping, bots)
          without written permission
        </li>
        <li>Do not attempt to bypass rate limits or security controls</li>
      </ul>

      <h2>4. Not Legal Advice</h2>
      <p>
        <strong>
          Content in the Platform — including risk classifications, obligation
          mappings, and compliance guidance — is informational tooling, not
          legal advice.
        </strong>{' '}
        Regulatory compliance decisions should be reviewed by qualified legal
        counsel. You are responsible for your organization's compliance.
      </p>

      <h2>5. Disclaimer of Warranties</h2>
      <p>
        THE PLATFORM IS PROVIDED ON AN &apos;AS IS&apos; BASIS. EURO AI MAKES
        NO WARRANTIES, EXPRESSED OR IMPLIED, AND HEREBY DISCLAIMS AND NEGATES
        ALL OTHER WARRANTIES INCLUDING, WITHOUT LIMITATION, IMPLIED WARRANTIES
        OR CONDITIONS OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR
        NON-INFRINGEMENT.
      </p>

      <h2>6. Limitations</h2>
      <p>
        In no event shall EURO AI or its suppliers be liable for any damages
        (including, without limitation, damages for loss of data or profit, or
        due to business interruption) arising out of the use or inability to
        use the Platform, even if we have been notified of the possibility of
        such damage.
      </p>

      <h2>7. Your Data</h2>
      <p>
        You retain ownership of the data you enter into your workspace. See the{' '}
        <a href="/privacy">Privacy Policy</a> for how it is processed and how
        to exercise your rights.
      </p>

      <h2>8. Changes</h2>
      <p>
        We may revise these terms periodically. Significant changes will be
        announced via the Platform; continued use after changes are posted
        means you accept the revised terms.
      </p>
    </div>
  );
}
