// Test email service locally
require('dotenv').config({ path: './config.env' });

const emailService = require('../services/emailService');

async function testEmail() {
  console.log('🧪 Testing Email Service Locally...\n');
  
  // Check environment variables
  console.log('📋 Environment Check:');
  console.log('   EMAIL_USER:', process.env.EMAIL_USER ? process.env.EMAIL_USER.substring(0, 5) + '***' : '❌ NOT SET');
  console.log('   EMAIL_APP_PASSWORD:', process.env.EMAIL_APP_PASSWORD ? '✅ SET (' + process.env.EMAIL_APP_PASSWORD.length + ' chars)' : '❌ NOT SET');
  console.log('');

  // Test 1: Test email configuration
  console.log('📧 Test 1: Testing email configuration...');
  try {
    const configTest = await emailService.testEmailConfig();
    if (configTest.success) {
      console.log('✅ Email configuration is valid!');
      if (configTest.port) {
        console.log(`   Using port: ${configTest.port}`);
      }
    } else {
      console.error('❌ Email configuration failed:', configTest.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error testing email config:', error.message);
    process.exit(1);
  }
  console.log('');

  // Test 2: Send test enrollment email
  const testEmail = process.argv[2] || 'farenabc123@gmail.com';
  console.log(`📧 Test 2: Sending test enrollment email to: ${testEmail}`);
  try {
    const result = await emailService.sendEnrollmentNotification({
      name: 'Test User',
      email: testEmail,
      employeeId: 'TEST001',
      fingerprintId: 999,
      username: 'TEST001',
      password: 'testpassword123',
      position: 'Test Position',
      department: 'Test Department'
    });

    if (result.success) {
      console.log('✅ Test email sent successfully!');
      console.log('   Message ID:', result.messageId);
      console.log(`\n📬 Please check your inbox at: ${testEmail}`);
    } else {
      console.error('❌ Failed to send test email:', result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error sending test email:', error.message);
    process.exit(1);
  }
  console.log('');

  // Test 3: Send welcome email
  console.log(`📧 Test 3: Sending test welcome email to: ${testEmail}`);
  try {
    const result = await emailService.sendWelcomeEmail(
      {
        name: 'Test User',
        email: testEmail,
        employeeId: 'TEST001',
        fingerprintId: 999,
        position: 'Test Position',
        department: 'Test Department',
        fingerprintEnrolled: false
      },
      {
        username: 'TEST001',
        password: 'testpassword123'
      }
    );

    if (result.success) {
      console.log('✅ Welcome email sent successfully!');
      console.log('   Message ID:', result.messageId);
    } else {
      console.error('❌ Failed to send welcome email:', result.error);
    }
  } catch (error) {
    console.error('❌ Error sending welcome email:', error.message);
  }

  console.log('\n✅ All tests completed!');
}

// Run tests
testEmail().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

