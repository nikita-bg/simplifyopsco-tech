"use client";

import Link from "next/link";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#0a0a14] text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-tight">
            Simplify<span className="text-[#256af4]">Ops</span>
          </Link>
          <Link
            href="/"
            className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
            Back to Home
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-gray-500 text-sm mb-12">Last updated: March 2026</p>

        <div className="space-y-10 text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Introduction</h2>
            <p>
              SimplifyOps (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) operates the Vocalize AI platform, an AI Voice Shopping Assistant
              provided as a software-as-a-service product at{" "}
              <a href="https://simplifyopsco.tech" className="text-[#256af4] hover:underline">simplifyopsco.tech</a>.
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use
              our service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Information We Collect</h2>
            <p className="mb-3">We collect the following categories of information:</p>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li>
                <span className="text-white font-medium">Voice Transcripts</span> — Audio interactions processed through our AI voice assistant are transcribed and stored to deliver and improve the service.
              </li>
              <li>
                <span className="text-white font-medium">Session Data</span> — Information about user sessions including timestamps, pages visited, and interaction metadata.
              </li>
              <li>
                <span className="text-white font-medium">Store Configuration</span> — Shopify store settings, product catalogs, and integration preferences provided by merchants.
              </li>
              <li>
                <span className="text-white font-medium">Payment Information</span> — Billing details processed securely through Stripe. We do not store full credit card numbers on our servers.
              </li>
              <li>
                <span className="text-white font-medium">Account Information</span> — Name, email address, and authentication credentials used to manage your SimplifyOps account.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. How We Store Your Data</h2>
            <p className="mb-3">
              Your data is stored securely using industry-standard practices:
            </p>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li>All application data is stored in <span className="text-white font-medium">Neon PostgreSQL</span> databases with encryption at rest.</li>
              <li>Shopify access tokens are encrypted using <span className="text-white font-medium">AES-256 encryption</span> before storage.</li>
              <li>All data transmission occurs over TLS-encrypted connections.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Third-Party Services</h2>
            <p className="mb-3">We integrate with the following third-party services to operate our platform:</p>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li>
                <span className="text-white font-medium">ElevenLabs</span> — Provides voice synthesis and processing capabilities for the AI assistant.
              </li>
              <li>
                <span className="text-white font-medium">OpenAI</span> — Powers conversation analysis and natural language understanding.
              </li>
              <li>
                <span className="text-white font-medium">Stripe</span> — Handles all payment processing securely. Stripe&apos;s privacy policy governs payment data handling.
              </li>
              <li>
                <span className="text-white font-medium">Shopify</span> — Provides store data, product information, and order management through authenticated API access.
              </li>
            </ul>
            <p className="mt-3">
              Each third-party service processes data according to their own privacy policies. We encourage you to review
              those policies independently.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Cookies &amp; Authentication</h2>
            <p>
              We use session cookies strictly for authentication purposes through Neon Auth. These cookies are essential
              for maintaining your logged-in session and do not track your activity across other websites. We do not use
              advertising or analytics cookies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Data Retention</h2>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li>
                <span className="text-white font-medium">Conversation data</span> (voice transcripts and session logs) is retained for <span className="text-white font-medium">90 days</span> from the date of creation, after which it is automatically deleted.
              </li>
              <li>
                <span className="text-white font-medium">Account data</span> is retained for as long as your account remains active. Upon account deletion, all associated data is removed within 30 days.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. GDPR Compliance &amp; Your Rights</h2>
            <p className="mb-3">
              If you are located in the European Economic Area (EEA), you have the following rights under the General Data
              Protection Regulation (GDPR):
            </p>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li><span className="text-white font-medium">Right of Access</span> — You may request a copy of the personal data we hold about you.</li>
              <li><span className="text-white font-medium">Right to Rectification</span> — You may request that we correct any inaccurate or incomplete personal data.</li>
              <li><span className="text-white font-medium">Right to Erasure</span> — You may request the deletion of your personal data, subject to legal retention obligations.</li>
              <li><span className="text-white font-medium">Right to Data Portability</span> — You may request your data in a structured, commonly used, machine-readable format.</li>
              <li><span className="text-white font-medium">Right to Object</span> — You may object to the processing of your personal data in certain circumstances.</li>
            </ul>
            <p className="mt-3">
              We comply with Shopify&apos;s mandatory GDPR webhooks for customer data requests, customer data erasure, and
              shop data erasure to ensure full compliance with data protection regulations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Data Sharing</h2>
            <p>
              We do <span className="text-white font-medium">not</span> sell, rent, or trade your personal data to third parties for marketing or any other
              purpose. Data is shared only with the third-party service providers listed in Section 4, and only to the
              extent necessary to operate the Vocalize AI platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal data against
              unauthorized access, alteration, disclosure, or destruction. However, no method of electronic transmission
              or storage is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated
              &quot;Last updated&quot; date. Your continued use of the service after any changes constitutes acceptance of the
              revised policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">11. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy or wish to exercise your data rights, please contact us at:
            </p>
            <p className="mt-2">
              <a href="mailto:hello@simplifyopsco.tech" className="text-[#256af4] hover:underline">
                hello@simplifyopsco.tech
              </a>
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-16">
        <div className="max-w-4xl mx-auto px-6 py-8 text-center text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} SimplifyOps. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
