import React, { useState, useEffect, useRef } from 'react';
import './BugReportButton.css';

const BugReportButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [screenshot, setScreenshot] = useState(null);
  const consoleErrors = useRef([]);
  
  const [formData, setFormData] = useState({
    type: 'bug',
    description: '',
    email: ''
  });

  // Capture console errors
  useEffect(() => {
    const originalError = console.error;
    const originalWarn = console.warn;
    
    console.error = (...args) => {
      consoleErrors.current.push({
        type: 'error',
        message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '),
        timestamp: new Date().toISOString()
      });
      // Keep only last 20 errors
      if (consoleErrors.current.length > 20) {
        consoleErrors.current = consoleErrors.current.slice(-20);
      }
      originalError.apply(console, args);
    };
    
    console.warn = (...args) => {
      consoleErrors.current.push({
        type: 'warn',
        message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '),
        timestamp: new Date().toISOString()
      });
      if (consoleErrors.current.length > 20) {
        consoleErrors.current = consoleErrors.current.slice(-20);
      }
      originalWarn.apply(console, args);
    };
    
    // Capture unhandled errors
    const handleError = (event) => {
      consoleErrors.current.push({
        type: 'unhandled',
        message: event.message || 'Unknown error',
        filename: event.filename,
        lineno: event.lineno,
        timestamp: new Date().toISOString()
      });
    };
    
    window.addEventListener('error', handleError);
    
    return () => {
      console.error = originalError;
      console.warn = originalWarn;
      window.removeEventListener('error', handleError);
    };
  }, []);

  // Get user ID from localStorage
  const getUserId = () => {
    try {
      const user = localStorage.getItem('user');
      if (user) {
        const parsed = JSON.parse(user);
        return parsed.id || parsed.user_id || parsed._id || null;
      }
    } catch (e) {}
    return null;
  };

  // Capture screenshot using html2canvas
  const captureScreenshot = async () => {
    setIsCapturing(true);
    try {
      // Dynamically load html2canvas
      if (!window.html2canvas) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        document.head.appendChild(script);
        await new Promise((resolve) => { script.onload = resolve; });
      }
      
      // Hide the modal temporarily
      const modal = document.querySelector('.bug-report-overlay');
      if (modal) modal.style.display = 'none';
      
      const canvas = await window.html2canvas(document.body, {
        scale: 0.5, // Reduce size
        logging: false,
        useCORS: true,
        allowTaint: true
      });
      
      // Show modal again
      if (modal) modal.style.display = 'flex';
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
      setScreenshot(dataUrl);
      
    } catch (error) {
      console.error('Screenshot capture failed:', error);
      alert('Could not capture screenshot. You can still submit the report.');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const reportData = {
        // Required fields
        type: formData.type,
        description: formData.description,
        page_url: window.location.href,
        user_id: getUserId(),
        device_info: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          screenWidth: window.screen.width,
          screenHeight: window.screen.height,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          devicePixelRatio: window.devicePixelRatio,
          touchSupport: 'ontouchstart' in window
        },
        timestamp: new Date().toISOString(),
        
        // Optional fields
        reporter_email: formData.email || null,
        screenshot: screenshot || null,
        console_errors: consoleErrors.current.slice(-10), // Last 10 errors
        
        // Additional context
        referrer: document.referrer || null,
        cookies_enabled: navigator.cookieEnabled
      };

      const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
      const response = await fetch(`${backendUrl}/api/bug-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData)
      });

      if (response.ok) {
        setSubmitted(true);
        setTimeout(() => {
          setIsOpen(false);
          setSubmitted(false);
          setScreenshot(null);
          setFormData({ type: 'bug', description: '', email: '' });
        }, 2000);
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to send report. Please try again.');
      }
    } catch (error) {
      console.error('Bug report error:', error);
      alert('Failed to send report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Bug Report Button */}
      <button 
        className="bug-report-fab"
        onClick={() => setIsOpen(true)}
        title="Report a Bug"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>
          <circle cx="12" cy="14" r="2"/>
        </svg>
        <span>Bug?</span>
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="bug-report-overlay" onClick={() => setIsOpen(false)}>
          <div className="bug-report-modal" onClick={(e) => e.stopPropagation()}>
            <button className="bug-report-close" onClick={() => setIsOpen(false)}>
              ×
            </button>
            
            {submitted ? (
              <div className="bug-report-success">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#00E676" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <h3>Report Sent!</h3>
                <p>Thank you for helping us improve.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <h2>🐛 Report an Issue</h2>
                <p className="bug-report-subtitle">Help us fix problems quickly</p>

                <div className="bug-report-field">
                  <label>Type</label>
                  <select 
                    value={formData.type} 
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                  >
                    <option value="bug">🐛 Bug / Something Broken</option>
                    <option value="ui">🎨 UI / Design Issue</option>
                    <option value="feature">💡 Feature Request</option>
                    <option value="other">❓ Other</option>
                  </select>
                </div>

                <div className="bug-report-field">
                  <label>What happened? *</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Describe what went wrong or what you expected to happen..."
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                <div className="bug-report-field">
                  <label>Your Email (optional)</label>
                  <input
                    type="email"
                    placeholder="For follow-up questions"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>

                {/* Screenshot Section */}
                <div className="bug-report-field">
                  <label>Screenshot (optional)</label>
                  {screenshot ? (
                    <div className="screenshot-preview">
                      <img src={screenshot} alt="Screenshot" />
                      <button type="button" onClick={() => setScreenshot(null)} className="remove-screenshot">
                        ✕ Remove
                      </button>
                    </div>
                  ) : (
                    <button 
                      type="button" 
                      onClick={captureScreenshot}
                      className="capture-btn"
                      disabled={isCapturing}
                    >
                      {isCapturing ? '📸 Capturing...' : '📸 Capture Screenshot'}
                    </button>
                  )}
                </div>

                <div className="bug-report-meta">
                  <small>📍 {window.location.pathname}</small>
                  {consoleErrors.current.length > 0 && (
                    <small className="error-count">⚠️ {consoleErrors.current.length} console errors captured</small>
                  )}
                </div>

                <button 
                  type="submit" 
                  className="bug-report-submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Sending...' : 'Send Report'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default BugReportButton;
