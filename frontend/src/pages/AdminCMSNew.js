import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { IoCash as DollarSign, IoEye as Eye, IoPeople as Users, IoSave, IoSettings as Settings, IoTrendingUp as TrendingUp } from 'react-icons/io5';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL;

export default function AdminCMSNew() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('fees');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Fee Settings
  const [feeSettings, setFeeSettings] = useState({
    deposit_fee_percent: 0.5,
    withdraw_fee_percent: 1.0,
    p2p_trade_fee_percent: 1.0
  });
  
  // Seller Limits
  const [sellerLimits, setSellerLimits] = useState({
    max_offers_per_seller: 10,
    min_trade_amount_usd: 50,
    max_trade_amount_usd: 50000,
    min_seller_rating: 4.0,
    require_kyc_above_amount: 1000
  });
  
  // Marketplace Visibility
  const [marketplaceVisibility, setMarketplaceVisibility] = useState({
    show_ratings: true,
    show_trade_count: true,
    show_completion_rate: true,
    show_payment_methods: true,
    allow_user_offers: true,
    require_kyc_to_trade: false
  });
  
  // Display Settings
  const [displaySettings, setDisplaySettings] = useState({
    sort_by: 'best_price',
    default_crypto: 'BTC',
    default_fiat: 'GBP',
    offers_per_page: 20,
    show_offline_sellers: false
  });

  useEffect(() => {
    checkAdminAuth();
    fetchAllSettings();
  }, []);

  const checkAdminAuth = () => {
    const adminData = localStorage.getItem('cryptobank_admin');
    if (!adminData) {
      navigate('/admin/login');
    }
  };

  const fetchAllSettings = async () => {
    try {
      const [feesRes, limitsRes, visibilityRes, displayRes] = await Promise.all([
        axios.get(`${API}/api/cms/settings/fees`),
        axios.get(`${API}/api/cms/settings/seller-limits`),
        axios.get(`${API}/api/cms/settings/marketplace-visibility`),
        axios.get(`${API}/api/cms/settings/display`)
      ]);

      if (feesRes.data.success) {
        setFeeSettings(feesRes.data.fees);
      }

      if (limitsRes.data.success) {
        setSellerLimits(limitsRes.data.limits);
      }

      if (visibilityRes.data.success) {
        setMarketplaceVisibility(visibilityRes.data.visibility);
      }

      if (displayRes.data.success) {
        setDisplaySettings(displayRes.data.display);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load CMS settings');
      setLoading(false);
    }
  };

  const saveFeeSettings = async () => {
    setSaving(true);
    try {
      const response = await axios.put(`${API}/api/cms/settings/fees`, feeSettings);
      
      if (response.data.success) {
        toast.success('Fee settings saved successfully!');
      }
    } catch (error) {
      console.error('Error saving fee settings:', error);
      toast.error('Failed to save fee settings');
    } finally {
      setSaving(false);
    }
  };

  const saveSellerLimits = async () => {
    setSaving(true);
    try {
      const response = await axios.put(`${API}/api/cms/settings/seller-limits`, sellerLimits);
      
      if (response.data.success) {
        toast.success('Seller limits saved successfully!');
      }
    } catch (error) {
      console.error('Error saving seller limits:', error);
      toast.error('Failed to save seller limits');
    } finally {
      setSaving(false);
    }
  };

  const saveMarketplaceVisibility = async () => {
    setSaving(true);
    try {
      const response = await axios.put(`${API}/api/cms/settings/marketplace-visibility`, marketplaceVisibility);
      
      if (response.data.success) {
        toast.success('Marketplace visibility saved successfully!');
      }
    } catch (error) {
      console.error('Error saving marketplace visibility:', error);
      toast.error('Failed to save marketplace visibility');
    } finally {
      setSaving(false);
    }
  };

  const saveDisplaySettings = async () => {
    setSaving(true);
    try {
      const response = await axios.put(`${API}/api/cms/settings/display`, displaySettings);
      
      if (response.data.success) {
        toast.success('Display settings saved successfully!');
      }
    } catch (error) {
      console.error('Error saving display settings:', error);
      toast.error('Failed to save display settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: '3rem', textAlign: 'center', color: '#fff' }}>
          Loading CMS...
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#fff', marginBottom: '0.5rem' }}>
            CMS - Platform Configuration
          </h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            Manage marketplace settings, fees, and seller limits without code changes
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {[
            { id: 'fees', label: 'Wallet Fees', icon: DollarSign },
            { id: 'limits', label: 'Seller Limits', icon: Users },
            { id: 'visibility', label: 'Marketplace Visibility', icon: Eye },
            { id: 'display', label: 'Display & Sorting', icon: Sliders }
          ].map(tab => (
            <Button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: activeTab === tab.id 
                  ? 'linear-gradient(135deg, #00F0FF, #A855F7)'
                  : 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                padding: '0.75rem 1.5rem',
                fontSize: '16px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <tab.icon size={18} />
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Wallet Fees Tab */}
        {activeTab === 'fees' && (
          <Card style={{
            background: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '16px',
            padding: '2rem'
          }}>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#fff', marginBottom: '1.5rem' }}>
              Wallet Fee Settings
            </h2>
            
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {/* Deposit Fee */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '0.5rem' }}>
                  Deposit Fee (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={feeSettings.deposit_fee_percent}
                  onChange={(e) => setFeeSettings({...feeSettings, deposit_fee_percent: parseFloat(e.target.value)})}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '16px'
                  }}
                />
                <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginTop: '0.25rem' }}>
                  Fee charged when users deposit crypto to the platform
                </p>
              </div>

              {/* Withdrawal Fee */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '0.5rem' }}>
                  Withdrawal Fee (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={feeSettings.withdraw_fee_percent}
                  onChange={(e) => setFeeSettings({...feeSettings, withdraw_fee_percent: parseFloat(e.target.value)})}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '16px'
                  }}
                />
                <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginTop: '0.25rem' }}>
                  Fee charged when users withdraw crypto from the platform (Applied automatically)
                </p>
              </div>

              {/* P2P Trade Fee */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '0.5rem' }}>
                  P2P Trade Fee (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={feeSettings.p2p_trade_fee_percent}
                  onChange={(e) => setFeeSettings({...feeSettings, p2p_trade_fee_percent: parseFloat(e.target.value)})}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '16px'
                  }}
                />
                <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginTop: '0.25rem' }}>
                  Fee charged on P2P trades (Paid by seller, applied automatically)
                </p>
              </div>

              {/* Save Button */}
              <Button
                onClick={saveFeeSettings}
                disabled={saving}
                style={{
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  border: 'none',
                  padding: '1rem',
                  fontSize: '16px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  marginTop: '1rem'
                }}
              >
                <IoSave size={18} />
                {saving ? 'Saving...' : 'Save Fee Settings'}
              </Button>
            </div>
          </Card>
        )}

        {/* Seller Limits Tab */}
        {activeTab === 'limits' && (
          <Card style={{
            background: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '16px',
            padding: '2rem'
          }}>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#fff', marginBottom: '1.5rem' }}>
              Seller Limit Settings
            </h2>
            
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {/* Max Offers Per Seller */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '0.5rem' }}>
                  Max Offers Per Seller
                </label>
                <input
                  type="number"
                  value={sellerLimits.max_offers_per_seller}
                  onChange={(e) => setSellerLimits({...sellerLimits, max_offers_per_seller: parseInt(e.target.value)})}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '16px'
                  }}
                />
              </div>

              {/* Min Trade Amount */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '0.5rem' }}>
                  Minimum Trade Amount (USD)
                </label>
                <input
                  type="number"
                  value={sellerLimits.min_trade_amount_usd}
                  onChange={(e) => setSellerLimits({...sellerLimits, min_trade_amount_usd: parseFloat(e.target.value)})}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '16px'
                  }}
                />
              </div>

              {/* Max Trade Amount */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '0.5rem' }}>
                  Maximum Trade Amount (USD)
                </label>
                <input
                  type="number"
                  value={sellerLimits.max_trade_amount_usd}
                  onChange={(e) => setSellerLimits({...sellerLimits, max_trade_amount_usd: parseFloat(e.target.value)})}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '16px'
                  }}
                />
              </div>

              {/* Min Seller Rating */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '0.5rem' }}>
                  Minimum Seller Rating
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={sellerLimits.min_seller_rating}
                  onChange={(e) => setSellerLimits({...sellerLimits, min_seller_rating: parseFloat(e.target.value)})}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '16px'
                  }}
                />
              </div>

              {/* KYC Threshold */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '0.5rem' }}>
                  Require KYC Above Amount (USD)
                </label>
                <input
                  type="number"
                  value={sellerLimits.require_kyc_above_amount}
                  onChange={(e) => setSellerLimits({...sellerLimits, require_kyc_above_amount: parseFloat(e.target.value)})}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '16px'
                  }}
                />
                <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginTop: '0.25rem' }}>
                  Users must complete KYC to trade above this amount
                </p>
              </div>

              {/* Save Button */}
              <Button
                onClick={saveSellerLimits}
                disabled={saving}
                style={{
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  border: 'none',
                  padding: '1rem',
                  fontSize: '16px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  marginTop: '1rem'
                }}
              >
                <IoSave size={18} />
                {saving ? 'Saving...' : 'Save Seller Limits'}
              </Button>
            </div>
          </Card>
        )}

        {/* Marketplace Visibility Tab */}
        {activeTab === 'visibility' && (
          <Card style={{
            background: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '16px',
            padding: '2rem'
          }}>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#fff', marginBottom: '1.5rem' }}>
              Marketplace Visibility Controls
            </h2>
            
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {Object.entries(marketplaceVisibility).map(([key, value]) => (
                <div key={key} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem',
                  background: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: '8px',
                  border: '1px solid rgba(0, 240, 255, 0.2)'
                }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#fff', marginBottom: '0.25rem' }}>
                      {key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                      {getVisibilityDescription(key)}
                    </div>
                  </div>
                  <label style={{ position: 'relative', display: 'inline-block', width: '60px', height: '34px' }}>
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => setMarketplaceVisibility({...marketplaceVisibility, [key]: e.target.checked})}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{
                      position: 'absolute',
                      cursor: 'pointer',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: value ? '#10B981' : '#374151',
                      transition: '0.4s',
                      borderRadius: '34px'
                    }}>
                      <span style={{
                        position: 'absolute',
                        content: '',
                        height: '26px',
                        width: '26px',
                        left: value ? '30px' : '4px',
                        bottom: '4px',
                        backgroundColor: 'white',
                        transition: '0.4s',
                        borderRadius: '50%'
                      }} />
                    </span>
                  </label>
                </div>
              ))}

              {/* Save Button */}
              <Button
                onClick={saveMarketplaceVisibility}
                disabled={saving}
                style={{
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  border: 'none',
                  padding: '1rem',
                  fontSize: '16px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  marginTop: '1rem'
                }}
              >
                <IoSave size={18} />
                {saving ? 'Saving...' : 'Save Visibility Settings'}
              </Button>
            </div>
          </Card>
        )}

        {/* Display & Sorting Tab */}
        {activeTab === 'display' && (
          <Card style={{
            background: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '16px',
            padding: '2rem'
          }}>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#fff', marginBottom: '1.5rem' }}>
              Display & Sorting Settings
            </h2>
            
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {/* Sort By */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '0.5rem' }}>
                  Default Sort Order
                </label>
                <select
                  value={displaySettings.sort_by}
                  onChange={(e) => setDisplaySettings({...displaySettings, sort_by: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '16px'
                  }}
                >
                  <option value="best_price">Best Price First</option>
                  <option value="rating">Highest Rating First</option>
                  <option value="trades">Most Trades First</option>
                  <option value="newest">Newest First</option>
                </select>
              </div>

              {/* Default Crypto */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '0.5rem' }}>
                  Default Cryptocurrency
                </label>
                <select
                  value={displaySettings.default_crypto}
                  onChange={(e) => setDisplaySettings({...displaySettings, default_crypto: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '16px'
                  }}
                >
                  <option value="BTC">Bitcoin (BTC)</option>
                  <option value="ETH">Ethereum (ETH)</option>
                  <option value="USDT">Tether (USDT)</option>
                  <option value="BNB">Binance Coin (BNB)</option>
                  <option value="SOL">Solana (SOL)</option>
                </select>
              </div>

              {/* Default Fiat */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '0.5rem' }}>
                  Default Fiat Currency
                </label>
                <select
                  value={displaySettings.default_fiat}
                  onChange={(e) => setDisplaySettings({...displaySettings, default_fiat: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '16px'
                  }}
                >
                  <option value="GBP">British Pound (GBP)</option>
                  <option value="EUR">Euro (EUR)</option>
                  <option value="USD">US Dollar (USD)</option>
                </select>
              </div>

              {/* Offers Per Page */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '0.5rem' }}>
                  Offers Per Page
                </label>
                <input
                  type="number"
                  value={displaySettings.offers_per_page}
                  onChange={(e) => setDisplaySettings({...displaySettings, offers_per_page: parseInt(e.target.value)})}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '16px'
                  }}
                />
              </div>

              {/* Show Offline Sellers */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '8px',
                border: '1px solid rgba(0, 240, 255, 0.2)'
              }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#fff', marginBottom: '0.25rem' }}>
                    Show Offline Sellers
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                    Display sellers who are currently inactive
                  </div>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: '60px', height: '34px' }}>
                  <input
                    type="checkbox"
                    checked={displaySettings.show_offline_sellers}
                    onChange={(e) => setDisplaySettings({...displaySettings, show_offline_sellers: e.target.checked})}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute',
                    cursor: 'pointer',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: displaySettings.show_offline_sellers ? '#10B981' : '#374151',
                    transition: '0.4s',
                    borderRadius: '34px'
                  }}>
                    <span style={{
                      position: 'absolute',
                      content: '',
                      height: '26px',
                      width: '26px',
                      left: displaySettings.show_offline_sellers ? '30px' : '4px',
                      bottom: '4px',
                      backgroundColor: 'white',
                      transition: '0.4s',
                      borderRadius: '50%'
                    }} />
                  </span>
                </label>
              </div>

              {/* Save Button */}
              <Button
                onClick={saveDisplaySettings}
                disabled={saving}
                style={{
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  border: 'none',
                  padding: '1rem',
                  fontSize: '16px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  marginTop: '1rem'
                }}
              >
                <IoSave size={18} />
                {saving ? 'Saving...' : 'Save Display Settings'}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}

function getVisibilityDescription(key) {
  const descriptions = {
    show_ratings: 'Display seller ratings on marketplace offers',
    show_trade_count: 'Display total number of trades completed by sellers',
    show_completion_rate: 'Display seller completion percentage',
    show_payment_methods: 'Display available payment methods on offers',
    allow_user_offers: 'Allow regular users to create P2P offers',
    require_kyc_to_trade: 'Require KYC verification before trading'
  };
  return descriptions[key] || '';
}
