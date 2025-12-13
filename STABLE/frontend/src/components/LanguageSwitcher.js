import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IoLanguage, IoCheckmark } from 'react-icons/io5';

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'pl', name: 'Polski', flag: '🇵🇱' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'th', name: 'ไทย', flag: '🇹🇭' },
  { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'sv', name: 'Svenska', flag: '🇸🇪' },
  { code: 'no', name: 'Norsk', flag: '🇳🇴' },
  { code: 'da', name: 'Dansk', flag: '🇩🇰' },
  { code: 'fi', name: 'Suomi', flag: '🇫🇮' },
  { code: 'el', name: 'Ελληνικά', flag: '🇬🇷' },
  { code: 'cs', name: 'Čeština', flag: '🇨🇿' },
  { code: 'ro', name: 'Română', flag: '🇷🇴' },
  { code: 'hu', name: 'Magyar', flag: '🇭🇺' },
  { code: 'uk', name: 'Українська', flag: '🇺🇦' },
  { code: 'he', name: 'עברית', flag: '🇮🇱' },
  { code: 'bn', name: 'বাংলা', flag: '🇧🇩' },
  { code: 'ms', name: 'Bahasa Melayu', flag: '🇲🇾' }
];

export default function LanguageSwitcher({ style }) {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const currentLanguage = LANGUAGES.find(lang => lang.code === i18n.language) || LANGUAGES[0];

  const changeLanguage = (langCode) => {
    i18n.changeLanguage(langCode);
    localStorage.setItem('userLanguage', langCode);
    setIsOpen(false);

    // Update user preference in backend if logged in
    const user = localStorage.getItem('cryptobank_user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        const API = process.env.REACT_APP_BACKEND_URL;
        fetch(`${API}/api/users/${userData.user_id}/language`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ language: langCode })
        }).catch(err => console.log('Could not save language preference:', err));
      } catch (e) {
        console.log('Error parsing user data:', e);
      }
    }
  };

  return (
    <div style={{ position: 'relative', ...style }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          background: 'rgba(0, 240, 255, 0.1)',
          border: '1px solid rgba(0, 240, 255, 0.3)',
          borderRadius: '8px',
          color: '#FFFFFF',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'all 0.3s',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(0, 240, 255, 0.2)';
          e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(0, 240, 255, 0.1)';
          e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.3)';
        }}
      >
        <span style={{ fontSize: '18px' }}>{currentLanguage.flag}</span>
        <span>{currentLanguage.name}</span>
      </button>

      {isOpen && (
        <>
          <div
            onClick={() => setIsOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '8px',
              background: 'linear-gradient(135deg, rgba(7, 19, 39, 0.98) 0%, rgba(2, 6, 24, 0.98) 100%)',
              border: '1px solid rgba(0, 240, 255, 0.3)',
              borderRadius: '12px',
              padding: '8px',
              minWidth: '180px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 240, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              zIndex: 1000
            }}
          >
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  background: i18n.language === lang.code ? 'rgba(0, 240, 255, 0.15)' : 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => {
                  if (i18n.language !== lang.code) {
                    e.currentTarget.style.background = 'rgba(0, 240, 255, 0.08)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (i18n.language !== lang.code) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <span style={{ fontSize: '20px' }}>{lang.flag}</span>
                <span style={{ flex: 1 }}>{lang.name}</span>
                {i18n.language === lang.code && (
                  <IoCheckmark size={18} color="#00F0FF" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
