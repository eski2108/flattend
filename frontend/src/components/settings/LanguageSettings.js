import React, { useState } from 'react';
import { IoClose, IoGlobe, IoCheckmarkCircle } from 'react-icons/io5';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'pl', name: 'Polski', flag: '🇵🇱' },
  { code: 'sv', name: 'Svenska', flag: '🇸🇪' },
  { code: 'no', name: 'Norsk', flag: '🇳🇴' },
  { code: 'da', name: 'Dansk', flag: '🇩🇰' },
  { code: 'fi', name: 'Suomi', flag: '🇫🇮' },
  { code: 'cs', name: 'Čeština', flag: '🇨🇿' },
  { code: 'el', name: 'Ελληνικά', flag: '🇬🇷' },
  { code: 'th', name: 'ไทย', flag: '🇹🇭' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
];

const LanguageSettings = ({ onClose }) => {
  const { i18n } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language || 'en');
  const [loading, setLoading] = useState(false);

  const handleLanguageChange = async (languageCode) => {
    setLoading(true);
    try {
      await i18n.changeLanguage(languageCode);
      setSelectedLanguage(languageCode);
      localStorage.setItem('language', languageCode);
      toast.success('✅ Language changed successfully!');
      setTimeout(() => onClose(), 500);
    } catch (error) {
      toast.error('Failed to change language');
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
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '20px',
      overflow: 'auto'
    }}>
      <div style={{
        background: '#1a1f3a',
        border: '2px solid rgba(0, 240, 255, 0.3)',
        borderRadius: '20px',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 0 40px rgba(0, 240, 255, 0.3)',
        margin: 'auto'
      }}>
        <div style={{
          padding: '24px',
          borderBottom: '1px solid rgba(0, 240, 255, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          background: '#1a1f3a',
          zIndex: 10
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
            <IoGlobe size={28} color="#00F0FF" />
            Language Settings
          </h2>
          <button onClick={onClose} style={{
            background: 'none',
            border: 'none',
            color: '#aaa',
            cursor: 'pointer',
            padding: '8px',
            display: 'flex',
            alignItems: 'center'
          }}>
            <IoClose size={28} />
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '12px'
          }}>
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                disabled={loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px',
                  background: selectedLanguage === lang.code ? 'rgba(0, 240, 255, 0.1)' : 'rgba(0, 0, 0, 0.3)',
                  border: `2px solid ${selectedLanguage === lang.code ? '#00F0FF' : 'rgba(0, 240, 255, 0.2)'}`,
                  borderRadius: '12px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  opacity: loading ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                  if (!loading && selectedLanguage !== lang.code) {
                    e.currentTarget.style.background = 'rgba(0, 240, 255, 0.05)';
                    e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedLanguage !== lang.code) {
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.3)';
                    e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.2)';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '28px' }}>{lang.flag}</span>
                  <span style={{
                    color: selectedLanguage === lang.code ? '#00F0FF' : '#FFFFFF',
                    fontSize: '15px',
                    fontWeight: selectedLanguage === lang.code ? '700' : '500'
                  }}>
                    {lang.name}
                  </span>
                </div>
                {selectedLanguage === lang.code && (
                  <IoCheckmarkCircle size={20} color="#00F0FF" />
                )}
              </button>
            ))}
          </div>

          <p style={{
            color: '#666',
            fontSize: '13px',
            marginTop: '24px',
            textAlign: 'center',
            lineHeight: '1.6'
          }}>
            Select your preferred language. The interface will be updated immediately.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LanguageSettings;