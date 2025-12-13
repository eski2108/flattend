import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error Boundary Caught:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0A1929 0%, #051018 100%)',
          padding: '2rem'
        }}>
          <div style={{
            maxWidth: '600px',
            background: 'rgba(0, 198, 255, 0.05)',
            border: '2px solid rgba(0, 198, 255, 0.3)',
            borderRadius: '16px',
            padding: '2rem',
            textAlign: 'center'
          }}>
            <h1 style={{ 
              color: '#00C6FF', 
              fontSize: '2rem', 
              marginBottom: '1rem',
              fontWeight: '700'
            }}>
              ⚠️ Oops! Something went wrong
            </h1>
            <p style={{ 
              color: '#8F9BB3', 
              fontSize: '1rem', 
              marginBottom: '1.5rem',
              lineHeight: '1.6'
            }}>
              We encountered an unexpected error. Don't worry, your data is safe. 
              Please try refreshing the page or contact support if the problem persists.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: 'linear-gradient(135deg, #00C6FF, #A855F7)',
                border: 'none',
                borderRadius: '8px',
                padding: '0.75rem 2rem',
                fontSize: '1rem',
                fontWeight: '600',
                color: '#000',
                cursor: 'pointer',
                transition: 'transform 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              🔄 Refresh Page
            </button>
            {this.state.error && (
              <details style={{ marginTop: '1.5rem', textAlign: 'left' }}>
                <summary style={{ 
                  color: '#00C6FF', 
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  marginBottom: '0.5rem'
                }}>
                  Technical Details
                </summary>
                <pre style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(0, 198, 255, 0.2)',
                  borderRadius: '8px',
                  padding: '1rem',
                  fontSize: '0.75rem',
                  color: '#EF4444',
                  overflowX: 'auto',
                  marginTop: '0.5rem'
                }}>
                  {this.state.error.toString()}
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;