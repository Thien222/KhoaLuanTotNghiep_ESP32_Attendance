import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider, theme, App as AntApp } from 'antd';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import MainLayout from './components/Layout';
import Dashboard from './pages/Dashboard';
import TestPage from './pages/TestPage';
import EmployeeManagement from './pages/employee/EmployeeManagement';
import AttendanceManagement from './pages/attendance/AttendanceManagement';
import LeaveManagement from './pages/leave/LeaveManagement';
import PayrollManagement from './pages/payroll/PayrollManagement';
import ReportsManagement from './pages/reports/ReportsManagement';
import ChatBot from './pages/chatbot/ChatBot';
import ESP32Management from './pages/esp32/ESP32Management';
import SettingsManagement from './pages/settings/SettingsManagement';

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
            {/* Redirect /login to / */}
            <Route path="/login" element={
              <MainLayout>
                <TestPage />
              </MainLayout>
            } />
            
            <Route path="/" element={
              <MainLayout>
                <TestPage />
              </MainLayout>
            } />
            
            <Route path="/dashboard" element={
              <MainLayout>
                <Dashboard />
              </MainLayout>
            } />
            
            <Route path="/attendance" element={
              <MainLayout>
                <AttendanceManagement />
              </MainLayout>
            } />
            
            <Route path="/employees" element={
              <MainLayout>
                <EmployeeManagement />
              </MainLayout>
            } />
            
            <Route path="/leave-requests" element={
              <MainLayout>
                <LeaveManagement />
              </MainLayout>
            } />
            
            <Route path="/payroll" element={
              <MainLayout>
                <PayrollManagement />
              </MainLayout>
            } />
            
            <Route path="/reports" element={
              <MainLayout>
                <ReportsManagement />
              </MainLayout>
            } />
            
            <Route path="/chatbot" element={
              <MainLayout>
                <ChatBot />
              </MainLayout>
            } />
            
            <Route path="/esp32" element={
              <MainLayout>
                <ESP32Management />
              </MainLayout>
            } />
            
            <Route path="/settings" element={
              <MainLayout>
                <SettingsManagement />
              </MainLayout>
            } />
            
            {/* Catch all route */}
            <Route path="*" element={
              <MainLayout>
                <Dashboard />
              </MainLayout>
            } />
          </Routes>
          <ToastContainer position="bottom-right" />
        </AntApp>
      </Router>
    </ConfigProvider>
  );
};

export default App;