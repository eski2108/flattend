import React, { useState, useEffect } from 'react';
import { IoAlertCircle, IoCheckmark as Check, IoCheckmarkCircle, IoClose, IoInformationCircle, IoMegaphone as Megaphone } from 'react-icons/io5';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function PromoBanner() {
  const [banner, setBanner] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Don't show banner on homepage
    if (window.location.pathname === '/' || window.location.pathname === '/home') {
      return;
    }
    fetchActiveBanner();
  }, []);

  const fetchActiveBanner = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/banners/active`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.banner) {
          // Check if user has dismissed this banner
          const dismissedBanners = JSON.parse(localStorage.getItem('dismissedBanners') || '[]');
          if (!dismissedBanners.includes(data.banner.banner_id)) {
            setBanner(data.banner);
            setIsVisible(true);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch banner:', error);
    }
  };

  const handleDismiss = () => {
    if (banner) {
      // Add to dismissed list in localStorage
      const dismissedBanners = JSON.parse(localStorage.getItem('dismissedBanners') || '[]');
      dismissedBanners.push(banner.banner_id);
      localStorage.setItem('dismissedBanners', JSON.stringify(dismissedBanners));
      
      setIsVisible(false);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'warning':
        return <IoAlertCircle size={20} />;
      case 'success':
        return <IoCheckmarkCircle size={20} />;
      case 'promo':
        return <Megaphone size={20} />;
      case 'info':
      default:
        return <IoInformationCircle size={20} />;
    }
  };

  const getColors = (type) => {
    switch (type) {
      case 'warning':
        return {
          bg: 'linear-gradient(135deg, rgba(251, 146, 60, 0.15) 0%, rgba(249, 115, 22, 0.1) 100%)',
          border: 'rgba(251, 146, 60, 0.4)',
          text: '#FB923C',
          icon: '#F97316'
        };
      case 'success':
        return {
          bg: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(22, 163, 74, 0.1) 100%)',
          border: 'rgba(34, 197, 94, 0.4)',
          text: '#22C55E',
          icon: '#16A34A'
        };
      case 'promo':
        return {
          bg: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(124, 58, 237, 0.1) 100%)',
          border: 'rgba(168, 85, 247, 0.4)',
          text: '#A855F7',
          icon: '#7C3AED'
        };
      case 'info':
      default:
        return {
          bg: 'linear-gradient(135deg, rgba(0, 240, 255, 0.15) 0%, rgba(168, 85, 247, 0.1) 100%)',
          border: 'rgba(0, 240, 255, 0.4)',
          text: '#00F0FF',
          icon: '#00F0FF'
        };
    }
  };

  if (!isVisible || !banner) {
    return null;
  }

  const colors = getColors(banner.type);

  return (
    <div
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderLeft: `4px solid ${colors.text}`,
        padding: '1rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        position: 'relative',
        animation: 'slideDown 0.5s ease-out',
        boxShadow: `0 4px 16px ${colors.border}40`
      }}
    >
      {/* Icon */}
      <div
        style={{
          flexShrink: 0,
          color: colors.icon,
          display: 'flex',
          alignItems: 'center'
        }}
      >
        {getIcon(banner.type)}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          flexWrap: 'wrap'
        }}>
          {banner.title && (
            <h3 style={{
              margin: 0,
              fontSize: '0.9375rem',
              fontWeight: '700',
              color: colors.text
            }}>
              {banner.title}
            </h3>
          )}
          <p style={{
            margin: 0,
            fontSize: '0.875rem',
            color: '#E2E8F0',
            flex: 1
          }}>
            {banner.message}
          </p>
          {banner.link && banner.link_text && (
            <a
              href={banner.link}
              style={{
                padding: '0.5rem 1rem',
                background: colors.text,
                color: '#000',
                textDecoration: 'none',
                borderRadius: '6px',
                fontSize: '0.8125rem',
                fontWeight: '700',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = `0 4px 12px ${colors.text}40`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {banner.link_text} →
            </a>
          )}
        </div>
      </div>

      {/* Dismiss Button */}
      <button
        onClick={handleDismiss}
        style={{
          flexShrink: 0,
          background: 'rgba(255, 255, 255, 0.1)',
          border: 'none',
          borderRadius: '6px',
          padding: '0.5rem',
          cursor: 'pointer',
          color: '#94A3B8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
          e.currentTarget.style.color = '#E2E8F0';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
          e.currentTarget.style.color = '#94A3B8';
        }}
      >
        <IoClose size={16} />
      </button>

      <style>
        {`
          @keyframes slideDown {
            from {
              transform: translateY(-100%);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
        `}
      </style>
    </div>
  );
}
