import React from 'react';
import { IoSearch, IoFunnel, IoTrendingUp, IoTrendingDown, IoStar, IoStarOutline } from 'react-icons/io5';

/**
 * WalletFilters Component
 * Advanced filtering and sorting for wallet assets
 * Supports search, categories, and sortable columns
 */
export default function WalletFilters({
  searchTerm,
  onSearchChange,
  selectedCategories = [],
  onCategoryToggle,
  sortBy,
  sortDirection,
  onSortChange,
  onToggleFavorites
}) {
  const categories = [
    { id: 'all', label: 'All Assets', color: '#00C6FF' },
    { id: 'favorites', label: 'Favorites', icon: IoStar, color: '#FBBF24' },
    { id: 'gainers', label: 'Gainers', icon: IoTrendingUp, color: '#22C55E' },
    { id: 'losers', label: 'Losers', icon: IoTrendingDown, color: '#EF4444' }
  ];

  const sortOptions = [
    { value: 'value', label: 'Total Value' },
    { value: 'name', label: 'Name (A-Z)' },
    { value: 'change', label: '24h Change' },
    { value: 'balance', label: 'Balance' }
  ];

  return (
    <div style={{
      background: 'rgba(0, 0, 0, 0.2)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '16px',
      padding: '20px',
      marginBottom: '20px'
    }}>
      {/* Top Row: Search and Sort */}
      <div style={{
        display: 'flex',
        gap: '16px',
        marginBottom: '16px',
        flexWrap: 'wrap'
      }}>
        {/* Search Box */}
        <div style={{
          flex: '1',
          minWidth: '250px',
          position: 'relative'
        }}>
          <IoSearch
            size={20}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#8F9BB3'
            }}
          />
          <input
            type="text"
            placeholder="Search coins..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 12px 12px 44px',
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              color: '#FFFFFF',
              fontSize: '14px',
              outline: 'none',
              transition: 'all 0.2s ease'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#00C6FF';
              e.currentTarget.style.background = 'rgba(0, 198, 255, 0.05)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.3)';
            }}
          />
        </div>

        {/* Sort Dropdown */}
        <div style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center'
        }}>
          <IoFunnel size={18} color="#8F9BB3" />
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value, sortDirection)}
            style={{
              padding: '12px 16px',
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              color: '#FFFFFF',
              fontSize: '14px',
              cursor: 'pointer',
              outline: 'none',
              minWidth: '150px'
            }}
          >
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>
                Sort by: {option.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => onSortChange(sortBy, sortDirection === 'asc' ? 'desc' : 'asc')}
            style={{
              padding: '12px',
              background: 'rgba(0, 198, 255, 0.1)',
              border: '1px solid rgba(0, 198, 255, 0.3)',
              borderRadius: '12px',
              color: '#00C6FF',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0, 198, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(0, 198, 255, 0.1)';
            }}
          >
            {sortDirection === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {/* Category Filters */}
      <div style={{
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap'
      }}>
        {categories.map(category => {
          const isSelected = selectedCategories.includes(category.id) || 
                           (selectedCategories.length === 0 && category.id === 'all');
          const Icon = category.icon;
          
          return (
            <button
              key={category.id}
              onClick={() => onCategoryToggle(category.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                background: isSelected 
                  ? `${category.color}22` 
                  : 'rgba(0, 0, 0, 0.3)',
                border: `1px solid ${isSelected ? category.color : 'rgba(255, 255, 255, 0.1)'}`,
                borderRadius: '20px',
                color: isSelected ? category.color : '#8F9BB3',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = category.color + '66';
                  e.currentTarget.style.color = category.color;
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.color = '#8F9BB3';
                }
              }}
            >
              {Icon && <Icon size={14} />}
              {category.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
