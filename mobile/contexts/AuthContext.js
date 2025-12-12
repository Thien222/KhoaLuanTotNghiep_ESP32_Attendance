import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';

export const AuthContext = createContext();

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userData = await AsyncStorage.getItem('user');
      
      console.log('🔍 Checking auth:', {
        hasToken: !!token,
        tokenLength: token?.length,
        hasUserData: !!userData
      });
      
      if (token && userData) {
        setUser(JSON.parse(userData));
        setIsAuthenticated(true);
        console.log('✅ Auth check passed - user authenticated');
      } else {
        console.warn('⚠️ Auth check failed - no token or user data');
      }
    } catch (error) {
      console.error('❌ Error checking auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const response = await authAPI.login(username, password);
      
      if (response.success) {
        const { user: userData, token } = response.data;
        
        console.log('🔐 Login successful:', {
          hasToken: !!token,
          tokenLength: token?.length,
          hasUser: !!userData,
          profileCompleted: userData?.profileCompleted,
          employeeProfileCompleted: userData?.employee?.profileCompleted
        });
        
        if (!token) {
          console.error('❌ No token in response!', response);
          return { success: false, message: 'Không nhận được token từ server' };
        }
        
        // Ensure profileCompleted is properly set in user data
        const enrichedUserData = {
          ...userData,
          profileCompleted: userData.profileCompleted !== undefined 
            ? userData.profileCompleted 
            : (userData.employee?.profileCompleted !== undefined 
              ? userData.employee.profileCompleted 
              : true)
        };
        
        await AsyncStorage.setItem('token', token);
        await AsyncStorage.setItem('user', JSON.stringify(enrichedUserData));
        
        // Verify token was saved
        const savedToken = await AsyncStorage.getItem('token');
        console.log('✅ Token saved to AsyncStorage:', {
          saved: !!savedToken,
          length: savedToken?.length,
          profileCompleted: enrichedUserData.profileCompleted
        });
        
        setUser(enrichedUserData);
        setIsAuthenticated(true);
        
        return { success: true };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Đăng nhập thất bại',
      };
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        login,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

