import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider, theme, App as AntApp } from 'antd';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import MainLayout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Login from './pages/auth/Login';
import EmployeeManagement from './pages/employee/EmployeeManagement';
import AttendanceManagement from './pages/attendance/AttendanceManagement';
import PayrollManagement from './pages/payroll/PayrollManagement';
import ChatBot from './pages/chatbot/ChatBot';
import RequestManagement from './pages/requests/RequestManagement';
import SettingsManagement from './pages/settings/SettingsManagement';
import IPConfiguration from './pages/settings/IPConfiguration';
import Profile from './pages/profile/Profile';
import CompleteProfile from './pages/profile/CompleteProfile';
import ShiftManagement from './pages/shift/ShiftManagement';
import StatisticsPage from './pages/statistics/StatisticsPage';

const App = () => {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 8,
          fontSize: 14
        },
        algorithm: theme.defaultAlgorithm
      }}
    >
      <Router>
        <AntApp>
          <Routes>
            {/* Login page without layout */}
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Login />} />
            
            {/* IP Configuration page - public, no authentication required */}
            <Route path="/ip-config" element={<IPConfiguration />} />
            
            <Route path="/dashboard" element={
              <MainLayout>
                <ProtectedRoute allowedRoles={['manager']}>
                  <Dashboard />
                </ProtectedRoute>
              </MainLayout>
            } />
            
            <Route path="/attendance" element={
              <MainLayout>
                <ProtectedRoute allowedRoles={['manager']}>
                  <AttendanceManagement />
                </ProtectedRoute>
              </MainLayout>
            } />
            
            <Route path="/employees" element={
              <MainLayout>
                <ProtectedRoute allowedRoles={['manager']}>
                  <EmployeeManagement />
                </ProtectedRoute>
              </MainLayout>
            } />
            
            {/* Unified Request Management (Leave + OT) */}
            <Route path="/requests" element={
              <MainLayout>
                <ProtectedRoute allowedRoles={['employee', 'manager']} requireProfileComplete={true}>
                  <RequestManagement />
                </ProtectedRoute>
              </MainLayout>
            } />
            
            <Route path="/payroll" element={
              <MainLayout>
                <ProtectedRoute allowedRoles={['employee', 'manager', 'accountant']} requireProfileComplete={true}>
                  <PayrollManagement />
                </ProtectedRoute>
              </MainLayout>
            } />
            
            <Route path="/chatbot" element={
              <MainLayout>
                <ProtectedRoute allowedRoles={['employee', 'manager']} requireProfileComplete={true}>
                  <ChatBot />
                </ProtectedRoute>
              </MainLayout>
            } />
            
            <Route path="/settings" element={
              <MainLayout>
                <ProtectedRoute allowedRoles={['manager']}>
                  <SettingsManagement />
                </ProtectedRoute>
              </MainLayout>
            } />
            
            <Route path="/shifts" element={
              <MainLayout>
                <ProtectedRoute allowedRoles={['manager']}>
                  <ShiftManagement />
                </ProtectedRoute>
              </MainLayout>
            } />
            
            <Route path="/statistics" element={
              <MainLayout>
                <ProtectedRoute allowedRoles={['manager']}>
                  <StatisticsPage />
                </ProtectedRoute>
              </MainLayout>
            } />
            
            <Route path="/profile" element={
              <MainLayout>
                <Profile />
              </MainLayout>
            } />
            
            <Route path="/complete-profile" element={
              <MainLayout>
                <ProtectedRoute>
                  <CompleteProfile />
                </ProtectedRoute>
              </MainLayout>
            } />
            
            {/* Catch all route - redirect to login */}
            <Route path="*" element={<Login />} />
          </Routes>
          <ToastContainer position="bottom-right" />
        </AntApp>
      </Router>
    </ConfigProvider>
  );
};

export default App;
