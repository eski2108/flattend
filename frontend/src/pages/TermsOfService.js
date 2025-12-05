import React from 'react';

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-600/20 via-purple-600/20 to-cyan-600/20 border-b border-cyan-500/30">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-4">
            Terms of Service
          </h1>
          <p className="text-gray-400 text-lg">Last Updated: December 5, 2025</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="bg-gray-800/50 backdrop-blur-sm border border-cyan-500/30 rounded-2xl p-8 shadow-2xl shadow-cyan-500/10">
          
          {/* Introduction */}
          <section className="mb-8">
            <h2 className="text-3xl font-bold text-cyan-400 mb-4">1. Agreement to Terms</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              These Terms of Service ("Terms") govern your access to and use of the CoinHubX platform, website, and services (collectively, the "Services"). By accessing or using our Services, you agree to be bound by these Terms.
            </p>
            <p className="text-gray-300 leading-relaxed mb-4">
              <strong className="text-cyan-400">Important:</strong> Please read these Terms carefully before using our Services. If you do not agree with these Terms, you must not access or use our Services.
            </p>
            <p className="text-gray-300 leading-relaxed">
              We reserve the right to modify these Terms at any time. Continued use of the Services after changes constitutes acceptance of the modified Terms.
            </p>
          </section>

          {/* Eligibility */}
          <section className="mb-8">
            <h2 className="text-3xl font-bold text-cyan-400 mb-4">2. Eligibility</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              To use our Services, you must:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>Be at least 18 years of age</li>
              <li>Have the legal capacity to enter into binding contracts</li>
              <li>Not be prohibited from using our Services under applicable laws</li>
              <li>Not be located in a restricted or sanctioned jurisdiction</li>
              <li>Complete our KYC (Know Your Customer) verification process</li>
              <li>Comply with all applicable laws and regulations in your jurisdiction</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              By using our Services, you represent and warrant that you meet all of these eligibility requirements.
            </p>
          </section>

          {/* Account Registration */}
          <section className="mb-8">
            <h2 className="text-3xl font-bold text-cyan-400 mb-4">3. Account Registration and Security</h2>
            
            <h3 className="text-xl font-semibold text-purple-400 mb-3">3.1 Account Creation</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              To access certain features of our Services, you must register for an account. You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate, current, and complete.
            </p>

            <h3 className="text-xl font-semibold text-purple-400 mb-3">3.2 Account Security</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              You are responsible for:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4 ml-4">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized access or security breach</li>
              <li>Enabling two-factor authentication when available</li>
            </ul>

            <h3 className="text-xl font-semibold text-purple-400 mb-3">3.3 Account Verification</h3>
            <p className="text-gray-300 leading-relaxed">
              We require identity verification (KYC) for all users. You must provide valid identification documents and may be required to provide additional information to verify your identity. We reserve the right to suspend or terminate accounts that fail verification.
            </p>
          </section>

          {/* Services */}
          <section className="mb-8">
            <h2 className="text-3xl font-bold text-cyan-400 mb-4">4. Description of Services</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              CoinHubX provides a cryptocurrency exchange platform that allows users to:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>Buy, sell, and trade cryptocurrencies</li>
              <li>Store digital assets in platform wallets</li>
              <li>Access P2P (peer-to-peer) trading features</li>
              <li>Utilize instant buy/sell services</li>
              <li>Swap between different cryptocurrencies</li>
              <li>Earn through savings and staking programs</li>
              <li>Access referral and rewards programs</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              We reserve the right to modify, suspend, or discontinue any aspect of our Services at any time without prior notice.
            </p>
          </section>

          {/* Trading Rules */}
          <section className="mb-8">
            <h2 className="text-3xl font-bold text-cyan-400 mb-4">5. Trading Rules and Restrictions</h2>
            
            <h3 className="text-xl font-semibold text-purple-400 mb-3">5.1 Trading Limitations</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              We may impose limits on trading volume, withdrawal amounts, and other transaction parameters based on your account tier, verification level, and other factors.
            </p>

            <h3 className="text-xl font-semibold text-purple-400 mb-3">5.2 Order Execution</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              All trades are executed based on market conditions at the time of the transaction. We do not guarantee execution at any specific price. Orders may be subject to slippage, particularly during periods of high volatility.
            </p>

            <h3 className="text-xl font-semibold text-purple-400 mb-3">5.3 Prohibited Activities</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              You agree not to engage in:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>Market manipulation, including wash trading, pump and dump schemes</li>
              <li>Money laundering or financing of illegal activities</li>
              <li>Using our Services for any unlawful purpose</li>
              <li>Attempting to circumvent our security measures</li>
              <li>Using automated trading systems without authorization</li>
              <li>Creating multiple accounts to evade restrictions</li>
            </ul>
          </section>

          {/* Fees */}
          <section className="mb-8">
            <h2 className="text-3xl font-bold text-cyan-400 mb-4">6. Fees and Charges</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We charge fees for certain Services, including:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>Trading fees on buy/sell transactions</li>
              <li>P2P trading platform fees</li>
              <li>Withdrawal fees for cryptocurrency and fiat transfers</li>
              <li>Instant buy/sell service fees</li>
              <li>Currency conversion fees</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              Current fee schedules are available on our website. We reserve the right to modify our fees at any time. Continued use of our Services after fee changes constitutes acceptance of the new fees.
            </p>
          </section>

          {/* Deposits and Withdrawals */}
          <section className="mb-8">
            <h2 className="text-3xl font-bold text-cyan-400 mb-4">7. Deposits and Withdrawals</h2>
            
            <h3 className="text-xl font-semibold text-purple-400 mb-3">7.1 Deposits</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              You may deposit cryptocurrencies and fiat currency (where available) to your account. You are responsible for ensuring deposits are sent to the correct address. We are not responsible for deposits sent to incorrect addresses.
            </p>

            <h3 className="text-xl font-semibold text-purple-400 mb-3">7.2 Withdrawals</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              Withdrawal requests are subject to:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4 ml-4">
              <li>Account verification requirements</li>
              <li>Daily and monthly withdrawal limits</li>
              <li>Security review periods (typically 1-24 hours)</li>
              <li>Applicable withdrawal fees</li>
              <li>Compliance with AML/CTF regulations</li>
            </ul>

            <h3 className="text-xl font-semibold text-purple-400 mb-3">7.3 Incorrect Withdrawals</h3>
            <p className="text-gray-300 leading-relaxed">
              Cryptocurrency transactions are irreversible. We are not responsible for funds sent to incorrect addresses. Please verify all withdrawal details carefully before confirming transactions.
            </p>
          </section>

          {/* Risks */}
          <section className="mb-8">
            <h2 className="text-3xl font-bold text-cyan-400 mb-4">8. Risks and Disclaimers</h2>
            
            <h3 className="text-xl font-semibold text-purple-400 mb-3">8.1 Market Risks</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              Cryptocurrency trading involves substantial risk of loss. You acknowledge and accept that:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4 ml-4">
              <li>Cryptocurrency values can be highly volatile</li>
              <li>You may lose some or all of your investment</li>
              <li>Past performance does not guarantee future results</li>
              <li>Market conditions can change rapidly</li>
            </ul>

            <h3 className="text-xl font-semibold text-purple-400 mb-3">8.2 Not Financial Advice</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              We do not provide investment, financial, legal, or tax advice. Any information provided on our platform is for informational purposes only and should not be construed as professional advice.
            </p>

            <h3 className="text-xl font-semibold text-purple-400 mb-3">8.3 Service Availability</h3>
            <p className="text-gray-300 leading-relaxed">
              We do not guarantee uninterrupted access to our Services. Our Services may be unavailable due to maintenance, technical issues, or circumstances beyond our control.
            </p>
          </section>

          {/* Liability */}
          <section className="mb-8">
            <h2 className="text-3xl font-bold text-cyan-400 mb-4">9. Limitation of Liability</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              To the maximum extent permitted by law:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>We are not liable for any indirect, incidental, special, consequential, or punitive damages</li>
              <li>Our total liability shall not exceed the fees you paid to us in the 12 months preceding the claim</li>
              <li>We are not liable for losses resulting from unauthorized access to your account</li>
              <li>We are not liable for losses due to your failure to secure your account credentials</li>
              <li>We are not responsible for the performance or security of third-party services</li>
            </ul>
          </section>

          {/* Indemnification */}
          <section className="mb-8">
            <h2 className="text-3xl font-bold text-cyan-400 mb-4">10. Indemnification</h2>
            <p className="text-gray-300 leading-relaxed">
              You agree to indemnify, defend, and hold harmless CoinHubX, its affiliates, officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from your use of our Services, violation of these Terms, or violation of any rights of another party.
            </p>
          </section>

          {/* Compliance */}
          <section className="mb-8">
            <h2 className="text-3xl font-bold text-cyan-400 mb-4">11. Compliance and Legal Obligations</h2>
            
            <h3 className="text-xl font-semibold text-purple-400 mb-3">11.1 AML/CTF Compliance</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              We are committed to preventing money laundering and terrorist financing. We may:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4 ml-4">
              <li>Verify your identity and source of funds</li>
              <li>Monitor and report suspicious transactions</li>
              <li>Freeze or terminate accounts that violate AML/CTF regulations</li>
              <li>Cooperate with law enforcement and regulatory authorities</li>
            </ul>

            <h3 className="text-xl font-semibold text-purple-400 mb-3">11.2 Tax Obligations</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              You are solely responsible for determining and paying any taxes applicable to your use of our Services. We may report your transactions to tax authorities as required by law.
            </p>

            <h3 className="text-xl font-semibold text-purple-400 mb-3">11.3 Sanctions Compliance</h3>
            <p className="text-gray-300 leading-relaxed">
              We comply with international sanctions regimes. We do not provide Services to individuals or entities in sanctioned jurisdictions or on sanctions lists.
            </p>
          </section>

          {/* Intellectual Property */}
          <section className="mb-8">
            <h2 className="text-3xl font-bold text-cyan-400 mb-4">12. Intellectual Property Rights</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              All content, features, and functionality of our Services, including but not limited to text, graphics, logos, icons, images, and software, are the exclusive property of CoinHubX and are protected by copyright, trademark, and other intellectual property laws.
            </p>
            <p className="text-gray-300 leading-relaxed">
              You may not copy, modify, distribute, sell, or lease any part of our Services without our express written permission.
            </p>
          </section>

          {/* Termination */}
          <section className="mb-8">
            <h2 className="text-3xl font-bold text-cyan-400 mb-4">13. Termination</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We may suspend or terminate your account and access to our Services at any time, with or without notice, for any reason, including:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4 ml-4">
              <li>Violation of these Terms</li>
              <li>Suspected fraud or illegal activity</li>
              <li>Extended periods of inactivity</li>
              <li>Failure to complete verification requirements</li>
              <li>At our sole discretion</li>
            </ul>
            <p className="text-gray-300 leading-relaxed">
              Upon termination, you may withdraw your funds subject to applicable fees and waiting periods, unless prohibited by law or regulation.
            </p>
          </section>

          {/* Dispute Resolution */}
          <section className="mb-8">
            <h2 className="text-3xl font-bold text-cyan-400 mb-4">14. Dispute Resolution</h2>
            
            <h3 className="text-xl font-semibold text-purple-400 mb-3">14.1 Informal Resolution</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              If you have a dispute with us, you agree to first contact us at <a href="mailto:support@coinhubx.net" className="text-cyan-400 hover:text-cyan-300">support@coinhubx.net</a> and attempt to resolve the dispute informally.
            </p>

            <h3 className="text-xl font-semibold text-purple-400 mb-3">14.2 Arbitration</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              Any disputes not resolved informally shall be resolved through binding arbitration in accordance with the rules of [Arbitration Body]. The arbitration shall take place in [Jurisdiction], and judgment on the award may be entered in any court having jurisdiction.
            </p>

            <h3 className="text-xl font-semibold text-purple-400 mb-3">14.3 Class Action Waiver</h3>
            <p className="text-gray-300 leading-relaxed">
              You agree that any disputes shall be resolved on an individual basis and not as a class action, consolidated action, or representative action.
            </p>
          </section>

          {/* Governing Law */}
          <section className="mb-8">
            <h2 className="text-3xl font-bold text-cyan-400 mb-4">15. Governing Law</h2>
            <p className="text-gray-300 leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of [Jurisdiction], without regard to its conflict of law principles. You agree to submit to the exclusive jurisdiction of the courts located in [Jurisdiction] for the resolution of any disputes.
            </p>
          </section>

          {/* General Provisions */}
          <section className="mb-8">
            <h2 className="text-3xl font-bold text-cyan-400 mb-4">16. General Provisions</h2>
            
            <h3 className="text-xl font-semibold text-purple-400 mb-3">16.1 Entire Agreement</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              These Terms constitute the entire agreement between you and CoinHubX regarding the use of our Services.
            </p>

            <h3 className="text-xl font-semibold text-purple-400 mb-3">16.2 Severability</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              If any provision of these Terms is found to be unenforceable, the remaining provisions shall remain in full force and effect.
            </p>

            <h3 className="text-xl font-semibold text-purple-400 mb-3">16.3 Waiver</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              Our failure to enforce any right or provision of these Terms shall not constitute a waiver of such right or provision.
            </p>

            <h3 className="text-xl font-semibold text-purple-400 mb-3">16.4 Assignment</h3>
            <p className="text-gray-300 leading-relaxed">
              You may not assign or transfer these Terms or your account without our prior written consent. We may assign these Terms at any time without restriction.
            </p>
          </section>

          {/* Contact */}
          <section className="mb-8">
            <h2 className="text-3xl font-bold text-cyan-400 mb-4">17. Contact Information</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              If you have questions about these Terms, please contact us:
            </p>
            <div className="bg-gray-900/50 border border-cyan-500/30 rounded-xl p-6">
              <p className="text-gray-300 mb-2"><strong className="text-cyan-400">CoinHubX</strong></p>
              <p className="text-gray-300 mb-2">Email: <a href="mailto:support@coinhubx.net" className="text-cyan-400 hover:text-cyan-300">support@coinhubx.net</a></p>
              <p className="text-gray-300 mb-2">Legal: <a href="mailto:legal@coinhubx.net" className="text-cyan-400 hover:text-cyan-300">legal@coinhubx.net</a></p>
              <p className="text-gray-300">Website: <a href="https://coinhubx.net" className="text-cyan-400 hover:text-cyan-300">https://coinhubx.net</a></p>
            </div>
          </section>

          {/* Acknowledgment */}
          <section>
            <div className="bg-gradient-to-r from-cyan-600/20 to-purple-600/20 border border-cyan-500/30 rounded-xl p-6">
              <p className="text-gray-300 leading-relaxed">
                <strong className="text-cyan-400">Acknowledgment:</strong> By using CoinHubX Services, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service. If you do not agree to these Terms, you must not use our Services.
              </p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};

export default TermsOfService;