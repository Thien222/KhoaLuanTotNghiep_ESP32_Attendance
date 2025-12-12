const nodemailer = require('nodemailer');

// Singleton transporter to reuse connection
let cachedTransporter = null;

// Create email transporter with retry logic
const createTransporter = () => {
  if (cachedTransporter) {
    console.log('📧 Using cached transporter');
    return cachedTransporter;
  }

  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_APP_PASSWORD;

  console.log('📧 createTransporter called with:', {
    hasEmailUser: !!emailUser,
    hasEmailPassword: !!emailPassword,
    emailUser: emailUser || 'undefined',
    passwordLength: emailPassword ? emailPassword.length : 0
  });

  if (!emailUser || !emailPassword) {
    console.error('❌ EMAIL_USER or EMAIL_APP_PASSWORD is not set!');
    throw new Error('Email configuration missing. Set EMAIL_USER and EMAIL_APP_PASSWORD.');
  }

  // Create transporter with connection pooling and increased timeouts
  cachedTransporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    pool: true, // Use connection pooling
    maxConnections: 3,
    maxMessages: 100,
    auth: {
      user: emailUser,
      pass: emailPassword
    },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 60000, // 60 seconds
    greetingTimeout: 60000,   // 60 seconds  
    socketTimeout: 60000,     // 60 seconds
    debug: true,  // Enable debug output
    logger: true  // Log to console
  });

  console.log('📧 New transporter created with pooling');
  return cachedTransporter;
};

// Send email with retry logic
const sendEmailWithRetry = async (mailOptions, maxRetries = 3) => {
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📧 [Attempt ${attempt}/${maxRetries}] Sending email to: ${mailOptions.to}`);

      const transporter = createTransporter();
      const info = await transporter.sendMail(mailOptions);

      console.log(`✅ [Attempt ${attempt}] Email sent successfully!`);
      console.log('📧 Message ID:', info.messageId);
      console.log('📧 Response:', info.response);

      return { success: true, messageId: info.messageId, attempt };

    } catch (error) {
      lastError = error;
      console.error(`❌ [Attempt ${attempt}/${maxRetries}] Email error:`, error.message);
      console.error('❌ Error code:', error.code);

      // Reset transporter on connection errors
      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNECTION' || error.code === 'ESOCKET') {
        console.log('🔄 Resetting transporter due to connection error...');
        cachedTransporter = null;
      }

      if (attempt < maxRetries) {
        const delay = attempt * 2000; // 2s, 4s, 6s...
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  console.error('❌ All email attempts failed!');
  return { success: false, error: lastError?.message || 'Unknown error', attempts: maxRetries };
};

// Send enrollment notification
exports.sendEnrollmentNotification = async (employeeData) => {
  console.log('========== EMAIL SERVICE START ==========');
  console.log('📧 sendEnrollmentNotification called');
  console.log('📧 Employee data:', JSON.stringify(employeeData, null, 2));

  try {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #52c41a 0%, #237804 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .success-box { background: white; padding: 20px; border-left: 4px solid #52c41a; margin: 20px 0; text-align: center; }
          .credentials { background: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; }
          .credential-item { margin: 10px 0; }
          .credential-label { font-weight: bold; color: #667eea; }
          .credential-value { font-size: 18px; color: #333; background: #f0f0f0; padding: 8px 12px; border-radius: 4px; display: inline-block; margin-left: 10px; }
          .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Đăng ký vân tay thành công!</h1>
          </div>
          
          <div class="content">
            <p>Xin chào <strong>${employeeData.name}</strong>,</p>
            
            <div class="success-box">
              <h2>🎉 Chúc mừng!</h2>
              <p>Vân tay của bạn đã được đăng ký thành công vào hệ thống.</p>
              <p style="font-size: 48px; margin: 20px 0;">👆</p>
              <p><strong>ID Vân tay:</strong> #${employeeData.fingerprintId}</p>
            </div>

            ${employeeData.password ? `
            <div class="credentials">
              <h3>🔐 Thông tin đăng nhập:</h3>
              <div class="credential-item">
                <span class="credential-label">👤 Tên đăng nhập:</span>
                <span class="credential-value">${employeeData.username || employeeData.employeeId}</span>
              </div>
              <div class="credential-item">
                <span class="credential-label">🔑 Mật khẩu:</span>
                <span class="credential-value">${employeeData.password}</span>
              </div>
              <div class="credential-item">
                <span class="credential-label">📧 Email:</span>
                <span class="credential-value">${employeeData.email}</span>
              </div>
              <div class="credential-item">
                <span class="credential-label">🆔 Mã nhân viên:</span>
                <span class="credential-value">${employeeData.employeeId}</span>
              </div>
            </div>
            
            <div class="warning">
              <strong>⚠️ Lưu ý:</strong>
              <ul>
                <li>Vui lòng <strong>đổi mật khẩu</strong> ngay sau lần đăng nhập đầu tiên</li>
                <li>Không chia sẻ thông tin đăng nhập với bất kỳ ai</li>
              </ul>
            </div>
            ` : ''}

            <p>Từ bây giờ, bạn có thể sử dụng vân tay để chấm công.</p>
            <p>Chúc bạn có một ngày làm việc hiệu quả! 💪</p>
          </div>

          <div class="footer">
            <p>© 2025 HR Management System</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"HR Management System" <${process.env.EMAIL_USER}>`,
      to: employeeData.email,
      subject: '✅ Đăng ký vân tay thành công!',
      html: htmlContent
    };

    const result = await sendEmailWithRetry(mailOptions, 3);

    console.log('========== EMAIL SERVICE END ==========');
    return result;

  } catch (error) {
    console.error('========== EMAIL SERVICE ERROR ==========');
    console.error('❌ Error:', error.message);
    console.error('❌ Stack:', error.stack);
    console.error('========== EMAIL SERVICE END (FAILED) ==========');
    return { success: false, error: error.message };
  }
};

