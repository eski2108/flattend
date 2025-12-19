/**
 * 🔒 IDEMPOTENT BUTTON COMPONENT (P0-3)
 * 
 * A button that automatically handles:
 * - Disabling on click
 * - Showing "Processing..." state
 * - Generating idempotency keys
 * - Re-enabling on response/error
 * 
 * Usage:
 *   <IdempotentButton
 *     onClick={async (idempotencyKey) => {
 *       await api.withdraw(data, { headers: { 'Idempotency-Key': idempotencyKey } });
 *     }}
 *   >
 *     Withdraw
 *   </IdempotentButton>
 */

import React, { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

export function IdempotentButton({
  children,
  onClick,
  className = '',
  processingText = 'Processing...',
  disabled = false,
  type = 'button',
  variant = 'primary', // primary, secondary, danger
  ...props
}) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleClick = useCallback(async (e) => {
    if (isProcessing || disabled) return;
    
    e?.preventDefault();
    setIsProcessing(true);
    
    // Generate unique idempotency key
    const idempotencyKey = uuidv4();
    
    try {
      await onClick(idempotencyKey, e);
    } catch (error) {
      console.error('IdempotentButton error:', error);
      // Don't throw - just log. The parent can handle errors via the onClick promise.
    } finally {
      setIsProcessing(false);
    }
  }, [onClick, isProcessing, disabled]);

  // Base styles
  const baseStyles = `
    px-4 py-2 rounded-lg font-medium transition-all duration-200
    disabled:opacity-50 disabled:cursor-not-allowed
    flex items-center justify-center gap-2
  `;

  // Variant styles
  const variantStyles = {
    primary: 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-700',
    secondary: 'bg-gray-700 text-white hover:bg-gray-600',
    danger: 'bg-red-600 text-white hover:bg-red-700'
  };

  return (
    <button
      type={type}
      className={`${baseStyles} ${variantStyles[variant] || variantStyles.primary} ${className}`}
      onClick={handleClick}
      disabled={isProcessing || disabled}
      {...props}
    >
      {isProcessing ? (
        <>
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          {processingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}

/**
 * Hook to add idempotency header to fetch requests
 */
export function withIdempotency(fetchOptions = {}, idempotencyKey) {
  return {
    ...fetchOptions,
    headers: {
      ...fetchOptions.headers,
      'Idempotency-Key': idempotencyKey || uuidv4()
    }
  };
}

export default IdempotentButton;
