/**
 * ATTENDANCE TIMELINE INFO
 * Component hiển thị timeline chấm công và công thức tính lương mới
 */

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Divider,
  Box,
  List,
  ListItem,
  ListItemText,
  Alert
} from '@mui/material';
import {
  AccessTime,
  AttachMoney,
  TrendingUp,
  Warning,
  CheckCircle,
  Error,
  Info
} from '@mui/icons-material';

const AttendanceTimeline = () => {
  const timeline = [
    {
      time: '7h00 - 8h04',
      label: 'Đúng giờ',
      icon: <CheckCircle />,
      color: 'success',
      description: 'Grace period 4 phút'
    },
    {
      time: '8h04 - 10h03',
      label: 'Đi muộn < 2h',
      icon: <Warning />,
      color: 'warning',
      description: 'Phạt 20k/15 phút'
    },
    {
      time: '>= 10h04',
      label: 'Đi muộn >= 2h',
      icon: <Error />,
      color: 'error',
      description: 'Mất 1 ngày công'
    }
  ];

  const checkoutTimeline = [
    {
      time: '< 16h56',
      label: 'Về sớm',
      icon: <Warning />,
      color: 'warning',
      description: 'Phạt tương tự đi muộn'
    },
    {
      time: '16h56 - 18h59',
      label: 'Đúng giờ',
      icon: <CheckCircle />,
      color: 'success',
      description: 'Không tính OT'
    },
    {
      time: '>= 19h00',
      label: 'Làm thêm giờ',
      icon: <TrendingUp />,
      color: 'primary',
      description: 'Tính OT 100k/1h'
    }
  ];

  const salaryFormula = [
    {
      label: 'Lương cơ bản',
      formula: 'LCB × (Số ngày công / 30)',
      example: '15,000,000 × (22 / 30) = 11,000,000đ'
    },
    {
      label: 'Phụ cấp',
      formula: '5% LCB',
      example: '15,000,000 × 5% = 750,000đ'
    },
    {
      label: 'OT',
      formula: 'Số giờ OT × 100,000đ',
      example: '5h × 100,000 = 500,000đ'
    },
    {
      label: 'Thuế',
      formula: '(Gross - Phạt) × 10%',
      example: '(12,250,000 - 40,000) × 10% = 1,221,000đ'
    },
    {
      label: 'Lương thực nhận',
      formula: 'Gross - Thuế - Phạt',
      example: '12,250,000 - 1,221,000 - 40,000 = 10,989,000đ'
    }
  ];

  return (
    <Box>
      {/* Warning */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>Timeline mới đã được cập nhật!</strong> Grace period giảm xuống 4 phút, OT bắt đầu từ 19h.
      </Alert>

      {/* Check-in Timeline */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <AccessTime /> Timeline Check-in
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Grid container spacing={2}>
            {timeline.map((item, index) => (
              <Grid item xs={12} md={4} key={index}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={1}>
                      <Chip
                        icon={item.icon}
                        label={item.label}
                        color={item.color}
                        size="small"
                      />
                    </Box>
                    <Typography variant="h6" color="text.primary">
                      {item.time}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Check-out Timeline */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <AccessTime /> Timeline Check-out
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Grid container spacing={2}>
            {checkoutTimeline.map((item, index) => (
              <Grid item xs={12} md={4} key={index}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={1}>
                      <Chip
                        icon={item.icon}
                        label={item.label}
                        color={item.color}
                        size="small"
                      />
                    </Box>
                    <Typography variant="h6" color="text.primary">
                      {item.time}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Salary Formula */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <AttachMoney /> Công Thức Tính Lương Mới
          </Typography>
          <Divider sx={{ my: 2 }} />
          <List>
            {salaryFormula.map((item, index) => (
              <ListItem key={index}>
                <ListItemText
                  primary={
                    <Typography variant="subtitle1" fontWeight="bold">
                      {item.label}
                    </Typography>
                  }
                  secondary={
                    <>
                      <Typography variant="body2" color="text.secondary">
                        Công thức: {item.formula}
                      </Typography>
                      <Typography variant="caption" color="success.main">
                        Ví dụ: {item.example}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>

          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Lưu ý:</strong> Phụ cấp giảm từ 10% xuống 5%. Thuế 10% bao gồm thuế TNCN + bảo hiểm.
              Lương cơ bản tính theo ngày công / 30 (thay vì / 26).
            </Typography>
          </Alert>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AttendanceTimeline;


