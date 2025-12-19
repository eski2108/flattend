/**
 * 🔒 IDEMPOTENCY HOOK (P0-3)
 * 
 * Provides frontend-side duplicate protection:
 * - Generates idempotency keys for requests
 * - Disables buttons during processing
 * - Shows "Processing..." state
 * - Re-enables on response or error
 * 
 * Usage:
 *   const { executeWithIdempotency, isProcessing } = useIdempotency();
 *   
 *   const handleSubmit = async () => {
 *     const result = await executeWithIdempotency(
 *       'withdrawal',
 *       async (idempotencyKey) => {
 *         return await api.withdraw({ ...data }, { headers: { 'Idempotency-Key': idempotencyKey } });
 *       }
 *     );
 *   };
 */

import { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

// Minimum delay between same-action requests (ms)
const DEBOUNCE_MS = 1000;

export function useIdempotency() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingAction, setProcessingAction] = useState(null);
  const lastActionTime = useRef({});
  const pendingRequests = useRef(new Set());

  /**
   * Execute an action with idempotency protection
   * @param {string} actionType - Type of action (e.g., 'withdrawal', 'swap', 'buy')
   * @param {Function} action - Async function that receives idempotency key and executes request
   * @returns {Promise} - Result of the action
   */
  const executeWithIdempotency = useCallback(async (actionType, action) => {
    // Check if same action is already processing
    if (pendingRequests.current.has(actionType)) {
      console.warn(`🔒 Action ${actionType} is already processing`);
      return { success: false, message: 'Request already in progress' };
    }

    // Check debounce
    const now = Date.now();
    const lastTime = lastActionTime.current[actionType] || 0;
    if (now - lastTime < DEBOUNCE_MS) {
      console.warn(`🔒 Action ${actionType} debounced`);
      return { success: false, message: 'Please wait before retrying' };
    }

    // Generate idempotency key
    const idempotencyKey = uuidv4();
    
    // Set processing state
    setIsProcessing(true);
    setProcessingAction(actionType);
    pendingRequests.current.add(actionType);
    lastActionTime.current[actionType] = now;

    try {
      const result = await action(idempotencyKey);
      return result;
    } catch (error) {
      console.error(`Error in ${actionType}:`, error);
      throw error;
    } finally {
      // Clear processing state
      setIsProcessing(false);
      setProcessingAction(null);
      pendingRequests.current.delete(actionType);
    }
  }, []);

  /**
   * Check if a specific action is processing
   */
  const isActionProcessing = useCallback((actionType) => {
    return pendingRequests.current.has(actionType);
  }, []);

  /**
   * Generate a unique idempotency key
   */
  const generateKey = useCallback(() => {
    return uuidv4();
  }, []);

  return {
    executeWithIdempotency,
    isProcessing,
    processingAction,
    isActionProcessing,
    generateKey
  };
}

/**
 * Simple button debounce hook
 * Use this for simple cases where you just need button protection
 */
export function useButtonDebounce(delayMs = 2000) {
  const [isDisabled, setIsDisabled] = useState(false);
  const timeoutRef = useRef(null);

  const handleClick = useCallback(async (onClick) => {
    if (isDisabled) return;
    
    setIsDisabled(true);
    
    try {
      await onClick();
    } finally {
      // Re-enable after delay or immediately on error
      timeoutRef.current = setTimeout(() => {
        setIsDisabled(false);
      }, delayMs);
    }
  }, [isDisabled, delayMs]);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsDisabled(false);
  }, []);

  return { isDisabled, handleClick, cleanup, setIsDisabled };
}

export default useIdempotency;
