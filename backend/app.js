
// Load environment variables
require('dotenv').config({ path: './config.env' });
require('dotenv').config({ path: './.env' }); // Also try .env for compatibility

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const employeeRoutes = require('./routes/employeeRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const authRoutes = require('./routes/authRoutes');
const holidayRoutes = require('./routes/holidayRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const payrollRoutes = require('./routes/payrollRoutes');
const shiftRoutes = require('./routes/shiftRoutes');
const chatRoutes = require('./routes/chatRoutes');
const testRoutes = require('./routes/testRoutes');
const timeMachineRoutes = require('./routes/timeMachineRoutes'); // NEW
const salaryRoutes = require('./routes/salaryRoutes');
const settingsRoutes = require('./routes/settingsRoutes'); // Settings
const overtimeRoutes = require('./routes/overtimeRoutes'); // Overtime requests
const terminatedEmployeeRoutes = require('./routes/terminatedEmployeeRoutes'); // Terminated employees
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
const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!mongoURI) {
  console.error('❌ MONGODB_URI is not set in environment variables!');
  console.error('Please set MONGODB_URI in your .env or config.env file');
  process.exit(1);
}

// Log connection (hide password)
const safeURI = mongoURI.replace(/:[^:]*@/, ':****@');
console.log('Connecting to MongoDB with URI:', safeURI);

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('MongoDB connected successfully');
  
  // Load ESP32 IP from database on startup
  try {
    const ESP32Config = require('./models/ESP32Config');
    const latestConfig = await ESP32Config.findOne().sort({ lastSeen: -1 });
    if (latestConfig && latestConfig.esp32Ip) {
      esp32Info.ip = latestConfig.esp32Ip;
      esp32Info.lastSeen = latestConfig.lastSeen?.toISOString() || new Date().toISOString();
      console.log(`✅ Loaded ESP32 IP from database: ${esp32Info.ip}`);
    } else {
      console.log('ℹ️ No ESP32 IP found in database. Will use configured IP or wait for ESP32 registration.');
    }
  } catch (error) {
    console.error('Error loading ESP32 config from database:', error);
  }
  
  // Initialize Auto-Completion Service (Cron Job at 17:00 daily)
  try {
    const cron = require('node-cron');
    const autoCompletionService = require('./services/autoCompletionService');
    const Settings = require('./models/Settings');
    
    // Get work end time from settings (default: 17:00)
    const workSettings = await Settings.findOne({ type: 'working-hours' });
    const endTime = workSettings?.config?.endTime || '17:00';
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    // Schedule cron job at work end time (e.g., 17:00)
    // Format: "minute hour * * *" (minute hour day month weekday)
    const cronSchedule = `${endMin} ${endHour} * * *`;
    
    cron.schedule(cronSchedule, async () => {
      console.log(`\n🕐 Auto-completion cron triggered at ${new Date().toLocaleString()}`);
      await autoCompletionService.runAutoCompletion();
    });
    
    console.log(`✅ Auto-completion cron job scheduled at ${endTime} daily (${cronSchedule})`);
  } catch (error) {
    console.error('❌ Error initializing auto-completion service:', error);
    console.error('Note: Run "npm install node-cron" if module not found');
  }
})
.catch(err => console.error('MongoDB connection error:', err));

// ===== ESP32 state (in-memory) =====
let esp32Info = {
  ip: null,
  lastSeen: null
};

// Get current server URL (dynamically from request)
const getServerUrl = (req) => {
  // Try to get from request first
  const protocol = req.protocol || 'http';
  const host = req.get('host');
  
  if (host) {
    return `${protocol}://${host}/api`;
  }
  
  // Fallback to environment variable or default
  const serverIP = process.env.IP_MACHINE || 'localhost';
  const serverPort = process.env.PORT || '3000';
  return `http://${serverIP}:${serverPort}/api`;
};

