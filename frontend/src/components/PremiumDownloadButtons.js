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
    padding: compact ? '1.2rem 1.8rem' : '1.5rem 2.5rem',
    borderRadius: '20px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    minWidth: compact ? '300px' : '360px',
    fontSize: '1rem',
    fontWeight: '700',
    fontFamily: "'Inter', sans-serif",
    overflow: 'hidden',
    textDecoration: 'none',
    color: 'inherit',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)'
  };

  const appStoreStyle = {
    ...buttonBaseStyle,
    background: 'linear-gradient(135deg, #00F0FF 0%, #7B2CFF 50%, #A855F7 100%)',
    boxShadow: hoveredButton === 'appstore' 
      ? '0 0 40px rgba(0, 240, 255, 0.6), 0 0 80px rgba(123, 44, 255, 0.4), 0 20px 60px rgba(0, 240, 255, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
      : '0 0 28px rgba(0, 240, 255, 0.4), 0 0 56px rgba(123, 44, 255, 0.2), 0 12px 40px rgba(0, 240, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
    transform: hoveredButton === 'appstore' ? 'translateY(-8px) scale(1.02)' : 'translateY(0) scale(1)',
    color: '#ffffff',
    border: '1px solid rgba(0, 240, 255, 0.3)'
  };

  const googlePlayStyle = {
    ...buttonBaseStyle,
    background: 'linear-gradient(135deg, #00F0FF 0%, #00D4E6 30%, #7B2CFF 70%, #A855F7 100%)',
    boxShadow: hoveredButton === 'googleplay'
      ? '0 0 40px rgba(0, 240, 255, 0.7), 0 0 80px rgba(123, 44, 255, 0.5), 0 20px 60px rgba(0, 240, 255, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
      : '0 0 28px rgba(0, 240, 255, 0.5), 0 0 56px rgba(123, 44, 255, 0.3), 0 12px 40px rgba(0, 240, 255, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
    transform: hoveredButton === 'googleplay' ? 'translateY(-8px) scale(1.02)' : 'translateY(0) scale(1)',
    color: '#ffffff',
    border: '1px solid rgba(0, 240, 255, 0.4)'
  };

  const iconContainerStyle = {
    width: compact ? '52px' : '60px',
    height: compact ? '52px' : '60px',
    borderRadius: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: compact ? '30px' : '36px',
    transition: 'all 0.3s ease',
    background: 'rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.2)'
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
    fontSize: '28px',
    transition: 'all 0.3s ease',
    transform: hoveredButton ? 'translateX(6px) scale(1.1)' : 'translateX(0) scale(1)',
    filter: hoveredButton ? 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.8))' : 'none'
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
          aria-label="Install CoinHubX PWA for iPhone"
        >
          {/* Premium glow overlay */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: hoveredButton === 'appstore' 
              ? 'radial-gradient(circle at center, rgba(0, 240, 255, 0.15) 0%, rgba(123, 44, 255, 0.1) 50%, transparent 80%)'
              : 'radial-gradient(circle at center, rgba(0, 240, 255, 0.05) 0%, transparent 60%)',
            pointerEvents: 'none',
            transition: 'all 0.4s ease',
            borderRadius: '20px'
          }} />
          
          <div style={{
            ...iconContainerStyle,
            boxShadow: hoveredButton === 'appstore' 
              ? '0 0 20px rgba(0, 240, 255, 0.6), inset 0 0 20px rgba(255, 255, 255, 0.1)'
              : '0 0 10px rgba(0, 240, 255, 0.3), inset 0 0 10px rgba(255, 255, 255, 0.05)'
          }}>
            <IoLogoApple style={{ 
              color: '#ffffff',
              filter: hoveredButton === 'appstore' 
                ? 'drop-shadow(0 0 12px rgba(0, 240, 255, 1)) drop-shadow(0 0 24px rgba(255, 255, 255, 0.5))' 
                : 'drop-shadow(0 0 6px rgba(0, 240, 255, 0.6))'
            }} />
          </div>
          
          <div style={textContainerStyle}>
            <div style={labelStyle}>Install PWA on</div>
            <div style={storeNameStyle}>iPhone</div>
          </div>
          
          <IoPhonePortrait style={arrowStyle} />
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