import React from 'react';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-600/20 via-purple-600/20 to-cyan-600/20 border-b border-cyan-500/30">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-4">
            Privacy Policy
          </h1>
          <p className="text-gray-400 text-lg">Last Updated: December 5, 2025</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="bg-gray-800/50 backdrop-blur-sm border border-cyan-500/30 rounded-2xl p-8 shadow-2xl shadow-cyan-500/10">
          
          {/* Introduction */}
          <section className="mb-8">
            <h2 className="text-3xl font-bold text-cyan-400 mb-4">1. Introduction</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              Welcome to CoinHubX ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our cryptocurrency exchange platform and services.
            </p>
            <p className="text-gray-300 leading-relaxed">
              By accessing or using CoinHubX, you agree to the terms of this Privacy Policy. If you do not agree with the terms, please do not access or use our services.
            </p>
          </section>

          {/* Information We Collect */}
          <section className="mb-8">
            <h2 className="text-3xl font-bold text-cyan-400 mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-semibold text-purple-400 mb-3">2.1 Personal Information</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              We collect personal information that you provide directly to us, including:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 mb-6 ml-4">
              <li>Name, email address, and contact information</li>
              <li>Date of birth and nationality</li>
              <li>Government-issued identification documents (for KYC verification)</li>
              <li>Proof of address documentation</li>
              <li>Photograph or selfie (for identity verification)</li>
              <li>Financial information including bank account details and transaction history</li>
              <li>Cryptocurrency wallet addresses</li>
            </ul>

            <h3 className="text-xl font-semibold text-purple-400 mb-3">2.2 Automatically Collected Information</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              When you access our platform, we automatically collect certain information, including:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 mb-6 ml-4">
              <li>Device information (IP address, browser type, operating system)</li>
              <li>Usage data (pages visited, time spent, features used)</li>
              <li>Location information (derived from IP address)</li>
              <li>Cookies and similar tracking technologies</li>
              <li>Transaction data and trading activity</li>
            </ul>

            <h3 className="text-xl font-semibold text-purple-400 mb-3">2.3 Information from Third Parties</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              We may receive information about you from third-party service providers, including:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>KYC and identity verification providers</li>
              <li>Payment processors and financial institutions</li>
              <li>Blockchain networks and cryptocurrency services</li>
              <li>Analytics and advertising partners</li>
            </ul>
          </section>

          {/* How We Use Your Information */}
          <section className="mb-8">
            <h2 className="text-3xl font-bold text-cyan-400 mb-4">3. How We Use Your Information</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We use the information we collect for the following purposes:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>To provide, maintain, and improve our services</li>
              <li>To process your transactions and manage your account</li>
              <li>To verify your identity and comply with KYC/AML regulations</li>
              <li>To detect, prevent, and address fraud and security issues</li>
              <li>To comply with legal obligations and regulatory requirements</li>
              <li>To communicate with you about your account and our services</li>
              <li>To send you marketing communications (with your consent)</li>
              <li>To analyze usage patterns and improve user experience</li>
              <li>To enforce our Terms of Service and protect our rights</li>
            </ul>
          </section>

          {/* Information Sharing */}
          <section className="mb-8">
            <h2 className="text-3xl font-bold text-cyan-400 mb-4">4. Information Sharing and Disclosure</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We may share your information in the following circumstances:
            </p>
            
            <h3 className="text-xl font-semibold text-purple-400 mb-3">4.1 Service Providers</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              We share information with third-party service providers who perform services on our behalf, including payment processing, KYC verification, data analysis, email delivery, hosting services, and customer service.
            </p>

            <h3 className="text-xl font-semibold text-purple-400 mb-3">4.2 Legal Requirements</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              We may disclose your information if required by law, regulation, legal process, or governmental request, including to comply with anti-money laundering (AML) and counter-terrorism financing (CTF) obligations.
            </p>

            <h3 className="text-xl font-semibold text-purple-400 mb-3">4.3 Business Transfers</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              In the event of a merger, acquisition, reorganization, or sale of assets, your information may be transferred as part of that transaction.
            </p>

            <h3 className="text-xl font-semibold text-purple-400 mb-3">4.4 With Your Consent</h3>
            <p className="text-gray-300 leading-relaxed">
              We may share your information with third parties when you have given us explicit consent to do so.
            </p>
          </section>

          {/* Data Security */}
          <section className="mb-8">
            <h2 className="text-3xl font-bold text-cyan-400 mb-4">5. Data Security</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>Encryption of data in transit and at rest</li>
              <li>Secure server infrastructure and firewalls</li>
              <li>Regular security audits and vulnerability assessments</li>
              <li>Multi-factor authentication for account access</li>
              <li>Employee training on data protection and security</li>
              <li>Restricted access to personal information on a need-to-know basis</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              However, no method of transmission over the internet or electronic storage is 100% secure. While we strive to protect your personal information, we cannot guarantee its absolute security.
            </p>
          </section>

          {/* Data Retention */}
          <section className="mb-8">
            <h2 className="text-3xl font-bold text-cyan-400 mb-4">6. Data Retention</h2>
            <p className="text-gray-300 leading-relaxed">
              We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law. We will retain and use your information to the extent necessary to comply with our legal obligations, resolve disputes, enforce our agreements, and protect our legal rights.
            </p>
          </section>

          {/* Your Rights */}
          <section className="mb-8">
            <h2 className="text-3xl font-bold text-cyan-400 mb-4">7. Your Privacy Rights</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              Depending on your location, you may have the following rights regarding your personal information:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li><strong className="text-cyan-400">Access:</strong> Request access to the personal information we hold about you</li>
              <li><strong className="text-cyan-400">Correction:</strong> Request correction of inaccurate or incomplete information</li>
              <li><strong className="text-cyan-400">Deletion:</strong> Request deletion of your personal information (subject to legal obligations)</li>
              <li><strong className="text-cyan-400">Portability:</strong> Request a copy of your data in a structured, commonly used format</li>
              <li><strong className="text-cyan-400">Objection:</strong> Object to the processing of your personal information</li>
              <li><strong className="text-cyan-400">Restriction:</strong> Request restriction of processing your personal information</li>
              <li><strong className="text-cyan-400">Withdraw Consent:</strong> Withdraw consent where we rely on consent for processing</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              To exercise these rights, please contact us at <a href="mailto:privacy@coinhubx.net" className="text-cyan-400 hover:text-cyan-300">privacy@coinhubx.net</a>
            </p>
          </section>

          {/* International Transfers */}
          <section className="mb-8">
            <h2 className="text-3xl font-bold text-cyan-400 mb-4">8. International Data Transfers</h2>
            <p className="text-gray-300 leading-relaxed">
              Your information may be transferred to and processed in countries other than your country of residence. These countries may have data protection laws that are different from the laws of your country. We ensure that appropriate safeguards are in place to protect your information in accordance with this Privacy Policy and applicable laws.
            </p>
          </section>

          {/* Cookies */}
          <section className="mb-8">
            <h2 className="text-3xl font-bold text-cyan-400 mb-4">9. Cookies and Tracking Technologies</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We use cookies and similar tracking technologies to track activity on our platform and store certain information. You can instruct your browser to refuse all cookies or indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our service.
            </p>
          </section>

          {/* Third-Party Links */}
          <section className="mb-8">
            <h2 className="text-3xl font-bold text-cyan-400 mb-4">10. Third-Party Links and Services</h2>
            <p className="text-gray-300 leading-relaxed">
              Our platform may contain links to third-party websites or services. We are not responsible for the privacy practices of these third parties. We encourage you to review the privacy policies of any third-party sites you visit.
            </p>
          </section>

          {/* Children's Privacy */}
          <section className="mb-8">
            <h2 className="text-3xl font-bold text-cyan-400 mb-4">11. Children's Privacy</h2>
            <p className="text-gray-300 leading-relaxed">
              Our services are not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If you become aware that a child has provided us with personal information, please contact us immediately, and we will take steps to delete such information.
            </p>
          </section>

          {/* Changes */}
          <section className="mb-8">
            <h2 className="text-3xl font-bold text-cyan-400 mb-4">12. Changes to This Privacy Policy</h2>
            <p className="text-gray-300 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. We encourage you to review this Privacy Policy periodically for any changes.
            </p>
          </section>

          {/* Contact */}
          <section className="mb-8">
            <h2 className="text-3xl font-bold text-cyan-400 mb-4">13. Contact Us</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="bg-gray-900/50 border border-cyan-500/30 rounded-xl p-6">
              <p className="text-gray-300 mb-2"><strong className="text-cyan-400">CoinHubX</strong></p>
              <p className="text-gray-300 mb-2">Email: <a href="mailto:privacy@coinhubx.net" className="text-cyan-400 hover:text-cyan-300">privacy@coinhubx.net</a></p>
              <p className="text-gray-300 mb-2">Support: <a href="mailto:support@coinhubx.net" className="text-cyan-400 hover:text-cyan-300">support@coinhubx.net</a></p>
              <p className="text-gray-300">Website: <a href="https://coinhubx.net" className="text-cyan-400 hover:text-cyan-300">https://coinhubx.net</a></p>
            </div>
          </section>

          {/* Acknowledgment */}
          <section>
            <div className="bg-gradient-to-r from-cyan-600/20 to-purple-600/20 border border-cyan-500/30 rounded-xl p-6">
              <p className="text-gray-300 leading-relaxed">
                <strong className="text-cyan-400">Acknowledgment:</strong> By using CoinHubX, you acknowledge that you have read and understood this Privacy Policy and agree to its terms.
              </p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;