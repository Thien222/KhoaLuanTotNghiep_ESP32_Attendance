const Holiday = require('../models/Holiday');

// Get all holidays
exports.getHolidays = async (req, res) => {
  try {
    const { year, active } = req.query;
    
    let query = {};
    
    // Filter by year if provided
    if (year) {
      const startDate = new Date(`${year}-01-01`);
      const endDate = new Date(`${year}-12-31`);
      query.date = { $gte: startDate, $lte: endDate };
    }
    
    // Filter by active status
    if (active !== undefined) {
      query.active = active === 'true';
    }
    
    const holidays = await Holiday.find(query).sort({ date: 1 });
    
    res.status(200).json({
      success: true,
      data: holidays
    });
  } catch (error) {
    console.error('Error getting holidays:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting holidays',
      error: error.message
    });
  }
};

// Get single holiday
exports.getHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    
    const holiday = await Holiday.findById(id);
    if (!holiday) {
      return res.status(404).json({
        success: false,
        message: 'Holiday not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: holiday
    });
  } catch (error) {
    console.error('Error getting holiday:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting holiday',
      error: error.message
    });
  }
};

// Add holiday
exports.addHoliday = async (req, res) => {
  try {
    const { name, date, type, workRate, description } = req.body;
    
    if (!name || !date) {
      return res.status(400).json({
        success: false,
        message: 'Name and date are required'
      });
    }
    
    const holiday = new Holiday({
      name,
      date,
      type: type || 'national',
      workRate: workRate || 2.0,
      description
    });
    
    await holiday.save();
    
    res.status(201).json({
      success: true,
      message: 'Holiday added successfully',
      data: holiday
    });
  } catch (error) {
    console.error('Error adding holiday:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding holiday',
      error: error.message
    });
  }
};

// Update holiday
exports.updateHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const holiday = await Holiday.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );
    
    if (!holiday) {
      return res.status(404).json({
        success: false,
        message: 'Holiday not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Holiday updated successfully',
      data: holiday
    });
  } catch (error) {
    console.error('Error updating holiday:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating holiday',
      error: error.message
    });
  }
};

// Delete holiday
exports.deleteHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    
    const holiday = await Holiday.findByIdAndDelete(id);
    
    if (!holiday) {
      return res.status(404).json({
        success: false,
        message: 'Holiday not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Holiday deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting holiday:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting holiday',
      error: error.message
    });
  }
};

// Check if a specific date is a holiday
exports.checkIsHoliday = async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required'
      });
    }
    
    const holiday = await Holiday.isHoliday(new Date(date));
    
    res.status(200).json({
      success: true,
      isHoliday: !!holiday,
      data: holiday
    });
  } catch (error) {
    console.error('Error checking holiday:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking holiday',
      error: error.message
    });
  }
};


