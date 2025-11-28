import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';

const faqs = [
  {
    category: 'Getting Started',
    questions: [
      {
        q: 'How do I create an account?',
        a: 'Click "Sign Up" on the homepage, enter your details, and verify your email. You can also sign up with Google for faster registration.'
      },
      {
        q: 'Do I need KYC verification?',
        a: 'KYC is required to become a seller or for high-value transactions. Basic buying requires minimal verification.'
      },
      {
        q: 'What cryptocurrencies can I trade?',
        a: 'Currently, we support BTC, ETH, and USDT. More cryptocurrencies will be added soon.'
      }
    ]
  },
  {
    category: 'Trading',
    questions: [
      {
        q: 'How does P2P trading work?',
        a: 'Browse available offers in the Marketplace, select one that matches your needs, initiate a trade, make payment via the agreed method, and the seller releases crypto from escrow after confirming payment.'
      },
      {
        q: 'What is escrow protection?',
        a: 'When a trade starts, the seller\'s cryptocurrency is locked in our secure escrow. It\'s only released after the buyer confirms payment and the seller approves, or after admin resolves any disputes.'
      },
      {
        q: 'How long does a trade take?',
        a: 'Most trades complete within 15-30 minutes. You have a payment window (usually 15 minutes) to send payment. After marking as paid, the seller typically releases crypto within 5-10 minutes.'
      },
      {
        q: 'What payment methods are supported?',
        a: 'We support bank transfers, PayPal, Revolut, and other popular payment methods. Each seller specifies their accepted payment methods.'
      }
    ]
  },
  {
    category: 'Fees & Limits',
    questions: [
      {
        q: 'What are the trading fees?',
        a: 'Standard platform fees apply to completed trades. New users get 0% fees for 30 days with a referral code. Check your dashboard for current fee structure.'
      },
      {
        q: 'Are there trading limits?',
        a: 'Limits depend on your verification level. Unverified users have lower limits, while KYC-verified users enjoy higher trading limits.'
      },
      {
        q: 'How does the referral program work?',
        a: 'Share your referral code with friends. When they trade, you earn 20% of their trading fees for 12 months! They also get 0% fees for their first 30 days.'
      }
    ]
  },
  {
    category: 'Safety & Disputes',
    questions: [
      {
        q: 'What if I have a problem with a trade?',
        a: 'You can open a dispute directly from the trade page. Our admin team will review evidence from both parties and resolve the issue fairly within 24-48 hours.'
      },
      {
        q: 'How do I stay safe while trading?',
        a: 'Always use the platform chat, never release crypto before receiving payment, keep proof of payment, be wary of too-good-to-be-true offers, and report suspicious users.'
      },
      {
        q: 'Is my cryptocurrency safe?',
        a: 'Yes! We use industry-standard security including cold storage, multi-signature wallets, and regular security audits. Your crypto is always under escrow protection during trades.'
      }
    ]
  },
  {
    category: 'Selling Crypto',
    questions: [
      {
        q: 'How do I become a seller?',
        a: 'Go to Merchant Center, complete KYC verification, add payment methods, and create your first ad. Once approved, your ad will appear in the marketplace.'
      },
      {
        q: 'Can I set my own prices?',
        a: 'Yes! When creating an ad, you can set your price as a percentage above or below market rate, or use a fixed price.'
      },
      {
        q: 'How do I receive payments?',
        a: 'Buyers send payment using the method you specified (bank transfer, PayPal, etc.). After verifying payment receipt, you release crypto from escrow.'
      }
    ]
  },
  {
    category: 'Technical',
    questions: [
      {
        q: 'Do you have a mobile app?',
        a: 'Our platform is fully mobile-responsive. A dedicated mobile app is coming soon!'
      },
      {
        q: 'Which countries do you support?',
        a: 'Coin Hub X is available globally. However, some countries may have restrictions. Check our supported regions list for details.'
      },
      {
        q: 'How do I contact support?',
        a: 'Use the live chat button (bottom right), email support@coinhubx.com, or open a support ticket from your dashboard. We\'re available 24/7!'
      }
    ]
  }
];

export default function FAQ() {
  const navigate = useNavigate();
  const [openItems, setOpenItems] = useState({});

  const toggleItem = (categoryIndex, questionIndex) => {
    const key = `${categoryIndex}-${questionIndex}`;
    setOpenItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
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
          <ArrowLeft size={18} />
          Back to Home
        </button>

        <div style={{
          textAlign: 'center',
          marginBottom: '3rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '1rem' }}>
            <HelpCircle size={48} color="#22C55E" />
            <h1 style={{ color: '#fff', fontSize: '48px', fontWeight: '900', margin: 0 }}>FAQ</h1>
          </div>
          <p style={{ color: '#888', fontSize: '18px' }}>Find answers to commonly asked questions</p>
        </div>

        {faqs.map((category, catIndex) => (
          <div key={catIndex} style={{ marginBottom: '3rem' }}>
            <h2 style={{
              color: '#00F0FF',
              fontSize: '28px',
              fontWeight: '700',
              marginBottom: '1.5rem'
            }}>
              {category.category}
            </h2>

            {category.questions.map((item, qIndex) => {
              const key = `${catIndex}-${qIndex}`;
              const isOpen = openItems[key];

              return (
                <div
                  key={qIndex}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(0, 240, 255, 0.2)',
                    borderRadius: '12px',
                    marginBottom: '1rem',
                    overflow: 'hidden',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <button
                    onClick={() => toggleItem(catIndex, qIndex)}
                    style={{
                      width: '100%',
                      padding: '1.5rem',
                      background: 'none',
                      border: 'none',
                      color: '#fff',
                      fontSize: '18px',
                      fontWeight: '600',
                      textAlign: 'left',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <span>{item.q}</span>
                    {isOpen ? <ChevronUp size={24} color="#00F0FF" /> : <ChevronDown size={24} color="#888" />}
                  </button>

                  {isOpen && (
                    <div style={{
                      padding: '0 1.5rem 1.5rem 1.5rem',
                      color: '#ccc',
                      fontSize: '16px',
                      lineHeight: '1.7',
                      borderTop: '1px solid rgba(0, 240, 255, 0.1)'
                    }}>
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        <div style={{
          background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.1), rgba(168, 85, 247, 0.1))',
          border: '2px solid rgba(0, 240, 255, 0.3)',
          borderRadius: '16px',
          padding: '2rem',
          textAlign: 'center',
          marginTop: '3rem'
        }}>
          <h3 style={{ color: '#fff', fontSize: '24px', fontWeight: '700', marginBottom: '1rem' }}>
            Still have questions?
          </h3>
          <p style={{ color: '#ccc', fontSize: '16px', marginBottom: '1.5rem' }}>
            Our support team is available 24/7 to help you
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              padding: '14px 32px',
              background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
              border: 'none',
              borderRadius: '12px',
              color: '#000',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(0, 240, 255, 0.4)'
            }}
          >
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
}
