const nodemailer = require('nodemailer');

// Create email transporter
const createTransporter = () => {
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

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: emailUser,
      pass: emailPassword
    },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000
  });

  return transporter;
};

// Send enrollment notification
exports.sendEnrollmentNotification = async (employeeData) => {
  try {
    console.log('========== EMAIL SERVICE START ==========');
    console.log('📧 sendEnrollmentNotification called');
    console.log('📧 Employee data:', JSON.stringify(employeeData, null, 2));
    
    const transporter = createTransporter();
    console.log('✅ Transporter created');

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

    console.log('📧 Sending email to:', employeeData.email);
    console.log('📧 From:', mailOptions.from);
    
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email sent successfully!');
    console.log('📧 Message ID:', info.messageId);
    console.log('📧 Response:', info.response);
    console.log('========== EMAIL SERVICE END (SUCCESS) ==========');
    
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error('========== EMAIL SERVICE ERROR ==========');
    console.error('❌ Error:', error.message);
    console.error('❌ Code:', error.code);
    console.error('❌ Stack:', error.stack);
    console.error('========== EMAIL SERVICE END (FAILED) ==========');
    return { success: false, error: error.message };
  }
};

// Send admin notification
exports.sendAdminNotification = async (notificationData) => {
  try {
    console.log('========== ADMIN NOTIFICATION START ==========');
    console.log('📧 Sending admin notification');
    
    const transporter = createTransporter();

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

    console.log('📧 Sending to admin:', notificationData.adminEmail);
    
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Admin notification sent!');
    console.log('📧 Message ID:', info.messageId);
    console.log('========== ADMIN NOTIFICATION END ==========');
    
    return { success: true, messageId: info.messageId };
    
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

// Test email config
exports.testEmailConfig = async () => {
  try {
    console.log('📧 Testing email configuration...');
    const transporter = createTransporter();
    await transporter.verify();
    console.log('✅ Email config is valid');
    return { success: true };
  } catch (error) {
    console.error('❌ Email config error:', error.message);
    return { success: false, error: error.message };
  }
};
