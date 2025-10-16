require('dotenv').config({ path: './.env' });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const employeeRoutes = require('./routes/employeeRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const authRoutes = require('./routes/authRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Debug environment variables
console.log('MONGO_URI:', process.env.MONGO_URI);
console.log('NODE_ENV:', process.env.NODE_ENV);

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(morgan('dev'));

// Connect to MongoDB
const mongoURI = 'mongodb+srv://farenabc123:thien123@cluster0.l0erdhn.mongodb.net/fingerprint_db?retryWrites=true&w=majority&appName=Cluster0';
console.log('Connecting to MongoDB with URI:', mongoURI);

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// ===== ESP32 state (in-memory) =====
let esp32Info = {
  ip: null,
  lastSeen: null
};

// ESP32 registration endpoint (for ESP32 to register its IP)
app.post('/esp32-register', (req, res) => {
  const { ip } = req.body;
  console.log(`=== ESP32 REGISTRATION ===`);
  console.log(`ESP32 registered with IP: ${ip}`);
  console.log(`Registration time: ${new Date().toISOString()}`);

  // Update in-memory info
  esp32Info.ip = ip;
  esp32Info.lastSeen = new Date().toISOString();

  // Optionally persist to DB or file later
  res.status(200).json({ message: 'ESP32 registered successfully', ip, registeredAt: esp32Info.lastSeen });
});

// Debug route to inspect registered ESP32 info
app.get('/api/esp32-info', (req, res) => {
  res.json({
    success: true,
    data: esp32Info
  });
});

// ESP32 attendance endpoint - handles both /api/attendance/add and /api/attendance/fingerprint
app.post('/api/attendance/fingerprint', async (req, res) => {
  try {
    const { fingerId, action } = req.body;
    console.log('Received fingerprint attendance from ESP32:', { fingerId, action });
    
    // Call attendance controller directly
    const { addAttendance } = require('./controllers/attendanceController');
    await addAttendance(req, res);
  } catch (error) {
    console.error('Error in fingerprint attendance endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing fingerprint attendance',
      error: error.message
    });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);

// ESP32 health check endpoint
app.get('/healthz', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// ESP32 enroll endpoint - handles GET /api/enroll?id=X
app.get('/api/enroll', async (req, res) => {
  try {
    const { id } = req.query;
    console.log('=== ESP32 ENROLL REQUEST ===');
    console.log('Fingerprint ID:', id);

    if (!id) {
      return res.status(400).json({ success: false, message: 'Missing fingerprint ID' });
    }

    // Use registered ESP32 IP if available, otherwise fallback to configured IP but warn
    const configuredIp = '192.168.2.52';
    const esp32Ip = esp32Info.ip || configuredIp;

    if (!esp32Info.ip) {
      console.warn('ESP32 IP not registered; using configured fallback IP. Recommend calling /esp32-register from ESP32.');
    }

    const healthCheckUrl = `http://${esp32Ip}/healthz`;

    // Health check with AbortController (no unsupported timeout option)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const healthResponse = await fetch(healthCheckUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!healthResponse.ok) {
        throw new Error(`ESP32 health check failed with status: ${healthResponse.status}`);
      }
      console.log(`ESP32 (${esp32Ip}) health check passed.`);
      // update lastSeen when reachable
      esp32Info.ip = esp32Ip;
      esp32Info.lastSeen = new Date().toISOString();
    } catch (healthError) {
      console.error('ESP32 Health Check Error:', healthError);
      return res.status(503).json({
        success: false,
        message: 'ESP32 device is unreachable. Ensure ESP32 is online and has called /esp32-register or check network/firewall.',
        error: healthError.message,
        esp32Info
      });
    }

    // Proceed with enrollment
    const esp32Url = `http://${esp32Ip}/enroll?id=${encodeURIComponent(id)}`;
    const maxRetries = 3;
    const baseTimeout = 10000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt} to communicate with ESP32 ${esp32Ip}...`);
        const controller = new AbortController();
        const timeoutDuration = baseTimeout * attempt;
        const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

        const response = await fetch(esp32Url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`ESP32 returned status: ${response.status}`);
        }

        const data = await response.json();

        const Employee = require('./models/Employee');
        const updateResult = await Employee.findOneAndUpdate(
          { fingerprintId: parseInt(id) },
          { fingerprintEnrolled: true },
          { new: true }
        );

        if (!updateResult) {
          return res.status(404).json({
            success: false,
            message: 'Employee not found with given fingerprint ID'
          });
        }

        return res.json({
          success: true,
          message: 'Enrollment successful',
          data: {
            employee: updateResult,
            enrollStatus: data
          }
        });

      } catch (esp32Error) {
        console.error(`Attempt ${attempt} failed:`, esp32Error);

        if (esp32Error.name === 'AbortError') {
          console.error('ESP32 connection timeout on attempt', attempt);
        }

        if (attempt === maxRetries) {
          return res.status(504).json({
            success: false,
            message: 'ESP32 connection failed after multiple attempts',
            error: esp32Error.message,
            esp32Info
          });
        }

        // small delay before retry
        await new Promise(r => setTimeout(r, 500));
      }
    }
  } catch (error) {
    console.error('Enrollment Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during enrollment',
      error: error.message
    });
  }
});

// Special route for ESP32 fingerprint device
app.post('/api/fingerprint', async (req, res) => {
  try {
    const { fingerId, action, template } = req.body;
    console.log('Received fingerprint data from ESP32:', { fingerId, action, hasTemplate: !!template });
    
    // If this is a template upload (enrollment), update fingerprintEnrolled status
    if (template && fingerId) {
      console.log('Template received for fingerprint ID:', fingerId);
      const Employee = require('./models/Employee');
      const updateResult = await Employee.findOneAndUpdate(
        { fingerprintId: parseInt(fingerId) },
        { fingerprintEnrolled: true },
        { new: true }
      );
      
      if (updateResult) {
        console.log('Updated employee fingerprint status:', updateResult.name, 'enrolled:', updateResult.fingerprintEnrolled);
        return res.json({
          success: true,
          message: 'Fingerprint template received and employee enrolled',
          data: {
            employee: updateResult,
            what: 'enrolled',
            action: 'template-received'
          }
        });
      } else {
        return res.status(404).json({
          success: false,
          message: 'Employee not found with this fingerprint ID',
          fingerId: fingerId
        });
      }
    }
    
    // Forward the request to attendance handler with correct format
    const attendanceData = {
      fingerId: fingerId,
      action: action || 'auto'
    };
    
    // Call attendance controller directly
    const { addAttendance } = require('./controllers/attendanceController');
    req.body = attendanceData;
    await addAttendance(req, res);
  } catch (error) {
    console.error('Error in fingerprint endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing fingerprint',
      error: error.message
    });
  }
});

// ESP32 attendance endpoint - handles /api/attendance/add (ESP32 current code)
app.post('/api/attendance/add', async (req, res) => {
  try {
    const { fingerId, action } = req.body;
    console.log('=== ESP32 ATTENDANCE REQUEST ===');
    console.log('Received ESP32 attendance request:', { fingerId, action });
    console.log('Full request body:', req.body);
    
    // Call attendance controller directly
    const { addAttendance } = require('./controllers/attendanceController');
    await addAttendance(req, res);
  } catch (error) {
    console.error('Error in ESP32 attendance endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing ESP32 attendance',
      error: error.message
    });
  }
});

// ESP32 specific endpoint with simplified response
app.post('/api/esp32-attendance', async (req, res) => {
  try {
    const { fingerId, action } = req.body;
    console.log('=== ESP32 SIMPLIFIED ATTENDANCE ===');
    console.log('FingerId:', fingerId, 'Action:', action);
    
    const { addAttendance } = require('./controllers/attendanceController');
    
    // Create a mock response handler to capture the result
    let responseData = null;
    const originalJson = res.json;
    res.json = function(data) {
      responseData = data;
      return originalJson.call(this, data);
    };
    
    await addAttendance(req, res);
    
    // Send simplified response for ESP32
    if (responseData) {
      const simplifiedResponse = {
        success: responseData.success,
        what: responseData.what || 'unknown',
        message: responseData.message,
        status: responseData.status || 'unknown'
      };
      
      console.log('Sending simplified response to ESP32:', simplifiedResponse);
      res.json(simplifiedResponse);
    }
  } catch (error) {
    console.error('Error in ESP32 simplified attendance:', error);
    res.status(500).json({
      success: false,
      what: 'error',
      message: 'Server error',
      status: 'error'
    });
  }
});

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// Debug route for ESP32 status
app.get('/api/esp32-status', (req, res) => {
  res.json({ 
    message: 'ESP32 status check',
    timestamp: new Date().toISOString(),
    server: 'running'
  });
});

// ESP32 test endpoint
app.post('/api/esp32-test', (req, res) => {
  console.log('ESP32 test request received:', req.body);
  res.json({
    success: true,
    message: 'ESP32 connection test successful',
    received: req.body,
    timestamp: new Date().toISOString()
  });
});

// Force ESP32 to clear cache and re-register
app.get('/api/esp32-reset', (req, res) => {
  console.log('=== ESP32 RESET REQUEST ===');
  console.log('Time:', new Date().toISOString());
  res.json({
    success: true,
    message: 'ESP32 should clear cache and re-register',
    timestamp: new Date().toISOString()
  });
});

// Test attendance manually
app.post('/api/test-attendance', async (req, res) => {
  try {
    const { fingerId, action } = req.body;
    console.log('=== MANUAL ATTENDANCE TEST ===');
    console.log('FingerId:', fingerId);
    console.log('Action:', action);
    
    const { addAttendance } = require('./controllers/attendanceController');
    req.body = { fingerId, action };
    await addAttendance(req, res);
  } catch (error) {
    console.error('Error in manual attendance test:', error);
    res.status(500).json({
      success: false,
      message: 'Error in manual attendance test',
      error: error.message
    });
  }
});

// Clear all attendance for testing
app.delete('/api/clear-attendance', async (req, res) => {
  try {
    const Attendance = require('./models/Attendance');
    const result = await Attendance.deleteMany({});
    console.log('Cleared all attendance records:', result.deletedCount);
    res.json({
      success: true,
      message: `Cleared ${result.deletedCount} attendance records`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error clearing attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Error clearing attendance',
      error: error.message
    });
  }
});

// Security: Clear attendance for unenrolled employees
app.delete('/api/security/clear-unenrolled-attendance', async (req, res) => {
  try {
    const Attendance = require('./models/Attendance');
    const Employee = require('./models/Employee');
    
    // Find all employees who are not enrolled
    const unenrolledEmployees = await Employee.find({ fingerprintEnrolled: false });
    const unenrolledIds = unenrolledEmployees.map(emp => emp._id);
    
    console.log('Found unenrolled employees:', unenrolledEmployees.length);
    console.log('Unenrolled employee IDs:', unenrolledIds);
    
    // Delete attendance records for unenrolled employees
    const result = await Attendance.deleteMany({ 
      employee: { $in: unenrolledIds } 
    });
    
    console.log('Cleared attendance for unenrolled employees:', result.deletedCount);
    
    res.json({
      success: true,
      message: `Cleared ${result.deletedCount} attendance records for unenrolled employees`,
      deletedCount: result.deletedCount,
      unenrolledCount: unenrolledEmployees.length
    });
  } catch (error) {
    console.error('Error clearing unenrolled attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Error clearing unenrolled attendance',
      error: error.message
    });
  }
});

// Debug: Get all employees with fingerprint info
app.get('/api/debug/employees', async (req, res) => {
  try {
    const Employee = require('./models/Employee');
    const employees = await Employee.find({}, 'name employeeId fingerprintId fingerprintEnrolled position department email phone status');
    console.log('All employees:', employees);
    res.json({
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
});

// Debug: Add new employee
app.post('/api/debug/employees', async (req, res) => {
  try {
    const Employee = require('./models/Employee');
    const { name, position, department, email, phone, fingerprintId } = req.body;
    
    // Generate employee ID
    const count = await Employee.countDocuments();
    const employeeId = `EMP${String(count + 1).padStart(3, '0')}`;
    
    const newEmployee = new Employee({
      name,
      position,
      department,
      email,
      phone,
      employeeId,
      fingerprintId: fingerprintId || (count + 1),
      fingerprintEnrolled: false,
      status: 'active'
    });
    
    const savedEmployee = await newEmployee.save();
    console.log('New employee created:', savedEmployee);
    
    res.json({
      success: true,
      data: savedEmployee
    });
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating employee',
      error: error.message
    });
  }
});

// Debug: Get attendance with date info
app.get('/api/debug/attendance', async (req, res) => {
  try {
    const Attendance = require('./models/Attendance');
    const Employee = require('./models/Employee');
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    console.log('Debug - Current time:', now);
    console.log('Debug - Today date:', today);
    
    // Check employees first
    const employees = await Employee.find({}).limit(5);
    console.log('Debug - Employees count:', employees.length);
    console.log('Debug - First employee:', employees[0]);
    
    const attendance = await Attendance.find({})
      .populate('employee', 'name employeeId')
      .sort({ createdAt: -1 })
      .limit(10);
    
    console.log('Debug - Found records:', attendance.length);
    console.log('Debug - First record employee:', attendance[0]?.employee);
    
    res.json({
      success: true,
      data: {
        currentTime: now,
        todayDate: today,
        employeesCount: employees.length,
        firstEmployee: employees[0],
        recordsCount: attendance.length,
        records: attendance
      }
    });
  } catch (error) {
    console.error('Error in debug attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Error in debug attendance',
      error: error.message
    });
  }
});

// Security check: Verify employee enrollment status
app.get('/api/security/check-enrollment/:fingerprintId', async (req, res) => {
  try {
    const { fingerprintId } = req.params;
    const Employee = require('./models/Employee');
    
    const employee = await Employee.findOne({ fingerprintId: parseInt(fingerprintId) });
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
        fingerprintId: fingerprintId
      });
    }
    
    res.json({
      success: true,
      data: {
        employeeId: employee.employeeId,
        name: employee.name,
        fingerprintId: employee.fingerprintId,
        fingerprintEnrolled: employee.fingerprintEnrolled,
        securityStatus: employee.fingerprintEnrolled ? 'ENROLLED' : 'NOT_ENROLLED'
      }
    });
  } catch (error) {
    console.error('Error checking enrollment:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking enrollment',
      error: error.message
    });
  }
});

// ESP32 enroll endpoint
app.post('/api/esp32-enroll', async (req, res) => {
  try {
    const { fingerId } = req.body;
    console.log('=== ESP32 ENROLL REQUEST ===');
    console.log('FingerId:', fingerId);
    
    const { enrollFingerprint } = require('./controllers/employeeController');
    await enrollFingerprint(req, res);
  } catch (error) {
    console.error('Error in ESP32 enroll endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing ESP32 enroll',
      error: error.message
    });
  }
});

// Error handling
app.use(errorHandler);

// Handle 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  console.log(`Server accessible at: http://192.168.2.28:${PORT}`);
});