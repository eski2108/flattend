import React, { useState } from 'react';
import './BugReportButton.css';

const BugReportButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    type: 'bug',
    description: '',
    email: '',
    page: window.location.pathname
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const reportData = {
        ...formData,
        url: window.location.href,
        userAgent: navigator.userAgent,
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        timestamp: new Date().toISOString()
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
          setFormData({ type: 'bug', description: '', email: '', page: window.location.pathname });
        }, 2000);
      } else {
        alert('Failed to send report. Please try again.');
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
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
          <circle cx="12" cy="12" r="3"/>
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

                <div className="bug-report-meta">
                  <small>📍 Page: {formData.page}</small>
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
