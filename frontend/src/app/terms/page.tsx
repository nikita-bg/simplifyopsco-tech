"use client";

import Link from "next/link";

export default function TermsOfService() {
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
        <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-gray-500 text-sm mb-12">Last updated: March 2026</p>

        <div className="space-y-10 text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Agreement to Terms</h2>
            <p>
              By accessing or using the Vocalize AI platform operated by SimplifyOps (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) at{" "}
              <a href="https://simplifyopsco.tech" className="text-[#256af4] hover:underline">simplifyopsco.tech</a>,
              you agree to be bound by these Terms of Service. If you do not agree to these terms, you must not use the
              service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Service Description</h2>
            <p>
              Vocalize AI is an AI-powered voice shopping assistant widget designed for e-commerce websites. The service
              enables online shoppers to browse products, ask questions, and complete purchases using natural voice
              conversations. Merchants integrate the widget into their storefronts to provide customers with a hands-free,
              conversational shopping experience.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Subscription Plans &amp; Pricing</h2>
            <p className="mb-4">We offer the following subscription tiers:</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="py-3 pr-4 text-white font-semibold">Plan</th>
                    <th className="py-3 pr-4 text-white font-semibold">Price</th>
                    <th className="py-3 text-white font-semibold">Voice Minutes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-white/5">
                    <td className="py-3 pr-4">Trial</td>
                    <td className="py-3 pr-4">Free</td>
                    <td className="py-3">30 minutes</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-3 pr-4">Starter</td>
                    <td className="py-3 pr-4">$39/month</td>
                    <td className="py-3">100 minutes</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-3 pr-4">Growth</td>
                    <td className="py-3 pr-4">$99/month</td>
                    <td className="py-3">300 minutes</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-3 pr-4">Scale</td>
                    <td className="py-3 pr-4">$299/month</td>
                    <td className="py-3">1,000 minutes</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4">
              Usage beyond your plan&apos;s included minutes may result in service throttling or overage charges as
              described in your plan details. We reserve the right to modify pricing with 30 days&apos; prior notice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Payment Terms</h2>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li>All payments are processed securely through <span className="text-white font-medium">Stripe</span>.</li>
              <li>Paid subscriptions are billed on a <span className="text-white font-medium">monthly</span> recurring basis from the date of subscription.</li>
              <li>You may <span className="text-white font-medium">cancel your subscription at any time</span>. Cancellation takes effect at the end of the current billing period. No partial refunds are issued for unused time within a billing cycle.</li>
              <li>Failed payments may result in service suspension. We will attempt to notify you before suspending access.</li>
              <li>All fees are stated in US Dollars (USD) unless otherwise specified.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Acceptable Use Policy</h2>
            <p className="mb-3">You agree not to use the service to:</p>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li>Violate any applicable local, state, national, or international law or regulation.</li>
              <li>Transmit harmful, abusive, harassing, defamatory, or otherwise objectionable content through the voice assistant.</li>
              <li>Attempt to gain unauthorized access to our systems, other users&apos; accounts, or connected third-party services.</li>
              <li>Interfere with or disrupt the integrity or performance of the service or its underlying infrastructure.</li>
              <li>Reverse-engineer, decompile, or disassemble any aspect of the service.</li>
              <li>Use the service to build a competing product or replicate core functionality.</li>
              <li>Exceed your plan&apos;s usage limits through automated or programmatic means intended to circumvent restrictions.</li>
            </ul>
            <p className="mt-3">
              We reserve the right to suspend or terminate accounts that violate this acceptable use policy without prior
              notice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Intellectual Property</h2>
            <p>
              All content, features, and functionality of the Vocalize AI platform — including but not limited to the
              software, algorithms, user interface, design, text, graphics, and logos — are owned by SimplifyOps and
              are protected by copyright, trademark, and other intellectual property laws. Your subscription grants you
              a limited, non-exclusive, non-transferable license to use the service for its intended purpose. You retain
              ownership of all content and data you provide through the service, including store configurations and
              product information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by applicable law, SimplifyOps shall not be liable for any indirect,
              incidental, special, consequential, or punitive damages, including but not limited to loss of profits,
              data, business opportunities, or goodwill, arising out of or related to your use of the service. Our total
              aggregate liability for any claims arising from or related to the service shall not exceed the amount you
              paid to us in the twelve (12) months preceding the claim. The service is provided on an &quot;as is&quot; and &quot;as
              available&quot; basis without warranties of any kind, whether express or implied.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Termination</h2>
            <p className="mb-3">
              Either party may terminate this agreement at any time:
            </p>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li>
                <span className="text-white font-medium">By you:</span> You may cancel your subscription and close your account at any time through the dashboard settings or by contacting us.
              </li>
              <li>
                <span className="text-white font-medium">By us:</span> We may suspend or terminate your access if you breach these terms, engage in prohibited conduct, or fail to pay applicable fees.
              </li>
            </ul>
            <p className="mt-3">
              Upon termination, your right to use the service ceases immediately. We will retain your data in accordance
              with our <Link href="/privacy" className="text-[#256af4] hover:underline">Privacy Policy</Link> retention
              schedule, after which it will be deleted.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless SimplifyOps, its officers, directors, employees, and agents from
              any claims, damages, losses, liabilities, and expenses (including reasonable attorneys&apos; fees) arising
              out of your use of the service or your violation of these terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">10. Governing Law</h2>
            <p>
              These Terms of Service shall be governed by and construed in accordance with the laws of the United States.
              Any disputes arising under or in connection with these terms shall be subject to the exclusive jurisdiction
              of the courts located in the State of Delaware, without regard to conflict of law principles.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">11. Changes to These Terms</h2>
            <p>
              We reserve the right to update or modify these Terms of Service at any time. Material changes will be
              communicated via email or through a notice on the platform at least 30 days before taking effect. Your
              continued use of the service after changes become effective constitutes acceptance of the revised terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">12. Contact Us</h2>
            <p>
              If you have any questions about these Terms of Service, please contact us at:
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
