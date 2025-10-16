import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import { Fingerprint, PersonOff } from '@mui/icons-material';
import { employeeApi } from '../services/api';
import { toast } from 'react-toastify';

const EmployeeList = ({ onRefresh }) => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState({});

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await employeeApi.getAllEmployees();
      console.log('API Response:', response);
      // response is already {success: true, data: [...]}
      const employeesData = response.data || [];
      setEmployees(Array.isArray(employeesData) ? employeesData : []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Error fetching employees');
      setEmployees([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollFingerprint = async (employee) => {
    try {
      setEnrolling(prev => ({ ...prev, [employee._id]: true }));
      
      const esp32Ip = '192.168.2.52'; // You can make this configurable
      const esp32Url = `http://${esp32Ip}/enroll?id=${employee.fingerprintId}`;
      
      toast.info(`Enrolling fingerprint for ${employee.name}...`);
      
      const response = await fetch(esp32Url);
      const result = await response.json();
      
      if (result.message && result.message.includes('thanh cong')) {
        // Update employee in database
        await employeeApi.updateEmployee(employee._id, {
          fingerprintEnrolled: true,
          fingerprintTemplate: 'enrolled_template_' + employee.fingerprintId
        });
        
        toast.success('Fingerprint enrolled successfully!');
        fetchEmployees(); // Refresh list
      } else {
        throw new Error(result.message || 'Enrollment failed');
      }
    } catch (error) {
      console.error('Error enrolling fingerprint:', error);
      toast.error(`Fingerprint enrollment failed: ${error.message}`);
    } finally {
      setEnrolling(prev => ({ ...prev, [employee._id]: false }));
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      try {
        await employeeApi.deleteEmployee(id);
        toast.success('Employee deleted successfully');
        fetchEmployees();
        onRefresh && onRefresh();
      } catch (error) {
        console.error('Error deleting employee:', error);
        toast.error('Error deleting employee');
      }
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          Employee List ({employees.length} employees)
        </Typography>
        <Button 
          variant="outlined" 
          onClick={fetchEmployees}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Employee ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Position</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Fingerprint ID</TableCell>
              <TableCell>Fingerprint Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {employees.map((employee) => (
              <TableRow key={employee._id}>
                <TableCell>{employee.employeeId}</TableCell>
                <TableCell>{employee.name}</TableCell>
                <TableCell>{employee.position}</TableCell>
                <TableCell>{employee.department}</TableCell>
                <TableCell>{employee.email}</TableCell>
                <TableCell>{employee.phone}</TableCell>
                <TableCell>{employee.fingerprintId}</TableCell>
                <TableCell>
                  <Chip 
                    icon={employee.fingerprintEnrolled ? <Fingerprint /> : <PersonOff />}
                    label={employee.fingerprintEnrolled ? 'Enrolled' : 'Not Enrolled'}
                    color={employee.fingerprintEnrolled ? 'success' : 'warning'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Box display="flex" gap={1}>
                    {!employee.fingerprintEnrolled && (
                      <Tooltip title="Enroll Fingerprint">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleEnrollFingerprint(employee)}
                          disabled={enrolling[employee._id]}
                        >
                          {enrolling[employee._id] ? (
                            <CircularProgress size={20} />
                          ) : (
                            <Fingerprint />
                          )}
                        </IconButton>
                      </Tooltip>
                    )}
                    <Button 
                      size="small" 
                      color="error"
                      onClick={() => handleDelete(employee._id)}
                    >
                      Delete
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
            
            {employees.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  No employees found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default EmployeeList;