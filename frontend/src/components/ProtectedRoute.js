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
