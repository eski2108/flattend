import React, { useState } from 'react';
import { IoLogoApple, IoLogoGooglePlaystore, IoArrowForward, IoPhonePortrait, IoDownload, IoCloudDownload } from 'react-icons/io5';

const PremiumDownloadButtons = ({ showTitle = true, compact = false }) => {
  const [hoveredButton, setHoveredButton] = useState(null);

  const handleAppStoreClick = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      alert('To install CoinHubX on iPhone:\n\n1. Tap the Share button (⬆️)\n2. Scroll and tap "Add to Home Screen"\n3. Tap "Add" to install\n\nThe app will appear on your home screen!');
    } else {
      // For non-iOS devices, show PWA instructions
      alert('To install CoinHubX:\n\n1. Open this site in Safari\n2. Tap the Share button (⬆️)\n3. Scroll and tap "Add to Home Screen"\n4. Tap "Add" to install\n\nThe app will appear on your home screen!');
    }
  };

  const handleGooglePlayClick = () => {
    // Trigger APK download
    const link = document.createElement('a');
    link.href = '/api/download-app';
    link.download = 'CoinHubX.apk';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const buttonBaseStyle = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: compact ? '1rem 1.5rem' : '1.25rem 2rem',
    borderRadius: '20px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    minWidth: compact ? '280px' : '340px',
    fontSize: '1rem',
    fontWeight: '700',
    fontFamily: "'Inter', sans-serif",
    overflow: 'hidden',
    textDecoration: 'none',
    color: 'inherit'
  };

  const appStoreStyle = {
    ...buttonBaseStyle,
    background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #000000 100%)',
    boxShadow: hoveredButton === 'appstore' 
      ? '0 20px 60px rgba(0, 240, 255, 0.4), 0 0 0 2px rgba(0, 240, 255, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
      : '0 12px 40px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(0, 240, 255, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
    transform: hoveredButton === 'appstore' ? 'translateY(-8px) scale(1.02)' : 'translateY(0) scale(1)',
    color: '#ffffff'
  };

  const googlePlayStyle = {
    ...buttonBaseStyle,
    background: 'linear-gradient(135deg, #00F0FF 0%, #00D4E6 50%, #00B8CC 100%)',
    boxShadow: hoveredButton === 'googleplay'
      ? '0 20px 60px rgba(0, 240, 255, 0.6), 0 0 0 2px rgba(0, 240, 255, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
      : '0 12px 40px rgba(0, 240, 255, 0.4), 0 0 0 1px rgba(0, 240, 255, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
    transform: hoveredButton === 'googleplay' ? 'translateY(-8px) scale(1.02)' : 'translateY(0) scale(1)',
    color: '#000000'
  };

  const iconContainerStyle = {
    width: compact ? '48px' : '56px',
    height: compact ? '48px' : '56px',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: compact ? '28px' : '32px',
    transition: 'all 0.3s ease'
  };

  const textContainerStyle = {
    flex: 1,
    textAlign: 'left',
    marginLeft: '1rem',
    marginRight: '1rem'
  };

  const labelStyle = {
    fontSize: compact ? '0.7rem' : '0.75rem',
    opacity: 0.8,
    fontWeight: '600',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    marginBottom: '2px',
    lineHeight: '1'
  };

  const storeNameStyle = {
    fontSize: compact ? '1.3rem' : '1.5rem',
    fontWeight: '900',
    letterSpacing: '-0.5px',
    lineHeight: '1',
    fontFamily: "'Space Grotesk', sans-serif"
  };

  const arrowStyle = {
    fontSize: '24px',
    transition: 'transform 0.3s ease',
    transform: hoveredButton ? 'translateX(4px)' : 'translateX(0)'
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: compact ? '1rem' : '2rem',
      width: '100%',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      {showTitle && (
        <div style={{ textAlign: 'center', marginBottom: compact ? '1rem' : '2rem' }}>
          <h2 style={{
            fontSize: compact ? 'clamp(1.5rem, 4vw, 2rem)' : 'clamp(2rem, 5vw, 2.5rem)',
            fontWeight: '900',
            background: 'linear-gradient(135deg, #00F0FF 0%, #A855F7 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '0.75rem',
            fontFamily: "'Space Grotesk', sans-serif",
            letterSpacing: '-0.02em',
            filter: 'drop-shadow(0 0 30px rgba(0, 240, 255, 0.3))'
          }}>
            Download CoinHubX Mobile App
          </h2>
          <p style={{
            fontSize: compact ? '1rem' : '1.125rem',
            color: 'rgba(255, 255, 255, 0.8)',
            fontWeight: '500',
            lineHeight: '1.5'
          }}>
            Trade crypto P2P with full escrow protection on your mobile device
          </p>
        </div>
      )}

      <div style={{
        display: 'flex',
        gap: compact ? '1rem' : '2rem',
        justifyContent: 'center',
        flexWrap: 'wrap',
        width: '100%'
      }}>
        {/* App Store Button */}
        <button
          style={appStoreStyle}
          onMouseEnter={() => setHoveredButton('appstore')}
          onMouseLeave={() => setHoveredButton(null)}
          onClick={handleAppStoreClick}
          aria-label="Download CoinHubX for iPhone from App Store"
        >
          {/* Subtle glow overlay */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: hoveredButton === 'appstore' 
              ? 'radial-gradient(circle at center, rgba(0, 240, 255, 0.1) 0%, transparent 70%)'
              : 'transparent',
            pointerEvents: 'none',
            transition: 'all 0.3s ease'
          }} />
          
          <div style={{
            ...iconContainerStyle,
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <IoLogoApple style={{ 
              color: '#ffffff',
              filter: hoveredButton === 'appstore' ? 'drop-shadow(0 0 10px rgba(0, 240, 255, 0.8))' : 'none'
            }} />
          </div>
          
          <div style={textContainerStyle}>
            <div style={labelStyle}>Download on the</div>
            <div style={storeNameStyle}>App Store</div>
          </div>
          
          <IoArrowForward style={arrowStyle} />
        </button>

        {/* Google Play Button */}
        <button
          style={googlePlayStyle}
          onMouseEnter={() => setHoveredButton('googleplay')}
          onMouseLeave={() => setHoveredButton(null)}
          onClick={handleGooglePlayClick}
          aria-label="Download CoinHubX for Android from Google Play"
        >
          {/* Subtle glow overlay */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: hoveredButton === 'googleplay'
              ? 'radial-gradient(circle at center, rgba(255, 255, 255, 0.1) 0%, transparent 70%)'
              : 'transparent',
            pointerEvents: 'none',
            transition: 'all 0.3s ease'
          }} />
          
          <div style={{
            ...iconContainerStyle,
            background: 'rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(0, 0, 0, 0.2)'
          }}>
            <IoLogoGooglePlaystore style={{ 
              color: '#000000',
              filter: hoveredButton === 'googleplay' ? 'drop-shadow(0 0 10px rgba(0, 0, 0, 0.5))' : 'none'
            }} />
          </div>
          
          <div style={textContainerStyle}>
            <div style={labelStyle}>Get it on</div>
            <div style={storeNameStyle}>Google Play</div>
          </div>
          
          <IoArrowForward style={arrowStyle} />
        </button>
      </div>

      {/* Feature highlights */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: compact ? '1rem' : '2rem',
        flexWrap: 'wrap',
        marginTop: compact ? '1rem' : '1.5rem',
        padding: '0 1rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: compact ? '0.85rem' : '0.9rem',
          color: 'rgba(255, 255, 255, 0.8)',
          fontWeight: '500'
        }}>
          <div style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px'
          }}>
            🛡️
          </div>
          <span>Escrow Protected</span>
        </div>
        
        <div style={{
          width: '4px',
          height: '4px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.4)'
        }} />
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: compact ? '0.85rem' : '0.9rem',
          color: 'rgba(255, 255, 255, 0.8)',
          fontWeight: '500'
        }}>
          <div style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px'
          }}>
            ⚡
          </div>
          <span>Instant Trading</span>
        </div>
        
        <div style={{
          width: '4px',
          height: '4px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.4)'
        }} />
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: compact ? '0.85rem' : '0.9rem',
          color: 'rgba(255, 255, 255, 0.8)',
          fontWeight: '500'
        }}>
          <div style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px'
          }}>
            📱
          </div>
          <span>Mobile Optimized</span>
        </div>
      </div>
    </div>
  );
};

export default PremiumDownloadButtons;