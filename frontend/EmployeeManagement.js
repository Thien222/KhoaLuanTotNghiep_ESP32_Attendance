import React from 'react';
import { App, message, Button } from 'antd';
import axios from 'axios';

const handleEnrollFingerprint = async (fingerprintId) => {
  try {
    const response = await axios.get(`/api/enroll?id=${fingerprintId}`);
    if (response.data.success) {
      message.success('Enrollment successful!');
    } else {
      message.error(response.data.message || 'Enrollment failed.');
    }
  } catch (error) {
    console.error('Enrollment error:', error);

    if (error.code === 'ERR_BAD_RESPONSE' && error.response?.status === 504) {
      message.error('Enrollment failed: Server timeout. Please try again later.');
    } else if (error.message.includes('Network Error')) {
      message.error('Enrollment failed: Unable to connect to the server.');
    } else {
      message.error('Enrollment failed: An unexpected error occurred.');
    }
  }
};

const EmployeeManagement = () => (
  <App>
    <div>
      <Button onClick={() => handleEnrollFingerprint(10)}>Enroll Fingerprint</Button>
    </div>
  </App>
);

export default EmployeeManagement;