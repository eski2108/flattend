/**
 * Wallet Event Utilities
 * Trigger wallet balance refresh across components
 */

/**
 * Notify all wallet components that balances have been updated
 * Call this after any transaction that changes user balances:
 * - Swaps
 * - P2P purchases
 * - Deposits
 * - Withdrawals
 */
export const notifyWalletBalanceUpdated = () => {
  // Trigger custom event for same-tab listeners
  window.dispatchEvent(new Event('walletBalanceUpdated'));
  
  // Update localStorage to trigger storage event for cross-tab listeners
  localStorage.setItem('wallet_balance_updated', Date.now().toString());
  
  console.log('✅ Wallet balance update notification sent');
};

/**
 * Clear old balance update flags (optional cleanup)
 */
export const clearBalanceUpdateFlags = () => {
  localStorage.removeItem('wallet_balance_updated');
};
