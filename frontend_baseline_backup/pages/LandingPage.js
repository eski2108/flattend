import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@/contexts/WalletContext';
import { Button } from '@/components/ui/button';
import { ArrowRight, Shield, TrendingUp, Zap, Lock, Users, DollarSign, CreditCard } from 'lucide-react';
import Logo from '@/components/Logo';
import axios from 'axios';
import Footer from '@/components/Footer';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Animated Counter Component
const AnimatedCounter = ({ end, duration = 2000, suffix = '' }) => {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const counterRef = React.useRef(null);

  useEffect(() => {
    if (hasAnimated) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setHasAnimated(true);
          let startTime;
          const animate = (currentTime) => {
            if (!startTime) startTime = currentTime;
            const progress = Math.min((currentTime - startTime) / duration, 1);
            const easeOutQuad = 1 - (1 - progress) * (1 - progress);
            setCount(Math.floor(easeOutQuad * end));
            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              setCount(end);
            }
          };
          requestAnimationFrame(animate);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    if (counterRef.current) observer.observe(counterRef.current);
    return () => observer.disconnect();
  }, [end, duration, hasAnimated]);

  return <span ref={counterRef}>{count}{suffix}</span>;
};

// StatBox Component
const StatBox = ({ icon, number, suffix, label, microcopy }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.08), rgba(168, 85, 247, 0.08))',
        borderRadius: '20px',
        border: '2px solid rgba(0, 240, 255, 0.3)',
        padding: 'clamp(2rem, 4vw, 3rem)',
        textAlign: 'center',
        boxShadow: isHovered 
          ? '0 0 40px rgba(0, 240, 255, 0.4), 0 0 80px rgba(168, 85, 247, 0.3), 0 8px 32px rgba(0, 0, 0, 0.5)'
          : '0 0 25px rgba(0, 240, 255, 0.25), 0 0 50px rgba(168, 85, 247, 0.15), 0 4px 20px rgba(0, 0, 0, 0.4)',
        transform: isHovered ? 'translateY(-8px)' : 'translateY(0)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Subtle gradient overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at top, rgba(0, 240, 255, 0.1) 0%, transparent 70%)',
        pointerEvents: 'none',
        opacity: isHovered ? 1 : 0.5,
        transition: 'opacity 0.4s ease'
      }} />
      
      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Icon */}
        <div style={{
          fontSize: 'clamp(48px, 6vw, 64px)',
          marginBottom: '1rem',
          filter: isHovered ? 'drop-shadow(0 0 20px rgba(0, 240, 255, 0.6))' : 'none',
          transition: 'filter 0.3s ease'
        }}>
          {icon}
        </div>
        
        {/* Number */}
        <div style={{
          fontSize: 'clamp(48px, 8vw, 72px)',
          fontWeight: '900',
          background: 'linear-gradient(135deg, #00F0FF 0%, #A855F7 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: '0.5rem',
          lineHeight: '1',
          letterSpacing: '-0.02em',
          filter: 'drop-shadow(0 0 30px rgba(0, 240, 255, 0.4))'
        }}>
          <AnimatedCounter end={number} suffix={suffix} duration={2000} />
        </div>
        
        {/* Label */}
        <div style={{
          fontSize: 'clamp(16px, 2.5vw, 20px)',
          fontWeight: '700',
          color: '#fff',
          marginBottom: '0.75rem',
          letterSpacing: '0.5px'
        }}>
          {label}
        </div>
        
        {/* Microcopy */}
        <div style={{
          fontSize: 'clamp(13px, 2vw, 14px)',
          color: 'rgba(203, 213, 225, 0.9)',
          lineHeight: '1.5',
          fontWeight: '400'
        }}>
          {microcopy}
        </div>
      </div>
    </div>
  );
};

