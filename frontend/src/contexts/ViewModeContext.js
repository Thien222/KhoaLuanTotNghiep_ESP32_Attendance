import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

/**
 * ViewModeContext - Quản lý chế độ xem cho từng role
 * 
 * - Admin: 'admin' (quản lý) | 'personal' (cá nhân)
 * - Accountant: 'accountant' (kế toán) | 'personal' (cá nhân)
 * - Employee: chỉ 'personal' (cá nhân)
 * 
 * Tính năng cá nhân: Xem lương, Lịch chấm công, Gửi đơn, Chatbot
 */

const ViewModeContext = createContext();

export const useViewMode = () => {
  const context = useContext(ViewModeContext);
  if (!context) {
    throw new Error('useViewMode must be used within ViewModeProvider');
  }
  return context;
};

export const ViewModeProvider = ({ children }) => {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState('personal');
  const [initialized, setInitialized] = useState(false);

  // Reset viewMode when user changes
  useEffect(() => {
    if (user && !initialized) {
      // Default mode based on role
      if (user.role === 'manager') {
        setViewMode('admin');
      } else if (user.role === 'accountant') {
        setViewMode('personal'); // Accountant default to personal
      } else {
        setViewMode('personal');
      }
      setInitialized(true);
    } else if (!user) {
      setInitialized(false);
      setViewMode('personal');
    }
  }, [user, initialized]);

  // Check if user can switch modes
  const canSwitchMode = React.useMemo(() => {
    const role = user?.role;
    const result = role === 'manager' || role === 'accountant';
    console.log('[ViewMode] canSwitchMode check:', { role, result, user });
    return result;
  }, [user?.role]);

  // Get available modes based on role
  const getAvailableModes = React.useCallback(() => {
    const role = user?.role;
    console.log('[ViewMode] getAvailableModes:', { role });
    if (role === 'manager') {
      return [
        { key: 'admin', label: 'Quản lý', icon: 'crown', color: '#ff4d4f' },
        { key: 'personal', label: 'Cá nhân', icon: 'user', color: '#1890ff' },
      ];
    }
    if (role === 'accountant') {
      return [
        { key: 'accountant', label: 'Kế toán', icon: 'dollar', color: '#722ed1' },
        { key: 'personal', label: 'Cá nhân', icon: 'user', color: '#1890ff' },
      ];
    }
    // Employee - only personal
    return [
      { key: 'personal', label: 'Cá nhân', icon: 'user', color: '#1890ff' },
    ];
  }, [user?.role]);

  // Check if current mode is personal
  const isPersonalMode = viewMode === 'personal';

  // Check if current mode is admin/manager mode
  const isAdminMode = viewMode === 'admin' && user?.role === 'manager';

  // Check if current mode is accountant mode
  const isAccountantMode = viewMode === 'accountant' && user?.role === 'accountant';

  // Toggle between modes
  const toggleMode = React.useCallback(() => {
    const role = user?.role;
    console.log('[ViewMode] toggleMode called:', { role, currentMode: viewMode });
    
    if (role === 'manager') {
      setViewMode(prev => {
        const newMode = prev === 'admin' ? 'personal' : 'admin';
        console.log('[ViewMode] Manager toggle:', { prev, newMode });
        return newMode;
      });
    } else if (role === 'accountant') {
      setViewMode(prev => {
        const newMode = prev === 'accountant' ? 'personal' : 'accountant';
        console.log('[ViewMode] Accountant toggle:', { prev, newMode });
        return newMode;
      });
    }
  }, [user?.role, viewMode]);

  // Get current mode info
  const getCurrentModeInfo = () => {
    const modes = getAvailableModes();
    return modes.find(m => m.key === viewMode) || modes[0];
  };

  // Check if user has access to a feature in current mode
  const hasAccessTo = (feature) => {
    // Personal features - available in personal mode for everyone
    const personalFeatures = ['my-salary', 'my-attendance', 'my-leave', 'chatbot', 'profile'];
    
    // Admin-only features
    const adminFeatures = [
      'employee-management', 
      'attendance-management', 
      'shift-management',
      'overtime-management',
      'leave-approval',
      'holiday-management',
      'settings',
      'esp32',
      'statistics',
      'reports',
    ];
    
    // Payroll features
    const payrollFeatures = ['payroll-management', 'payroll-all'];

    if (personalFeatures.includes(feature)) {
      return true; // Everyone can access personal features
    }

    if (adminFeatures.includes(feature)) {
      return isAdminMode; // Only admin mode
    }

    if (payrollFeatures.includes(feature)) {
      return isAdminMode || isAccountantMode; // Admin or Accountant mode
    }

    return false;
  };

  const value = {
    viewMode,
    setViewMode,
    canSwitchMode,
    getAvailableModes,
    isPersonalMode,
    isAdminMode,
    isAccountantMode,
    toggleMode,
    getCurrentModeInfo,
    hasAccessTo,
  };

  return (
    <ViewModeContext.Provider value={value}>
      {children}
    </ViewModeContext.Provider>
  );
};

export default ViewModeContext;

