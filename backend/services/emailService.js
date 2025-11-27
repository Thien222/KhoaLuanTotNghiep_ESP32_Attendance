const nodemailer = require('nodemailer');

// Load environment variables
require('dotenv').config({ path: '../config.env' });

// Create email transporter
const createTransporter = () => {
  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_APP_PASSWORD;
  
  if (!emailUser || !emailPassword) {
    console.error('❌ EMAIL_USER or EMAIL_APP_PASSWORD is not set in environment variables!');
    throw new Error('Email configuration is required');
  }
  
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPassword
    }
  });
  
  return transporter;
};
// Send welcome email with login credentials
exports.sendWelcomeEmail = async (employeeData, credentials) => {
  try {
    const transporter = createTransporter();

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

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    console.log('📧 To:', employeeData.email);
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return { success: false, error: error.message };
  }
};

// Send fingerprint enrollment notification
exports.sendEnrollmentNotification = async (employeeData) => {
  try {
    const transporter = createTransporter();

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

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Enrollment notification sent:', info.messageId);
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error('❌ Error sending enrollment notification:', error);
    return { success: false, error: error.message };
  }
};

// Test email configuration
exports.testEmailConfig = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('✅ Email server is ready');
    return { success: true };
  } catch (error) {
    console.error('❌ Email server error:', error);
    return { success: false, error: error.message };
  }
};

