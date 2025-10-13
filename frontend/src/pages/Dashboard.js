import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Tab,
  Tabs
} from '@mui/material';
import EmployeeForm from '../components/EmployeeForm';
import EmployeeList from '../components/EmployeeList';
import AttendanceTable from '../components/AttendanceTable';
import AttendanceForm from '../components/AttendanceForm';
import { attendanceApi } from '../services/api';
import { toast } from 'react-toastify';

const Dashboard = () => {
  const [tabValue, setTabValue] = useState(0);
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTodayAttendance();
  }, []);

  const fetchTodayAttendance = async () => {
    try {
      setLoading(true);
      console.log('Fetching attendance data...');
      // Try getAllAttendance first to see all records
      const response = await attendanceApi.getAllAttendance();
      console.log('Dashboard - API response:', response);
      console.log('Dashboard - response.data:', response.data);
      console.log('Dashboard - response.data.data:', response.data.data);
      console.log('Dashboard - response.data.data length:', response.data.data?.length);
      
      // Fix: response.data already contains the data array
      const data = response.data.data || response.data || [];
      console.log('Dashboard - Setting attendanceData to:', data);
      setAttendanceData(data);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      toast.error('Error fetching attendance data');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleEmployeeAdded = () => {
    toast.success('Employee added successfully');
    // Refresh employee list if on that tab
    if (tabValue === 1) {
      // Trigger refresh in EmployeeList component
      window.dispatchEvent(new CustomEvent('refreshEmployees'));
    }
  };

  const handleRefresh = () => {
    // Refresh data when needed
    fetchTodayAttendance();
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h4" gutterBottom>
              Employee Management System
            </Typography>
            
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tabs value={tabValue} onChange={handleTabChange}>
                <Tab label="Add Employee" />
                <Tab label="Employee List" />
                <Tab label="Manual Attendance" />
                <Tab label="Attendance Records" />
              </Tabs>
            </Box>

            {tabValue === 0 && (
              <EmployeeForm onSuccess={handleEmployeeAdded} />
            )}

            {tabValue === 1 && (
              <EmployeeList onRefresh={handleRefresh} />
            )}

            {tabValue === 2 && (
              <AttendanceForm onAttendanceRecorded={handleRefresh} />
            )}

            {tabValue === 3 && (
              <Box>
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6">Attendance Records</Typography>
                  <button 
                    onClick={handleRefresh}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#1976d2',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Refresh
                  </button>
                </Box>
                {loading ? (
                  <Typography>Loading attendance data...</Typography>
                ) : (
                  <AttendanceTable attendanceData={attendanceData} />
                )}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;