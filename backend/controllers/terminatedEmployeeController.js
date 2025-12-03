const TerminatedEmployee = require('../models/TerminatedEmployee');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const User = require('../models/User');

/**
 * GET /api/terminated-employees
 * Lấy danh sách nhân viên đã nghỉ việc
 */
exports.getAll = async (req, res) => {
  try {
    const { search, department, reason } = req.query;
    
    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (department) {
      query.department = department;
    }
    
    if (reason) {
      query.terminationReason = reason;
    }
    
    const terminatedEmployees = await TerminatedEmployee.find(query)
      .sort({ terminationDate: -1 });
    
    res.json({
      success: true,
      data: terminatedEmployees,
      count: terminatedEmployees.length
    });
  } catch (error) {
    console.error('Error getting terminated employees:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách nhân viên nghỉ việc',
      error: error.message
    });
  }
};

/**
 * GET /api/terminated-employees/:id
 * Lấy chi tiết một nhân viên đã nghỉ việc
 */
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const terminatedEmployee = await TerminatedEmployee.findById(id);
    
    if (!terminatedEmployee) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin nhân viên'
      });
    }
    
    res.json({
      success: true,
      data: terminatedEmployee
    });
  } catch (error) {
    console.error('Error getting terminated employee:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin nhân viên',
      error: error.message
    });
  }
};

/**
 * POST /api/terminated-employees/terminate/:employeeId
 * Chuyển nhân viên sang trạng thái nghỉ việc (từ Employee sang TerminatedEmployee)
 */
exports.terminateEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { reason, note } = req.body;
    const user = req.user;
    
    // Tìm nhân viên
    const employee = await Employee.findById(employeeId);
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhân viên'
      });
    }
    
    // Tính số ngày công
    const attendances = await Attendance.find({ 
      employee: employeeId,
      status: { $in: ['present', 'half-day'] }
    });
    
    let totalWorkingDays = 0;
    attendances.forEach(att => {
      if (att.status === 'present') {
        totalWorkingDays += 1;
      } else if (att.status === 'half-day') {
        totalWorkingDays += 0.5;
      }
    });
    
    // Tạo bản ghi terminated employee
    const terminatedEmployee = new TerminatedEmployee({
      originalEmployeeId: employee._id,
      employeeId: employee.employeeId,
      fingerprintId: employee.fingerprintId,
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      position: employee.position,
      department: employee.department,
      contractType: employee.contractType,
      baseSalary: employee.baseSalary || employee.salary || 0,
      joinDate: employee.joinDate || employee.createdAt,
      terminationDate: new Date(),
      totalWorkingDays,
      terminationReason: reason || 'resigned',
      terminationNote: note || '',
      terminatedBy: user?.name || user?.email || 'Admin',
      status: 'terminated',
      address: employee.address,
      citizenId: employee.citizenId,
      dateOfBirth: employee.dateOfBirth,
      gender: employee.gender,
      bankAccount: employee.bankAccount,
      socialInsuranceNumber: employee.socialInsuranceNumber
    });
    
    await terminatedEmployee.save();
    
    // Xóa user account liên kết (nếu có)
    await User.findOneAndDelete({ employee: employeeId });
    
    // Xóa nhân viên khỏi bảng Employee
    await Employee.findByIdAndDelete(employeeId);
    
    console.log(`[terminateEmployee] Employee ${employee.name} (${employee.employeeId}) terminated by ${user?.name || 'Admin'}`);
    
    res.json({
      success: true,
      message: `Đã chuyển nhân viên "${employee.name}" sang danh sách nghỉ việc`,
      data: terminatedEmployee
    });
  } catch (error) {
    console.error('Error terminating employee:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xử lý nghỉ việc',
      error: error.message
    });
  }
};

/**
 * PUT /api/terminated-employees/:id
 * Cập nhật thông tin nhân viên đã nghỉ việc
 */
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { terminationReason, terminationNote } = req.body;
    
    const terminatedEmployee = await TerminatedEmployee.findByIdAndUpdate(
      id,
      { 
        terminationReason: terminationReason,
        terminationNote: terminationNote 
      },
      { new: true }
    );
    
    if (!terminatedEmployee) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin nhân viên'
      });
    }
    
    res.json({
      success: true,
      message: 'Cập nhật thông tin thành công',
      data: terminatedEmployee
    });
  } catch (error) {
    console.error('Error updating terminated employee:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật thông tin',
      error: error.message
    });
  }
};

/**
 * DELETE /api/terminated-employees/:id
 * Xóa vĩnh viễn bản ghi nhân viên nghỉ việc
 */
exports.deletePermanently = async (req, res) => {
  try {
    const { id } = req.params;
    
    const terminatedEmployee = await TerminatedEmployee.findById(id);
    
    if (!terminatedEmployee) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin nhân viên'
      });
    }
    
    await TerminatedEmployee.findByIdAndDelete(id);
    
    res.json({
      success: true,
      message: 'Đã xóa vĩnh viễn thông tin nhân viên'
    });
  } catch (error) {
    console.error('Error deleting terminated employee:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa thông tin',
      error: error.message
    });
  }
};


