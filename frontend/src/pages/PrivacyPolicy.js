import React from 'react';
import { useNavigate } from 'react-router-dom';
import { IoLockClosed, IoArrowBack } from 'react-icons/io5';;

export default function PrivacyPolicy() {
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
          padding: '3rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '2rem' }}>
            <IoLockClosed size={40} color="#A855F7" />
            <h1 style={{ color: '#fff', fontSize: '36px', fontWeight: '900', margin: 0 }}>Privacy Policy</h1>
          </div>

          <p style={{ color: '#888', fontSize: '14px', marginBottom: '2rem' }}>Last Updated: November 2024</p>

          <div style={{ color: '#ccc', fontSize: '16px', lineHeight: '1.8' }}>
            <h2 style={{ color: '#A855F7', fontSize: '24px', marginTop: '2rem', marginBottom: '1rem' }}>1. Information We Collect</h2>
            <p>We collect the following information to provide our services:</p>
            <ul style={{ marginLeft: '1.5rem' }}>
              <li><strong>Account Information:</strong> Name, email address, password</li>
              <li><strong>Profile Data:</strong> Payment methods, trading preferences</li>
              <li><strong>Transaction Data:</strong> Trade history, cryptocurrency addresses</li>
              <li><strong>Device Information:</strong> IP address, browser type, device ID</li>
              <li><strong>Communication Data:</strong> Support messages, dispute communications</li>
            </ul>

            <h2 style={{ color: '#A855F7', fontSize: '24px', marginTop: '2rem', marginBottom: '1rem' }}>2. How We Use Your Information</h2>
            <p>Your information is used to:</p>
            <ul style={{ marginLeft: '1.5rem' }}>
              <li>Facilitate P2P cryptocurrency trading</li>
              <li>Process transactions and manage escrow</li>
              <li>Verify user identity and prevent fraud</li>
              <li>Provide customer support</li>
              <li>Send important platform updates</li>
              <li>Comply with legal obligations</li>
              <li>Improve our services and user experience</li>
            </ul>

            <h2 style={{ color: '#A855F7', fontSize: '24px', marginTop: '2rem', marginBottom: '1rem' }}>3. Data Security</h2>
            <p>We implement industry-standard security measures:</p>
            <ul style={{ marginLeft: '1.5rem' }}>
              <li>End-to-end encryption for sensitive data</li>
              <li>Secure password hashing</li>
              <li>Regular security audits</li>
              <li>Two-factor authentication (2FA) support</li>
              <li>Secure API communications</li>
            </ul>

            <h2 style={{ color: '#A855F7', fontSize: '24px', marginTop: '2rem', marginBottom: '1rem' }}>4. Information Sharing</h2>
            <p>We do NOT sell your personal information. We may share data with:</p>
            <ul style={{ marginLeft: '1.5rem' }}>
              <li><strong>Other Users:</strong> Trading counterparties see limited info needed for transactions</li>
              <li><strong>Service Providers:</strong> Payment processors, hosting services (under NDA)</li>
              <li><strong>Legal Authorities:</strong> When required by law or to prevent fraud</li>
            </ul>

            <h2 style={{ color: '#A855F7', fontSize: '24px', marginTop: '2rem', marginBottom: '1rem' }}>5. Cookies and Tracking</h2>
            <p>We use cookies and similar technologies to:</p>
            <ul style={{ marginLeft: '1.5rem' }}>
              <li>Keep you logged in</li>
              <li>Remember your preferences</li>
              <li>Analyze platform usage</li>
              <li>Improve platform performance</li>
            </ul>

            <h2 style={{ color: '#A855F7', fontSize: '24px', marginTop: '2rem', marginBottom: '1rem' }}>6. Your Rights</h2>
            <p>You have the right to:</p>
            <ul style={{ marginLeft: '1.5rem' }}>
              <li>Access your personal data</li>
              <li>Correct inaccurate information</li>
              <li>Request data deletion (subject to legal requirements)</li>
              <li>Export your data</li>
              <li>Opt-out of marketing communications</li>
              <li>Withdraw consent</li>
            </ul>

            <h2 style={{ color: '#A855F7', fontSize: '24px', marginTop: '2rem', marginBottom: '1rem' }}>7. Data Retention</h2>
            <p>We retain your data:</p>
            <ul style={{ marginLeft: '1.5rem' }}>
              <li>As long as your account is active</li>
              <li>For 7 years after account closure (regulatory requirement)</li>
              <li>Longer if required by law or for dispute resolution</li>
            </ul>

            <h2 style={{ color: '#A855F7', fontSize: '24px', marginTop: '2rem', marginBottom: '1rem' }}>8. International Transfers</h2>
            <p>Your data may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place for international data transfers.</p>

            <h2 style={{ color: '#A855F7', fontSize: '24px', marginTop: '2rem', marginBottom: '1rem' }}>9. Children's Privacy</h2>
            <p>Coin Hub IoClose as X is not intended for users under 18. We do not knowingly collect information from children.</p>

            <h2 style={{ color: '#A855F7', fontSize: '24px', marginTop: '2rem', marginBottom: '1rem' }}>10. Changes to This Policy</h2>
            <p>We may update this privacy policy. Significant changes will be communicated via email or platform notification.</p>

            <h2 style={{ color: '#A855F7', fontSize: '24px', marginTop: '2rem', marginBottom: '1rem' }}>11. Contact Us</h2>
            <p>For privacy concerns or requests:<br />
Email: privacy@coinhubx.com<br />
Data Protection Officer: dpo@coinhubx.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
