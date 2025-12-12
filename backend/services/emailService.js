/**
 * Email Service using Resend (HTTP API)
 * 
 * Render Free Tier blocks SMTP connections (port 25, 465, 587)
 * Resend uses HTTP API which is NOT blocked!
 * 
 * Setup:
 * 1. Go to https://resend.com and create account
 * 2. Get API key from dashboard
 * 3. Add RESEND_API_KEY to Render environment variables
 * 4. Verify your domain or use onboarding@resend.dev for testing
 */

const { Resend } = require('resend');

// Initialize Resend client
let resendClient = null;

const getResendClient = () => {
  if (resendClient) return resendClient;

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.error('❌ RESEND_API_KEY is not set!');
    console.log('📧 To enable email, add RESEND_API_KEY to environment variables');
    console.log('📧 Get free API key at: https://resend.com');
    return null;
  }

  resendClient = new Resend(apiKey);
  console.log('📧 Resend client initialized');
  return resendClient;
};

// Send email using Resend API (HTTP - không bị Render block!)
const sendEmailWithResend = async (mailOptions) => {
  console.log('📧 Sending email via Resend HTTP API...');
  console.log('📧 To:', mailOptions.to);

  const client = getResendClient();

  if (!client) {
    console.log('⚠️ Email disabled (no RESEND_API_KEY)');
    return { success: false, error: 'Resend API key not configured' };
  }

  try {
    // Resend requires verified domain or use their test email
    // For testing, use: onboarding@resend.dev as from address
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'HR System <onboarding@resend.dev>';

    const result = await client.emails.send({
      from: fromEmail,
      to: mailOptions.to,
      subject: mailOptions.subject,
      html: mailOptions.html
    });

    console.log('✅ Email sent via Resend!');
    console.log('📧 Result:', JSON.stringify(result));

    return { success: true, messageId: result.data?.id || 'sent', result };

  } catch (error) {
    console.error('❌ Resend error:', error.message);
    console.error('❌ Full error:', JSON.stringify(error));
    return { success: false, error: error.message };
  }
};

// Send enrollment notification
exports.sendEnrollmentNotification = async (employeeData) => {
  console.log('========== EMAIL SERVICE START (RESEND) ==========');
  console.log('📧 sendEnrollmentNotification called');
  console.log('📧 Employee:', employeeData.name, '-', employeeData.email);

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
      to: employeeData.email,
      subject: '✅ Đăng ký vân tay thành công!',
      html: htmlContent
    };

    const result = await sendEmailWithResend(mailOptions);

    console.log('========== EMAIL SERVICE END ==========');
    return result;

  } catch (error) {
    console.error('========== EMAIL SERVICE ERROR ==========');
    console.error('❌ Error:', error.message);
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
      to: notificationData.adminEmail,
      subject: '⚠️ Nhân viên chưa có tài khoản đăng nhập',
      html: htmlContent
    };

    const result = await sendEmailWithResend(mailOptions);
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

// Test email config
exports.testEmailConfig = async () => {
  try {
    console.log('📧 Testing Resend configuration...');

    const client = getResendClient();
    if (!client) {
      return {
        success: false,
        error: 'RESEND_API_KEY not set',
        message: 'Get free API key at https://resend.com'
      };
    }

    // Try to send a test email
    const result = await client.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'HR System <onboarding@resend.dev>',
      to: 'test@test.com',
      subject: 'Test Email',
      html: '<p>Test email from HR System</p>'
    });

    console.log('✅ Resend config is valid');
    return { success: true, message: 'Resend configuration is valid' };

  } catch (error) {
    console.error('❌ Resend config error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// No-op for compatibility
exports.closeTransporter = () => {
  console.log('📧 Resend uses HTTP API, no connection to close');
};