// Send admin notification
exports.sendAdminNotification = async (notificationData) => {
  console.log('========== ADMIN NOTIFICATION START ==========');
  console.log('📧 Sending admin notification');

  try {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif;">
        <h1>⚠️ Nhân viên chưa có tài khoản</h1>
        <p>Nhân viên <strong>${notificationData.employeeName}</strong> đã enroll vân tay nhưng chưa có tài khoản.</p>
        <ul>
          <li>Email: ${notificationData.employeeEmail}</li>
          <li>Mã NV: ${notificationData.employeeId}</li>
          <li>ID Vân tay: #${notificationData.fingerprintId}</li>
        </ul>
        <p>Vui lòng tạo tài khoản cho nhân viên này.</p>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"HR Management System" <${process.env.EMAIL_USER}>`,
      to: notificationData.adminEmail,
      subject: '⚠️ Nhân viên chưa có tài khoản đăng nhập',
      html: htmlContent
    };

    const result = await sendEmailWithRetry(mailOptions, 3);
    console.log('========== ADMIN NOTIFICATION END ==========');
    return result;

  } catch (error) {
    console.error('❌ Admin notification error:', error.message);
    return { success: false, error: error.message };
  }
};

// Send welcome email
exports.sendWelcomeEmail = async (employeeData, credentials) => {
  return exports.sendEnrollmentNotification({
    ...employeeData,
    username: credentials.username,
    password: credentials.password
  });
};

// Test email config with detailed error
exports.testEmailConfig = async () => {
  try {
    console.log('📧 Testing email configuration...');
    const transporter = createTransporter();

    console.log('📧 Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified!');

    return { success: true, message: 'Email configuration is valid' };
  } catch (error) {
    console.error('❌ Email config error:', error.message);
    console.error('❌ Error code:', error.code);
    console.error('❌ Full error:', error);
    return {
      success: false,
      error: error.message,
      code: error.code,
      details: error.response || 'No additional details'
    };
  }
};

// Force close transporter (use when shutting down)
exports.closeTransporter = () => {
  if (cachedTransporter) {
    cachedTransporter.close();
    cachedTransporter = null;
    console.log('📧 Transporter closed');
  }
};
