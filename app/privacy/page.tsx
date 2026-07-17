import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — EURO AI',
  description: 'Privacy policy for EURO AI',
};

export const revalidate = 86400; // Revalidate every 24 hours

export default function PrivacyPage() {
  return (
    <div className="prose prose-invert max-w-3xl">
      <h1>Privacy Policy</h1>

      <p className="rounded-md border border-amber-700/60 bg-amber-950/30 px-4 py-3 text-amber-200">
        <strong>Draft.</strong> This policy is pending legal review and may
        change before general availability. It describes the platform's actual
        current behavior.
      </p>

      <p className="text-white/70 italic">
        Last updated:{' '}
        {new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </p>

      <h2>Overview</h2>
      <p>
        EURO AI (&quot;the Platform&quot;) helps organizations govern their AI
        systems and meet EU AI Act obligations. This policy describes what
        personal data the Platform processes and why.
      </p>

      <h2>Data Collection</h2>
      <p>The Platform collects and stores the following data:</p>
      <ul>
        <li>
          <strong>Account data:</strong> Your email address, name (optional),
          and encrypted authentication credentials, managed by Supabase Auth
        </li>
        <li>
          <strong>Workspace data:</strong> The company profile you provide
          during onboarding (company name, country, industry, size, website,
          governance priorities)
        </li>
        <li>
          <strong>Governance records:</strong> AI system inventories, risk
          assessments, obligations, evidence, and remediation plans you create
          in your workspace
        </li>
      </ul>

      <h2>Tenant Isolation</h2>
      <p>
        Workspace data is isolated per tenant and enforced at the database level
        with row-level security: members of one workspace cannot read another
        workspace's data.
      </p>

      <h2>Legal Basis</h2>
      <p>
        We process account and workspace data to provide the service you sign up
        for (performance of contract), and with your consent where applicable.
        You can withdraw consent by deleting your account.
      </p>

      <h2>Data Storage &amp; Security</h2>
      <ul>
        <li>
          <strong>Database:</strong> Data is stored in Supabase (PostgreSQL);
          EU-region hosting is available and region confirmation is part of our
          launch checklist
        </li>
        <li>
          <strong>Encryption:</strong> All traffic is encrypted in transit
          (HTTPS only)
        </li>
        <li>
          <strong>Access control:</strong> Role-based access within workspaces
          (owner, admin, member, viewer)
        </li>
      </ul>

      <h2>Third-Party Services</h2>
      <ul>
        <li>
          <strong>Supabase:</strong> Database and authentication. See Supabase's
          privacy policy.
        </li>
        <li>
          <strong>Vercel:</strong> Hosting platform. See Vercel's privacy
          policy.
        </li>
      </ul>

      <h2>Your Rights</h2>
      <p>
        Under GDPR (if you are in the EU) and similar privacy laws, you have the
        right to:
      </p>
      <ul>
        <li>
          <strong>Access:</strong> Request a copy of all data stored about you
        </li>
        <li>
          <strong>Correction:</strong> Correct inaccurate data
        </li>
        <li>
          <strong>Deletion:</strong> Request permanent deletion (right to be
          forgotten)
        </li>
        <li>
          <strong>Portability:</strong> Request data export in a portable format
        </li>
        <li>
          <strong>Objection:</strong> Object to certain processing
        </li>
      </ul>
      <p>
        To exercise these rights, contact your onboarding representative or the
        workspace owner.
      </p>

      <h2>Policy Changes</h2>
      <p>
        We may update this privacy policy periodically. Significant changes will
        be announced via the Platform. Your continued use after changes are
        posted means you accept the updated policy.
      </p>
    </div>
  );
}
