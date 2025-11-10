<<<<<<< HEAD
import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  // Get user from localStorage
  const userData = localStorage.getItem('user');
  
  if (!userData) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(userData);
    const userRole = user.role;

    // If no role restriction, allow all authenticated users
    if (allowedRoles.length === 0) {
      return children;
    }

    // Check if user role is allowed
    if (allowedRoles.includes(userRole)) {
      return children;
    }

    // Redirect based on role - user goes to leave-requests, manager to dashboard
    if (userRole === 'employee') {
      return <Navigate to="/leave-requests" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  } catch (error) {
    console.error('Error parsing user data:', error);
    return <Navigate to="/login" replace />;
  }
};

export default ProtectedRoute;
=======
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Spin } from 'antd';

const ProtectedRoute = ({ children, requiredRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;


>>>>>>> 03f3fc8ca695fadb2e80e46e5549b7e9db5477cf
