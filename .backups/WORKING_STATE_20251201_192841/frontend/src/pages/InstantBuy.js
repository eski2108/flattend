import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

function InstantBuy() {
  const navigate = useNavigate();
  
  // Redirect to P2P Express (Instant Buy backend not configured)
  useEffect(() => {
    toast.info('Redirecting to P2P Express for instant purchases...');
    navigate('/p2p-express');
  }, [navigate]);

  return null;
}

export default InstantBuy;
