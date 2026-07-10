import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — NewsPulse AI',
  description: 'Terms of service for NewsPulse AI',
};

export default function TermsPage() {
  return (
    <div className="prose prose-invert max-w-3xl">
      <h1>Terms of Service</h1>

      <p className="text-white/70 italic">
        Effective date: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
      </p>

      <h2>1. Acceptance of Terms</h2>
      <p>
        By accessing and using NewsPulse AI ("the App"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the App.
      </p>

      <h2>2. Use License</h2>
      <p>
        Permission is granted to temporarily access and use the App for personal, non-commercial purposes. You may not:
      </p>
      <ul>
        <li>Modify or copy the materials (including HTML/CSS/JavaScript source code)</li>
        <li>Use the materials for any commercial purpose or for any public display</li>
        <li>Attempt to decompile or reverse engineer the App</li>
        <li>Remove any copyright or proprietary notices from the materials</li>
        <li>Transfer the App or materials to another person or "mirror" on other servers</li>
        <li>Access the App via automated means (scraping, bots, crawlers) without written permission</li>
        <li>Attempt to bypass rate limits or security controls</li>
      </ul>

      <h2>3. Disclaimer of Warranties</h2>
      <p>
        THE MATERIALS IN THE APP ARE PROVIDED ON AN 'AS IS' BASIS. NEWSPULSE AI MAKES NO WARRANTIES, EXPRESSED OR IMPLIED, AND HEREBY DISCLAIMS AND NEGATES ALL OTHER WARRANTIES INCLUDING, WITHOUT LIMITATION, IMPLIED WARRANTIES OR CONDITIONS OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT OF INTELLECTUAL PROPERTY OR OTHER VIOLATION OF RIGHTS.
      </p>

      <h2>4. AI-Generated Content</h2>
      <p>
        The App uses OpenAI's GPT models to generate summaries. These summaries:
      </p>
      <ul>
        <li>Are automatically generated and may contain errors, inaccuracies, or hallucinations</li>
        <li>Should not be relied upon as sole source of truth for critical decisions</li>
        <li>Are labeled as AI-generated in the App interface</li>
        <li>Remain the property of NewsPulse AI and OpenAI jointly</li>
      </ul>
      <p>
        <strong>You are responsible for verifying information from original sources before relying on it.</strong>
      </p>

      <h2>5. Limitations</h2>
      <p>
        In no event shall NewsPulse AI or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the App, even if we have been notified of the possibility of such damage.
      </p>

      <h2>6. Accuracy of Materials</h2>
      <p>
        The materials appearing on the App could include technical, typographical, or photographic errors. NewsPulse AI does not warrant that any of the materials in the App are accurate, complete, or current. NewsPulse AI may make changes to the materials contained in the App at any time without notice.
      </p>

      <h2>7. Links</h2>
      <p>
        NewsPulse AI has not reviewed all of the sites linked to its website and is not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by NewsPulse AI of the site. Use of any such linked website is at the user's own risk.
      </p>

      <h2>8. Modifications</h2>
      <p>
        NewsPulse AI may revise these Terms of Service for the App at any time without notice. By using the App, you are agreeing to be bound by the then current version of these Terms of Service.
      </p>

      <h2>9. Governing Law</h2>
      <p>
        These materials and the contents of the App are made available by NewsPulse AI. These terms and conditions are governed by and construed in accordance with the laws of the jurisdiction where NewsPulse AI is domiciled, and you irrevocably submit to the exclusive jurisdiction of the courts in that location.
      </p>

      <h2>10. Third-Party Services</h2>
      <p>
        The App relies on third-party services (Firecrawl, OpenAI, Supabase, Vercel). NewsPulse AI is not responsible for:
      </p>
      <ul>
        <li>Outages or service degradation from third parties</li>
        <li>Data practices of third-party services (see their privacy policies)</li>
        <li>Changes to third-party APIs or terms</li>
      </ul>

      <h2>11. User Conduct</h2>
      <p>
        You agree not to use the App to:
      </p>
      <ul>
        <li>Violate any laws or regulations</li>
        <li>Infringe upon the intellectual property rights of others</li>
        <li>Harass, threaten, or intimidate others</li>
        <li>Spam or send unsolicited communications</li>
        <li>Interfere with or disrupt the integrity of the App</li>
      </ul>

      <h2>12. Contact</h2>
      <p>
        If you have questions about these Terms of Service, please contact us at{' '}
        <a href="mailto:legal@newspulse-ai.dev" className="text-accent-400 hover:text-accent-300">
          legal@newspulse-ai.dev
        </a>
        .
      </p>
    </div>
  );
}
