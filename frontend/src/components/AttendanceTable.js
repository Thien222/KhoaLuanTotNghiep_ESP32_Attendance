import React from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';

const AttendanceTable = ({ attendanceData = [] }) => {
  const formatTime = (date) => {
    if (!date) return '--:--';
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Ensure attendanceData is an array
  const safeAttendanceData = Array.isArray(attendanceData) ? attendanceData : [];
  
  // Debug logging
  console.log('AttendanceTable - attendanceData:', attendanceData);
  console.log('AttendanceTable - safeAttendanceData length:', safeAttendanceData.length);
  if (safeAttendanceData.length > 0) {
    console.log('AttendanceTable - first record:', safeAttendanceData[0]);
  }

  return (
    <TableContainer component={Paper}>
      <Typography variant="h6" sx={{ p: 2 }}>
        Today's Attendance
      </Typography>
      
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Employee ID</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Department</TableCell>
            <TableCell>Check In</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Check Out</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Working Hours</TableCell>
          </TableRow>
        </TableHead>
        
        <TableBody>
          {safeAttendanceData.map((record) => (
            <TableRow key={record._id}>
              <TableCell>{record.employee?.employeeId || record.fingerprintId || 'N/A'}</TableCell>
              <TableCell>{record.employee?.name || 'Unknown'}</TableCell>
              <TableCell>{record.employee?.department || 'N/A'}</TableCell>
              <TableCell>{formatTime(record.checkIn?.time)}</TableCell>
              <TableCell>{record.checkIn?.status || '--'}</TableCell>
              <TableCell>{formatTime(record.checkOut?.time)}</TableCell>
              <TableCell>{record.checkOut?.status || '--'}</TableCell>
              <TableCell>
                {record.workingHours ? `${record.workingHours.toFixed(2)}h` : '--'}
              </TableCell>
            </TableRow>
          ))}
          
          {safeAttendanceData.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} align="center">
                No attendance records for today
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default AttendanceTable;
