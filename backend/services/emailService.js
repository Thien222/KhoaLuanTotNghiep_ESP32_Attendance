const nodemailer = require('nodemailer');

// Environment variables are loaded from app.js, no need to reload here

// Create email transporter with automatic fallback
const createTransporter = (preferredPort = 465) => {
  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_APP_PASSWORD;

  console.log('📧 createTransporter called with:', {
    hasEmailUser: !!emailUser,
    hasEmailPassword: !!emailPassword,
    emailUserValue: emailUser || 'undefined',
    passwordLength: emailPassword ? emailPassword.length : 0,
    preferredPort: preferredPort
  });

  if (!emailUser || !emailPassword) {
    console.error('❌ EMAIL_USER or EMAIL_APP_PASSWORD is not set in environment variables!');
    console.error('❌ Current values: EMAIL_USER=' + (emailUser || 'undefined') + ', EMAIL_APP_PASSWORD=' + (emailPassword ? '[SET]' : 'undefined'));
    throw new Error('Email configuration is required. Please set EMAIL_USER and EMAIL_APP_PASSWORD.');
  }

  // Try port 465 (SSL) first, fallback to 587 (STARTTLS)
  // Some hosting providers block port 587
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: preferredPort, // 465 (SSL) or 587 (STARTTLS)
    secure: preferredPort === 465, // true for 465, false for 587
    auth: {
      user: emailUser,
      pass: emailPassword
    },
    tls: {
      rejectUnauthorized: false // Allow connections on some hosting providers
    },
    connectionTimeout: 30000, // 30 seconds (increased for Render)
    greetingTimeout: 30000,
    socketTimeout: 30000,
    // Additional options for better reliability
    pool: true,
    maxConnections: 1,
    maxMessages: 3
  });

  console.log(`✅ Email transporter created successfully (port ${preferredPort})`);
  return transporter;
};
// Send welcome email with login credentials
exports.sendWelcomeEmail = async (employeeData, credentials) => {
  try {
    console.log('📧 Preparing to send welcome email...');
    console.log('📧 Email config check:', {
      hasEmailUser: !!process.env.EMAIL_USER,
      hasEmailPassword: !!process.env.EMAIL_APP_PASSWORD,
      emailUser: process.env.EMAIL_USER
    });

    const transporter = createTransporter();
    console.log('✅ Email transporter created');

    const mailOptions = {
      from: `"HR Management System" <${process.env.EMAIL_USER}>`,
      to: employeeData.email,
      subject: '🎉 Chào mừng bạn đến với Hệ thống Quản lý Nhân sự!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .credentials { background: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; }
            .credential-item { margin: 10px 0; }
            .credential-label { font-weight: bold; color: #667eea; }
            .credential-value { font-size: 18px; color: #333; background: #f0f0f0; padding: 8px 12px; border-radius: 4px; display: inline-block; margin-left: 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Chào mừng ${employeeData.name}!</h1>
              <p>Tài khoản của bạn đã được tạo thành công</p>
            </div>
            
            <div class="content">
              <h2>Thông tin đăng nhập</h2>
              <p>Xin chào <strong>${employeeData.name}</strong>,</p>
              <p>Chúng tôi rất vui mừng chào đón bạn đến với Hệ thống Quản lý Nhân sự tích hợp chấm công vân tay!</p>
              
              <div class="credentials">
                <h3>🔐 Thông tin đăng nhập của bạn:</h3>
                <div class="credential-item">
                  <span class="credential-label">👤 Tên đăng nhập:</span>
                  <span class="credential-value">${credentials.username}</span>
                </div>
                <div class="credential-item">
                  <span class="credential-label">🔑 Mật khẩu:</span>
                  <span class="credential-value">${credentials.password}</span>
                </div>
                <div class="credential-item">
                  <span class="credential-label">📧 Email:</span>
                  <span class="credential-value">${employeeData.email}</span>
                </div>
                <div class="credential-item">
                  <span class="credential-label">🆔 Mã nhân viên:</span>
                  <span class="credential-value">${employeeData.employeeId}</span>
                </div>
                <div class="credential-item">
                  <span class="credential-label">👆 ID Vân tay:</span>
                  <span class="credential-value">#${employeeData.fingerprintId}</span>
                </div>
              </div>

              <div class="warning">
                <strong>⚠️ Lưu ý quan trọng:</strong>
                <ul>
                  <li>Vui lòng <strong>đổi mật khẩu</strong> ngay sau lần đăng nhập đầu tiên</li>
                  <li>Không chia sẻ thông tin đăng nhập với bất kỳ ai</li>
                  <li>Liên hệ bộ phận HR nếu bạn quên mật khẩu</li>
                </ul>
              </div>

              <p style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3001'}" class="button">
                  🚀 Đăng nhập ngay
                </a>
              </p>

              <h3>📋 Thông tin nhân viên:</h3>
              <ul>
                <li><strong>Chức vụ:</strong> ${employeeData.position || 'N/A'}</li>
                <li><strong>Phòng ban:</strong> ${employeeData.department || 'N/A'}</li>
                <li><strong>Trạng thái vân tay:</strong> ${employeeData.fingerprintEnrolled ? '✅ Đã đăng ký' : '⏳ Chưa đăng ký'}</li>
              </ul>

              <p>Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với bộ phận HR.</p>
              
              <p>Chúc bạn có một ngày làm việc vui vẻ! 😊</p>
            </div>

            <div class="footer">
              <p>Email này được gửi tự động từ Hệ thống Quản lý Nhân sự</p>
              <p>© 2025 HR Management System. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    console.log('📧 Sending email to:', employeeData.email);
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully!');
    console.log('📧 Message ID:', info.messageId);
    console.log('📧 Response:', info.response);
    console.log('📧 To:', employeeData.email);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error('❌ Error sending email:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode
    });
    return { success: false, error: error.message };
  }
};

// Send fingerprint enrollment notification
exports.sendEnrollmentNotification = async (employeeData) => {
  try {
    console.log('📧 Preparing to send enrollment notification...');
    console.log('📧 Employee data:', {
      name: employeeData.name,
      email: employeeData.email,
      employeeId: employeeData.employeeId,
      fingerprintId: employeeData.fingerprintId,
      hasPassword: !!employeeData.password
    });

    const transporter = createTransporter();
    console.log('✅ Email transporter created for enrollment notification');

    const mailOptions = {
      from: `"HR Management System" <${process.env.EMAIL_USER}>`,
      to: employeeData.email,
      subject: '✅ Đăng ký vân tay thành công!',
      html: `
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

              ${employeeData.employeeId ? `
              <h2>Thông tin đăng nhập</h2>
              <p>Chúng tôi rất vui mừng chào đón bạn đến với Hệ thống Quản lý Nhân sự tích hợp chấm công vân tay!</p>
              
              <div class="credentials">
                <h3>🔐 Thông tin đăng nhập của bạn:</h3>
                <div class="credential-item">
                  <span class="credential-label">👤 Tên đăng nhập:</span>
                  <span class="credential-value">${employeeData.employeeId || employeeData.username || 'N/A'}</span>
                </div>
                ${employeeData.password ? `
                <div class="credential-item">
                  <span class="credential-label">🔑 Mật khẩu:</span>
                  <span class="credential-value">${employeeData.password}</span>
                </div>
                ` : ''}
                <div class="credential-item">
                  <span class="credential-label">📧 Email:</span>
                  <span class="credential-value">${employeeData.email}</span>
                </div>
                <div class="credential-item">
                  <span class="credential-label">🆔 Mã nhân viên:</span>
                  <span class="credential-value">${employeeData.employeeId || 'N/A'}</span>
                </div>
                <div class="credential-item">
                  <span class="credential-label">👆 ID Vân tay:</span>
                  <span class="credential-value">#${employeeData.fingerprintId}</span>
                </div>
              </div>
              
              ${employeeData.password ? `
              <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
                <strong>⚠️ Lưu ý quan trọng:</strong>
                <ul>
                  <li>Vui lòng <strong>đổi mật khẩu</strong> ngay sau lần đăng nhập đầu tiên</li>
                  <li>Không chia sẻ thông tin đăng nhập với bất kỳ ai</li>
                  <li>Liên hệ bộ phận HR nếu bạn quên mật khẩu</li>
                </ul>
              </div>
              ` : ''}
              ` : ''}

              <p>Từ bây giờ, bạn có thể sử dụng vân tay để:</p>
              <ul>
                <li>✅ Chấm công vào/ra</li>
                <li>✅ Truy cập các khu vực được phép</li>
                <li>✅ Xác thực danh tính</li>
              </ul>

              <p>Nếu bạn gặp bất kỳ vấn đề nào khi sử dụng, vui lòng liên hệ với bộ phận IT.</p>
              
              <p>Chúc bạn có một ngày làm việc hiệu quả! 💪</p>
            </div>

            <div class="footer">
              <p>Email này được gửi tự động từ Hệ thống Quản lý Nhân sự</p>
              <p>© 2025 HR Management System. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    console.log('📧 Sending enrollment notification to:', employeeData.email);
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Enrollment notification sent successfully!');
    console.log('📧 Message ID:', info.messageId);
    console.log('📧 Response:', info.response);
    console.log('📧 To:', employeeData.email);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error('❌ Error sending enrollment notification:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode
    });
    return { success: false, error: error.message };
  }
};

// Test email configuration with timeout and retry
exports.testEmailConfig = async () => {
  try {
    const transporter = createTransporter();
    
    // Use Promise.race to add timeout
    const verifyPromise = transporter.verify();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout after 20 seconds')), 20000)
    );
    
    await Promise.race([verifyPromise, timeoutPromise]);
    console.log('✅ Email server is ready');
    return { success: true };
  } catch (error) {
    console.error('❌ Email server error:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      command: error.command
    });
    
    // If port 465 fails, try port 587 as fallback
    if (error.message.includes('timeout') || error.code === 'ETIMEDOUT') {
      console.log('⚠️ Port 465 failed, trying port 587 (STARTTLS)...');
      try {
        const fallbackTransporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_APP_PASSWORD
          },
          tls: {
            rejectUnauthorized: false
          },
          connectionTimeout: 30000,
          greetingTimeout: 30000,
          socketTimeout: 30000
        });
        
        const verifyPromise = fallbackTransporter.verify();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 20000)
        );
        
        await Promise.race([verifyPromise, timeoutPromise]);
        console.log('✅ Email server is ready (using port 587)');
        return { success: true, port: 587 };
      } catch (fallbackError) {
        console.error('❌ Fallback port 587 also failed:', fallbackError.message);
        return { 
          success: false, 
          error: `Both ports failed. Last error: ${fallbackError.message}. This may be due to hosting provider blocking SMTP connections.` 
        };
      }
    }
    
    return { success: false, error: error.message };
  }
};

