import React, { useState, useEffect } from 'react';
import { IoClose, IoCard, IoAdd, IoTrash, IoCheckmarkCircle, IoWarning, IoPencil } from 'react-icons/io5';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const PaymentMethodsManager = ({ user, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('list'); // 'list' | 'add' | 'edit'
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [currentMethod, setCurrentMethod] = useState(null);
  const [formData, setFormData] = useState({
    method_label: '',
    method_type: 'bank_transfer',
    account_holder_name: '',
    bank_name: '',
    sort_code: '',
    account_number: '',
    iban: '',
    swift: '',
    is_primary: false
  });

  const paymentTypes = [
    { value: 'bank_transfer', label: 'Bank Transfer', icon: '🏦', fields: ['account_holder_name', 'bank_name', 'sort_code', 'account_number'] },
    { value: 'faster_payments', label: 'Faster Payments (UK)', icon: '⚡', fields: ['account_holder_name', 'bank_name', 'sort_code', 'account_number'] },
    { value: 'sepa', label: 'SEPA Transfer', icon: '🇪🇺', fields: ['account_holder_name', 'bank_name', 'iban', 'swift'] },
    { value: 'paypal', label: 'PayPal', icon: '🔵', fields: ['account_holder_name'] },
    { value: 'revolut', label: 'Revolut', icon: '💳', fields: ['account_holder_name'] },
    { value: 'wise', label: 'Wise', icon: '🟢', fields: ['account_holder_name', 'account_number'] },
    { value: 'cashapp', label: 'Cash App', icon: '💵', fields: ['account_holder_name'] }
  ];

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/api/user/payment-methods`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
          params: { user_id: user.user_id }
        }
      );
      
      if (response.data.success) {
        setPaymentMethods(response.data.methods || []);
      }
    } catch (error) {
      console.error('Failed to fetch payment methods:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setFormData({
      method_label: '',
      method_type: 'bank_transfer',
      account_holder_name: '',
      bank_name: '',
      sort_code: '',
      account_number: '',
      iban: '',
      swift: '',
      is_primary: paymentMethods.length === 0
    });
    setCurrentMethod(null);
    setView('add');
  };

  const handleEdit = (method) => {
    setCurrentMethod(method);
    setFormData({
      method_label: method.method_label || '',
      method_type: method.method_type,
      account_holder_name: method.details?.account_holder_name || '',
      bank_name: method.details?.bank_name || '',
      sort_code: method.details?.sort_code || '',
      account_number: method.details?.account_number || '',
      iban: method.details?.iban || '',
      swift: method.details?.swift || '',
      is_primary: method.is_primary || false
    });
    setView('edit');
  };

  const handleSave = async () => {
    // Validation
    if (!formData.method_label) {
      toast.error('Please enter a label for this payment method');
      return;
    }
    if (!formData.account_holder_name) {
      toast.error('Account holder name is required');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      const methodData = {
        user_id: user.user_id,
        method_label: formData.method_label,
        method_type: formData.method_type,
        details: {
          account_holder_name: formData.account_holder_name,
          bank_name: formData.bank_name,
          sort_code: formData.sort_code,
          account_number: formData.account_number,
          iban: formData.iban,
          swift: formData.swift
        },
        is_primary: formData.is_primary
      };

      const endpoint = currentMethod 
        ? `${API}/api/user/payment-methods/${currentMethod.method_id}`
        : `${API}/api/user/payment-methods`;
      
      const method = currentMethod ? 'put' : 'post';
      
      const response = await axios[method](
        endpoint,
        methodData,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        toast.success(`✅ Payment method ${currentMethod ? 'updated' : 'added'} successfully!`);
        await fetchPaymentMethods();
        setView('list');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save payment method');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (methodId, hasActiveOffers) => {
    if (hasActiveOffers) {
      toast.error('Cannot delete: This payment method is used in active P2P offers');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this payment method?')) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(
        `${API}/api/user/payment-methods/${methodId}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
          params: { user_id: user.user_id }
        }
      );
      
      if (response.data.success) {
        toast.success('Payment method deleted');
        await fetchPaymentMethods();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete payment method');
    } finally {
      setLoading(false);
    }
  };

  const selectedType = paymentTypes.find(t => t.value === formData.method_type);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '20px'
    }}>
      <div style={{
        background: '#1a1f3a',
        border: '2px solid rgba(0, 240, 255, 0.3)',
        borderRadius: '20px',
        maxWidth: '650px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 0 40px rgba(0, 240, 255, 0.3)'
      }}>
        <div style={{
          padding: '24px',
          borderBottom: '1px solid rgba(0, 240, 255, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '800',
            color: '#FFFFFF',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <IoCard size={28} color="#00F0FF" />
            Payment Methods
          </h2>
          <button onClick={onClose} style={{
            background: 'none',
            border: 'none',
            color: '#666',
            cursor: 'pointer',
            padding: '8px'
          }}>
            <IoClose size={28} />
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          {view === 'list' && (
            <div>
              <div style={{
                background: 'rgba(0, 240, 255, 0.1)',
                border: '1px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px'
              }}>
                <p style={{ color: '#00F0FF', fontSize: '14px', margin: 0 }}>
                  🔗 <strong>P2P Integration:</strong> These payment methods are automatically available in your P2P offers
                </p>
              </div>

              {paymentMethods.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <IoCard size={64} color="#888" style={{ marginBottom: '16px' }} />
                  <p style={{ color: '#666', fontSize: '16px', marginBottom: '24px' }}>
                    No payment methods added yet
                  </p>
                </div>
              ) : (
                <div style={{ marginBottom: '20px' }}>
                  {paymentMethods.map((method) => (
                    <div
                      key={method.method_id}
                      style={{
                        background: 'rgba(0, 0, 0, 0.2)',
                        border: `2px solid ${method.is_primary ? '#00F0FF' : 'rgba(0, 240, 255, 0.2)'}`,
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: '12px',
                        boxShadow: method.is_primary ? '0 0 20px rgba(0, 240, 255, 0.2)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '24px' }}>
                              {paymentTypes.find(t => t.value === method.method_type)?.icon || '💳'}
                            </span>
                            <h3 style={{ color: '#FFFFFF', fontSize: '16px', fontWeight: '700', margin: 0 }}>
                              {method.method_label || paymentTypes.find(t => t.value === method.method_type)?.label}
                            </h3>
                            {method.is_primary && (
                              <span style={{
                                background: 'linear-gradient(135deg, #00F0FF, #9B4DFF)',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: '700',
                                color: '#FFFFFF'
                              }}>
                                PRIMARY
                              </span>
                            )}
                          </div>
                          <p style={{ color: '#666', fontSize: '13px', margin: '4px 0' }}>
                            {method.details?.account_holder_name}
                          </p>
                          {method.details?.bank_name && (
                            <p style={{ color: '#666', fontSize: '13px', margin: '4px 0' }}>
                              {method.details.bank_name}
                              {method.details.account_number && ` • ****${method.details.account_number.slice(-4)}`}
                            </p>
                          )}
                          {method.in_use && (
                            <p style={{ color: '#FFC800', fontSize: '12px', margin: '8px 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <IoWarning size={14} />
                              Used in active P2P offers
                            </p>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleEdit(method)}
                            style={{
                              background: 'rgba(0, 240, 255, 0.2)',
                              border: '1px solid rgba(0, 240, 255, 0.4)',
                              borderRadius: '8px',
                              padding: '8px',
                              color: '#00F0FF',
                              cursor: 'pointer'
                            }}
                          >
                            <IoPencil size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(method.method_id, method.in_use)}
                            disabled={method.in_use}
                            style={{
                              background: method.in_use ? 'rgba(255, 68, 68, 0.1)' : 'rgba(255, 68, 68, 0.2)',
                              border: '1px solid rgba(255, 68, 68, 0.4)',
                              borderRadius: '8px',
                              padding: '8px',
                              color: '#FF4444',
                              cursor: method.in_use ? 'not-allowed' : 'pointer',
                              opacity: method.in_use ? 0.5 : 1
                            }}
                          >
                            <IoTrash size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={handleAdd}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: 'linear-gradient(135deg, #00F0FF 0%, #9B4DFF 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#FFFFFF',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 20px rgba(0, 240, 255, 0.4)'
                }}
              >
                <IoAdd size={24} />
                Add Payment Method
              </button>
            </div>
          )}

          {(view === 'add' || view === 'edit') && (
            <div>
              <button
                onClick={() => setView('list')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#00F0FF',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  marginBottom: '20px',
                  padding: 0
                }}
              >
                ← Back to list
              </button>

              {/* Method Type Selection */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: '700',
                  marginBottom: '8px',
                  display: 'block',
                  textTransform: 'uppercase'
                }}>
                  Payment Method Type *
                </label>
                <select
                  value={formData.method_type}
                  onChange={(e) => setFormData({ ...formData, method_type: e.target.value })}
                  disabled={view === 'edit'}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(0, 240, 255, 0.4)',
                    borderRadius: '12px',
                    color: '#FFFFFF',
                    fontSize: '15px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    cursor: view === 'edit' ? 'not-allowed' : 'pointer'
                  }}
                >
                  {paymentTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Method Label */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: '700',
                  marginBottom: '8px',
                  display: 'block',
                  textTransform: 'uppercase'
                }}>
                  Method Label (e.g., "My Barclays GBP") *
                </label>
                <input
                  type="text"
                  value={formData.method_label}
                  onChange={(e) => setFormData({ ...formData, method_label: e.target.value })}
                  placeholder="Give this method a friendly name"
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(0, 240, 255, 0.4)',
                    borderRadius: '12px',
                    color: '#FFFFFF',
                    fontSize: '15px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Dynamic Fields based on payment type */}
              {selectedType?.fields.includes('account_holder_name') && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: '700',
                    marginBottom: '8px',
                    display: 'block',
                    textTransform: 'uppercase'
                  }}>
                    Account Holder Name *
                  </label>
                  <input
                    type="text"
                    value={formData.account_holder_name}
                    onChange={(e) => setFormData({ ...formData, account_holder_name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(0, 240, 255, 0.4)',
                      borderRadius: '12px',
                      color: '#FFFFFF',
                      fontSize: '15px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              )}

              {selectedType?.fields.includes('bank_name') && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: '700',
                    marginBottom: '8px',
                    display: 'block',
                    textTransform: 'uppercase'
                  }}>
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(0, 240, 255, 0.4)',
                      borderRadius: '12px',
                      color: '#FFFFFF',
                      fontSize: '15px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              )}

              {selectedType?.fields.includes('sort_code') && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: '700',
                    marginBottom: '8px',
                    display: 'block',
                    textTransform: 'uppercase'
                  }}>
                    Sort Code
                  </label>
                  <input
                    type="text"
                    value={formData.sort_code}
                    onChange={(e) => setFormData({ ...formData, sort_code: e.target.value })}
                    placeholder="12-34-56"
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(0, 240, 255, 0.4)',
                      borderRadius: '12px',
                      color: '#FFFFFF',
                      fontSize: '15px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              )}

              {selectedType?.fields.includes('account_number') && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: '700',
                    marginBottom: '8px',
                    display: 'block',
                    textTransform: 'uppercase'
                  }}>
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={formData.account_number}
                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                    placeholder="12345678"
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(0, 240, 255, 0.4)',
                      borderRadius: '12px',
                      color: '#FFFFFF',
                      fontSize: '15px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              )}

              {selectedType?.fields.includes('iban') && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: '700',
                    marginBottom: '8px',
                    display: 'block',
                    textTransform: 'uppercase'
                  }}>
                    IBAN
                  </label>
                  <input
                    type="text"
                    value={formData.iban}
                    onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                    placeholder="GB29 NWBK 6016 1331 9268 19"
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(0, 240, 255, 0.4)',
                      borderRadius: '12px',
                      color: '#FFFFFF',
                      fontSize: '15px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              )}

              {selectedType?.fields.includes('swift') && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: '700',
                    marginBottom: '8px',
                    display: 'block',
                    textTransform: 'uppercase'
                  }}>
                    SWIFT/BIC Code
                  </label>
                  <input
                    type="text"
                    value={formData.swift}
                    onChange={(e) => setFormData({ ...formData, swift: e.target.value })}
                    placeholder="NWBKGB2L"
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(0, 240, 255, 0.4)',
                      borderRadius: '12px',
                      color: '#FFFFFF',
                      fontSize: '15px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              )}

              {/* Primary Toggle */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px',
                background: 'rgba(0, 0, 0, 0.2)',
                border: '1px solid rgba(0, 240, 255, 0.2)',
                borderRadius: '12px',
                marginBottom: '24px'
              }}>
                <div>
                  <p style={{ color: '#FFFFFF', fontSize: '15px', fontWeight: '700', marginBottom: '4px' }}>
                    Set as Primary Method
                  </p>
                  <p style={{ color: '#666', fontSize: '13px', margin: 0 }}>
                    Default method for P2P transactions
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_primary: !formData.is_primary })}
                  style={{
                    width: '52px',
                    height: '28px',
                    borderRadius: '14px',
                    background: formData.is_primary ? 'linear-gradient(135deg, #00F0FF, #9B4DFF)' : 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.3s',
                    boxShadow: formData.is_primary ? '0 0 20px rgba(0, 240, 255, 0.5)' : 'none'
                  }}
                >
                  <div style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: '#1a1f3a',
                    position: 'absolute',
                    top: '3px',
                    left: formData.is_primary ? '27px' : '3px',
                    transition: 'all 0.3s',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                  }} />
                </button>
              </div>

              <button
                onClick={handleSave}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: loading ? 'rgba(0, 240, 255, 0.3)' : 'linear-gradient(135deg, #00F0FF 0%, #9B4DFF 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#FFFFFF',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: loading ? 'none' : '0 4px 20px rgba(0, 240, 255, 0.4)'
                }}
              >
                {loading ? 'Saving...' : (
                  <>
                    <IoCheckmarkCircle size={24} />
                    {view === 'add' ? 'Add Payment Method' : 'Save Changes'}
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodsManager;
