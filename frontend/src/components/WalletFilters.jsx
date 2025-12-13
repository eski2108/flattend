import React from 'react';
import { IoSearch, IoFunnel, IoTrendingUp, IoTrendingDown, IoStar } from 'react-icons/io5';

/**
 * WalletFilters Component - Binance Premium Design
 * Exact brand colors and styling
 */
export default function WalletFilters({
  searchTerm,
  onSearchChange,
  selectedCategories = [],
  onCategoryToggle,
  sortBy,
  sortDirection,
  onSortChange
}) {
  const categories = [
    { id: 'all', label: 'All Assets', color: '#F0B90B' },
    { id: 'favorites', label: 'Favorites', icon: IoStar, color: '#F0B90B' },
    { id: 'gainers', label: 'Gainers', icon: IoTrendingUp, color: '#0ECB81' },
    { id: 'losers', label: 'Losers', icon: IoTrendingDown, color: '#F6465D' }
  ];

  const sortOptions = [
    { value: 'value', label: 'Total Value' },
    { value: 'name', label: 'Name (A-Z)' },
    { value: 'change', label: '24h Change' },
    { value: 'balance', label: 'Balance' }
  ];

  return (
    <div style={{
      background: 'rgba(18, 22, 28, 0.85)',
      backdropFilter: 'blur(12px)',
      border: '1px solid #1E2329',
      borderRadius: '14px',
      padding: '20px',
      marginBottom: '20px',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)'
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
              color: '#B7BDC6'
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
              background: '#0B0E11',
              border: '1px solid #1E2329',
              borderRadius: '12px',
              color: '#EAECEF',
              fontSize: '14px',
              outline: 'none',
              transition: 'all 0.2s ease'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#F0B90B';
              e.currentTarget.style.background = 'rgba(240, 185, 11, 0.05)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#1E2329';
              e.currentTarget.style.background = '#0B0E11';
            }}
          />
        </div>

        {/* Sort Dropdown */}
        <div style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center'
        }}>
          <IoFunnel size={18} color="#B7BDC6" />
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value, sortDirection)}
            style={{
              padding: '12px 16px',
              background: '#0B0E11',
              border: '1px solid #1E2329',
              borderRadius: '12px',
              color: '#EAECEF',
              fontSize: '14px',
              cursor: 'pointer',
              outline: 'none',
              minWidth: '150px',
              fontWeight: '500'
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
              background: 'rgba(240, 185, 11, 0.1)',
              border: '1px solid #F0B90B',
              borderRadius: '12px',
              color: '#F0B90B',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontWeight: '600',
              fontSize: '16px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(240, 185, 11, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(240, 185, 11, 0.1)';
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
                  ? `rgba(240, 185, 11, 0.15)` 
                  : '#0B0E11',
                border: `1px solid ${isSelected ? category.color : '#1E2329'}`,
                borderRadius: '20px',
                color: isSelected ? category.color : '#B7BDC6',
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
                  e.currentTarget.style.borderColor = '#1E2329';
                  e.currentTarget.style.color = '#B7BDC6';
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
