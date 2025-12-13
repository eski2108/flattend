import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import { toast } from 'sonner';

const WalletContext = createContext();

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
};

export const WalletProvider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check if already connected
    checkConnection();
  }, []);

  const checkConnection = async () => {
    // First check localStorage for email/password login
    const storedUser = localStorage.getItem('cryptobank_user');
    const storedToken = localStorage.getItem('token');
    
    if (storedUser && storedToken) {
      try {
        const userData = JSON.parse(storedUser);
        
        // SET USER IMMEDIATELY from localStorage - don't wait for API
        setUser(userData);
        
        // Then fetch fresh user data from backend in background
        try {
          const response = await axios.get(`${API}/user/profile/${userData.user_id}`, {
            headers: {
              'Authorization': `Bearer ${storedToken}`
            }
          });
          
          if (response.data.success) {
            const freshUserData = response.data.user;
            setUser(freshUserData);
            // Update localStorage with fresh data
            localStorage.setItem('cryptobank_user', JSON.stringify(freshUserData));
            console.log('✅ User profile refreshed from backend:', freshUserData.email);
            return;
          }
        } catch (apiError) {
          console.error('Error fetching fresh user data:', apiError);
          // If API call fails but we have stored data, use it
          setUser(userData);
          console.log('✅ User loaded from localStorage (API unavailable):', userData.email);
          return;
        }
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('cryptobank_user');
        localStorage.removeItem('token');
      }
    }
    
    // Then check MetaMask wallet connection
    if (typeof window.ethereum !== 'undefined') {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
          const account = accounts[0].address;
          setAccount(account);
          setProvider(provider);
          await fetchUserProfile(account);
        }
      } catch (error) {
        console.error('Error checking MetaMask connection:', error);
      }
    }
  };

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      toast.error('Please install MetaMask to use this platform');
      return;
    }

    setIsConnecting(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      setProvider(provider);
      setAccount(address);

      // Register/login with backend
      const response = await axios.post(`${API}/auth/connect-wallet`, {
        wallet_address: address,
      });

      if (response.data.success) {
        setUser(response.data.user);
        toast.success('Wallet connected successfully!');
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      toast.error('Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setProvider(null);
    setUser(null);
    // Clear all localStorage data
    localStorage.clear();
    sessionStorage.clear();
    toast.info('Logged out successfully');
  };

  const fetchUserProfile = async (walletAddress) => {
    try {
      const response = await axios.get(`${API}/user/profile/${walletAddress}`);
      if (response.data.success) {
        setUser(response.data.user);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const refreshUser = async () => {
    if (account) {
      await fetchUserProfile(account);
    }
  };

  return (
    <WalletContext.Provider
      value={{
        account,
        provider,
        user,
        isConnecting,
        connectWallet,
        disconnectWallet,
        refreshUser,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};