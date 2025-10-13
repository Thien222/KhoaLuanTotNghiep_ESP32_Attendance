import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Typography,
  Grid,
  Chip,
  CircularProgress
} from '@mui/material';
import { AccessTime, CheckCircle } from '@mui/icons-material';
import { employeeApi, attendanceApi } from '../services/api';
import { toast } from 'react-toastify';

const AttendanceForm = ({ onAttendanceRecorded }) => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [attendanceType, setAttendanceType] = useState('checkin');
  const [loading, setLoading] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true);
      const response = await employeeApi.getAllEmployees();
      setEmployees(response.data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Error fetching employees');
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleAttendance = async () => {
    if (!selectedEmployee) {
      toast.error('Please select an employee');
      return;
    }

    try {
      setLoading(true);
      
      const employee = employees.find(emp => emp._id === selectedEmployee);
      if (!employee) {
        toast.error('Employee not found');
        return;
      }

      // Create attendance record
      const attendanceData = {
        employeeId: employee._id,
        fingerprintId: employee.fingerprintId,
        type: attendanceType,
        timestamp: new Date().toISOString()
      };

      await attendanceApi.addAttendance(attendanceData);
      
      toast.success(`${attendanceType === 'checkin' ? 'Check-in' : 'Check-out'} recorded successfully!`);
      
      // Reset form
      setSelectedEmployee('');
      setAttendanceType('checkin');
      
      onAttendanceRecorded && onAttendanceRecorded();

    } catch (error) {
      console.error('Error recording attendance:', error);
      toast.error('Error recording attendance');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (loadingEmployees) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Manual Attendance
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Select Employee</InputLabel>
            <Select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              label="Select Employee"
            >
              {employees.map((employee) => (
                <MenuItem key={employee._id} value={employee._id}>
                  <Box display="flex" alignItems="center" width="100%">
                    <Box flexGrow={1}>
                      <Typography variant="body1">
                        {employee.name} ({employee.employeeId})
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {employee.position} - {employee.department}
                      </Typography>
                    </Box>
                    <Chip
                      icon={employee.fingerprintEnrolled ? <CheckCircle /> : null}
                      label={employee.fingerprintEnrolled ? 'Enrolled' : 'Not Enrolled'}
                      color={employee.fingerprintEnrolled ? 'success' : 'warning'}
                      size="small"
                    />
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Attendance Type</InputLabel>
            <Select
              value={attendanceType}
              onChange={(e) => setAttendanceType(e.target.value)}
              label="Attendance Type"
            >
              <MenuItem value="checkin">
                <Box display="flex" alignItems="center">
                  <AccessTime sx={{ mr: 1 }} />
                  Check In
                </Box>
              </MenuItem>
              <MenuItem value="checkout">
                <Box display="flex" alignItems="center">
                  <AccessTime sx={{ mr: 1 }} />
                  Check Out
                </Box>
              </MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="body2" color="textSecondary">
              Current Time: {getCurrentTime()}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Total Employees: {employees.length}
            </Typography>
          </Box>
        </Grid>

        <Grid item xs={12}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleAttendance}
            disabled={loading || !selectedEmployee}
            fullWidth
            size="large"
            startIcon={loading ? <CircularProgress size={20} /> : <AccessTime />}
          >
            {loading ? 'Recording...' : `Record ${attendanceType === 'checkin' ? 'Check In' : 'Check Out'}`}
          </Button>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default AttendanceForm;
