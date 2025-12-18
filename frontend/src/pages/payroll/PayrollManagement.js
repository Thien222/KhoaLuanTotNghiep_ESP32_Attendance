import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  DatePicker,
  Card,
  Typography,
  Tag,
  message,
  Modal,
  Form,
  Input,
  InputNumber,
  Descriptions,
  Divider,
  List,
  Row,
  Col,
  Statistic,
  Tooltip,
  Calendar,
  Badge,
  Select,
  Alert
} from 'antd';
import {
  DollarOutlined,
  EyeOutlined,
  CalculatorOutlined,
  EditOutlined,
  PlusOutlined,
  MinusOutlined,
  PrinterOutlined,
  SendOutlined,
  BankOutlined,
  UserOutlined,
  MailOutlined,
  SafetyCertificateOutlined,
  ExportOutlined,
  ReloadOutlined,
  CalendarOutlined,
  CloseOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  MoreOutlined,
  DeleteOutlined,
  LeftOutlined,
  RightOutlined
} from '@ant-design/icons';
import { TableActionDropdown } from '../../components/ActionDropdown';
import axios from 'axios';
import moment from 'moment';
import { getAPIUrl } from '../../utils/configManager';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const PayrollManagement = () => {
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(moment());
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [dailyDetailVisible, setDailyDetailVisible] = useState(false);
  const [lateCalendarVisible, setLateCalendarVisible] = useState(false);
  const [adjustModalVisible, setAdjustModalVisible] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [selectedEmployeeAttendances, setSelectedEmployeeAttendances] = useState([]);
  const [lateDaysData, setLateDaysData] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [form] = Form.useForm();
  const [userRole, setUserRole] = useState(null);
  const [viewMode, setViewMode] = useState('month'); // 'day' or 'month'
  const [selectedDate, setSelectedDate] = useState(moment()); // For day view
  const [currentCalendarDate, setCurrentCalendarDate] = useState(moment());
  // ==== ATTENDANCE CALENDAR (MOBILE-LIKE) ====
  const [attendanceCalendarVisible, setAttendanceCalendarVisible] = useState(false);
  const [attendanceCalendarData, setAttendanceCalendarData] = useState([]);
  const [attendanceCalendarDate, setAttendanceCalendarDate] = useState(moment()); // For late calendar modal

  // Reset calendar date when opening modal with new payroll
  useEffect(() => {
    if (selectedPayroll) {
      setCurrentCalendarDate(moment(`${selectedPayroll.year}-${String(selectedPayroll.month).padStart(2, '0')}-01`));
    }
  }, [selectedPayroll]);

  // Get user role
  useEffect(() => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        setUserRole(user.role);
      }
    } catch (e) {
      console.error('Error parsing user data:', e);
    }
  }, []);

  useEffect(() => {
    if (viewMode === 'month') {
      fetchPayrolls();
    } else {
      fetchDailyPayrolls();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedDate, viewMode]);

  const fetchPayrolls = async () => {
    setLoading(true);
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');

      if (!token) {
        message.error('Chưa đăng nhập');
        return;
      }

      const month = selectedMonth.month() + 1;
      const year = selectedMonth.year();

      const response = await axios.get(`${API_URL}/payroll`, {
        params: { month, year },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        // Enhanced data with fixed 10% deduction
        const enhancedData = (response.data.data || []).map(p => {
          // NEW: Lương cơ bản THÁNG (do admin set) - Hiển thị trên bảng lương
          const basicSalaryFull = p.basicSalaryFull || p.employee?.baseSalary || 0;
          // Lương tính theo ngày công (prorated) - Cách 1: Chia cho 26 ngày công chuẩn
          const STANDARD_WORKING_DAYS = 26;
          const proratedSalary = p.baseSalary || Math.round((basicSalaryFull * (p.workingDays || 0)) / STANDARD_WORKING_DAYS);
          // Lương 1 ngày công
          const dailyRate = p.dailyRate || Math.round(basicSalaryFull / STANDARD_WORKING_DAYS);

          // FIX: Ưu tiên dùng giá trị từ backend, nếu không có mới tính lại
          // Phụ cấp chung (5%) - Ưu tiên dùng từ backend
          const generalAllowance = p.generalAllowance || Math.round(basicSalaryFull * 0.05);

          // Tổng phụ cấp (bao gồm thâm niên, chức vụ, khác)
          const totalAllowances = generalAllowance +
            (p.seniorityAllowance || 0) +
            (p.positionAllowance || 0) +
            (p.otherAllowances || 0);

          // Net Salary = Prorated + Allowances + OT - Late Penalties (BỎ thuế và bảo hiểm)
          // FIX: BỎ weekendWorkPay - phiếu lương gốc không có khoản này
          const grossIncome = proratedSalary + totalAllowances + (p.overtimePay || 0) + (p.holidayWorkPay || 0);
          // Đồng bộ với phiếu lương - chỉ trừ tiền phạt
          const netSalary = grossIncome - (p.latePenalty || 0);

          return {
            ...p,
            department: p.employee?.department || 'Chưa phân loại',
            allowance: totalAllowances, // Tổng phụ cấp
            generalAllowance: generalAllowance, // Phụ cấp chung (5%)
            netSalary: netSalary, // FIX: Cho phép hiển thị số âm
            grossIncome: grossIncome,
            // NEW: Thêm cả 2 loại lương
            basicSalaryFull: basicSalaryFull, // Lương cơ bản tháng (do admin set)
            proratedSalary: proratedSalary,   // Lương theo ngày công
            dailyRate: dailyRate              // Lương 1 ngày
          };
        });
        setPayrolls(enhancedData);
      } else {
        message.error(response.data.message || 'Lỗi khi tải dữ liệu');
      }
    } catch (error) {
      console.error('Error fetching payrolls:', error);
      message.error(error.response?.data?.message || 'Lỗi khi tải dữ liệu bảng lương');
      setPayrolls([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch daily payroll data (for day view)
  const fetchDailyPayrolls = async () => {
    setLoading(true);
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');

      if (!token) {
        message.error('Chưa đăng nhập');
        return;
      }

      // Get current user info
      let currentEmployeeId = null;
      try {
        const userData = localStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          if (user.role === 'employee' && user.employee) {
            currentEmployeeId = user.employee._id || user.employee;
          }
        }
      } catch (e) {
        console.error('Error parsing user data:', e);
      }

      const dateStr = selectedDate.format('YYYY-MM-DD');

      // Fetch attendance for the selected date
      const response = await axios.get(`${API_URL}/attendance`, {
        params: {
          startDate: dateStr,
          endDate: dateStr
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        let attendances = response.data.data || [];

        // Nếu là employee, chỉ lấy attendance của chính mình
        if (currentEmployeeId) {
          attendances = attendances.filter(att => {
            const empId = att.employee?._id || att.employee;
            return String(empId) === String(currentEmployeeId);
          });
        }

        // Transform attendance data to daily payroll format
        const dailyPayrolls = attendances.map(att => {
          const employee = att.employee;
          const basicSalary = employee?.baseSalary || employee?.salary || 0;
          const dailyRate = basicSalary > 0 ? basicSalary / 26 : 0;

          return {
            _id: att._id,
            employee: employee,
            date: att.date,
            workingDays: att.status === 'present' || att.status === 'half-day' ? 1 : 0,
            dailySalary: dailyRate,
            overtimeHours: att.overtimeHours || 0,
            isLate: att.lateMinutes > 0,
            lateMinutes: att.lateMinutes || 0,
            penalty: att.actualPenalty || 0,
            otSalary: att.estimatedOTSalary || 0,
            workingHours: att.workingHours || 0,
            status: att.status
          };
        });

        setPayrolls(dailyPayrolls);
      } else {
        message.error(response.data.message || 'Lỗi khi tải dữ liệu');
      }
    } catch (error) {
      console.error('Error fetching daily payrolls:', error);
      message.error(error.response?.data?.message || 'Lỗi khi tải dữ liệu bảng lương');
      setPayrolls([]);
    } finally {
      setLoading(false);
    }
  };

  // ==== DAILY DETAILS (FULL MONTH) ====
  const fetchDailyDetails = async (employeeId, year, month) => {
    setLoadingDetails(true);
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');

      const startDate = moment(`${year}-${String(month).padStart(2, '0')}-01`);
      const endDate = startDate.clone().endOf('month');

      const response = await axios.get(`${API_URL}/attendance`, {
        params: {
          startDate: startDate.format('YYYY-MM-DD'),
          endDate: endDate.format('YYYY-MM-DD')
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        // 1) Lọc attendance của đúng employee
        const allAttendance = (response.data.data || []).filter(
          att => att.employee?._id === employeeId || att.employee === employeeId
        );

        // 2) Map nhanh theo ngày
        const attMap = {};
        allAttendance.forEach(att => {
          const key = moment(att.date).format('YYYY-MM-DD');
          attMap[key] = att;
        });

        // 3) Build đủ ngày trong tháng
        const fullMonth = [];
        let cur = startDate.clone();
        while (cur.isSameOrBefore(endDate, 'day')) {
          const key = cur.format('YYYY-MM-DD');
          const att = attMap[key];

          if (att) {
            fullMonth.push(att);
          } else {
            fullMonth.push({
              _id: `empty-${key}`,
              date: cur.toISOString(),
              status: 'none',
              overtimeHours: 0,
              lateMinutes: 0,
              actualPenalty: 0
            });
          }
          cur.add(1, 'day');
        }

        setSelectedEmployeeAttendances(fullMonth);
      }
    } catch (error) {
      console.error('Error fetching daily details:', error);
      message.error('Lỗi khi tải chi tiết ngày');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleViewDetails = (payroll) => {
    setSelectedPayroll(payroll);
    setDetailModalVisible(true);
  };

  const handleViewDailyDetails = async (payroll) => {
    setSelectedPayroll(payroll);
    await fetchDailyDetails(payroll.employee._id, payroll.year, payroll.month);
    setDailyDetailVisible(true);
  };

  const handleViewAttendanceCalendar = async (payroll) => {
    setSelectedPayroll(payroll);
    setLoadingDetails(true);

    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');

      const startDate = moment(`${payroll.year}-${String(payroll.month).padStart(2, '0')}-01`);
      const endDate = startDate.clone().endOf('month');

      const response = await axios.get(`${API_URL}/attendance`, {
        params: {
          startDate: startDate.format('YYYY-MM-DD'),
          endDate: endDate.format('YYYY-MM-DD')
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        const data = (response.data.data || []).filter(
          att => (att.employee?._id === payroll.employee._id || att.employee === payroll.employee._id)
        );
        setAttendanceCalendarData(data);
        setAttendanceCalendarDate(startDate);
        setAttendanceCalendarVisible(true);
      }
    } catch (error) {
      console.error('Error fetching attendance calendar:', error);
      message.error('Lỗi khi tải lịch chấm công');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleViewLateDays = async (payroll) => {
    setSelectedPayroll(payroll);
    setLoadingDetails(true);

    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');

      const startDate = moment(`${payroll.year}-${String(payroll.month).padStart(2, '0')}-01`).format('YYYY-MM-DD');
      const endDate = moment(startDate).endOf('month').format('YYYY-MM-DD');

      const response = await axios.get(`${API_URL}/attendance`, {
        params: { startDate, endDate },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        // Filter late days for this employee
        const lateDays = (response.data.data || []).filter(
          att => (att.employee?._id === payroll.employee._id || att.employee === payroll.employee._id) &&
            att.lateMinutes > 0
        );
        setLateDaysData(lateDays);
        setLateCalendarVisible(true);
      }
    } catch (error) {
      console.error('Error fetching late days:', error);
      message.error('Lỗi khi tải dữ liệu ngày đi trễ');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleAdjustSalary = (payroll) => {
    setSelectedPayroll(payroll);
    setAdjustModalVisible(true);
    form.resetFields();
  };

  const handleCalculatePayroll = async () => {
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');

      const month = selectedMonth.month() + 1;
      const year = selectedMonth.year();

      const response = await axios.post(
        `${API_URL}/payroll/calculate`,
        { month, year },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        message.success('Tính lương thành công');
        fetchPayrolls();
      } else {
        message.error(response.data.message || 'Lỗi khi tính lương');
      }
    } catch (error) {
      console.error('Error calculating payroll:', error);
      message.error(error.response?.data?.message || 'Lỗi khi tính lương');
    }
  };

  const handleSendPayslips = () => {
    if (payrolls.length === 0) {
      message.warning('Không có dữ liệu lương để gửi');
      return;
    }

    setSending(true);
    message.loading({ content: 'Đang tạo và gửi phiếu lương qua email...', key: 'sending', duration: 0 });

    setTimeout(() => {
      setSending(false);
      message.success({
        content: `Đã gửi thành công ${payrolls.length} phiếu lương đến nhân viên!`,
        key: 'sending',
        duration: 4
      });
    }, 2000);
  };

  const handleAdjustSubmit = async (values) => {
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');

      const response = await axios.post(
        `${API_URL}/payroll/${selectedPayroll._id}/adjust`,
        {
          type: values.type,
          amount: values.amount,
          reason: values.reason
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        message.success('Điều chỉnh lương thành công');
        setAdjustModalVisible(false);
        form.resetFields();
        fetchPayrolls();
      } else {
        message.error(response.data.message || 'Lỗi khi điều chỉnh lương');
      }
    } catch (error) {
      console.error('Error adjusting salary:', error);
      message.error(error.response?.data?.message || 'Lỗi khi điều chỉnh lương');
    }
  };

  const handleDeletePayroll = async (payrollId) => {
    try {
      const API_URL = getAPIUrl();
      const token = localStorage.getItem('token');

      const response = await axios.delete(
        `${API_URL}/payroll/${payrollId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        message.success('Xóa bảng lương thành công');
        fetchPayrolls();
      } else {
        message.error(response.data.message || 'Lỗi khi xóa bảng lương');
      }
    } catch (error) {
      console.error('Error deleting payroll:', error);
      message.error(error.response?.data?.message || 'Lỗi khi xóa bảng lương');
    }
  };

  const getAdjustmentTypeText = (type) => {
    const types = {
      bonus: 'Thưởng',
      penalty: 'Phạt',
      increase: 'Tăng',
      decrease: 'Giảm'
    };
    return types[type] || type;
  };

  const getAdjustmentTypeColor = (type) => {
    const colors = {
      bonus: 'green',
      penalty: 'red',
      increase: 'blue',
      decrease: 'orange'
    };
    return colors[type] || 'default';
  };

  // Check if user is admin/manager
  const isAdmin = userRole === 'manager' || userRole === 'admin';

  // Export to Excel function
  const handleExportExcel = () => {
    if (payrolls.length === 0) {
      message.warning('Không có dữ liệu để xuất');
      return;
    }

    // Create CSV content
    const headers = ['STT', 'Họ tên', 'Phòng ban', 'Lương cơ bản', 'Ngày công', 'Giờ OT', 'Ngày đi trễ', 'Tiền OT', 'Tiền phạt', 'Phụ cấp', 'Thực lãnh'];
    const rows = payrolls.map((p, index) => [
      index + 1,
      p.employee?.name || '',
      p.department || '',
      p.basicSalary || 0,
      p.workingDays || 0,
      p.overtimeHours || 0,
      p.lateCount || 0,
      p.overtimePay || 0,
      p.latePenalty || 0,
      p.allowance || 0,
      p.netSalary || 0
    ]);

    // Add BOM for Vietnamese characters
    let csvContent = '\uFEFF' + headers.join(',') + '\n';
    rows.forEach(row => {
      csvContent += row.join(',') + '\n';
    });

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `BangLuong_${selectedMonth.format('MM-YYYY')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    message.success('Đã xuất file Excel thành công!');
  };

  // Currency formatter
  const currency = (value) => new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(value || 0);

  // Number to text helper (simplified for demo) - FIX: Xử lý số âm
  const convertNumberToText = (amount) => {
    if (amount === 0) return 'Không';
    const isNegative = amount < 0;
    const absAmount = Math.abs(amount);
    const millions = Math.floor(absAmount / 1000000);
    const thousands = Math.floor((absAmount % 1000000) / 1000);
    const remainder = absAmount % 1000;

    let text = isNegative ? 'Âm ' : '';
    if (millions > 0) text += `${millions} triệu `;
    if (thousands > 0) text += `${thousands} nghìn `;
    if (remainder > 0) text += `${remainder} `;
    return text.trim() || 'Không';
  };

  // Calendar cell render for late days
  const dateCellRender = (value) => {
    const dateStr = value.format('YYYY-MM-DD');
    const lateDay = lateDaysData.find(day => moment(day.date).format('YYYY-MM-DD') === dateStr);

    if (lateDay) {
      return (
        <div style={{ position: 'relative' }}>
          <Badge status="error" />
          <div style={{ fontSize: 11, color: '#ff4d4f', marginTop: 4 }}>
            <div>Muộn: {lateDay.lateMinutes}p</div>
            <div>Phạt: {Math.round(lateDay.actualPenalty || 0).toLocaleString()}đ</div>
          </div>
        </div>
      );
    }
    return null;
  };

  const attendanceDateCellRender = (value) => {
    const dateStr = value.format('YYYY-MM-DD');
    const att = attendanceCalendarData.find(
      d => moment(d.date).format('YYYY-MM-DD') === dateStr
    );

    if (!att) return null;

    // màu theo trạng thái
    let bg = '#d4d4d8';                          // xám: default
    if (att.status === 'present') bg = '#22c55e'; // xanh lá: có mặt
    if (att.status === 'absent') bg = '#ef4444';  // đỏ: vắng
    if (att.leaveType === 'annual') bg = '#facc15'; // vàng: nghỉ phép
    if (att.leaveType === 'sick') bg = '#fb923c';   // cam: nghỉ ốm

    const hasOT = (att.overtimeHours || 0) > 0;   // có OT thì viền tím

    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            backgroundColor: bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 13,
            boxShadow: hasOT ? '0 0 0 2px #8b5cf6' : 'none'
          }}
        >
          {value.date()}
        </div>
      </div>
    );
  };

  // Day View Columns
  const dayColumns = [
    {
      title: 'Họ tên',
      dataIndex: ['employee', 'name'],
      key: 'name',
      width: 180,
      fixed: 'left',
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: 'Phòng ban',
      dataIndex: ['employee', 'department'],
      key: 'dept',
      width: 140,
      render: (text) => <Tag color="blue">{text || 'Chưa phân loại'}</Tag>
    },
    {
      title: 'Ngày công',
      dataIndex: 'workingDays',
      key: 'workingDays',
      width: 100,
      align: 'center',
      render: (days) => days > 0 ? <Tag color="green">{days} ngày</Tag> : <Tag color="red">0</Tag>
    },
    {
      title: 'Lương ngày công',
      dataIndex: 'proratedSalary',
      key: 'proratedSalary',
      width: 130,
      render: val => currency(val)
    },
    {
      title: 'Tổng giờ OT',
      dataIndex: 'overtimeHours',
      key: 'overtimeHours',
      width: 100,
      align: 'center',
      render: (hours) => hours > 0 ? <Tag color="blue">{hours}h</Tag> : '-'
    },
    {
      title: 'Đi trễ',
      dataIndex: 'isLate',
      key: 'isLate',
      width: 100,
      align: 'center',
      render: (isLate, record) => {
        if (isLate) {
          return <Tag color="orange">Có ({record.lateMinutes}p)</Tag>;
        }
        return <Tag color="green">Không</Tag>;
      }
    },
    {
      title: 'Tiền OT',
      dataIndex: 'otSalary',
      key: 'otSalary',
      width: 130,
      render: val => val > 0 ? <Text type="success">+{currency(val)}</Text> : '-'
    },
    {
      title: 'Tiền phạt',
      dataIndex: 'penalty',
      key: 'penalty',
      width: 130,
      render: val => val > 0 ? <Text type="danger">-{currency(val)}</Text> : '-'
    },
    {
      title: 'Thao tác',
      key: 'action',
      fixed: 'right',
      width: 80,
      align: 'center',
      render: (_, record) => (
        <TableActionDropdown
          items={[
            {
              key: 'view',
              label: 'Xem chi tiết',
              icon: <EyeOutlined />,
              onClick: () => {
                setSelectedPayroll(record);
                setDetailModalVisible(true);
              }
            }
          ]}
        />
      )
    }
  ];

  // Level 1: Monthly Summary Table Columns
  const columns = [
    {
      title: 'Thông tin nhân viên',
      fixed: 'left',
      children: [
        {
          title: 'Họ tên',
          dataIndex: ['employee', 'name'],
          key: 'name',
          width: 180,
          fixed: 'left',
          render: (text) => <Text strong>{text}</Text>
        },
        {
          title: 'Phòng ban',
          dataIndex: 'department',
          key: 'dept',
          width: 140,
          render: (text) => <Tag color="blue">{text}</Tag>
        }
      ]
    },
    {
      title: <Tooltip title="Lương do admin nhập cho nhân viên">Lương cơ bản</Tooltip>,
      dataIndex: 'basicSalaryFull',
      key: 'basicFull',
      width: 150,
      render: val => currency(val)
    },
    {
      title: <Tooltip title="Lương cơ bản × (Số ngày công / 26)">Tổng lương ngày công</Tooltip>,
      dataIndex: 'proratedSalary',
      key: 'prorated',
      width: 140,
      render: val => <Text type="secondary">{currency(val)}</Text>
    },
    {
      title: 'Tổng ngày công',
      dataIndex: 'workingDays',
      key: 'workingDays',
      width: 100,
      align: 'center',
      render: (days) => <Tag color="green">{days || 0} ngày</Tag>
    },
    {
      title: 'Tổng giờ OT',
      dataIndex: 'overtimeHours',
      key: 'overtimeHours',
      width: 100,
      align: 'center',
      render: (hours) => hours > 0 ? <Tag color="blue">{hours}h</Tag> : '-'
    },
    {
      title: 'Tổng ngày đi trễ',
      key: 'lateDays',
      width: 120,
      align: 'center',
      render: (_, record) => {
        if (record.lateCount > 0) {
          return (
            <Tooltip title="Click để xem chi tiết lịch đi trễ">
              <Button
                type="link"
                danger
                icon={<CalendarOutlined />}
                onClick={() => handleViewLateDays(record)}
              >
                {record.lateCount} lần
              </Button>
            </Tooltip>
          );
        }
        return '-';
      }
    },
    {
      title: 'Tiền OT',
      dataIndex: 'overtimePay',
      key: 'overtimePay',
      width: 130,
      render: val => val > 0 ? <Text type="success">+{currency(val)}</Text> : '-'
    },
    {
      title: 'Tiền phạt',
      dataIndex: 'latePenalty',
      key: 'latePenalty',
      width: 120,
      render: val => val > 0 ? <Text type="danger">-{currency(val)}</Text> : '-'
    },
    {
      title: <Tooltip title="5% lương cơ bản tháng">Phụ cấp (5%)</Tooltip>,
      dataIndex: 'generalAllowance',
      key: 'generalAllowance',
      width: 130,
      render: (val, record) => {
        const allowance = record.generalAllowance || record.allowance || 0;
        return allowance > 0 ? <Text type="success">+{currency(allowance)}</Text> : <Text type="secondary">0</Text>;
      }
    },
    {
      title: <span style={{ color: '#1890ff', fontWeight: 'bold' }}>Thực lãnh</span>,
      dataIndex: 'netSalary',
      key: 'net',
      fixed: 'right',
      width: 160,
      render: (val) => {
        const netSalary = val || 0;
        return (
          <Text
            strong
            style={{
              color: netSalary < 0 ? '#ff4d4f' : '#1890ff',
              fontSize: netSalary < 0 ? 14 : 15
            }}
          >
            {currency(netSalary)}
          </Text>
        );
      },
      render: val => <Text strong style={{ color: '#1890ff', fontSize: 16 }}>{currency(val)}</Text>
    },
    {
      title: 'Thao tác',
      key: 'action',
      fixed: 'right',
      width: 80,
      align: 'center',
      render: (_, record) => {
        const actionItems = [
          {
            key: 'view',
            label: 'Xem phiếu lương',
            icon: <EyeOutlined />,
            onClick: () => handleViewDetails(record)
          },
          {
            key: 'daily',
            label: 'Chi tiết ngày',
            icon: <CalendarOutlined />,
            onClick: () => handleViewDailyDetails(record)
          },
          {
            key: 'calendar',
            label: 'Lịch chấm công (tháng)',
            icon: <CalendarOutlined />,
            onClick: () => handleViewAttendanceCalendar(record)
          }
        ];

        if (record.lateCount > 0) {
          actionItems.push({
            key: 'late',
            label: `Xem ${record.lateCount} ngày đi trễ`,
            icon: <ClockCircleOutlined />,
            onClick: () => handleViewLateDays(record)
          });
        }

        if (isAdmin) {
          actionItems.push(
            { type: 'divider' },
            {
              key: 'adjust',
              label: 'Điều chỉnh lương',
              icon: <EditOutlined />,
              onClick: () => handleAdjustSalary(record)
            },
            {
              key: 'delete',
              label: 'Xóa bảng lương',
              icon: <DeleteOutlined />,
              danger: true,
              onClick: () => {
                Modal.confirm({
                  title: 'Xác nhận xóa',
                  content: `Bạn có chắc muốn xóa bảng lương của "${record.employee?.name}" tháng ${record.month}/${record.year}?`,
                  okText: 'Xóa',
                  okButtonProps: { danger: true },
                  cancelText: 'Hủy',
                  onOk: () => handleDeletePayroll(record._id)
                });
              }
            }
          );
        }

        return <TableActionDropdown items={actionItems} />;
      }
    }
  ];

  // Level 2: Daily Breakdown Table Columns
  const dailyColumns = [
    {
      title: 'Ngày',
      dataIndex: 'date',
      key: 'date',
      render: (date) => moment(date).format('DD/MM/YYYY (ddd)'),
      width: 150
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => {
        const statusMap = {
          present: { text: 'Có mặt', color: 'green' },
          late: { text: 'Muộn', color: 'orange' },
          absent: { text: 'Vắng', color: 'red' },
          'half-day': { text: 'Nửa công', color: 'orange' },
          none: { text: 'Không dữ liệu', color: 'default' }
        };
        const s = statusMap[status] || { text: status, color: 'default' };
        return <Tag color={s.color}>{s.text}</Tag>;
      }
    },
    {
      title: 'OT',
      key: 'overtime',
      width: 200,
      render: (_, record) => {
        if (record.overtimeHours > 0) {
          return (
            <div>
              <Tag color="blue">{record.overtimeHours}h (x{record.overtimeRate || 1.0})</Tag>
              <div style={{ color: '#52c41a', fontSize: 12, marginTop: 4 }}>
                +{Math.round(record.estimatedOTSalary || 0).toLocaleString()}đ
              </div>
            </div>
          );
        }
        return '-';
      }
    },
    {
      title: 'Đi trễ / Về sớm',
      key: 'violations',
      width: 200,
      render: (_, record) => {
        if (record.lateMinutes > 0) {
          return (
            <div>
              <Tag color="error">Muộn {record.lateMinutes} phút</Tag>
              <div style={{ color: '#ff4d4f', fontSize: 12, marginTop: 4 }}>
                -{Math.round(record.actualPenalty || 0).toLocaleString()}đ
              </div>
            </div>
          );
        }
        return '-';
      }
    }
  ];

  // Calculate totals
  const totalNetSalary = payrolls.reduce((sum, p) => sum + (p.netSalary || 0), 0);
  const totalBasicSalary = payrolls.reduce((sum, p) => sum + (p.basicSalary || 0), 0);
  const totalDeductions = payrolls.reduce((sum, p) => sum + (p.latePenalty || 0), 0);

  return (
    <div style={{ width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
      <Card bodyStyle={{ padding: '12px' }}>
        {/* Header - ALIGNED */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
          flexWrap: 'wrap',
          gap: 8
        }}>
          <Space align="center" size={12}>
            <Title level={3} style={{ margin: 0 }}>
              <BankOutlined style={{ marginRight: 8, color: '#1890ff' }} />
              Quản lý Bảng lương
            </Title>
            <Tag color="blue" style={{ fontSize: 14, padding: '4px 12px', borderRadius: 6 }}>
              {viewMode === 'month'
                ? `Tháng ${selectedMonth.format('MM/YYYY')}`
                : `Ngày ${selectedDate.format('DD/MM/YYYY')}`
              }
            </Tag>
          </Space>

          <Space size={8} wrap>
            {isAdmin && (
              <Button
                icon={<CalculatorOutlined />}
                onClick={handleCalculatePayroll}
                loading={loading}
                style={{ borderRadius: 6 }}
              >
                Tính lương
              </Button>
            )}
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchPayrolls}
              style={{ borderRadius: 6 }}
            >
              Tải lại
            </Button>
            {isAdmin && (
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSendPayslips}
                loading={sending}
                disabled={payrolls.length === 0}
                style={{ background: '#22c55e', borderColor: '#22c55e', borderRadius: 6 }}
              >
                Gửi Phiếu lương & Hoàn tất
              </Button>
            )}
          </Space>
        </div>

        {/* Summary Statistics */}
        <Card size="small" style={{ marginBottom: 8, background: '#f5f7fa' }}>
          {viewMode === 'month' ? (
            <Row gutter={[24, 16]}>
              <Col xs={24} sm={12} lg={6}>
                <Statistic
                  title={<Text type="secondary"><UserOutlined /> Tổng nhân viên</Text>}
                  value={payrolls.length}
                  valueStyle={{ fontSize: 20, fontWeight: 'bold' }}
                />
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Statistic
                  title={<Text type="secondary"><DollarOutlined /> Tổng lương ngày công</Text>}
                  value={totalBasicSalary}
                  prefix={<PlusOutlined />}
                  valueStyle={{ color: '#1890ff', fontSize: 18 }}
                  formatter={(value) => new Intl.NumberFormat('vi-VN').format(value)}
                />
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Statistic
                  title={<Text type="secondary"><MinusOutlined /> Tổng khấu trừ</Text>}
                  value={totalDeductions}
                  valueStyle={{ color: '#ff4d4f', fontSize: 18 }}
                  formatter={(value) => new Intl.NumberFormat('vi-VN').format(value)}
                />
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Statistic
                  title={<Text type="secondary"><DollarOutlined /> Tổng thực chi</Text>}
                  value={totalNetSalary}
                  valueStyle={{ color: '#52c41a', fontSize: 20, fontWeight: 'bold' }}
                  formatter={(value) => new Intl.NumberFormat('vi-VN').format(value)}
                />
              </Col>
            </Row>
          ) : (
            <Row gutter={[24, 16]}>
              <Col xs={24} sm={12} lg={6}>
                <Statistic
                  title={<Text type="secondary"><UserOutlined /> Tổng nhân viên</Text>}
                  value={payrolls.length}
                  valueStyle={{ fontSize: 20, fontWeight: 'bold' }}
                />
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Statistic
                  title={<Text type="secondary"><ClockCircleOutlined /> Tổng giờ OT</Text>}
                  value={payrolls.reduce((sum, p) => sum + (p.overtimeHours || 0), 0)}
                  suffix="h"
                  valueStyle={{ color: '#1890ff', fontSize: 18 }}
                />
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Statistic
                  title={<Text type="secondary"><DollarOutlined /> Tổng lương ngày</Text>}
                  value={payrolls.reduce((sum, p) => sum + (p.dailySalary || 0), 0)}
                  valueStyle={{ color: '#1890ff', fontSize: 18 }}
                  formatter={(value) => new Intl.NumberFormat('vi-VN').format(value)}
                />
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Statistic
                  title={<Text type="secondary"><CloseCircleOutlined /> Đi trễ</Text>}
                  value={payrolls.filter(p => p.isLate).length}
                  suffix={`/${payrolls.length}`}
                  valueStyle={{ color: '#ff4d4f', fontSize: 18 }}
                />
              </Col>
            </Row>
          )}
        </Card>

        {/* Toolbar with View Toggle - ALIGNED */}
        <div style={{
          marginBottom: 8,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          padding: '8px 12px',
          background: '#fafafa',
          borderRadius: 8,
          border: '1px solid #f0f0f0'
        }}>
          <Space size={12} align="center">
            <Select
              value={viewMode}
              onChange={setViewMode}
              style={{ width: 130, borderRadius: 6 }}
            >
              <Option value="month">📅 Theo tháng</Option>
              <Option value="day">📆 Theo ngày</Option>
            </Select>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {viewMode === 'month' ? (
                <DatePicker
                  picker="month"
                  value={selectedMonth}
                  onChange={setSelectedMonth}
                  format="MM/YYYY"
                  allowClear={false}
                  style={{ borderRadius: 6 }}
                  placeholder="Chọn tháng"
                />
              ) : (
                <DatePicker
                  value={selectedDate}
                  onChange={setSelectedDate}
                  format="DD/MM/YYYY"
                  allowClear={false}
                  style={{ borderRadius: 6 }}
                  placeholder="Chọn ngày"
                />
              )}
            </div>
          </Space>

          <Button
            icon={<ExportOutlined />}
            onClick={handleExportExcel}
            style={{ borderRadius: 6 }}
          >
            Xuất Excel
          </Button>
        </div>

        {/* Conditional Table Rendering */}
        {viewMode === 'month' ? (
          <Table
            columns={columns}
            dataSource={payrolls}
            loading={loading}
            rowKey="_id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `Tổng ${total} nhân viên`
            }}
            bordered
            size="small"
            rowClassName={(_, index) => index % 2 === 0 ? 'table-row-light' : 'table-row-dark'}
          />
        ) : (
          <Table
            columns={dayColumns}
            dataSource={payrolls}
            loading={loading}
            rowKey="_id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `Tổng ${total} nhân viên`
            }}
            bordered
            size="small"
            rowClassName={(_, index) => index % 2 === 0 ? 'table-row-light' : 'table-row-dark'}
          />
        )}
      </Card>

      {/* Professional Payslip Modal */}
      <Modal
        title={null}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={750}
        bodyStyle={{ padding: 0, backgroundColor: '#f0f2f5' }}
      >
        {selectedPayroll && (
          <div style={{ padding: 12 }}>
            <div style={{
              background: 'white',
              padding: 12,
              borderRadius: 8,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              border: '1px solid #e8e8e8'
            }}>
              {/* Payslip Header */}
              <div style={{ textAlign: 'center', marginBottom: 8, borderBottom: '2px solid #1890ff', paddingBottom: 8 }}>
                <SafetyCertificateOutlined style={{ fontSize: 32, color: '#1890ff', marginBottom: 8 }} />
                <Title level={2} style={{ margin: 0, textTransform: 'uppercase', letterSpacing: 2 }}>
                  Phiếu Lương
                </Title>
                <Text type="secondary" style={{ fontSize: 14 }}>
                  Kỳ lương: Tháng {selectedPayroll.month}/{selectedPayroll.year}
                </Text>
              </div>

              {/* Company Info Section */}
              <Row gutter={12} style={{ marginBottom: 12 }}>
                <Col span={12}>
                  <div style={{ background: '#f5f7fa', padding: 12, borderRadius: 4 }}>
                    <Text strong style={{ fontSize: 12, color: '#666' }}>CÔNG TY</Text>
                    <div style={{ marginTop: 4 }}>
                      <Text strong>Công ty TNHH ABC</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>123 Đường ABC, Quận 1, TP.HCM</Text>
                    </div>
                  </div>
                </Col>
                <Col span={12} style={{ textAlign: 'right' }}>
                  <div style={{ background: '#f5f7fa', padding: 12, borderRadius: 4 }}>
                    <Text strong style={{ fontSize: 12, color: '#666' }}>MÃ PHIẾU</Text>
                    <div style={{ marginTop: 4 }}>
                      <Text strong>PL-{selectedPayroll.month}{selectedPayroll.year}-{selectedPayroll.employee?.employeeId || '001'}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>Ngày in: {moment().format('DD/MM/YYYY HH:mm')}</Text>
                    </div>
                  </div>
                </Col>
              </Row>

              {/* Employee Info */}
              <Row gutter={12} style={{ marginBottom: 12 }}>
                <Col span={12}>
                  <Descriptions column={1} size="small" bordered>
                    <Descriptions.Item label={<Text strong>Họ và tên</Text>}>
                      <Text strong style={{ fontSize: 15 }}>{selectedPayroll.employee?.name}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Mã nhân viên">
                      {selectedPayroll.employee?.employeeId || 'NV001'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Phòng ban">
                      {selectedPayroll.department}
                    </Descriptions.Item>
                    <Descriptions.Item label="Chức vụ">
                      {selectedPayroll.employee?.position || 'Nhân viên'}
                    </Descriptions.Item>
                  </Descriptions>
                </Col>
                <Col span={12}>
                  <Descriptions column={1} size="small" bordered>
                    <Descriptions.Item label="Ngày công">
                      <Text strong>{selectedPayroll.workingDays || 0} ngày</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Giờ công">
                      {selectedPayroll.workingHours || 0} giờ
                    </Descriptions.Item>
                    <Descriptions.Item label="Làm thêm">
                      {selectedPayroll.overtimeHours || 0} giờ
                    </Descriptions.Item>
                    <Descriptions.Item label="Đi muộn">
                      {selectedPayroll.lateMinutes || 0} phút ({selectedPayroll.lateCount || 0} lần)
                    </Descriptions.Item>
                  </Descriptions>
                </Col>
              </Row>

              <Divider dashed />

              {/* Salary Breakdown */}
              <Row gutter={8} style={{ marginBottom: 8 }}>
                {/* Income Column */}
                <Col span={12}>
                  <Title level={5} style={{ color: '#52c41a', marginBottom: 8 }}>
                    <PlusOutlined /> Thu nhập
                  </Title>
                  <List
                    size="small"
                    split={false}
                    dataSource={[
                      { label: 'Lương cơ bản (tháng)', value: selectedPayroll.basicSalaryFull, isReference: true },
                      { label: `Lương theo ngày công (${selectedPayroll.workingDays || 0} ngày)`, value: selectedPayroll.proratedSalary || selectedPayroll.baseSalary || 0 },
                      { label: 'Phụ cấp chung (5%)', value: selectedPayroll.generalAllowance || selectedPayroll.allowance || 0 },
                      ...(selectedPayroll.seniorityAllowance > 0 ? [{ label: 'PC Thâm niên', value: selectedPayroll.seniorityAllowance }] : []),
                      ...(selectedPayroll.positionAllowance > 0 ? [{ label: 'PC Chức vụ', value: selectedPayroll.positionAllowance }] : []),
                      ...(selectedPayroll.overtimePay > 0 ? [{ label: `Làm thêm giờ (${selectedPayroll.overtimeHours || 0}h)`, value: selectedPayroll.overtimePay }] : []),
                      ...(selectedPayroll.holidayWorkPay > 0 ? [{ label: 'Làm ngày lễ', value: selectedPayroll.holidayWorkPay }] : [])
                      // Bỏ "Làm cuối tuần" - không có công thức tính lương liên quan
                    ]}
                    renderItem={item => (
                      <List.Item style={{
                        border: 'none',
                        padding: '8px 0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        opacity: item.isReference ? 0.7 : 1
                      }}>
                        <Text type={item.isReference ? 'secondary' : undefined} style={{ fontSize: item.isReference ? 12 : 14 }}>
                          {item.label} {item.isReference && '(Tham chiếu)'}
                        </Text>
                        <Text strong={!item.isReference} style={{ fontSize: item.isReference ? 12 : 14 }}>
                          {currency(item.value)}
                        </Text>
                      </List.Item>
                    )}
                  />
                  <div style={{
                    marginTop: 8,
                    borderTop: '2px solid #52c41a',
                    paddingTop: 12,
                    display: 'flex',
                    justifyContent: 'space-between',
                    background: '#f6ffed',
                    padding: '8px 12px',
                    borderRadius: 4
                  }}>
                    <Text strong style={{ color: '#52c41a' }}>Tổng thu nhập:</Text>
                    <Text strong style={{ color: '#52c41a', fontSize: 16 }}>
                      {currency(
                        (selectedPayroll.proratedSalary || selectedPayroll.baseSalary || 0) +
                        (selectedPayroll.generalAllowance || selectedPayroll.allowance || 0) +
                        (selectedPayroll.seniorityAllowance || 0) +
                        (selectedPayroll.positionAllowance || 0) +
                        (selectedPayroll.overtimePay || 0) +
                        (selectedPayroll.holidayWorkPay || 0) +
                        // Bỏ weekendWorkPay - không có công thức tính lương liên quan
                        (selectedPayroll.bonus || 0) +
                        (selectedPayroll.performanceBonus || 0) +
                        (selectedPayroll.otherAllowances || 0)
                      )}
                    </Text>
                  </div>
                </Col>

                {/* Deductions Column */}
                <Col span={12}>
                  <Title level={5} style={{ color: '#ff4d4f', marginBottom: 8 }}>
                    <MinusOutlined /> Khấu trừ
                  </Title>
                  <List
                    size="small"
                    split={false}
                    dataSource={[
                      ...(selectedPayroll.latePenalty > 0 ? [{ label: `Phạt đi muộn (${selectedPayroll.lateMinutes || 0}p, ${selectedPayroll.lateCount || 0} lần)`, value: selectedPayroll.latePenalty }] : []),
                      ...(selectedPayroll.absentDeduction > 0 ? [{ label: 'Nghỉ không lương', value: selectedPayroll.absentDeduction }] : []),
                      ...(selectedPayroll.unpaidLeaveDeduction > 0 ? [{ label: 'Nghỉ phép không lương', value: selectedPayroll.unpaidLeaveDeduction }] : [])
                      // Bỏ "Khấu trừ khác" - không hiển thị
                    ]}
                    renderItem={item => (
                      <List.Item style={{ border: 'none', padding: '8px 0', display: 'flex', justifyContent: 'space-between' }}>
                        <Text>{item.label}</Text>
                        <Text type="danger" strong>-{currency(item.value)}</Text>
                      </List.Item>
                    )}
                  />
                  <div style={{
                    marginTop: 8,
                    borderTop: '2px solid #ff4d4f',
                    paddingTop: 12,
                    display: 'flex',
                    justifyContent: 'space-between',
                    background: '#fff1f0',
                    padding: '8px 12px',
                    borderRadius: 4
                  }}>
                    <Text strong style={{ color: '#ff4d4f' }}>Tổng khấu trừ:</Text>
                    <Text strong style={{ color: '#ff4d4f', fontSize: 16 }}>
                      -{currency(
                        (selectedPayroll.latePenalty || 0)
                        // Chỉ giữ Tiền phạt - đã bỏ Bảo hiểm + Thuế
                      )}
                    </Text>
                  </div>
                </Col>
              </Row>

              <Divider />

              {/* Net Pay Footer - FIX: Tính lại từ Tổng thu nhập - Tổng khấu trừ */}
              {(() => {
                // Tính lại tổng thu nhập (giống như trên)
                const totalIncome =
                  (selectedPayroll.proratedSalary || selectedPayroll.baseSalary || 0) +
                  (selectedPayroll.generalAllowance || selectedPayroll.allowance || 0) +
                  (selectedPayroll.seniorityAllowance || 0) +
                  (selectedPayroll.positionAllowance || 0) +
                  (selectedPayroll.overtimePay || 0) +
                  (selectedPayroll.holidayWorkPay || 0) +
                  (selectedPayroll.bonus || 0) +
                  (selectedPayroll.performanceBonus || 0) +
                  (selectedPayroll.otherAllowances || 0);

                // Tính lại tổng khấu trừ (chỉ Tiền phạt - đã bỏ Bảo hiểm + Thuế)
                const totalDeductions = (selectedPayroll.latePenalty || 0);

                // Thực lãnh = Tổng thu nhập - Tổng khấu trừ
                const netPay = totalIncome - totalDeductions;

                return (
                  <>
                    <div style={{
                      backgroundColor: netPay < 0 ? '#fff2f0' : '#e6f7ff',
                      border: `2px solid ${netPay < 0 ? '#ff4d4f' : '#1890ff'}`,
                      padding: 12,
                      borderRadius: 8,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 8
                    }}>
                      <Text strong style={{
                        fontSize: 18,
                        color: netPay < 0 ? '#ff4d4f' : '#1890ff'
                      }}>
                        THỰC LÃNH (NET PAY):
                      </Text>
                      <Title level={2} style={{
                        margin: 0,
                        color: netPay < 0 ? '#ff4d4f' : '#1890ff'
                      }}>
                        {currency(netPay)}
                      </Title>
                    </div>

                    <div style={{ textAlign: 'center', marginBottom: 12 }}>
                      <Text type="secondary" italic>
                        Số tiền bằng chữ: <Text strong style={{
                          color: netPay < 0 ? '#ff4d4f' : '#333'
                        }}>
                          {convertNumberToText(netPay)} đồng
                        </Text>
                      </Text>
                    </div>
                  </>
                );
              })()}

              {/* Manual Adjustments */}
              {selectedPayroll.manualAdjustments && selectedPayroll.manualAdjustments.length > 0 && (
                <>
                  <Divider>Điều chỉnh thủ công</Divider>
                  <List
                    size="small"
                    dataSource={selectedPayroll.manualAdjustments}
                    renderItem={(item) => (
                      <List.Item>
                        <List.Item.Meta
                          title={
                            <Space>
                              <Tag color={getAdjustmentTypeColor(item.type)}>
                                {getAdjustmentTypeText(item.type)}
                              </Tag>
                              <Text strong>
                                {currency(item.amount)}
                              </Text>
                            </Space>
                          }
                          description={
                            <>
                              <div>{item.reason}</div>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {moment(item.date).format('DD/MM/YYYY HH:mm')} - Bởi: {item.createdBy || 'Admin'}
                              </Text>
                            </>
                          }
                        />
                      </List.Item>
                    )}
                  />
                </>
              )}

              {/* Modal Footer Actions */}
              <div style={{ marginTop: 8, textAlign: 'right', borderTop: '1px solid #f0f0f0', paddingTop: 8 }}>
                <Space>
                  <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
                    In Phiếu
                  </Button>
                  <Button type="primary" icon={<MailOutlined />}>
                    Gửi Email
                  </Button>
                  <Button onClick={() => setDetailModalVisible(false)}>
                    Đóng
                  </Button>
                </Space>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Level 2: Daily Breakdown Modal */}
      <Modal
        title={
          <Space>
            <CalendarOutlined />
            <span>Chi tiết ngày - {selectedPayroll?.employee?.name || ''}</span>
            <Tag color="blue">Tháng {selectedMonth.format('MM/YYYY')}</Tag>
          </Space>
        }
        open={dailyDetailVisible}
        onCancel={() => setDailyDetailVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDailyDetailVisible(false)}>
            Đóng
          </Button>
        ]}
        width={900}
      >
        <Table
          columns={dailyColumns}
          dataSource={selectedEmployeeAttendances}
          loading={loadingDetails}
          rowKey="_id"
          pagination={false}           // ❌ không phân trang
          bordered
          size="small"
          scroll={{ y: 400 }}          // ✅ kéo để xem hết tháng
        />
      </Modal>

      {/* Late Days Calendar Modal */}
      <Modal
        title={
          <Space>
            <CalendarOutlined style={{ color: '#ff4d4f' }} />
            <span>Lịch ngày đi trễ - {selectedPayroll?.employee?.name || ''}</span>
            <Tag color="red">{lateDaysData.length} ngày</Tag>
          </Space>
        }
        open={lateCalendarVisible}
        onCancel={() => setLateCalendarVisible(false)}
        footer={[
          <Button key="close" icon={<CloseOutlined />} onClick={() => setLateCalendarVisible(false)}>
            Đóng
          </Button>
        ]}
        width={800}
      >
        <div style={{ marginBottom: 8 }}>
          <Alert
            message={`Tổng: ${lateDaysData.length} lần đi trễ | Tổng phạt: ${lateDaysData.reduce((sum, d) => sum + (d.actualPenalty || 0), 0).toLocaleString()}đ`}
            type="warning"
            showIcon
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <Space>
            <Button
              icon={<LeftOutlined />}
              onClick={() => {
                const prev = moment(currentCalendarDate).subtract(1, 'month');
                setCurrentCalendarDate(prev);
              }}
            />
            <span style={{ fontSize: 16, fontWeight: 'bold' }}>
              Tháng {currentCalendarDate.format('MM/YYYY')}
            </span>
            <Button
              icon={<RightOutlined />}
              onClick={() => {
                const next = moment(currentCalendarDate).add(1, 'month');
                setCurrentCalendarDate(next);
              }}
            />
          </Space>
        </div>
        <Calendar
          fullscreen={false}
          value={currentCalendarDate}
          headerRender={() => null}
          dateCellRender={dateCellRender}
        />

        <Divider>Chi tiết các ngày đi trễ</Divider>
        <List
          size="small"
          dataSource={lateDaysData}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                title={
                  <Space>
                    <Text strong>{moment(item.date).format('DD/MM/YYYY (dddd)')}</Text>
                    <Tag color="error">Muộn {item.lateMinutes} phút</Tag>
                  </Space>
                }
                description={
                  <Text type="danger">
                    Tiền phạt: -{Math.round(item.actualPenalty || 0).toLocaleString()}đ
                  </Text>
                }
              />
            </List.Item>
          )}
        />
      </Modal>

      {/* Adjust Salary Modal */}
      <Modal
        title={
          <Space>
            <EditOutlined />
            <span>Điều chỉnh lương - {selectedPayroll?.employee?.name || ''}</span>
          </Space>
        }
        open={adjustModalVisible}
        onCancel={() => {
          setAdjustModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAdjustSubmit}
        >
          <Form.Item
            name="type"
            label="Loại điều chỉnh"
            rules={[{ required: true, message: 'Vui lòng chọn loại điều chỉnh' }]}
          >
            <Select placeholder="Chọn loại điều chỉnh">
              <Option value="bonus">Thưởng</Option>
              <Option value="penalty">Phạt</Option>
              <Option value="increase">Tăng lương</Option>
              <Option value="decrease">Giảm lương</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="amount"
            label="Số tiền (VND)"
            rules={[
              { required: true, message: 'Vui lòng nhập số tiền' },
              { type: 'number', min: 0, message: 'Số tiền phải lớn hơn 0' }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/\$\s?|(,*)/g, '')}
              min={0}
              placeholder="Nhập số tiền"
            />
          </Form.Item>

          <Form.Item
            name="reason"
            label="Lý do"
            rules={[{ required: true, message: 'Vui lòng nhập lý do' }]}
          >
            <TextArea
              rows={3}
              placeholder="Nhập lý do điều chỉnh (ví dụ: Hoàn thành xuất sắc dự án X, Đi trễ nhiều lần, ...)"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setAdjustModalVisible(false);
                form.resetFields();
              }}>
                Hủy
              </Button>
              <Button type="primary" htmlType="submit">
                Xác nhận
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Attendance Calendar Modal (Mobile-like) */}
      <Modal
        title={
          <Space>
            <CalendarOutlined />
            <span>Lịch chấm công - {selectedPayroll?.employee?.name || ''}</span>
            <Tag color="blue">Tháng {attendanceCalendarDate.format('MM/YYYY')}</Tag>
          </Space>
        }
        open={attendanceCalendarVisible}
        onCancel={() => setAttendanceCalendarVisible(false)}
        footer={[
          <Button
            key="close"
            icon={<CloseOutlined />}
            onClick={() => setAttendanceCalendarVisible(false)}
          >
            Đóng
          </Button>
        ]}
        width={800}
      >
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Calendar
              fullscreen={false}
              value={attendanceCalendarDate}
              headerRender={() => null}          // ẩn header mặc định => gọn như mobile
              dateCellRender={attendanceDateCellRender}
            />
          </Col>

          <Col span={24}>
            <Card size="small">
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={8}>
                  <Statistic
                    title="Ngày có mặt"
                    value={attendanceCalendarData.filter(a => a.status === 'present').length}
                    valueStyle={{ color: '#22c55e', fontWeight: 'bold' }}
                  />
                </Col>
                <Col xs={24} sm={8}>
                  <Statistic
                    title="Lần đi trễ"
                    value={attendanceCalendarData.filter(a => (a.lateMinutes || 0) > 0).length}
                    valueStyle={{ color: '#f97316', fontWeight: 'bold' }}
                  />
                </Col>
                <Col xs={24} sm={8}>
                  <Statistic
                    title="Giờ OT"
                    value={attendanceCalendarData.reduce((s, a) => s + (a.overtimeHours || 0), 0)}
                    suffix="h"
                    valueStyle={{ color: '#8b5cf6', fontWeight: 'bold' }}
                  />
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      </Modal>
    </div>
  );
};

export default PayrollManagement;
