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
import LeaveManagement from './pages/leave/LeaveManagement';
import PayrollManagement from './pages/payroll/PayrollManagement';
import ReportsManagement from './pages/reports/ReportsManagement';
import ChatBot from './pages/chatbot/ChatBot';
import ESP32Management from './pages/esp32/ESP32Management';
import SettingsManagement from './pages/settings/SettingsManagement';
import Profile from './pages/profile/Profile';

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
            
            <Route path="/leave-requests" element={
              <MainLayout>
                <ProtectedRoute allowedRoles={['employee', 'manager']}>
                  <LeaveManagement />
                </ProtectedRoute>
              </MainLayout>
            } />
            
            <Route path="/payroll" element={
              <MainLayout>
                <ProtectedRoute allowedRoles={['employee', 'manager']}>
                  <PayrollManagement />
                </ProtectedRoute>
              </MainLayout>
            } />
            
            <Route path="/reports" element={
              <MainLayout>
                <ProtectedRoute allowedRoles={['manager']}>
                  <ReportsManagement />
                </ProtectedRoute>
              </MainLayout>
            } />
            
            <Route path="/chatbot" element={
              <MainLayout>
                <ProtectedRoute allowedRoles={['employee', 'manager']}>
                  <ChatBot />
                </ProtectedRoute>
              </MainLayout>
            } />
            
            <Route path="/esp32" element={
              <MainLayout>
                <ProtectedRoute allowedRoles={['manager']}>
                  <ESP32Management />
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
            
            <Route path="/profile" element={
              <MainLayout>
                <Profile />
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
