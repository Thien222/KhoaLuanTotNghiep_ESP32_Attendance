import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles = [], requireProfileComplete = false }) => {
  const location = useLocation();
  
  // Get user from localStorage
  const userData = localStorage.getItem('user');
  
  if (!userData) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(userData);
    const userRole = user.role;
    const profileCompleted = user.profileCompleted !== false; // Default to true if not set

    // Check profile completion for employee routes (except complete-profile page)
    if (userRole === 'employee' && requireProfileComplete && !profileCompleted && location.pathname !== '/complete-profile') {
      return <Navigate to="/complete-profile" replace />;
    }

    // If no role restriction, allow all authenticated users
    if (allowedRoles.length === 0) {
      return children;
    }

    // Check if user role is allowed
    if (allowedRoles.includes(userRole)) {
      // For employee routes that require profile completion, check again
      if (userRole === 'employee' && requireProfileComplete && !profileCompleted && location.pathname !== '/complete-profile') {
        return <Navigate to="/complete-profile" replace />;
      }
      return children;
    }

    // Redirect based on role - user goes to requests, manager to dashboard
    if (userRole === 'employee') {
      // Check profile completion before redirecting
      if (!profileCompleted) {
        return <Navigate to="/complete-profile" replace />;
      }
      return <Navigate to="/requests" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  } catch (error) {
    console.error('Error parsing user data:', error);
    return <Navigate to="/login" replace />;
  }
};

export default ProtectedRoute;
