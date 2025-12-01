import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, IoShield as Shield } from 'react-icons/io5';

export default function TermsOfService() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'none',
            border: 'none',
            color: '#00F0FF',
            fontSize: '14px',
            cursor: 'pointer',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <IoArrowBack size={18} />
          Back to Home
        </button>

        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(0, 240, 255, 0.2)',
          borderRadius: '16px',
          padding: '3rem',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '2rem' }}>
            <IoShield size={40} color="#00F0FF" />
            <h1 style={{ color: '#fff', fontSize: '36px', fontWeight: '900', margin: 0 }}>Terms of Service</h1>
          </div>

          <p style={{ color: '#888', fontSize: '14px', marginBottom: '2rem' }}>Last Updated: November 2024</p>

          <div style={{ color: '#ccc', fontSize: '16px', lineHeight: '1.8' }}>
            <h2 style={{ color: '#00F0FF', fontSize: '24px', marginTop: '2rem', marginBottom: '1rem' }}>1. Acceptance of Terms</h2>
            <p>By accessing and using Coin Hub IoClose as X, you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.</p>

            <h2 style={{ color: '#00F0FF', fontSize: '24px', marginTop: '2rem', marginBottom: '1rem' }}>2. P2P Trading Services</h2>
            <p>Coin Hub IoClose as X provides a peer-to-peer marketplace for cryptocurrency trading. We facilitate connections between buyers and sellers but are not a party to any transaction. All trades are conducted directly between users.</p>

            <h2 style={{ color: '#00F0FF', fontSize: '24px', marginTop: '2rem', marginBottom: '1rem' }}>3. User Responsibilities</h2>
            <ul style={{ marginLeft: '1.5rem' }}>
              <li>You must be at least 18 years old to use our services</li>
              <li>You are responsible for maintaining the security of your account</li>
              <li>You must comply with all applicable laws and regulations</li>
              <li>You must not engage in fraudulent or illegal activities</li>
              <li>You are responsible for the accuracy of information you provide</li>
            </ul>

            <h2 style={{ color: '#00F0FF', fontSize: '24px', marginTop: '2rem', marginBottom: '1rem' }}>4. Escrow Service</h2>
            <p>Our escrow service holds cryptocurrency during trades to ensure safe transactions. Funds are released only when both parties confirm trade completion or when a dispute is resolved by our admin team.</p>

            <h2 style={{ color: '#00F0FF', fontSize: '24px', marginTop: '2rem', marginBottom: '1rem' }}>5. Fees and Commissions</h2>
            <p>Coin Hub IoClose as X charges platform fees on completed trades. Current fee structure:</p>
            <ul style={{ marginLeft: '1.5rem' }}>
              <li>Trading fees vary by transaction type</li>
              <li>Referral commissions: 20% for 12 months</li>
              <li>New users get 0% fees for first 30 days with referral code</li>
            </ul>

            <h2 style={{ color: '#00F0FF', fontSize: '24px', marginTop: '2rem', marginBottom: '1rem' }}>6. Dispute Resolution</h2>
            <p>In case of disputes, our admin team will review evidence from both parties and make a final decision. Disputes must be opened within 24 hours of the issue occurring.</p>

            <h2 style={{ color: '#00F0FF', fontSize: '24px', marginTop: '2rem', marginBottom: '1rem' }}>7. Prohibited Activities</h2>
            <p>The following activities are strictly prohibited:</p>
            <ul style={{ marginLeft: '1.5rem' }}>
              <li>Money laundering or terrorist financing</li>
              <li>Trading stolen or illegally obtained cryptocurrency</li>
              <li>Manipulating prices or engaging in market manipulation</li>
              <li>Creating multiple accounts to abuse promotions</li>
              <li>Impersonating other users or Coin Hub IoClose as X staff</li>
            </ul>

            <h2 style={{ color: '#00F0FF', fontSize: '24px', marginTop: '2rem', marginBottom: '1rem' }}>8. Limitation of Liability</h2>
            <p>Coin Hub IoClose as X is not liable for losses resulting from:</p>
            <ul style={{ marginLeft: '1.5rem' }}>
              <li>Market volatility or price fluctuations</li>
              <li>User errors or negligence</li>
              <li>Third-party payment processor failures</li>
              <li>Network congestion or blockchain delays</li>
              <li>Acts of God or force majeure events</li>
            </ul>

            <h2 style={{ color: '#00F0FF', fontSize: '24px', marginTop: '2rem', marginBottom: '1rem' }}>9. Account Termination</h2>
            <p>We reserve the right to suspend or terminate accounts that violate these terms or engage in suspicious activities. Users may also close their accounts at any time.</p>

            <h2 style={{ color: '#00F0FF', fontSize: '24px', marginTop: '2rem', marginBottom: '1rem' }}>10. Changes to Terms</h2>
            <p>Coin Hub IoClose as X may update these terms at any time. Continued use of our services after changes constitutes acceptance of the new terms.</p>

            <h2 style={{ color: '#00F0FF', fontSize: '24px', marginTop: '2rem', marginBottom: '1rem' }}>11. Contact Us</h2>
            <p>For questions about these terms, contact us at:<br />
Email: legal@coinhubx.com<br />
Support: support@coinhubx.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
