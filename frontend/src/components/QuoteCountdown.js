import React, { useState, useEffect } from 'react';
import { IoTimeOutline } from 'react-icons/io5';

function QuoteCountdown({ expiresAt, onExpire }) {
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  useEffect(() => {
    const calculateRemaining = () => {
      const now = new Date();
      const expiry = new Date(expiresAt);
      const diff = Math.floor((expiry - now) / 1000);
      return Math.max(0, diff);
    };

    setSecondsRemaining(calculateRemaining());

    const interval = setInterval(() => {
      const remaining = calculateRemaining();
      setSecondsRemaining(remaining);
      
      if (remaining === 0) {
        clearInterval(interval);
        if (onExpire) onExpire();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;

  const isExpiring = secondsRemaining <= 30;
  const isExpired = secondsRemaining === 0;

  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
      isExpired ? 'bg-red-500/20 text-red-400' : 
      isExpiring ? 'bg-orange-500/20 text-orange-400' : 
      'bg-blue-500/20 text-blue-400'
    }`}>
      <IoTimeOutline className="text-xl" />
      <div className="flex flex-col">
        <span className="text-xs opacity-70">Quote expires in</span>
        <span className="text-lg font-bold font-mono">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </span>
      </div>
    </div>
  );
}

export default QuoteCountdown;
