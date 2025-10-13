const Employee = require('../models/Employee');

// Get next employee ID
const getNextEmployeeId = async () => {
  try {
    const lastEmployee = await Employee.findOne().sort({ employeeId: -1 });
    if (lastEmployee && lastEmployee.employeeId.startsWith('EMP')) {
      const lastId = parseInt(lastEmployee.employeeId.replace('EMP', ''));
      return `EMP${lastId + 1}`;
    }
    return 'EMP1';
  } catch (error) {
    console.error('Error getting next employee ID:', error);
    return `EMP${Date.now()}`;
  }
};

// Get next fingerprint ID
const getNextFingerprintId = async () => {
  try {
    const lastEmployee = await Employee.findOne().sort({ fingerprintId: -1 });
    if (lastEmployee && lastEmployee.fingerprintId) {
      return lastEmployee.fingerprintId + 1;
    }
    return 1;
  } catch (error) {
    console.error('Error getting next fingerprint ID:', error);
    return Math.floor(Math.random() * 1000) + 1;
  }
};

// Add new employee with fingerprint
exports.addEmployee = async (req, res) => {
  try {
    console.log('Received request body:', req.body);
    
    const { name } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
      });
    }

    // Generate auto IDs with retry logic
    let generatedEmployeeId, generatedFingerprintId, generatedEmail;
    let retryCount = 0;
    const maxRetries = 3;
    
    do {
      generatedEmployeeId = await getNextEmployeeId();
      generatedFingerprintId = await getNextFingerprintId();
      generatedEmail = `employee${Date.now()}${retryCount}@company.com`;
      
      console.log('Generated IDs (attempt', retryCount + 1, '):', {
        employeeId: generatedEmployeeId,
        fingerprintId: generatedFingerprintId,
        email: generatedEmail
      });
      
      try {
        // Create new employee
        const employee = new Employee({
          name,
          employeeId: generatedEmployeeId,
          fingerprintId: generatedFingerprintId,
          fingerprintTemplate: 'not_enrolled',
          fingerprintEnrolled: false,
          position: 'Staff',
          department: 'General',
          email: generatedEmail,
          phone: '0123456789'
        });

        console.log('Creating employee:', employee);
        await employee.save();
        console.log('Employee saved successfully');
        
        res.status(201).json({
          success: true,
          data: employee,
          message: 'Employee added successfully'
        });
        return;
        
      } catch (saveError) {
        if (saveError.code === 11000 && retryCount < maxRetries - 1) {
          console.log('Duplicate key error, retrying...', saveError.keyValue);
          retryCount++;
          continue;
        }
        throw saveError;
      }
    } while (retryCount < maxRetries);

  } catch (error) {
    console.error('Error in addEmployee:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(409).json({
        success: false,
        message: `Employee with this ${field} already exists`,
        error: error.message
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error adding employee',
      error: error.message
    });
  }
};

// Get all employees
exports.getAllEmployees = async (req, res) => {
  try {
    const employees = await Employee.find().select('-fingerprintTemplate').sort({ employeeId: 1 });
    res.status(200).json({
      success: true,
      data: employees
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching employees',
      error: error.message
    });
  }
};

// Get employee by ID
exports.getEmployeeById = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id).select('-fingerprintTemplate');
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }
    res.status(200).json({
      success: true,
      data: employee
    });
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching employee',
      error: error.message
    });
  }
};

// Update employee
exports.updateEmployee = async (req, res) => {
  try {
    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }
    res.status(200).json({
      success: true,
      data: employee,
      message: 'Employee updated successfully'
    });
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating employee',
      error: error.message
    });
  }
};

// Enroll employee fingerprint (mark as enrolled)
exports.enrollFingerprint = async (req, res) => {
  try {
    const { fingerprintId } = req.body;
    
    console.log('Enrolling fingerprint for ID:', fingerprintId);
    
    const employee = await Employee.findOneAndUpdate(
      { fingerprintId: fingerprintId },
      { 
        fingerprintEnrolled: true,
        fingerprintTemplate: 'enrolled'
      },
      { new: true, runValidators: true }
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found with this fingerprint ID',
        fingerprintId: fingerprintId
      });
    }

    console.log('Employee enrolled successfully:', employee.name, 'ID:', employee.employeeId);

    res.status(200).json({
      success: true,
      data: employee,
      message: 'Fingerprint enrolled successfully',
      what: 'enrolled',
      action: 'enroll-success'
    });
  } catch (error) {
    console.error('Error enrolling fingerprint:', error);
    res.status(500).json({
      success: false,
      message: 'Error enrolling fingerprint',
      error: error.message
    });
  }
};

// Delete employee
exports.deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }
    res.status(200).json({
      success: true,
      message: 'Employee deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting employee',
      error: error.message
    });
  }
};