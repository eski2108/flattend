import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../config/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      console.log('🔄 Loading user from storage...');
      const userData = await AsyncStorage.getItem('cryptobank_user');
      const token = await AsyncStorage.getItem('auth_token');
      
      if (userData && token) {
        setUser(JSON.parse(userData));
        console.log('✅ User loaded from storage');
      } else if (!token) {
        console.log('⚠️ No auth token found, clearing user data');
        await AsyncStorage.removeItem('cryptobank_user');
        setUser(null);
      }
    } catch (error) {
      console.error('❌ Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      console.log('🔐 Attempting login for:', email);
      const response = await api.post('/auth/login', { email, password });
      console.log('📡 Login response:', response.data);
      
      if (response.data.success) {
        const userData = response.data.user;
        const token = response.data.token;
        
        // Store both user data and token
        await AsyncStorage.setItem('cryptobank_user', JSON.stringify(userData));
        if (token) {
          await AsyncStorage.setItem('auth_token', token);
          await AsyncStorage.setItem('token', token); // Also store as 'token' for compatibility
          console.log('✅ Token stored successfully');
        }
        
        setUser(userData);
        console.log('✅ Login successful');
        return { success: true };
      }
      
      // Handle 2FA requirement
      if (response.data.requires_2fa) {
        console.log('🔐 2FA required');
        return { 
          success: false, 
          requires2FA: true,
          user_id: response.data.user_id,
          email: response.data.email,
          error: response.data.message 
        };
      }
      
      return { success: false, error: response.data.message || 'Login failed' };
    } catch (error) {
      console.error('❌ Login error:', error);
      console.error('❌ Error response:', error.response?.data);
      return {
        success: false,
        error: error.response?.data?.detail || error.response?.data?.message || 'Login failed. Please check your connection.',
      };
    }
  };

  const register = async (fullName, email, password) => {
    try {
      console.log('📝 Attempting registration for:', email);
      const response = await api.post('/auth/register', {
        full_name: fullName,
        email,
        password,
      });
      console.log('📡 Registration response:', response.data);
      
      if (response.data.success) {
        // If registration returns user data and token, auto-login
        if (response.data.user && response.data.token) {
          const userData = response.data.user;
          const token = response.data.token;
          
          await AsyncStorage.setItem('cryptobank_user', JSON.stringify(userData));
          await AsyncStorage.setItem('auth_token', token);
          await AsyncStorage.setItem('token', token);
          setUser(userData);
          console.log('✅ Registration successful with auto-login');
        }
        return { success: true, message: response.data.message };
      }
      return { success: false, error: response.data.message };
    } catch (error) {
      console.error('❌ Registration error:', error);
      console.error('❌ Error response:', error.response?.data);
      return {
        success: false,
        error: error.response?.data?.detail || error.response?.data?.message || 'Registration failed',
      };
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('cryptobank_user');
      await AsyncStorage.removeItem('auth_token');
      setUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
