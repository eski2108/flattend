import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Layout from '@/components/Layout';
const API = process.env.REACT_APP_BACKEND_URL;
import { IoAdd, IoAlertCircle, IoCheckmark, IoCheckmarkCircle, IoClose, IoCreate } from 'react-icons/io5';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';;

// API already defined

function PaymentMethods() {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMethod, setEditingMethod] = useState(null);
  const [methodTypes, setMethodTypes] = useState({});
  const [validationErrors, setValidationErrors] = useState({});
  const [formData, setFormData] = useState({
    method_type: 'UK Bank Transfer',
    nickname: '',
    currency: 'GBP',
    is_active: true,
    details: {}
  });

  useEffect(() => {
    loadPaymentMethods();
    loadMethodTypes();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('cryptobank_user') || localStorage.getItem('user'));
      if (!user) {
        toast.error('Please log in');
        return;
      }
      const response = await axios.get(`${API}/api/payment-methods/${user.user_id}`);
      setMethods(response.data.payment_methods || []);
    } catch (error) {
      console.error('Failed to load payment methods:', error);
      toast.error(error.response?.data?.detail || 'Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  };

  const loadMethodTypes = async () => {
    try {
      const response = await axios.get(`${API}/api/payment-methods/types`);
      setMethodTypes(response.data.types || {});
    } catch (error) {
      console.error('Failed to load method types:', error);
    }
  };

  const handleAddMethod = () => {
    setEditingMethod(null);
    setFormData({
      method_type: 'UK Bank Transfer',
      nickname: '',
      currency: 'GBP',
      is_active: true,
      details: {}
    });
    setValidationErrors({});
    setShowAddModal(true);
  };

  const handleEditMethod = (method) => {
    setEditingMethod(method);
    setFormData({
      method_type: method.method_type,
      nickname: method.nickname,
      currency: method.currency,
      is_active: method.is_active,
      details: method.details || {}
    });
    setValidationErrors({});
    setShowAddModal(true);
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.nickname.trim()) {
      errors.nickname = 'Nickname is required';
    }

    const config = methodTypes[formData.method_type];
    if (config) {
      config.required_fields.forEach(field => {
        if (!formData.details[field] || !formData.details[field].trim()) {
          errors[field] = `${field.replace('_', ' ')} is required`;
        }
      });
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveMethod = async () => {
    if (!validateForm()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const user = JSON.parse(localStorage.getItem('cryptobank_user') || localStorage.getItem('user'));
      
      if (editingMethod) {
        await axios.put(`${API}/api/payment-methods/${editingMethod.payment_method_id}`, formData);
        toast.success('✅ Payment method updated successfully!');
      } else {
        await axios.post(`${API}/api/payment-methods`, {
          ...formData,
          user_id: user.user_id
        });
        toast.success('✅ Payment method added successfully! You can now start selling.');
      }
      
      setShowAddModal(false);
      await loadPaymentMethods();
    } catch (error) {
      console.error('Save error:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to save payment method';
      toast.error('❌ ' + errorMsg);
      
      // Show validation errors if any
      if (error.response?.data?.errors) {
        setValidationErrors(error.response.data.errors);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMethod = async (methodId) => {
    if (!window.confirm('Are you sure you want to delete this payment method?')) return;
    
    try {
      await axios.delete(`${API}/api/payment-methods/${methodId}`);
      toast.success('✅ Payment method deleted');
      await loadPaymentMethods();
    } catch (error) {
      toast.error('❌ Failed to delete payment method');
    }
  };

  const handleToggleActive = async (method) => {
    try {
      await axios.put(`${API}/api/payment-methods/${method.payment_method_id}`, {
        ...method,
        is_active: !method.is_active
      });
      toast.success(method.is_active ? 'Method deactivated' : 'Method activated');
      await loadPaymentMethods();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const renderFormFields = () => {
    const config = methodTypes[formData.method_type];
    if (!config) return null;

    const allFields = [...(config.required_fields || []), ...(config.optional_fields || [])];

    return allFields.map(field => (
      <div key={field} style={{ marginBottom: '1.5rem' }}>
        <label style={{ 
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: '#fff', 
          fontSize: '14px', 
          fontWeight: '600', 
          marginBottom: '0.5rem' 
        }}>
          {field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          {config.required_fields.includes(field) && <span style={{ color: '#EF4444' }}>*</span>}
        </label>
        <input
          type="text"
          value={formData.details[field] || ''}
          onChange={(e) => {
            setFormData({
              ...formData,
              details: { ...formData.details, [field]: e.target.value }
            });
            // Clear error when user starts typing
            if (validationErrors[field]) {
              setValidationErrors({ ...validationErrors, [field]: null });
            }
          }}
          placeholder={`Enter ${field.replace('_', ' ')}`}
          style={{
            width: '100%',
            padding: '14px',
            background: 'rgba(0, 0, 0, 0.4)',
            border: validationErrors[field] 
              ? '2px solid rgba(239, 68, 68, 0.5)'
              : '2px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '10px',
            color: '#fff',
            fontSize: '14px',
            outline: 'none',
            transition: 'border-color 0.2s'
          }}
        />
        {validationErrors[field] && (
          <div style={{ 
            color: '#EF4444', 
            fontSize: '12px', 
            marginTop: '0.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}>
            <IoAlertCircle size={12} />
            {validationErrors[field]}
          </div>
        )}
      </div>
    ));
  };

  const activeMethodsCount = methods.filter(m => m.is_active).length;

  return (
    <Layout>
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)', padding: '2rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Header with Status */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h1 style={{ fontSize: '2rem', fontWeight: '800', background: 'linear-gradient(135deg, #00F0FF, #A855F7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.5rem' }}>
                  Payment Methods
                </h1>
                <p style={{ color: '#888', fontSize: '14px' }}>Manage your payment methods for P2P trading</p>
              </div>
              <button
                onClick={handleAddMethod}
                style={{
                  padding: '14px 28px',
                  background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#000',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'transform 0.2s',
                  boxShadow: '0 4px 12px rgba(0, 240, 255, 0.3)'
                }}
                onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
              >
                <IoAdd size={20} />
                Add Payment Method
              </button>
            </div>

            {/* Status Indicator */}
            {methods.length > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '1rem 1.5rem',
                background: activeMethodsCount > 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `2px solid ${activeMethodsCount > 0 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                borderRadius: '12px'
              }}>
                {activeMethodsCount > 0 ? (
                  <IoCheckmarkCircle size={20} color="#22C55E" />
                ) : (
                  <IoAlertCircle size={20} color="#EF4444" />
                )}
                <span style={{ color: activeMethodsCount > 0 ? '#22C55E' : '#EF4444', fontSize: '14px', fontWeight: '600' }}>
                  {activeMethodsCount > 0 
                    ? `You have ${activeMethodsCount} active payment method${activeMethodsCount > 1 ? 's' : ''} – Ready to sell!`
                    : 'No active payment methods – Add one to start selling'}
                </span>
              </div>
            )}
          </div>

          {/* Payment Methods List */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: '#888' }}>
              <AiOutlineLoading3Quarters size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
              <p>Loading payment methods...</p>
            </div>
          ) : methods.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '16px', border: '2px dashed rgba(0, 240, 255, 0.3)' }}>
              <IoAlertCircle size={48} color="#888" style={{ marginBottom: '1rem' }} />
              <p style={{ color: '#fff', fontSize: '20px', fontWeight: '700', marginBottom: '0.5rem' }}>No payment methods yet</p>
              <p style={{ color: '#888', fontSize: '14px', marginBottom: '2rem' }}>Add your first payment method to start accepting payments as a seller</p>
              <button
                onClick={handleAddMethod}
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                  border: 'none',
                  borderRadius: '10px',
                  color: '#000',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <IoAdd size={20} />
                Add Your First Method
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {methods.map(method => (
                <div key={method.payment_method_id} style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  border: `2px solid ${method.is_active ? 'rgba(0, 240, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}>
                  <div style={{ flex: '1 1 300px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                      <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '700', margin: 0 }}>
                        {method.nickname}
                      </h3>
                      <span style={{
                        padding: '4px 12px',
                        background: method.is_active ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        border: `1px solid ${method.is_active ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                        borderRadius: '6px',
                        color: method.is_active ? '#22C55E' : '#EF4444',
                        fontSize: '12px',
                        fontWeight: '600',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}>
                        {method.is_active ? <IoCheckmark size={12} /> : <IoClose size={12} />}
                        {method.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p style={{ color: '#888', fontSize: '14px', margin: '0.25rem 0' }}>
                      {method.method_type} • {method.currency}
                    </p>
                    {method.details && Object.keys(method.details).length > 0 && (
                      <p style={{ color: '#666', fontSize: '12px', marginTop: '0.5rem' }}>
                        {Object.keys(method.details).length} detail{Object.keys(method.details).length > 1 ? 's' : ''} saved
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => handleToggleActive(method)}
                      style={{
                        padding: '10px 18px',
                        background: 'rgba(168, 85, 247, 0.2)',
                        border: '1px solid rgba(168, 85, 247, 0.4)',
                        borderRadius: '8px',
                        color: '#A855F7',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                    >
                      {method.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleEditMethod(method)}
                      style={{
                        padding: '10px',
                        background: 'rgba(0, 240, 255, 0.2)',
                        border: '1px solid rgba(0, 240, 255, 0.4)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <IoCreate size={18} color="#00F0FF" />
                    </button>
                    <button
                      onClick={() => handleDeleteMethod(method.payment_method_id)}
                      style={{
                        padding: '10px',
                        background: 'rgba(239, 68, 68, 0.2)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Trash2 size={18} color="#EF4444" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}
        onClick={() => !saving && setShowAddModal(false)}
        >
          <div 
            style={{
              background: 'linear-gradient(135deg, #1a1f3a 0%, #0a0e27 100%)',
              borderRadius: '24px',
              padding: '2.5rem',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              border: '2px solid rgba(0, 240, 255, 0.3)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ color: '#fff', fontSize: '24px', fontWeight: '800', margin: 0 }}>
                {editingMethod ? 'Edit Payment Method' : 'Add Payment Method'}
              </h2>
              <button
                onClick={() => !saving && setShowAddModal(false)}
                disabled={saving}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#888',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  padding: '0.5rem'
                }}
              >
                <IoClose size={24} />
              </button>
            </div>

            {/* Nickname */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff', fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem' }}>
                Payment Method Name
                <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.nickname}
                onChange={(e) => {
                  setFormData({ ...formData, nickname: e.target.value });
                  if (validationErrors.nickname) {
                    setValidationErrors({ ...validationErrors, nickname: null });
                  }
                }}
                placeholder="e.g., Main Bank Account"
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: validationErrors.nickname
                    ? '2px solid rgba(239, 68, 68, 0.5)'
                    : '2px solid rgba(0, 240, 255, 0.3)',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
              {validationErrors.nickname && (
                <div style={{ color: '#EF4444', fontSize: '12px', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <IoAlertCircle size={12} />
                  {validationErrors.nickname}
                </div>
              )}
            </div>

            {/* Method Type */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', color: '#fff', fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem' }}>
                Payment Type
              </label>
              <select
                value={formData.method_type}
                onChange={(e) => setFormData({ ...formData, method_type: e.target.value, details: {} })}
                disabled={saving}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '2px solid rgba(0, 240, 255, 0.3)',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none',
                  cursor: saving ? 'not-allowed' : 'pointer'
                }}
              >
                {Object.keys(methodTypes).map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Dynamic Fields */}
            {renderFormFields()}

            {/* Currency */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', color: '#fff', fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem' }}>
                Currency
              </label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                disabled={saving}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '2px solid rgba(0, 240, 255, 0.3)',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none',
                  cursor: saving ? 'not-allowed' : 'pointer'
                }}
              >
                <option value="GBP">GBP</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowAddModal(false)}
                disabled={saving}
                style={{
                  padding: '12px 24px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.5 : 1
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveMethod}
                disabled={saving}
                style={{
                  padding: '12px 24px',
                  background: saving 
                    ? 'rgba(0, 240, 255, 0.5)'
                    : 'linear-gradient(135deg, #00F0FF, #A855F7)',
                  border: 'none',
                  borderRadius: '10px',
                  color: '#000',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                {saving ? (
                  <>
                    <AiOutlineLoading3Quarters size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    Saving...
                  </>
                ) : (
                  <>
                    <IoCheckmark size={16} />
                    {editingMethod ? 'Update Method' : 'Add Method'}
                  </>
                )}
              </button>
            </div>

            {/* Error Summary */}
            {Object.keys(validationErrors).length > 0 && (
              <div style={{
                marginTop: '1.5rem',
                padding: '1rem',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                color: '#EF4444',
                fontSize: '13px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: '600' }}>
                  <IoAlertCircle size={16} />
                  Please fix the following errors:
                </div>
                <ul style={{ margin: '0.5rem 0 0 1.5rem', padding: 0 }}>
                  {Object.entries(validationErrors).map(([field, error]) => (
                    error && <li key={field}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}

export default PaymentMethods;
