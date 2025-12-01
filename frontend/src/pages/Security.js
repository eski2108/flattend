import React from 'react';
import { Bell, Eye, FileText, IoCheckmark as Check, IoCheckmarkCircle, IoEye, IoLockClosed, IoNotifications, IoPeople, IoShield, IoWarning, Lock, Users } from 'react-icons/io5';

export default function Security() {
  const features = [
    {
      icon: <IoShield size={32} />,
      title: 'Escrow Protection',
      description: 'Every P2P trade is secured with our escrow system. Funds are held safely until both parties confirm completion.',
      color: '#00F0FF'
    },
    {
      icon: <IoLockClosed size={32} />,
      title: 'Two-Factor Authentication (2FA)',
      description: 'Add an extra layer of security to your account with 2FA. Protect against unauthorized access.',
      color: '#A855F7'
    },
    {
      icon: <IoNotifications size={32} />,
      title: 'Login Alerts',
      description: 'Receive instant email notifications whenever someone logs into your account from a new device.',
      color: '#22C55E'
    },
    {
      icon: <IoEye size={32} />,
      title: 'End-to-End Encryption',
      description: 'All sensitive data is encrypted using industry-standard AES-256 encryption.',
      color: '#FBBF24'
    }
  ];

  const p2pSafetySteps = [
    'Always verify the seller\'s rating and completion rate',
    'Check payment proof carefully before releasing crypto',
    'Use only the platform\'s chat - never external messaging',
    'Report suspicious activity immediately',
    'Never share your password or 2FA codes',
    'Double-check wallet addresses before withdrawing'
  ];

  const scamWarnings = [
    {
      title: 'Fake Payment Screenshots',
      description: 'Scammers may send fake payment confirmations. Always verify in your bank account.',
      severity: 'high'
    },
    {
      title: 'Off-Platform Deals',
      description: 'Never agree to complete trades outside the platform. You lose escrow protection.',
      severity: 'high'
    },
    {
      title: 'Urgency Tactics',
      description: 'Scammers create false urgency. Take your time to verify everything.',
      severity: 'medium'
    },
    {
      title: 'Impersonation',
      description: 'Check usernames carefully. Scammers may impersonate trusted sellers.',
      severity: 'medium'
    }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
      color: '#fff'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.1), rgba(168, 85, 247, 0.1))',
        borderBottom: '2px solid rgba(0, 240, 255, 0.3)',
        padding: '3rem 2rem',
        textAlign: 'center'
      }}>
        <IoShield size={64} color="#00F0FF" style={{ margin: '0 auto 1rem' }} />
        <h1 style={{
          fontSize: '48px',
          fontWeight: '900',
          background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '1rem'
        }}>
          Security & Safety
        </h1>
        <p style={{
          fontSize: '18px',
          color: '#888',
          maxWidth: '800px',
          margin: '0 auto'
        }}>
          Your security is our priority. Learn how we protect your trades and keep your funds safe.
        </p>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '3rem 2rem' }}>
        {/* Security Features */}
        <section style={{ marginBottom: '4rem' }}>
          <h2 style={{
            fontSize: '32px',
            fontWeight: '700',
            color: '#00F0FF',
            marginBottom: '2rem'
          }}>
            Our Security Features
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.5rem'
          }}>
            {features.map((feature, index) => (
              <div
                key={index}
                style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: `2px solid ${feature.color}40`,
                  borderRadius: '16px',
                  padding: '2rem',
                  transition: 'transform 0.3s, border-color 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.borderColor = feature.color;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = `${feature.color}40`;
                }}
              >
                <div style={{ color: feature.color, marginBottom: '1rem' }}>
                  {feature.icon}
                </div>
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: '#E2E8F0',
                  marginBottom: '0.75rem'
                }}>
                  {feature.title}
                </h3>
                <p style={{ color: '#888', fontSize: '14px', lineHeight: '1.6' }}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* How P2P Escrow Works */}
        <section style={{ marginBottom: '4rem' }}>
          <h2 style={{
            fontSize: '32px',
            fontWeight: '700',
            color: '#00F0FF',
            marginBottom: '2rem'
          }}>
            How P2P Escrow Works
          </h2>

          <div style={{
            background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.05), rgba(168, 85, 247, 0.05))',
            border: '2px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '16px',
            padding: '2rem'
          }}>
            <div style={{ display: 'grid', gap: '2rem' }}>
              {[
                {
                  step: 1,
                  title: 'Buyer Places Order',
                  description: 'Crypto is immediately locked in escrow. Seller cannot access it yet.'
                },
                {
                  step: 2,
                  title: 'Buyer Sends Payment',
                  description: 'Buyer transfers money via agreed payment method and marks as paid.'
                },
                {
                  step: 3,
                  title: 'Seller Confirms Receipt',
                  description: 'Seller checks their bank account and confirms payment received.'
                },
                {
                  step: 4,
                  title: 'Crypto Released',
                  description: 'Escrow automatically releases crypto to buyer. Trade complete!'
                }
              ].map((step) => (
                <div key={step.step} style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    fontWeight: '900',
                    color: '#000',
                    flexShrink: 0
                  }}>
                    {step.step}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '18px', fontWeight: '700', color: '#E2E8F0', marginBottom: '0.5rem' }}>
                      {step.title}
                    </h4>
                    <p style={{ color: '#888', fontSize: '14px' }}>
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Safety Tips */}
        <section style={{ marginBottom: '4rem' }}>
          <h2 style={{
            fontSize: '32px',
            fontWeight: '700',
            color: '#00F0FF',
            marginBottom: '2rem'
          }}>
            P2P Trading Safety Tips
          </h2>

          <div style={{
            background: 'rgba(34, 197, 94, 0.05)',
            border: '2px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '16px',
            padding: '2rem'
          }}>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {p2pSafetySteps.map((tip, index) => (
                <div key={index} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <IoCheckmarkCircle size={24} color="#22C55E" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <p style={{ color: '#E2E8F0', fontSize: '16px', margin: 0 }}>
                    {tip}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Scam Warnings */}
        <section style={{ marginBottom: '4rem' }}>
          <h2 style={{
            fontSize: '32px',
            fontWeight: '700',
            color: '#EF4444',
            marginBottom: '2rem'
          }}>
            ⚠️ Common Scams to Avoid
          </h2>

          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {scamWarnings.map((warning, index) => (
              <div
                key={index}
                style={{
                  background: warning.severity === 'high' ? 'rgba(239, 68, 68, 0.05)' : 'rgba(251, 146, 60, 0.05)',
                  border: `2px solid ${warning.severity === 'high' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(251, 146, 60, 0.3)'}`,
                  borderRadius: '12px',
                  padding: '1.5rem',
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'flex-start'
                }}
              >
                <IoWarning                   size={28}
                  color={warning.severity === 'high' ? '#EF4444' : '#FB923C'}
                  style={{ flexShrink: 0 }}
                />
                <div>
                  <h4 style={{
                    fontSize: '18px',
                    fontWeight: '700',
                    color: warning.severity === 'high' ? '#EF4444' : '#FB923C',
                    marginBottom: '0.5rem'
                  }}>
                    {warning.title}
                  </h4>
                  <p style={{ color: '#888', fontSize: '14px', margin: 0 }}>
                    {warning.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Withdrawal Safety */}
        <section style={{ marginBottom: '4rem' }}>
          <h2 style={{
            fontSize: '32px',
            fontWeight: '700',
            color: '#00F0FF',
            marginBottom: '2rem'
          }}>
            Withdrawal Safety
          </h2>

          <div style={{
            background: 'rgba(168, 85, 247, 0.05)',
            border: '2px solid rgba(168, 85, 247, 0.3)',
            borderRadius: '16px',
            padding: '2rem'
          }}>
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              <div>
                <h4 style={{ fontSize: '18px', fontWeight: '700', color: '#A855F7', marginBottom: '0.75rem' }}>
                  Always Double-Check Addresses
                </h4>
                <p style={{ color: '#888', fontSize: '14px', lineHeight: '1.6' }}>
                  Crypto transactions are irreversible. Verify the wallet address character by character before confirming. One wrong character means lost funds forever.
                </p>
              </div>

              <div>
                <h4 style={{ fontSize: '18px', fontWeight: '700', color: '#A855F7', marginBottom: '0.75rem' }}>
                  Start With Small Test Transactions
                </h4>
                <p style={{ color: '#888', fontSize: '14px', lineHeight: '1.6' }}>
                  When withdrawing to a new address, send a small test amount first. Confirm it arrives correctly before sending the full amount.
                </p>
              </div>

              <div>
                <h4 style={{ fontSize: '18px', fontWeight: '700', color: '#A855F7', marginBottom: '0.75rem' }}>
                  Use Whitelisted Addresses
                </h4>
                <p style={{ color: '#888', fontSize: '14px', lineHeight: '1.6' }}>
                  Save frequently used withdrawal addresses. This reduces the risk of copy-paste errors or clipboard malware.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Support */}
        <section>
          <div style={{
            background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.1), rgba(168, 85, 247, 0.1))',
            border: '2px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '16px',
            padding: '2rem',
            textAlign: 'center'
          }}>
            <IoPeople size={48} color="#00F0FF" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#00F0FF', marginBottom: '1rem' }}>
              Need Help?
            </h3>
            <p style={{ color: '#888', fontSize: '16px', marginBottom: '1.5rem' }}>
              Our support team is available 24/7 to assist with security concerns or suspicious activity.
            </p>
            <button
              onClick={() => window.location.href = '/help'}
              style={{
                padding: '1rem 2rem',
                background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                border: 'none',
                borderRadius: '8px',
                color: '#000',
                fontSize: '16px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Contact Support
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
