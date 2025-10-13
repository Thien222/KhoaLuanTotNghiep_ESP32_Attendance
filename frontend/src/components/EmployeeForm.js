import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Grid,
  Typography,
  Paper,
  CircularProgress
} from '@mui/material';
import { employeeApi } from '../services/api';
import { toast } from 'react-toastify';

const EmployeeForm = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      // Add employee to database with auto-generated IDs
      const employeeData = {
        name: formData.name
      };

      await employeeApi.addEmployee(employeeData);
      toast.success('Employee added successfully');
      
      // Reset form
      setFormData({
        name: ''
      });

      onSuccess && onSuccess();

    } catch (error) {
      console.error('Error adding employee:', error);
      toast.error(error.message || 'Error adding employee');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Add New Employee
      </Typography>
      
      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              required
              fullWidth
              label="Full Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter employee name"
            />
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            sx={{ minWidth: 120 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Add Employee'}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default EmployeeForm;