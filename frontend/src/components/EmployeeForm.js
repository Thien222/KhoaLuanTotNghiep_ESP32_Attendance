import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Grid,
  Typography,
  Paper,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Alert
} from '@mui/material';
import { employeeApi } from '../services/api';
import { toast } from 'react-toastify';

const EmployeeForm = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    position: '',
    department: '',
    contractType: 'probation',
    salary: '',
    createLoginAccount: false
  });

  // Contract type options based on position
  const [contractTypeOptions, setContractTypeOptions] = useState([
    { value: 'intern', label: 'Thực tập' },
    { value: 'probation', label: 'Thử việc' },
    { value: 'official', label: 'Chính thức' }
  ]);

  // Handle position change - automatically set contract type for managers
  useEffect(() => {
    if (formData.position === 'Trưởng phòng') {
      setFormData(prev => ({
        ...prev,
        contractType: 'official'
      }));
      setContractTypeOptions([{ value: 'official', label: 'Chính thức' }]);
    } else {
      setContractTypeOptions([
        { value: 'intern', label: 'Thực tập' },
        { value: 'probation', label: 'Thử việc' },
        { value: 'official', label: 'Chính thức' }
      ]);
    }
  }, [formData.position]);

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^[0-9]{10}$/;
    return phoneRegex.test(phone);
  };

  const validateForm = () => {
    const newErrors = {};

    // Required field validations
    if (!formData.name.trim()) {
      newErrors.name = 'Tên nhân viên là bắt buộc';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email là bắt buộc';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Số điện thoại là bắt buộc';
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = 'Số điện thoại phải có 10 số';
    }

    if (!formData.position) {
      newErrors.position = 'Chức vụ là bắt buộc';
    }

    if (!formData.department) {
      newErrors.department = 'Phòng ban là bắt buộc';
    }

    if (!formData.contractType) {
      newErrors.contractType = 'Loại hợp đồng là bắt buộc';
    }

    if (!formData.salary || isNaN(formData.salary) || formData.salary < 0) {
      newErrors.salary = 'Lương phải là số dương';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Check if email is already used
  const checkEmailExists = async (email) => {
    try {
      const employees = await employeeApi.getAllEmployees();
      return employees.data.some(emp => emp.email.toLowerCase() === email.toLowerCase());
    } catch (error) {
      console.error('Error checking email:', error);
      return false;
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleEmailBlur = async () => {
    if (formData.email && validateEmail(formData.email)) {
      const emailExists = await checkEmailExists(formData.email);
      if (emailExists) {
        setErrors(prev => ({
          ...prev,
          email: 'Email đã được sử dụng'
        }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Check email uniqueness
    const emailExists = await checkEmailExists(formData.email);
    if (emailExists) {
      setErrors(prev => ({
        ...prev,
        email: 'Email đã được sử dụng'
      }));
      return;
    }

    try {
      setLoading(true);

      // Prepare employee data
      const employeeData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        position: formData.position,
        department: formData.department,
        contractType: formData.contractType,
        salary: parseFloat(formData.salary) || 0
      };

      await employeeApi.addEmployee(employeeData);
      toast.success('Thêm nhân viên thành công');

      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        position: '',
        department: '',
        contractType: 'probation',
        salary: '',
        createLoginAccount: false
      });
      setErrors({});

      onSuccess && onSuccess();

    } catch (error) {
      console.error('Error adding employee:', error);
      toast.error(error.response?.data?.message || 'Lỗi khi thêm nhân viên');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Thêm Nhân Viên Mới
      </Typography>

      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          {/* Full Name */}
          <Grid item xs={12} md={6}>
            <TextField
              required
              fullWidth
              label="Họ và tên"
              name="name"
              value={formData.name}
              onChange={handleChange}
              error={!!errors.name}
              helperText={errors.name}
              placeholder="Nhập họ và tên nhân viên"
            />
          </Grid>

          {/* Email */}
          <Grid item xs={12} md={6}>
            <TextField
              required
              fullWidth
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleEmailBlur}
              error={!!errors.email}
              helperText={errors.email}
              placeholder="Nhập địa chỉ email"
            />
          </Grid>

          {/* Phone */}
          <Grid item xs={12} md={6}>
            <TextField
              required
              fullWidth
              label="Số điện thoại"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              error={!!errors.phone}
              helperText={errors.phone}
              placeholder="Nhập số điện thoại 10 số"
              inputProps={{ maxLength: 10 }}
            />
          </Grid>

          {/* Position */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth required error={!!errors.position}>
              <InputLabel>Chức vụ</InputLabel>
              <Select
                name="position"
                value={formData.position}
                onChange={handleChange}
                label="Chức vụ"
              >
                <MenuItem value="Nhân viên">Nhân viên</MenuItem>
                <MenuItem value="Trưởng phòng">Trưởng phòng</MenuItem>
                <MenuItem value="Phó phòng">Phó phòng</MenuItem>
                <MenuItem value="Giám đốc">Giám đốc</MenuItem>
              </Select>
              {errors.position && <Typography variant="caption" color="error" sx={{ mt: 1, ml: 2 }}>{errors.position}</Typography>}
            </FormControl>
          </Grid>

          {/* Department */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth required error={!!errors.department}>
              <InputLabel>Phòng ban</InputLabel>
              <Select
                name="department"
                value={formData.department}
                onChange={handleChange}
                label="Phòng ban"
              >
                <MenuItem value="Kỹ thuật">Kỹ thuật</MenuItem>
                <MenuItem value="Kinh doanh">Kinh doanh</MenuItem>
                <MenuItem value="Hành chính">Hành chính</MenuItem>
                <MenuItem value="Nhân sự">Nhân sự</MenuItem>
                <MenuItem value="Tài chính">Tài chính</MenuItem>
              </Select>
              {errors.department && <Typography variant="caption" color="error" sx={{ mt: 1, ml: 2 }}>{errors.department}</Typography>}
            </FormControl>
          </Grid>

          {/* Contract Type */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth required error={!!errors.contractType}>
              <InputLabel>Loại hợp đồng</InputLabel>
              <Select
                name="contractType"
                value={formData.contractType}
                onChange={handleChange}
                label="Loại hợp đồng"
                disabled={formData.position === 'Trưởng phòng'}
              >
                {contractTypeOptions.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
              {errors.contractType && <Typography variant="caption" color="error" sx={{ mt: 1, ml: 2 }}>{errors.contractType}</Typography>}
            </FormControl>
          </Grid>

          {/* Salary */}
          <Grid item xs={12} md={6}>
            <TextField
              required
              fullWidth
              label="Lương cơ bản"
              name="salary"
              type="number"
              value={formData.salary}
              onChange={handleChange}
              error={!!errors.salary}
              helperText={errors.salary}
              placeholder="Nhập lương cơ bản"
              InputProps={{
                endAdornment: 'VNĐ'
              }}
            />
          </Grid>

          {/* Create Login Account Checkbox */}
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  name="createLoginAccount"
                  checked={formData.createLoginAccount}
                  onChange={handleChange}
                />
              }
              label="Tạo tài khoản đăng nhập"
            />
            <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
              Phải tích vào ô này để có thể thêm nhân viên
            </Typography>
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !formData.createLoginAccount}
            sx={{ minWidth: 120 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Thêm nhân viên'}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default EmployeeForm;
