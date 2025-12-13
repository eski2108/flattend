import React, { useState } from 'react';
import { IoClose, IoGlobe, IoCheckmarkCircle } from 'react-icons/io5';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const LanguageSettings = ({ user, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(user.language || 'en');

  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧', native: 'English' },
    { code: 'es', name: 'Spanish', flag: '🇪🇸', native: 'Español', comingSoon: true },
    { code: 'fr', name: 'French', flag: '🇫🇷', native: 'Français', comingSoon: true },
    { code: 'de', name: 'German', flag: '🇩🇪', native: 'Deutsch', comingSoon: true },
    { code: 'zh', name: 'Chinese', flag: '🇨🇳', native: '中文', comingSoon: true },
    { code: 'ar', name: 'Arabic', flag: '🇸🇦', native: 'العربية', comingSoon: true },
    { code: 'pt', name: 'Portuguese', flag: '🇧🇷', native: 'Português', comingSoon: true },
    { code: 'ru', name: 'Russian', flag: '🇷🇺', native: 'Русский', comingSoon: true }
  ];

  const handleSave = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${API}/api/user/language`,
        {
          user_id: user.user_id,
          language: selectedLanguage
        },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        // Update local storage
        const updatedUser = { ...user, language: selectedLanguage };
        localStorage.setItem('cryptobank_user', JSON.stringify(updatedUser));
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        toast.success('✅ Language preference saved!');
        setTimeout(() => {
          onClose();
          // Optionally reload to apply language changes
          // window.location.reload();
        }, 1000);
      }
    } catch (error) {
      toast.error('Failed to save language preference');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        background: '#FFFFFF',
        border: '2px solid rgba(0, 240, 255, 0.3)',
        borderRadius: '20px',
        maxWidth: '550px',
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
            color: '#000000',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <IoGlobe size={28} color="#00F0FF" />
            Language Settings
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
          <p style={{ color: '#B8C5D6', fontSize: '14px', marginBottom: '20px' }}>
            Select your preferred language for the platform interface:
          </p>

          <div style={{ marginBottom: '24px' }}>
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => !lang.comingSoon && setSelectedLanguage(lang.code)}
                disabled={lang.comingSoon}
                style={{
                  width: '100%',
                  padding: '16px',
                  marginBottom: '12px',
                  background: selectedLanguage === lang.code 
                    ? 'linear-gradient(135deg, rgba(0, 240, 255, 0.2), rgba(155, 77, 255, 0.2))'
                    : 'rgba(0, 0, 0, 0.2)',
                  border: `2px solid ${selectedLanguage === lang.code ? '#00F0FF' : 'rgba(0, 240, 255, 0.2)'}`,
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: lang.comingSoon ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s',
                  opacity: lang.comingSoon ? 0.5 : 1,
                  boxShadow: selectedLanguage === lang.code ? '0 0 20px rgba(0, 240, 255, 0.3)' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '32px' }}>{lang.flag}</span>
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ color: '#000000', fontSize: '16px', fontWeight: '700', margin: 0 }}>
                      {lang.native}
                    </p>
                    <p style={{ color: '#666', fontSize: '13px', margin: 0 }}>
                      {lang.name}
                      {lang.comingSoon && ' - Coming Soon'}
                    </p>
                  </div>
                </div>
                {selectedLanguage === lang.code && (
                  <IoCheckmarkCircle size={24} color="#00F0FF" />
                )}
              </button>
            ))}
          </div>

          <div style={{
            background: 'rgba(0, 240, 255, 0.1)',
            border: '1px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <p style={{ color: '#00F0FF', fontSize: '13px', margin: 0 }}>
              🌐 More languages are being added. Check back soon!
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={onClose}
              disabled={loading}
              style={{
                flex: 1,
                padding: '14px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                color: '#000000',
                fontSize: '15px',
                fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              style={{
                flex: 1,
                padding: '14px',
                background: loading ? 'rgba(0, 240, 255, 0.3)' : 'linear-gradient(135deg, #00F0FF 0%, #9B4DFF 100%)',
                border: 'none',
                borderRadius: '12px',
                color: '#000000',
                fontSize: '15px',
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
                  <IoCheckmarkCircle size={20} />
                  Save Language
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LanguageSettings;
