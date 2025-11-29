import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="not-found-page">
      <div className="not-found-content">
        <div className="error-code">404</div>
        <h1 className="error-title">Page Not Found</h1>
        <p className="error-message">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="error-actions">
          <Button onClick={() => navigate(-1)} className="back-btn">
            <ArrowLeft size={20} />
            <span>Go Back</span>
          </Button>
          <Button onClick={() => navigate('/')} className="home-btn">
            <Home size={20} />
            <span>Go Home</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
