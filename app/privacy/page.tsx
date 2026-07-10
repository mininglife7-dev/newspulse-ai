import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — NewsPulse AI',
  description: 'Privacy policy for NewsPulse AI',
};

export default function PrivacyPage() {
  return (
    <div className="prose prose-invert max-w-3xl">
      <h1>Privacy Policy</h1>

      <p className="text-white/70 italic">
        Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
      </p>

      <h2>Overview</h2>
      <p>
        NewsPulse AI ("the App") is a news intelligence tool that allows you to search for articles, receive AI-generated summaries, and save your search history.
      </p>

      <h2>Data Collection</h2>
      <p>
        The App collects and stores the following personal data:
      </p>
      <ul>
        <li><strong>Search queries:</strong> Every search you perform is saved to provide your search history</li>
        <li><strong>Search results:</strong> Articles you search for are cached with AI-generated summaries</li>
        <li><strong>IP address:</strong> Used for rate limiting and security purposes</li>
        <li><strong>User agent:</strong> Standard browser information for analytics and debugging</li>
      </ul>

      <h2>Legal Basis</h2>
      <p>
        We process your data based on your consent (by using the App). You can withdraw this consent at any time by stopping use of the App.
      </p>

      <h2>Data Storage & Security</h2>
      <ul>
        <li><strong>Database:</strong> All data is stored in Supabase, a PostgreSQL-based backend with EU-region hosting available</li>
        <li><strong>Encryption:</strong> Data in transit is encrypted (HTTPS only); at-rest encryption depends on your Supabase configuration</li>
        <li><strong>Backups:</strong> Supabase performs automated daily backups; you can restore data up to 7 days prior</li>
      </ul>

      <h2>Data Retention</h2>
      <p>
        <strong>Default:</strong> Search history is retained indefinitely until you explicitly delete it.
      </p>
      <p>
        You can delete:
      </p>
      <ul>
        <li>Individual searches via the History tab (trash icon)</li>
        <li>All searches via the History tab (Clear All button with confirmation)</li>
      </ul>

      <h2>Third-Party Services</h2>
      <p>
        The App uses the following third-party services:
      </p>
      <ul>
        <li><strong>Firecrawl:</strong> Web search and scraping API. Firecrawl may log your queries for service improvement. See their privacy policy.</li>
        <li><strong>OpenAI:</strong> Generates summaries via gpt-4o-mini. OpenAI logs queries per their usage policy. See their privacy policy.</li>
        <li><strong>Supabase:</strong> Database and authentication. See Supabase's privacy policy.</li>
        <li><strong>Vercel:</strong> Hosting platform. See Vercel's privacy policy.</li>
      </ul>

      <h2>Your Rights</h2>
      <p>
        Under GDPR (if you are in the EU) and similar privacy laws, you have the right to:
      </p>
      <ul>
        <li><strong>Access:</strong> Request a copy of all data stored about you</li>
        <li><strong>Correction:</strong> Correct inaccurate data</li>
        <li><strong>Deletion:</strong> Request permanent deletion (right to be forgotten)</li>
        <li><strong>Portability:</strong> Request data export in a portable format</li>
        <li><strong>Objection:</strong> Object to certain processing</li>
      </ul>

      <p>
        To exercise these rights, contact us via the support email listed in your account or the footer of this site.
      </p>

      <h2>AI Transparency</h2>
      <p>
        <strong>Every summary shown in the App is AI-generated.</strong> Summaries are created by OpenAI's gpt-4o-mini model and are not verified for factual accuracy. We label all AI summaries in the UI.
      </p>
      <p>
        You should verify any critical information from the original source before relying on it.
      </p>

      <h2>Policy Changes</h2>
      <p>
        We may update this privacy policy periodically. Significant changes will be announced via the App. Your continued use of the App after changes are posted means you accept the updated policy.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this privacy policy? Contact the NewsPulse AI team at{' '}
        <a href="mailto:privacy@newspulse-ai.dev" className="text-accent-400 hover:text-accent-300">
          privacy@newspulse-ai.dev
        </a>
        .
      </p>
    </div>
  );
}