// ESP32 registration endpoint (for ESP32 to register its IP)
app.post('/esp32-register', async (req, res) => {
  try {
    const { ip } = req.body;
    const ESP32Config = require('./models/ESP32Config');
    const serverUrl = getServerUrl(req);
    
    console.log(`=== ESP32 REGISTRATION ===`);
    console.log(`ESP32 registered with IP: ${ip}`);
    console.log(`Server URL: ${serverUrl}`);
    console.log(`Registration time: ${new Date().toISOString()}`);

    // Update in-memory info
    esp32Info.ip = ip;
    esp32Info.lastSeen = new Date().toISOString();

    // Save/Update in database
    await ESP32Config.findOneAndUpdate(
      { esp32Ip: ip },
      {
        esp32Ip: ip,
        serverUrl: serverUrl,
        lastSeen: new Date(),
        lastUpdated: new Date(),
        status: 'online'
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      message: 'ESP32 registered successfully',
      data: {
        ip,
        serverUrl: serverUrl,
        fingerprintEndpoint: `${serverUrl}/fingerprint`,
        attendanceEndpoint: `${serverUrl}/attendance/add`,
        registeredAt: esp32Info.lastSeen
      }
    });
  } catch (error) {
    console.error('ESP32 registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
});

// ESP32 discovery endpoint - no authentication needed
app.get('/esp32-discovery', (req, res) => {
  const serverUrl = getServerUrl(req);
  res.json({
    success: true,
    serverUrl: serverUrl,
    fingerprintEndpoint: `${serverUrl}/fingerprint`,
    attendanceEndpoint: `${serverUrl}/attendance/add`,
    enrollEndpoint: `${serverUrl}/enroll`,
    configEndpoint: `${serverUrl}/esp32-config`
  });
});

// ESP32 get config endpoint
app.get('/api/esp32-config', async (req, res) => {
  try {
    const ESP32Config = require('./models/ESP32Config');
    const esp32Ip = req.query.ip || req.headers['x-esp32-ip'];
    const serverUrl = getServerUrl(req);
    
    let config;
    if (esp32Ip) {
      config = await ESP32Config.findOne({ esp32Ip });
    } else {
      // Get latest config or create default
      config = await ESP32Config.findOne().sort({ lastUpdated: -1 });
    }

    if (!config) {
      // Return default config
      return res.json({
        success: true,
        data: {
          serverUrl: serverUrl,
          fingerprintEndpoint: `${serverUrl}/fingerprint`,
          attendanceEndpoint: `${serverUrl}/attendance/add`,
          enrollEndpoint: `${serverUrl}/enroll`
        }
      });
    }

    // Update last seen
    config.lastSeen = new Date();
    config.status = 'online';
    await config.save();

    res.json({
      success: true,
      data: {
        serverUrl: config.serverUrl,
        fingerprintEndpoint: `${config.serverUrl}/fingerprint`,
        attendanceEndpoint: `${config.serverUrl}/attendance/add`,
        enrollEndpoint: `${config.serverUrl}/enroll`,
        lastUpdated: config.lastUpdated
      }
    });
  } catch (error) {
    console.error('Get ESP32 config error:', error);
    const serverUrl = getServerUrl(req);
    res.json({
      success: true,
      data: {
        serverUrl: serverUrl,
        fingerprintEndpoint: `${serverUrl}/fingerprint`,
        attendanceEndpoint: `${serverUrl}/attendance/add`,
        enrollEndpoint: `${serverUrl}/enroll`
      }
    });
  }
});

// ESP32 update config endpoint (from frontend/admin)
app.post('/api/esp32-update-config', async (req, res) => {
  try {
    const ESP32Config = require('./models/ESP32Config');
    const { esp32Ip, serverUrl } = req.body;

    if (!esp32Ip || !serverUrl) {
      return res.status(400).json({
        success: false,
        message: 'Missing esp32Ip or serverUrl'
      });
    }

    const config = await ESP32Config.findOneAndUpdate(
      { esp32Ip },
      {
        serverUrl,
        lastUpdated: new Date()
      },
      { upsert: true, new: true }
    );

    console.log(`✅ Updated ESP32 config for ${esp32Ip}: ${serverUrl}`);

    res.json({
      success: true,
      message: 'ESP32 config updated successfully',
      data: config
    });
  } catch (error) {
    console.error('Update ESP32 config error:', error);
    res.status(500).json({
      success: false,
      message: 'Update config failed',
      error: error.message
    });
  }
});

// Broadcast new server URL to all ESP32s
app.post('/api/esp32-broadcast-config', async (req, res) => {
  try {
    const ESP32Config = require('./models/ESP32Config');
    const serverUrl = req.body.serverUrl || getServerUrl(req);

    // Update all ESP32 configs
    const result = await ESP32Config.updateMany(
      {},
      {
        serverUrl,
        lastUpdated: new Date()
      }
    );

    console.log(`📡 Broadcasted new server URL to ${result.modifiedCount} ESP32(s): ${serverUrl}`);

    res.json({
      success: true,
      message: `Broadcasted config to ${result.modifiedCount} ESP32(s)`,
      data: {
        serverUrl,
        updatedCount: result.modifiedCount
      }
    });
  } catch (error) {
    console.error('Broadcast config error:', error);
    res.status(500).json({
      success: false,
      message: 'Broadcast failed',
      error: error.message
    });
  }
});

// Debug route to inspect registered ESP32 info
app.get('/api/esp32-info', async (req, res) => {
  try {
    const ESP32Config = require('./models/ESP32Config');
    const configs = await ESP32Config.find().sort({ lastSeen: -1 });
    
    res.json({
      success: true,
      data: {
        inMemory: esp32Info,
        database: configs
      }
    });
  } catch (error) {
    res.json({
      success: true,
      data: {
        inMemory: esp32Info,
        database: []
      }
    });
  }
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
app.use('/api/holidays', holidayRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/test', testRoutes); // Test routes
app.use('/api/timemachine', timeMachineRoutes); // NEW: Time Machine API (Admin only)
app.use('/api/salary', salaryRoutes); // Salary calculation routes
app.use('/api/settings', settingsRoutes); // Settings routes
app.use('/api/overtime', overtimeRoutes); // Overtime request routes
app.use('/api/terminated-employees', terminatedEmployeeRoutes); // Terminated employees routes
// Chat routes with mock user for testing
app.use((req, res, next) => {
  if (req.path.startsWith('/api/chat')) {
    // giả lập user để các handler dùng req.user
    req.user = { _id: 'demo', name: 'Tester', role: 'admin' }; 
  }
  next();
});
app.use('/api/chat', chatRoutes);

// ESP32 health check endpoint
app.get('/healthz', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// ESP32 enroll endpoint - handles GET /api/enroll?id=X
app.get('/api/enroll', async (req, res) => {
  try {
    const { id } = req.query;
    const MAX_FINGERPRINT_ID = 127;
    
    console.log('=== ESP32 ENROLL REQUEST ===');
    console.log('Fingerprint ID:', id);

    if (!id) {
      return res.status(400).json({ success: false, message: 'Missing fingerprint ID' });
    }

    const fingerprintId = parseInt(id);
    
    // Validate fingerprint ID range
    if (fingerprintId > MAX_FINGERPRINT_ID || fingerprintId < 1) {
      return res.status(400).json({
        success: false,
        message: `Fingerprint ID phải trong khoảng 1-${MAX_FINGERPRINT_ID}. ID hiện tại: ${fingerprintId} không hợp lệ.`
      });
    }

    // Try to get ESP32 IP from multiple sources
    let esp32Ip = null;
    
    // 1. First try in-memory (from registration)
    if (esp32Info.ip) {
      esp32Ip = esp32Info.ip;
    } else {
      // 2. Try to load from database
      try {
        const ESP32Config = require('./models/ESP32Config');
        const latestConfig = await ESP32Config.findOne().sort({ lastSeen: -1 });
        if (latestConfig && latestConfig.esp32Ip) {
          esp32Ip = latestConfig.esp32Ip;
          // Update in-memory cache
          esp32Info.ip = latestConfig.esp32Ip;
          esp32Info.lastSeen = latestConfig.lastSeen?.toISOString() || new Date().toISOString();
          console.log(`✅ Loaded ESP32 IP from database: ${esp32Ip}`);
        }
      } catch (dbError) {
        console.error('Error loading ESP32 IP from database:', dbError);
      }
      
      // 3. Fallback to configured IP
      if (!esp32Ip) {
        esp32Ip = process.env.IP_ESP32 || '192.168.1.101';
        console.warn(`⚠️ ESP32 IP not registered; using configured fallback IP: ${esp32Ip}`);
        console.warn('   Recommend: ESP32 should call /esp32-register or set IP manually via /api/esp32-update-config');
      }
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
      console.error('ESP32 IP attempted:', esp32Ip);
      console.error('Health check URL:', healthCheckUrl);
      return res.status(503).json({
        success: false,
        message: 'ESP32 thiết bị không kết nối được. Vui lòng đảm bảo:\n- ESP32 đã bật và kết nối mạng\n- IP ESP32 đã được cấu hình đúng (hiện tại: ' + esp32Ip + ')\n- ESP32 đã gọi /esp32-register hoặc kiểm tra firewall',
        error: healthError.message,
        esp32Info: {
          ip: esp32Ip,
          configuredIp: configuredIp,
          registered: !!esp32Info.ip
        },
        healthCheckUrl: healthCheckUrl
      });
    }

    // Proceed with enrollment
    const esp32Url = `http://${esp32Ip}/enroll?id=${encodeURIComponent(id)}`;
    const maxRetries = 3;
    const baseTimeout = 10000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt} to communicate with ESP32 ${esp32Ip}...`);
        console.log(`ESP32 URL: ${esp32Url}`);
        const controller = new AbortController();
        const timeoutDuration = baseTimeout * attempt;
        const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

        const response = await fetch(esp32Url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`ESP32 returned status ${response.status}: ${errorText}`);
          throw new Error(`ESP32 returned status: ${response.status} - ${errorText.substring(0, 100)}`);
        }

        const data = await response.json();
        console.log(`ESP32 enroll response:`, JSON.stringify(data).substring(0, 200));

        const Employee = require('./models/Employee');
        const User = require('./models/User');
        
        console.log(`Looking for employee with fingerprintId: ${fingerprintId}`);
        const updateResult = await Employee.findOneAndUpdate(
          { fingerprintId: parseInt(id) },
          { fingerprintEnrolled: true },
          { new: true }
        );

        if (!updateResult) {
          console.error(`❌ Employee not found with fingerprintId: ${fingerprintId}`);
          return res.status(404).json({
            success: false,
            message: `Không tìm thấy nhân viên với Fingerprint ID: ${fingerprintId}`,
            fingerprintId: fingerprintId
          });
        }

        console.log('✅ Fingerprint enrolled for:', updateResult.name, 'Employee ID:', updateResult.employeeId);

        // Check if user account exists
        let userAccount = null;
        let accountPassword = null; // Password to send in email
        
        try {
          userAccount = await User.findOne({ username: updateResult.employeeId });
        } catch (userError) {
          console.error('Error checking user account:', userError);
          // Continue even if user check fails
        }
        
        if (!userAccount) {
          // User account doesn't exist - create new one
          try {
            console.log('📝 Creating user account for:', updateResult.employeeId);
            
            // Generate random password
            accountPassword = Math.random().toString(36).slice(-8);
            
            // Create user account
            userAccount = new User({
              username: updateResult.employeeId,
              password: accountPassword,
              role: 'employee',
              employee: updateResult._id,
              isActive: true
            });
            
            await userAccount.save();
            console.log('✅ User account created:', updateResult.employeeId);
          } catch (userCreateError) {
            console.error('❌ Error creating user account:', userCreateError);
            // Generate password anyway for email (even if account creation fails)
            if (!accountPassword) {
              accountPassword = Math.random().toString(36).slice(-8);
            }
          }
        } else {
          // User account already exists - reset password
          console.log('ℹ️ User account already exists for:', updateResult.employeeId);
          
          try {
            // Generate new random password
            accountPassword = Math.random().toString(36).slice(-8);
            
            // Update password (will be hashed by pre-save hook)
            userAccount.password = accountPassword;
            await userAccount.save();
            console.log('✅ Password reset for existing user account:', updateResult.employeeId);
          } catch (passwordError) {
            console.error('❌ Error resetting password:', passwordError);
            // Generate password anyway for email (even if password reset fails)
            if (!accountPassword) {
              accountPassword = Math.random().toString(36).slice(-8);
            }
          }
        }

        // Always send email with login credentials when enroll fingerprint
        // Ensure we have a password to send
        if (!accountPassword) {
          accountPassword = Math.random().toString(36).slice(-8);
          console.log('⚠️ Generated fallback password for email');
        }
        
        if (updateResult.email) {
          try {
            const { sendEnrollmentNotification } = require('./services/emailService');
            console.log('📧 Sending enrollment notification with login credentials to:', updateResult.email);
            
            const emailResult = await sendEnrollmentNotification({
              name: updateResult.name,
              email: updateResult.email,
              employeeId: updateResult.employeeId,
              fingerprintId: updateResult.fingerprintId,
              username: userAccount ? userAccount.username : updateResult.employeeId,
              password: accountPassword, // Always include password
              position: updateResult.position,
              department: updateResult.department
            });
            
            if (emailResult.success) {
              console.log('✅ Enrollment notification with credentials sent successfully!');
            } else {
              console.error('❌ Failed to send enrollment notification:', emailResult.error);
            }
          } catch (emailError) {
            console.error('❌ Error sending enrollment notification:', emailError);
            // Continue even if email fails
          }
        } else if (updateResult.email && !accountPassword) {
          console.warn('⚠️ Cannot send email: password not generated');
        }

        return res.json({
          success: true,
          message: 'Enrollment successful! Check your email for login credentials.',
          data: {
            employee: updateResult,
            enrollStatus: data,
            emailSent: !!updateResult.email
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

// Debug: Fix salary for employee (temporary endpoint)
app.post('/api/debug/fix-salary/:employeeId', async (req, res) => {
  try {
    const Employee = require('./models/Employee');
    const { employeeId } = req.params;
    const { salary } = req.body;
    
    if (!salary || isNaN(Number(salary))) {
      return res.status(400).json({
        success: false,
        message: 'Lương không hợp lệ'
      });
    }
    
    const parsedSalary = Number(salary);
    const employee = await Employee.findOne({ employeeId });
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhân viên'
      });
    }
    
    employee.salary = parsedSalary;
    employee.baseSalary = parsedSalary;
    await employee.save();
    
    res.json({
      success: true,
      message: `Đã cập nhật lương cho ${employee.name} thành ${parsedSalary.toLocaleString('vi-VN')} VND`,
      data: employee
    });
  } catch (error) {
    console.error('Error fixing salary:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật lương',
      error: error.message
    });
  }
});

// Debug: Get all employees with fingerprint info
app.get('/api/debug/employees', async (req, res) => {
  try {
    const Employee = require('./models/Employee');
    const User = require('./models/User');
    
    // Include baseSalary in the select to ensure it's returned
    const employees = await Employee.find({}, 'name employeeId fingerprintId fingerprintEnrolled position department email phone status contractType salary baseSalary profileCompleted').lean();
    
    // Lookup user roles for each employee
    const employeesWithRole = await Promise.all(employees.map(async (emp) => {
      const user = await User.findOne({ employee: emp._id }, 'role').lean();
      return {
        ...emp,
        userRole: user?.role || 'employee'
      };
    }));
    
    console.log('All employees:', employeesWithRole.map(emp => ({ 
      name: emp.name, 
      employeeId: emp.employeeId, 
      salary: emp.salary, 
      baseSalary: emp.baseSalary,
      userRole: emp.userRole
    })));
    res.json({
      success: true,
      data: employeesWithRole
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

// Delete employee
app.delete('/api/debug/employees/:id', async (req, res) => {
  try {
    const Employee = require('./models/Employee');
    const User = require('./models/User');
    const Attendance = require('./models/Attendance');
    const { id } = req.params;
    
    console.log('🗑️ Deleting employee:', id);
    
    // Find employee first
    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Nhân viên không tồn tại'
      });
    }
    
    console.log('📋 Employee to delete:', {
      name: employee.name,
      employeeId: employee.employeeId,
      email: employee.email,
      fingerprintId: employee.fingerprintId
    });
    
    // Delete associated user accounts (by username OR email)
    const deleteUserPromises = [];
    
    if (employee.employeeId) {
      deleteUserPromises.push(
        User.findOneAndDelete({ username: employee.employeeId }).then(result => {
          if (result) console.log('✅ Deleted user account by username:', employee.employeeId);
        })
      );
    }
    
    if (employee.email) {
      deleteUserPromises.push(
        User.findOneAndDelete({ email: employee.email }).then(result => {
          if (result) console.log('✅ Deleted user account by email:', employee.email);
        })
      );
    }
    
    // Also delete by employee reference
    if (employee._id) {
      deleteUserPromises.push(
        User.findOneAndDelete({ employee: employee._id }).then(result => {
          if (result) console.log('✅ Deleted user account by employee reference:', employee._id);
        })
      );
    }
    
    await Promise.all(deleteUserPromises);
    
    // Delete attendance records for this employee
    const attendanceResult = await Attendance.deleteMany({ employee: employee._id });
    console.log('✅ Deleted attendance records:', attendanceResult.deletedCount);
    
    // Delete employee
    await Employee.findByIdAndDelete(id);
    console.log('✅ Employee deleted successfully:', id);
    
    res.json({
      success: true,
      message: 'Xóa nhân viên thành công',
      deleted: {
        employee: true,
        userAccounts: deleteUserPromises.length,
        attendanceRecords: attendanceResult.deletedCount
      }
    });
  } catch (error) {
    console.error('❌ Error deleting employee:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa nhân viên',
      error: error.message
    });
  }
});

// Debug: Add new employee
app.post('/api/debug/employees', async (req, res) => {
  try {
    const Employee = require('./models/Employee');
    const User = require('./models/User');
    const { name, position, department, email, phone, fingerprintId, contractType, salary: salaryRaw, createUserAccount, userRole } = req.body;
    
    console.log('📝 Creating employee with data:', req.body);
    
    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Tên nhân viên là bắt buộc'
      });
    }
    
    if (!position) {
      return res.status(400).json({
        success: false,
        message: 'Chức vụ là bắt buộc'
      });
    }
    
    if (!department) {
      return res.status(400).json({
        success: false,
        message: 'Phòng ban là bắt buộc'
      });
    }
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email là bắt buộc'
      });
    }
    
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Số điện thoại là bắt buộc'
      });
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check if employee with this email already exists
    const existingEmployee = await Employee.findOne({ email: normalizedEmail });
    if (existingEmployee) {
      return res.status(400).json({
        success: false,
        message: `Email ${normalizedEmail} đã được sử dụng bởi nhân viên khác`,
        existingEmployee: {
          id: existingEmployee._id,
          name: existingEmployee.name,
          employeeId: existingEmployee.employeeId
        }
      });
    }
    
    // Clean up orphan user accounts with this email (if any)
    // This handles the case where employee was deleted but user account remains
    const orphanUsers = await User.find({ 
      $or: [
        { email: normalizedEmail },
        { email: new RegExp(`^${normalizedEmail}$`, 'i') }
      ]
    });
    
    if (orphanUsers.length > 0) {
      console.log(`🧹 Found ${orphanUsers.length} orphan user account(s) with email ${normalizedEmail}, cleaning up...`);
      await User.deleteMany({ 
        $or: [
          { email: normalizedEmail },
          { email: new RegExp(`^${normalizedEmail}$`, 'i') }
        ]
      });
      console.log('✅ Cleaned up orphan user accounts');
    }
    
    // Generate employee ID (find next available ID)
    // Get all existing employeeIds
    const existingEmployeeIds = await Employee.distinct('employeeId');
    
    // Find next available employeeId
    let employeeId = null;
    for (let i = 1; i <= 999; i++) {
      const candidateId = `EMP${String(i).padStart(3, '0')}`;
      if (!existingEmployeeIds.includes(candidateId)) {
        employeeId = candidateId;
        break;
      }
    }
    
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Không thể tạo employeeId mới. Đã đạt giới hạn 999 nhân viên.'
      });
    }
    
    console.log('Generated employeeId:', employeeId);
    
    // Get next fingerprint ID if not provided
    // ESP32 fingerprint scanner typically supports IDs 1-127 or 1-255
    // Limit to 1-127 for safety
    const MAX_FINGERPRINT_ID = 127;
    let finalFingerprintId = fingerprintId;
    if (!finalFingerprintId) {
      // Find the highest fingerprint ID that's less than MAX_FINGERPRINT_ID
      const lastEmployee = await Employee.findOne({ 
        fingerprintId: { $lt: MAX_FINGERPRINT_ID } 
      }).sort({ fingerprintId: -1 });
      
      if (lastEmployee && lastEmployee.fingerprintId) {
        finalFingerprintId = lastEmployee.fingerprintId + 1;
      } else {
        finalFingerprintId = 1; // Start from 1
      }
      
      // If we've reached the max, find a gap or return error
      if (finalFingerprintId >= MAX_FINGERPRINT_ID) {
        // Find any available ID below max
        const usedIds = await Employee.distinct('fingerprintId', {
          fingerprintId: { $lt: MAX_FINGERPRINT_ID, $ne: null }
        });
        
        for (let i = 1; i < MAX_FINGERPRINT_ID; i++) {
          if (!usedIds.includes(i)) {
            finalFingerprintId = i;
            break;
          }
        }
        
        if (finalFingerprintId >= MAX_FINGERPRINT_ID) {
          return res.status(400).json({
            success: false,
            message: `Không thể tạo fingerprint ID mới. Đã đạt giới hạn ${MAX_FINGERPRINT_ID} vân tay. Vui lòng xóa vân tay cũ để tạo mới.`
          });
        }
      }
    }
    
    // Check if fingerprint ID is already in use
    if (finalFingerprintId) {
      const existingFingerprint = await Employee.findOne({ fingerprintId: finalFingerprintId });
      if (existingFingerprint) {
        return res.status(400).json({
          success: false,
          message: `Fingerprint ID ${finalFingerprintId} đã được sử dụng bởi nhân viên: ${existingFingerprint.name} (${existingFingerprint.employeeId})`
        });
      }
    }
    
    // Validate fingerprint ID range
    if (finalFingerprintId > MAX_FINGERPRINT_ID || finalFingerprintId < 1) {
      return res.status(400).json({
        success: false,
        message: `Fingerprint ID phải trong khoảng 1-${MAX_FINGERPRINT_ID}. Giá trị hiện tại: ${finalFingerprintId}`
      });
    }
    
    // Parse salary to number - handle both string and number input
    let parsedSalary = 0;
    if (salaryRaw !== undefined && salaryRaw !== null && salaryRaw !== '') {
      parsedSalary = Number(salaryRaw);
      if (isNaN(parsedSalary) || parsedSalary < 0) {
        return res.status(400).json({
          success: false,
          message: 'Lương không hợp lệ. Vui lòng nhập số dương.'
        });
      }
    }
    
    console.log('💰 Salary parsing:', { raw: salaryRaw, parsed: parsedSalary });
    
    const newEmployee = new Employee({
      name,
      position,
      department,
      email: normalizedEmail,
      phone,
      employeeId,
      fingerprintId: finalFingerprintId,
      fingerprintEnrolled: false,
      contractType: contractType || 'probation',
      salary: parsedSalary,
      baseSalary: parsedSalary, // Set baseSalary explicitly to ensure it's saved
      status: 'active' // Always set to active by default
    });
    
    console.log('💾 Saving employee:', newEmployee);
    const savedEmployee = await newEmployee.save();
    console.log('✅ Employee created successfully:', savedEmployee.employeeId);
    
    // Create user account if requested
    let userAccount = null;
    if (createUserAccount) {
      try {
        // Validate role
        const validRoles = ['employee', 'accountant', 'manager'];
        const finalRole = validRoles.includes(userRole) ? userRole : 'employee';
        
        // Check if user account already exists with this email
        const existingUser = await User.findOne({ 
          $or: [
            { email: normalizedEmail },
            { username: employeeId }
          ]
        });
        
        if (existingUser) {
          console.log('⚠️ User account already exists for this employee');
        } else {
          // Create user account
          // Default password is employeeId (user should change on first login)
          userAccount = new User({
            email: normalizedEmail,
            username: employeeId,
            password: employeeId, // Default password = employeeId
            role: finalRole,
            employee: savedEmployee._id, // Link to employee
            isActive: true
          });
          
          await userAccount.save();
          console.log(`✅ User account created with role: ${finalRole}`);
        }
      } catch (userError) {
        console.error('❌ Error creating user account:', userError);
        // Don't fail the employee creation if user account creation fails
        // Just log the error
      }
    }
    
    res.json({
      success: true,
      message: 'Thêm nhân viên thành công',
      data: savedEmployee,
      userAccount: userAccount ? {
        email: userAccount.email,
        username: userAccount.username,
        role: userAccount.role,
        defaultPassword: employeeId
      } : null,
      cleaned: {
        orphanUsers: orphanUsers.length
      }
    });
  } catch (error) {
    console.error('❌ Error creating employee:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern)[0];
      const duplicateValue = error.keyValue[duplicateField];
      
      let message = `${duplicateField === 'email' ? 'Email' : duplicateField === 'employeeId' ? 'Mã nhân viên' : duplicateField === 'fingerprintId' ? 'Fingerprint ID' : duplicateField} đã tồn tại`;
      
      if (duplicateField === 'email') {
        message += `. Có thể có user account cũ với email này. Đang tự động cleanup...`;
        // Try to clean up and retry
        try {
          await User.deleteMany({ email: duplicateValue });
          console.log('✅ Cleaned up user account, retrying...');
          // Don't retry automatically, return error with cleanup info
          return res.status(400).json({
            success: false,
            message: `${message} Đã cleanup user account. Vui lòng thử lại.`,
            error: error.message,
            cleaned: true
          });
        } catch (cleanupError) {
          console.error('Error during cleanup:', cleanupError);
        }
      }
      
      return res.status(400).json({
        success: false,
        message: message,
        error: error.message,
        duplicateField,
        duplicateValue
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo nhân viên',
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
  const serverIP = process.env.IP_MACHINE || 'localhost';
  console.log(`Server accessible at: http://${serverIP}:${PORT}`);
});


