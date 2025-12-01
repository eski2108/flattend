import React, { useState } from 'react';

/**
 * TraderBadge Component - Phase 2
 * 
 * Displays performance badges for traders in the P2P marketplace.
 * Badges are earned based on completion rate, volume, response time, etc.
 */
const TraderBadge = ({ badge, size = 'small', showTooltip = true }) => {
  const [showTip, setShowTip] = useState(false);

  const sizes = {
    small: {
      container: '20px',
      icon: '14px',
      fontSize: '12px'
    },
    medium: {
      container: '28px',
      icon: '18px',
      fontSize: '14px'
    },
    large: {
      container: '36px',
      icon: '24px',
      fontSize: '16px'
    }
  };

  const currentSize = sizes[size] || sizes.small;

  const badgeStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: currentSize.container,
    height: currentSize.container,
    borderRadius: '50%',
    background: `${badge.color}22`,
    border: `2px solid ${badge.color}`,
    fontSize: currentSize.icon,
    cursor: showTooltip ? 'pointer' : 'default',
    position: 'relative',
    transition: 'all 0.3s ease',
    boxShadow: `0 0 10px ${badge.color}44`,
    animation: 'badgePulse 2s ease-in-out infinite'
  };

  const badgeHoverStyle = {
    ...badgeStyle,
    transform: 'scale(1.1)',
    boxShadow: `0 0 15px ${badge.color}88`,
  };

  const tooltipStyle = {
    position: 'absolute',
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginBottom: '8px',
    padding: '8px 12px',
    background: 'rgba(0, 20, 40, 0.95)',
    border: `1px solid ${badge.color}`,
    borderRadius: '8px',
    fontSize: currentSize.fontSize,
    color: badge.color,
    whiteSpace: 'nowrap',
    zIndex: 1000,
    boxShadow: `0 4px 12px ${badge.color}44`,
    pointerEvents: 'none',
    minWidth: '200px',
    textAlign: 'center'
  };

  const tooltipArrowStyle = {
    content: '""',
    position: 'absolute',
    top: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    borderWidth: '6px',
    borderStyle: 'solid',
    borderColor: `${badge.color} transparent transparent transparent`
  };

  return (
    <>
      <style>
        {`
          @keyframes badgePulse {
            0%, 100% {
              box-shadow: 0 0 10px ${badge.color}44;
            }
            50% {
              box-shadow: 0 0 20px ${badge.color}88;
            }
          }
        `}
      </style>
      <div
        style={showTip ? badgeHoverStyle : badgeStyle}
        onMouseEnter={() => showTooltip && setShowTip(true)}
        onMouseLeave={() => showTooltip && setShowTip(false)}
        title={!showTooltip ? badge.description : ''}
      >
        <span role="img" aria-label={badge.name}>
          {badge.icon}
        </span>
        
        {showTooltip && showTip && (
          <div style={tooltipStyle}>
            <div style={{ fontWeight: '600', marginBottom: '4px', color: badge.color }}>
              {badge.icon} {badge.name}
            </div>
            <div style={{ fontSize: '11px', color: '#A0AEC0' }}>
              {badge.description}
            </div>
            <div style={tooltipArrowStyle} />
          </div>
        )}
      </div>
    </>
  );
};

/**
 * TraderBadgeList Component
 * Displays multiple badges in a row
 */
export const TraderBadgeList = ({ badges = [], size = 'small', maxDisplay = 5 }) => {
  const displayBadges = badges.slice(0, maxDisplay);
  const remainingCount = badges.length - maxDisplay;

  const containerStyle = {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
    flexWrap: 'wrap'
  };

  const moreStyle = {
    fontSize: '12px',
    color: '#00F0FF',
    fontWeight: '600',
    marginLeft: '4px'
  };

  return (
    <div style={containerStyle}>
      {displayBadges.map((badge, index) => (
        <TraderBadge key={badge.badge_id || index} badge={badge} size={size} />
      ))}
      {remainingCount > 0 && (
        <span style={moreStyle}>+{remainingCount}</span>
      )}
    </div>
  );
};

/**
 * BadgeFilter Component
 * Allows filtering traders by specific badges
 */
export const BadgeFilter = ({ availableBadges, selectedBadges = [], onToggleBadge }) => {
  const containerStyle = {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    padding: '12px',
    background: 'rgba(0, 20, 40, 0.4)',
    borderRadius: '12px',
    border: '1px solid rgba(0, 240, 255, 0.2)'
  };

  const badgeButtonStyle = (isSelected, color) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '20px',
    border: `2px solid ${color}`,
    background: isSelected ? `${color}33` : 'transparent',
    color: color,
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    boxShadow: isSelected ? `0 0 15px ${color}66` : 'none'
  });

  return (
    <div style={containerStyle}>
      <div style={{ fontSize: '13px', color: '#A0AEC0', alignSelf: 'center' }}>
        Filter by Badge:
      </div>
      {Object.entries(availableBadges).map(([badgeId, badgeInfo]) => {
        const isSelected = selectedBadges.includes(badgeId);
        return (
          <button
            key={badgeId}
            style={badgeButtonStyle(isSelected, badgeInfo.color)}
            onClick={() => onToggleBadge(badgeId)}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = `0 0 15px ${badgeInfo.color}88`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = isSelected ? `0 0 15px ${badgeInfo.color}66` : 'none';
            }}
          >
            <span>{badgeInfo.icon}</span>
            <span>{badgeInfo.name}</span>
          </button>
        );
      })}
    </div>
  );
};

export default TraderBadge;
