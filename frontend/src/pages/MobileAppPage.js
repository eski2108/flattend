import React from 'react';
import { IoClose, IoPhonePortrait, IoLogoApple, IoLogoAndroid, IoDownload, IoCheckmarkCircle } from 'react-icons/io5';
import Layout from '@/components/Layout';

const MobileAppPage = () => {
  const handleIOSInstall = () => {
    // Show iOS PWA installation instructions
    alert(
      'To install CoinHubX on your iPhone:\n\n' +
      '1. Open this page in Safari\n' +
      '2. Tap the Share button (square with arrow)\n' +
      '3. Scroll down and tap "Add to Home Screen"\n' +
      '4. Tap "Add" in the top right corner\n\n' +
      'The app will now appear on your home screen!'
    );
  };

  const handleAndroidDownload = () => {
    // In production, this should link to actual APK or Play Store
    window.open('https://coinhubx.net/download/coinhubx.apk', '_blank');
  };

  return (
    <Layout>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)',
        padding: '40px 20px'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h1 style={{
              fontSize: '48px',
              fontWeight: '900',
              background: 'linear-gradient(135deg, #00F0FF 0%, #9B4DFF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '20px'
            }}>
              📱 Get CoinHubX Mobile
            </h1>
            <p style={{ color: '#B8C5D6', fontSize: '20px', maxWidth: '600px', margin: '0 auto' }}>
              Trade crypto on the go. Available for iOS and Android.
            </p>
          </div>

          {/* Options Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '30px',
            marginBottom: '60px'
          }}>
            {/* iOS PWA */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(26, 31, 58, 0.8), rgba(19, 24, 41, 0.6))',
              border: '2px solid rgba(0, 240, 255, 0.3)',
              borderRadius: '20px',
              padding: '40px',
              textAlign: 'center',
              boxShadow: '0 0 40px rgba(0, 240, 255, 0.2)'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                background: 'linear-gradient(135deg, #00F0FF, #9B4DFF)',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                boxShadow: '0 10px 40px rgba(0, 240, 255, 0.4)'
              }}>
                <IoLogoApple size={48} color="#FFFFFF" />
              </div>
              <h2 style={{ color: '#FFFFFF', fontSize: '28px', fontWeight: '800', marginBottom: '12px' }}>
                iPhone / iPad
              </h2>
              <p style={{ color: '#888', fontSize: '15px', marginBottom: '24px', lineHeight: '1.6' }}>
                Install our Progressive Web App (PWA) directly from Safari. No App Store needed!
              </p>
              <button
                onClick={handleIOSInstall}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: 'linear-gradient(135deg, #00F0FF 0%, #9B4DFF 100%)',
                  border: 'none',
                  borderRadius: '14px',
                  color: '#FFFFFF',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  boxShadow: '0 6px 24px rgba(0, 240, 255, 0.4)',
                  transition: 'transform 0.3s'
                }}
                onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
              >
                <IoPhonePortrait size={24} />
                Install PWA on iPhone
              </button>
            </div>

            {/* Android APK */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(26, 31, 58, 0.8), rgba(19, 24, 41, 0.6))',
              border: '2px solid rgba(0, 240, 255, 0.3)',
              borderRadius: '20px',
              padding: '40px',
              textAlign: 'center',
              boxShadow: '0 0 40px rgba(0, 240, 255, 0.2)'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                background: 'linear-gradient(135deg, #3DDC84, #00C853)',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                boxShadow: '0 10px 40px rgba(61, 220, 132, 0.4)'
              }}>
                <IoLogoAndroid size={48} color="#FFFFFF" />
              </div>
              <h2 style={{ color: '#FFFFFF', fontSize: '28px', fontWeight: '800', marginBottom: '12px' }}>
                Android
              </h2>
              <p style={{ color: '#888', fontSize: '15px', marginBottom: '24px', lineHeight: '1.6' }}>
                Download the APK and install directly, or get it from Google Play Store.
              </p>
              <button
                onClick={handleAndroidDownload}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: 'linear-gradient(135deg, #3DDC84 0%, #00C853 100%)',
                  border: 'none',
                  borderRadius: '14px',
                  color: '#FFFFFF',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  boxShadow: '0 6px 24px rgba(61, 220, 132, 0.4)',
                  transition: 'transform 0.3s'
                }}
                onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
              >
                <IoDownload size={24} />
                Download APK for Android
              </button>
            </div>
          </div>

          {/* Installation Instructions */}
          <div style={{
            background: 'rgba(26, 31, 58, 0.6)',
            border: '2px solid rgba(0, 240, 255, 0.2)',
            borderRadius: '20px',
            padding: '40px',
            marginBottom: '40px'
          }}>
            <h3 style={{ color: '#00F0FF', fontSize: '24px', fontWeight: '800', marginBottom: '30px', textAlign: 'center' }}>
              📝 Installation Guide
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '30px'
            }}>
              {/* iOS Steps */}
              <div>
                <h4 style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IoLogoApple size={24} color="#00F0FF" />
                  iOS / Safari
                </h4>
                <ol style={{ color: '#B8C5D6', fontSize: '14px', lineHeight: '2', paddingLeft: '20px' }}>
                  <li>Open <strong>coinhubx.net</strong> in Safari</li>
                  <li>Tap the <strong>Share</strong> button 📤</li>
                  <li>Scroll and tap <strong>"Add to Home Screen"</strong></li>
                  <li>Tap <strong>"Add"</strong> in the top right</li>
                  <li>Find the app icon on your home screen! 🎉</li>
                </ol>
              </div>

              {/* Android Steps */}
              <div>
                <h4 style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IoLogoAndroid size={24} color="#3DDC84" />
                  Android
                </h4>
                <ol style={{ color: '#B8C5D6', fontSize: '14px', lineHeight: '2', paddingLeft: '20px' }}>
                  <li>Download the <strong>APK file</strong></li>
                  <li>Enable <strong>"Install from Unknown Sources"</strong> in Settings</li>
                  <li>Open the downloaded APK</li>
                  <li>Tap <strong>"Install"</strong></li>
                  <li>Open and start trading! 🚀</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Features */}
          <div style={{
            background: 'rgba(26, 31, 58, 0.6)',
            border: '2px solid rgba(0, 240, 255, 0.2)',
            borderRadius: '20px',
            padding: '40px'
          }}>
            <h3 style={{ color: '#00F0FF', fontSize: '24px', fontWeight: '800', marginBottom: '30px', textAlign: 'center' }}>
              ✨ App Features
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '24px'
            }}>
              {[
                { icon: '⚡', title: 'Lightning Fast', desc: 'Instant access to your portfolio' },
                { icon: '🔔', title: 'Push Notifications', desc: 'Real-time trade and price alerts' },
                { icon: '🔒', title: 'Secure', desc: 'Bank-grade encryption & 2FA' },
                { icon: '📊', title: 'Live Charts', desc: 'Track prices on the go' },
                { icon: '🤝', title: 'P2P Trading', desc: 'Buy & sell peer-to-peer' },
                { icon: '💰', title: 'Wallet Management', desc: 'Manage all your crypto' }
              ].map((feature, index) => (
                <div
                  key={index}
                  style={{
                    background: 'rgba(0, 0, 0, 0.2)',
                    border: '1px solid rgba(0, 240, 255, 0.2)',
                    borderRadius: '12px',
                    padding: '20px',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>{feature.icon}</div>
                  <h4 style={{ color: '#FFFFFF', fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>
                    {feature.title}
                  </h4>
                  <p style={{ color: '#888', fontSize: '13px', margin: 0 }}>
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default MobileAppPage;