export default function LandingPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    // Check if user is already logged in
    const userData = localStorage.getItem('cryptobank_user');
    if (userData) {
      navigate('/dashboard');
    }
    fetchPlatformStats();
  }, [navigate]);

  const fetchPlatformStats = async () => {
    try {
      const response = await axios.get(`${API}/platform/stats`);
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-gradient"></div>
        <nav className="nav-bar">
          <div className="nav-content">
            <div className="logo" data-testid="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
              <Logo size={46} showText={true} />
            </div>
            <div className="nav-buttons">
              <Button
                onClick={() => navigate('/login')}
                variant="ghost"
                className="login-btn"
                data-testid="login-btn"
              >
                Log In
              </Button>
              <Button
                onClick={() => navigate('/auth')}
                className="connect-wallet-btn"
                data-testid="register-btn"
              >
                Sign Up
              </Button>
            </div>
          </div>
        </nav>

        <div className="hero-content">
          <h1 className="hero-title" data-testid="hero-title">
            Trade Crypto P2P
            <br />
            <span className="gradient-text">With Total Protection</span>
          </h1>
          <p className="hero-subtitle" data-testid="hero-subtitle">
            Secure escrow system. Real-time dispute resolution. Bank-grade encryption.
            <br />
            Join the safest peer-to-peer cryptocurrency trading platform.
          </p>
          <div className="hero-cta" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
            <Button
              size="lg"
              onClick={() => navigate('/auth')}
              className="primary-cta-btn"
              data-testid="get-started-btn"
            >
              Create My Account Free <ArrowRight className="ml-2" size={20} />
            </Button>
            
            {/* Download Mobile App Button */}
            <Button
              size="lg"
              onClick={() => window.open('/api/download-app', '_blank')}
              style={{
                background: 'linear-gradient(135deg, #A855F7, #8B5CF6)',
                color: '#fff',
                padding: '0.875rem 2rem',
                fontSize: '1rem',
                fontWeight: '700',
                border: 'none',
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(168, 85, 247, 0.4)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer'
              }}
            >
              Download Mobile App
            </Button>
          </div>
          <p style={{ 
            marginTop: '1.5rem', 
            fontSize: '0.95rem', 
            color: 'rgba(148, 163, 184, 0.9)', 
            textAlign: 'center',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            flexWrap: 'wrap'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L4 6V12C4 16.55 7.16 20.74 12 22C16.84 20.74 20 16.55 20 12V6L12 2Z" stroke="#00F0FF" strokeWidth="2"/>
              </svg> Bank-grade security
            </span>
            <span style={{ color: 'rgba(71, 85, 105, 0.6)' }}>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="#00F0FF" stroke="#00F0FF" strokeWidth="2"/>
              </svg> Instant settlements
            </span>
            <span style={{ color: 'rgba(71, 85, 105, 0.6)' }}>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#A855F7" strokeWidth="2"/>
                <path d="M9 12L11 14L15 10" stroke="#A855F7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg> 100% Escrow protected
            </span>
          </p>

          {/* Buy/Sell Buttons - Prominent on Landing Page */}
          <div style={{ 
            display: 'flex', 
            gap: '1rem', 
            marginTop: '2.5rem', 
            justifyContent: 'center',
            flexWrap: 'wrap',
            padding: '0 1rem'
          }}>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate('/p2p-marketplace');
              }}
              data-testid="landing-buy-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: window.innerWidth < 768 ? '1rem 2rem' : '1.5rem 3rem',
                fontSize: window.innerWidth < 768 ? '1rem' : '1.3rem',
                fontWeight: '800',
                fontFamily: "'Space Grotesk', sans-serif",
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                borderRadius: '12px',
                border: '3px solid rgb(0, 255, 255)',
                background: 'rgb(0, 255, 255)',
                backgroundImage: 'linear-gradient(180deg, rgb(0, 255, 255) 0%, rgb(0, 240, 255) 50%, rgb(0, 220, 255) 100%)',
                color: '#000000',
                cursor: 'pointer',
                minWidth: window.innerWidth < 768 ? '160px' : '240px',
                flex: window.innerWidth < 768 ? '1 1 45%' : '0 0 auto',
                boxShadow: '0 0 30px rgba(0, 255, 255, 0.9), 0 0 60px rgba(0, 255, 255, 0.6), 0 8px 20px rgba(0, 0, 0, 0.5)',
                transition: 'all 0.3s ease',
                zIndex: 10,
                position: 'relative',
                WebkitBackgroundClip: 'padding-box',
                WebkitTextFillColor: '#000000'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-6px) scale(1.05)';
                e.currentTarget.style.boxShadow = '0 0 50px rgba(0, 255, 255, 1), 0 0 100px rgba(0, 255, 255, 0.8), 0 12px 30px rgba(0, 0, 0, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 255, 255, 0.8), 0 0 60px rgba(0, 255, 255, 0.5), 0 8px 20px rgba(0, 0, 0, 0.5)';
              }}
            >
              <TrendingUp size={28} />
              <span>Buy Crypto</span>
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate('/p2p-marketplace');
              }}
              data-testid="landing-sell-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: window.innerWidth < 768 ? '1rem 2rem' : '1.5rem 3rem',
                fontSize: window.innerWidth < 768 ? '1rem' : '1.3rem',
                fontWeight: '800',
                fontFamily: "'Space Grotesk', sans-serif",
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                borderRadius: '12px',
                border: '3px solid rgb(224, 160, 255)',
                background: 'rgb(224, 160, 255)',
                backgroundImage: 'linear-gradient(180deg, rgb(230, 170, 255) 0%, rgb(210, 140, 255) 50%, rgb(200, 120, 255) 100%)',
                color: '#000000',
                cursor: 'pointer',
                minWidth: window.innerWidth < 768 ? '160px' : '240px',
                flex: window.innerWidth < 768 ? '1 1 45%' : '0 0 auto',
                boxShadow: '0 0 30px rgba(224, 160, 255, 0.9), 0 0 60px rgba(192, 96, 255, 0.6), 0 8px 20px rgba(0, 0, 0, 0.5)',
                transition: 'all 0.3s ease',
                zIndex: 10,
                position: 'relative',
                WebkitBackgroundClip: 'padding-box',
                WebkitTextFillColor: '#000000'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-6px) scale(1.05)';
                e.currentTarget.style.boxShadow = '0 0 50px rgba(224, 160, 255, 1), 0 0 100px rgba(192, 96, 255, 0.8), 0 12px 30px rgba(0, 0, 0, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 0 30px rgba(224, 160, 255, 0.8), 0 0 60px rgba(192, 96, 255, 0.5), 0 8px 20px rgba(0, 0, 0, 0.5)';
              }}
            >
              <TrendingUp size={28} style={{ transform: 'rotate(180deg)' }} />
              <span>Sell Crypto</span>
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate('/buy-crypto-card');
              }}
              data-testid="landing-buy-card-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: window.innerWidth < 768 ? '1rem 2rem' : '1.5rem 3rem',
                fontSize: window.innerWidth < 768 ? '1rem' : '1.3rem',
                fontWeight: '800',
                fontFamily: "'Space Grotesk', sans-serif",
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                borderRadius: '12px',
                border: '3px solid #FFB800',
                background: 'linear-gradient(180deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)',
                color: '#1A0800',
                cursor: 'pointer',
                minWidth: window.innerWidth < 768 ? '160px' : '240px',
                flex: window.innerWidth < 768 ? '1 1 45%' : '0 0 auto',
                boxShadow: '0 0 30px rgba(255, 184, 0, 0.8), 0 0 60px rgba(255, 165, 0, 0.5), 0 8px 20px rgba(0, 0, 0, 0.5)',
                transition: 'all 0.3s ease',
                zIndex: 10,
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-6px) scale(1.05)';
                e.currentTarget.style.boxShadow = '0 0 50px rgba(255, 184, 0, 1), 0 0 100px rgba(255, 165, 0, 0.8), 0 12px 30px rgba(0, 0, 0, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 0 30px rgba(255, 184, 0, 0.8), 0 0 60px rgba(255, 165, 0, 0.5), 0 8px 20px rgba(0, 0, 0, 0.5)';
              }}
            >
              <CreditCard size={28} />
              <span>Buy with Card</span>
            </button>
          </div>

        </div>
      </section>

      {/* Premium Stats Section */}
      <section id="stats-section" style={{
        padding: 'clamp(3rem, 8vh, 6rem) clamp(1rem, 4vw, 2rem)',
        background: 'linear-gradient(180deg, #0a0e27 0%, #0f1128 100%)',
        position: 'relative'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: 'clamp(28px, 4vw, 40px)',
            fontWeight: '800',
            textAlign: 'center',
            marginBottom: '3rem',
            color: '#fff',
            letterSpacing: '-0.5px'
          }}>
            Trusted Platform Metrics
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '2rem',
            position: 'relative'
          }}>
            {/* Stat Box 1: 100% Escrow */}
            <StatBox
              icon="🛡️"
              number="100"
              suffix="%"
              label="Escrow Protected"
              microcopy="Every trade secured with smart escrow"
            />
            
            {/* Stat Box 2: Fast Trades */}
            <StatBox
              icon={<svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="url(#statGradient1)" stroke="url(#statGradient1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <defs>
                  <linearGradient id="statGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00F0FF" />
                    <stop offset="100%" stopColor="#A855F7" />
                  </linearGradient>
                </defs>
              </svg>}
              number="15"
              suffix=" min"
              label="Average Trade Time"
              microcopy="Complete trades in under 15 minutes"
            />
            
            {/* Stat Box 3: Low Fees */}
            <StatBox
              icon={<svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="url(#statGradient2)" strokeWidth="2"/>
                <path d="M12 6V18M9 9H13.5C14.163 9 14.7989 9.26339 15.2678 9.73223C15.7366 10.2011 16 10.837 16 11.5C16 12.163 15.7366 12.7989 15.2678 13.2678C14.7989 13.7366 14.163 14 13.5 14H9" stroke="url(#statGradient2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <defs>
                  <linearGradient id="statGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00F0FF" />
                    <stop offset="100%" stopColor="#A855F7" />
                  </linearGradient>
                </defs>
              </svg>}
              number="1"
              suffix="%"
              label="Platform Fee"
              microcopy="Transparent pricing, no hidden charges"
            />
            
            {/* Stat Box 4: 24/7 Support */}
            <StatBox
              icon={<svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 11.5C21.0034 12.8199 20.6951 14.1219 20.1 15.3C19.3944 16.7118 18.3098 17.8992 16.9674 18.7293C15.6251 19.5594 14.0782 19.9994 12.5 20C11.1801 20.0035 9.87812 19.6951 8.7 19.1L3 21L4.9 15.3C4.30493 14.1219 3.99656 12.8199 4 11.5C4.00061 9.92179 4.44061 8.37488 5.27072 7.03258C6.10083 5.69028 7.28825 4.6056 8.7 3.90003C9.87812 3.30496 11.1801 2.99659 12.5 3.00003H13C15.0843 3.11502 17.053 3.99479 18.5291 5.47089C20.0052 6.94699 20.885 8.91568 21 11V11.5Z" stroke="url(#statGradient3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <defs>
                  <linearGradient id="statGradient3" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00F0FF" />
                    <stop offset="100%" stopColor="#A855F7" />
                  </linearGradient>
                </defs>
              </svg>}
              number="24"
              suffix="/7"
              label="Live Support"
              microcopy="Professional mediation team available"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="features-content">
          <h2 className="section-title" data-testid="features-title">Why Traders Choose Coin Hub X</h2>
          <div className="features-grid">
            <div 
              className="feature-card" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate('/faq');
              }} 
              data-testid="feature-secure"
              style={{
                cursor: 'pointer',
                zIndex: 1,
                position: 'relative'
              }}
            >
              <div className="feature-icon">
                <Shield size={32} />
              </div>
              <h3>Military-Grade Escrow</h3>
              <p>Your cryptocurrency is secured in our smart escrow system. Funds are only released when both parties confirm successful trade completion.</p>
              <div className="card-cta">How It Works →</div>
            </div>

            <div 
              className="feature-card" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate('/p2p-marketplace');
              }} 
              data-testid="feature-instant"
              style={{
                cursor: 'pointer',
                zIndex: 1,
                position: 'relative'
              }}
            >
              <div className="feature-icon">
                <Zap size={32} />
              </div>
              <h3>Real-Time Settlement</h3>
              <p>Complete trades in under 15 minutes. Direct peer-to-peer transactions with instant escrow release upon confirmation.</p>
              <div className="card-cta">Start Trading →</div>
            </div>

            <div 
              className="feature-card" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate('/faq');
              }} 
              data-testid="feature-transparent"
              style={{
                cursor: 'pointer',
                zIndex: 1,
                position: 'relative'
              }}
            >
              <div className="feature-icon">
                <Lock size={32} />
              </div>
              <h3>24/7 Dispute Protection</h3>
              <p>Professional mediation team available around the clock. Every dispute is reviewed and resolved within 24 hours with full transparency.</p>
              <div className="card-cta">Learn More →</div>
            </div>

            <div 
              className="feature-card" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate('/payment-methods');
              }} 
              data-testid="feature-wallet"
              style={{
                cursor: 'pointer',
                zIndex: 1,
                position: 'relative'
              }}
            >
              <div className="feature-icon">
                <DollarSign size={32} />
              </div>
              <h3>Global Payment Support</h3>
              <p>Accept bank transfers via SEPA, SWIFT, PIX, UPI, M-Pesa, and 10+ additional payment methods worldwide.</p>
              <div className="card-cta">View All Methods →</div>
            </div>

            <div 
              className="feature-card" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate('/fees');
              }} 
              data-testid="feature-low-fees"
              style={{
                cursor: 'pointer',
                zIndex: 1,
                position: 'relative'
              }}
            >
              <div className="feature-icon">
                <TrendingUp size={32} />
              </div>
              <h3>Transparent Fee Structure</h3>
              <p>1% trading fee. 1% withdrawal fee. No hidden charges. No escrow fees. What you see is what you pay.</p>
              <div className="card-cta">View Full Pricing →</div>
            </div>

            <div 
              className="feature-card" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate('/auth');
              }} 
              data-testid="feature-support"
              style={{
                cursor: 'pointer',
                zIndex: 1,
                position: 'relative'
              }}
            >
              <div className="feature-icon">
                <Users size={32} />
              </div>
              <h3>Trusted Traders</h3>
              <p>Trade with confidence using our community reputation system. User ratings and trade history ensure safe transactions.</p>
              <div className="card-cta">Get Verified Now →</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works-section">
        <div className="how-content">
          <h2 className="section-title" data-testid="how-it-works-title">Start Trading in 3 Simple Steps</h2>
          <div className="steps-grid">
            <div 
              className="step-card" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate('/auth');
              }} 
              data-testid="step-1"
              style={{
                cursor: 'pointer',
                zIndex: 1,
                position: 'relative'
              }}
            >
              <div className="step-number">1</div>
              <h3>Register & Start</h3>
              <p>Create your account in under 2 minutes. No KYC required — start trading immediately with full platform access.</p>
              <div className="card-cta">Create Account →</div>
            </div>
            <div 
              className="step-card" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate('/p2p-marketplace');
              }} 
              data-testid="step-2"
              style={{
                cursor: 'pointer',
                zIndex: 1,
                position: 'relative'
              }}
            >
              <div className="step-number">2</div>
              <h3>Browse & Select Offers</h3>
              <p>Choose from thousands of verified buy and sell offers. Filter by price, payment method, and trader rating.</p>
              <div className="card-cta">View Marketplace →</div>
            </div>
            <div 
              className="step-card" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate('/p2p-marketplace');
              }} 
              data-testid="step-3"
              style={{
                cursor: 'pointer',
                zIndex: 1,
                position: 'relative'
              }}
            >
              <div className="step-number">3</div>
              <h3>Trade with Protection</h3>
              <p>Execute trades with automatic escrow protection. Release funds only when you confirm receipt of payment.</p>
              <div className="card-cta">Start Trading →</div>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Trust Section */}
      <section className="security-section" style={{
        padding: 'clamp(4rem, 10vh, 8rem) clamp(1rem, 4vw, 2rem)',
        background: 'linear-gradient(180deg, #0A0E27 0%, #0D1128 100%)',
        position: 'relative'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <h2 className="section-title">Your Security is Our Priority</h2>
          <p style={{ 
            fontSize: 'clamp(1rem, 2.5vw, 1.25rem)', 
            color: 'var(--text-secondary)', 
            marginBottom: '3rem',
            maxWidth: '800px',
            marginLeft: 'auto',
            marginRight: 'auto'
          }}>
            Industry-leading security measures to protect your trades and cryptocurrency
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(250px, 100%), 1fr))',
            gap: '2rem',
            marginTop: '3rem'
          }}>
            <div style={{
              padding: '2rem',
              background: 'rgba(30, 36, 67, 0.6)',
              backdropFilter: 'blur(30px)',
              borderRadius: '20px',
              border: '2px solid rgba(0, 240, 255, 0.2)',
              textAlign: 'center'
            }}>
              <div style={{ 
                width: '80px', 
                height: '80px', 
                margin: '0 auto 1.5rem',
                background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.2), rgba(168, 85, 247, 0.2))',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid rgba(0, 240, 255, 0.3)'
              }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L4 6V12C4 16.55 7.16 20.74 12 22C16.84 20.74 20 16.55 20 12V6L12 2Z" stroke="url(#gradient1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 12L11 14L15 10" stroke="url(#gradient1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <defs>
                    <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#00F0FF" />
                      <stop offset="100%" stopColor="#A855F7" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
                256-bit Encryption
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                Bank-grade SSL encryption protects all your data and transactions
              </p>
            </div>
            <div style={{
              padding: '2rem',
              background: 'rgba(30, 36, 67, 0.6)',
              backdropFilter: 'blur(30px)',
              borderRadius: '20px',
              border: '2px solid rgba(0, 240, 255, 0.2)',
              textAlign: 'center'
            }}>
              <div style={{ 
                width: '80px', 
                height: '80px', 
                margin: '0 auto 1.5rem',
                background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.2), rgba(168, 85, 247, 0.2))',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid rgba(0, 240, 255, 0.3)'
              }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="url(#gradient2)" strokeWidth="2"/>
                  <path d="M12 6V12L16 14" stroke="url(#gradient2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <defs>
                    <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#00F0FF" />
                      <stop offset="100%" stopColor="#A855F7" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
                Smart Contract Escrow
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                Automated escrow system ensures funds are never at risk
              </p>
            </div>
            <div style={{
              padding: '2rem',
              background: 'rgba(30, 36, 67, 0.6)',
              backdropFilter: 'blur(30px)',
              borderRadius: '20px',
              border: '2px solid rgba(0, 240, 255, 0.2)',
              textAlign: 'center'
            }}>
              <div style={{ 
                width: '80px', 
                height: '80px', 
                margin: '0 auto 1.5rem',
                background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.2), rgba(168, 85, 247, 0.2))',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid rgba(0, 240, 255, 0.3)'
              }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="url(#gradient3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="url(#gradient3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M17 11L19 13L23 9" stroke="url(#gradient3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <defs>
                    <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#00F0FF" />
                      <stop offset="100%" stopColor="#A855F7" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
                User Reputation System
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                Trade safely with community trust scores and completed-trade history — no KYC required.
              </p>
            </div>
            <div style={{
              padding: '2rem',
              background: 'rgba(30, 36, 67, 0.6)',
              backdropFilter: 'blur(30px)',
              borderRadius: '20px',
              border: '2px solid rgba(0, 240, 255, 0.2)',
              textAlign: 'center'
            }}>
              <div style={{ 
                width: '80px', 
                height: '80px', 
                margin: '0 auto 1.5rem',
                background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.2), rgba(168, 85, 247, 0.2))',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid rgba(0, 240, 255, 0.3)'
              }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="url(#gradient4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z" stroke="url(#gradient4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" stroke="url(#gradient4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 3.13C16.8604 3.3503 17.623 3.8507 18.1676 4.55231C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89317 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="url(#gradient4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <defs>
                    <linearGradient id="gradient4" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#00F0FF" />
                      <stop offset="100%" stopColor="#A855F7" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
                Expert Support Team
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                Professional mediators available 24/7 to resolve any issues
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Download App Section */}
      <section className="download-app-section" id="download-app">
        <div className="download-content">
          <h2 className="section-title" data-testid="download-title">Download Coin Hub X App</h2>
          <p className="download-subtitle">
            Use Coin Hub X on any device.
          </p>
          <div className="download-buttons-container" style={{ 
            display: 'flex', 
            gap: '2rem', 
            justifyContent: 'center', 
            flexWrap: 'wrap', 
            marginTop: '3rem',
            maxWidth: '800px',
            margin: '0 auto'
          }}>
            {/* Android Download Button - Premium Design */}
            <button
              onClick={() => window.open('/api/download-app', '_blank')}
              style={{
                position: 'relative',
                background: 'linear-gradient(135deg, #00F0FF 0%, #00B8E6 100%)',
                color: '#000',
                padding: '0',
                fontSize: '1rem',
                fontWeight: '700',
                border: 'none',
                borderRadius: '16px',
                boxShadow: '0 8px 32px rgba(0, 240, 255, 0.4), 0 0 0 1px rgba(0, 240, 255, 0.1)',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0, 4, 0, 0.2, 1)',
                minWidth: '320px',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
                e.currentTarget.style.boxShadow = '0 16px 48px rgba(0, 240, 255, 0.6), 0 0 0 2px rgba(0, 240, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 240, 255, 0.4), 0 0 0 1px rgba(0, 240, 255, 0.1)';
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1.5rem 2rem',
                background: 'rgba(0, 0, 0, 0.05)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    background: 'rgba(0, 0, 0, 0.1)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px'
                  }}>
                    📱
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ 
                      fontSize: '0.75rem', 
                      opacity: 0.7, 
                      fontWeight: '600',
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase',
                      marginBottom: '2px'
                    }}>
                      Download for
                    </div>
                    <div style={{ 
                      fontSize: '1.5rem', 
                      fontWeight: '900',
                      letterSpacing: '-0.5px',
                      lineHeight: '1'
                    }}>
                      Android
                    </div>
                  </div>
                </div>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </button>

            {/* iOS Download Button - Premium Design */}
            <button
              onClick={() => {
                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                if (isIOS) {
                  alert('To install on iPhone:\n\n1. Tap the Share button\n2. Scroll and tap "Add to Home Screen"\n3. Tap "Add" to install Coin Hub X\n\nThe app will appear on your home screen!');
                } else {
                  window.open('https://finance-check-5.preview.emergentagent.com', '_blank');
                }
              }}
              style={{
                position: 'relative',
                background: 'linear-gradient(135deg, #A855F7 0%, #8B5CF6 100%)',
                color: '#fff',
                padding: '0',
                fontSize: '1rem',
                fontWeight: '700',
                border: 'none',
                borderRadius: '16px',
                boxShadow: '0 8px 32px rgba(168, 85, 247, 0.4), 0 0 0 1px rgba(168, 85, 247, 0.1)',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                minWidth: '320px',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
                e.currentTarget.style.boxShadow = '0 16px 48px rgba(168, 85, 247, 0.6), 0 0 0 2px rgba(168, 85, 247, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(168, 85, 247, 0.4), 0 0 0 1px rgba(168, 85, 247, 0.1)';
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1.5rem 2rem',
                background: 'rgba(0, 0, 0, 0.15)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px'
                  }}>
                    🍎
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ 
                      fontSize: '0.75rem', 
                      opacity: 0.8, 
                      fontWeight: '600',
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase',
                      marginBottom: '2px'
                    }}>
                      Download for
                    </div>
                    <div style={{ 
                      fontSize: '1.5rem', 
                      fontWeight: '900',
                      letterSpacing: '-0.5px',
                      lineHeight: '1'
                    }}>
                      iPhone
                    </div>
                  </div>
                </div>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </button>
          </div>
          <p className="download-note" style={{
            color: '#a0a0a0',
            fontSize: '14px',
            marginTop: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}>
            Full P2P trading experience with escrow protection on your mobile device
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2 className="cta-title" data-testid="cta-title">Ready to Trade Securely?</h2>
          <p className="cta-subtitle">Join verified traders on the most secure P2P cryptocurrency platform</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              size="lg"
              onClick={() => navigate('/auth')}
              className="cta-btn"
              data-testid="cta-connect-btn"
            >
              Create My Account
            </Button>
            <Button
              size="lg"
              onClick={() => document.getElementById('download-app')?.scrollIntoView({ behavior: 'smooth' })}
              className="cta-btn-secondary"
              data-testid="cta-download-btn"
            >
              Get Mobile App
            </Button>
          </div>
          <p style={{ 
            marginTop: '2rem', 
            fontSize: '0.9rem', 
            color: 'rgba(148, 163, 184, 0.95)', 
            textAlign: 'center',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            flexWrap: 'wrap'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
              <path d="M12 2L4 6V12C4 16.55 7.16 20.74 12 22C16.84 20.74 20 16.55 20 12V6L12 2Z" stroke="#00F0FF" strokeWidth="2"/>
              <path d="M9 12L11 14L15 10" stroke="#00F0FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Your assets and data are secured with industry-standard encryption</span>
          </p>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
