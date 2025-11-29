const Settings = require('../models/Settings');

// Get all settings
exports.getAllSettings = async (req, res) => {
  try {
    const { type } = req.query;
    
    // If type is specified, return that specific setting
    if (type) {
      const setting = await Settings.findOne({ type });
      
      if (!setting) {
        // Return default settings if not found
        const defaults = Settings.getDefaultSettings();
        if (defaults[type]) {
          return res.status(200).json({
            success: true,
            data: {
              type: type,
              value: defaults[type],
              isDefault: true
            }
          });
        }
        return res.status(404).json({
          success: false,
          message: `Setting type '${type}' not found`
        });
      }
      
      return res.status(200).json({
        success: true,
        data: {
          type: setting.type,
          value: setting.config,
          updatedBy: setting.updatedBy,
          updatedAt: setting.updatedAt
        }
      });
    }
    
    // Return all settings
    const settings = await Settings.find({});
    const defaults = Settings.getDefaultSettings();
    
    // Merge with defaults for any missing types
    const result = {};
    Object.keys(defaults).forEach(key => {
      const found = settings.find(s => s.type === key);
      result[key] = found ? found.config : defaults[key];
    });
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching settings',
      error: error.message
    });
  }
};

// Get setting by type
exports.getSettingByType = async (req, res) => {
  try {
    const { type } = req.params;
    
    const setting = await Settings.findOne({ type });
    
    if (!setting) {
      // Return default settings if not found
      const defaults = Settings.getDefaultSettings();
      if (defaults[type]) {
        return res.status(200).json({
          success: true,
          data: {
            type: type,
            value: defaults[type],
            isDefault: true
          }
        });
      }
      return res.status(404).json({
        success: false,
        message: `Setting type '${type}' not found`
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        type: setting.type,
        value: setting.config,
        updatedBy: setting.updatedBy,
        updatedAt: setting.updatedAt
      }
    });
  } catch (error) {
    console.error('Error getting setting:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching setting',
      error: error.message
    });
  }
};

// Update setting
exports.updateSetting = async (req, res) => {
  try {
    const { type } = req.params;
    const { value } = req.body;
    
    if (!value) {
      return res.status(400).json({
        success: false,
        message: 'Value is required'
      });
    }
    
    // Validate type
    const validTypes = ['working-hours', 'overtime', 'late-policy', 'early-checkin', 'salary-structure', 'leave-policy', 'auto-checkout', 'tax-config', 'ot-rate'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid setting type. Must be one of: ${validTypes.join(', ')}`
      });
    }
    
    // Get current default to merge with new values
    const defaults = Settings.getDefaultSettings();
    const currentDefault = defaults[type] || {};
    
    // Merge new values with defaults
    const mergedConfig = { ...currentDefault, ...value };
    
    const setting = await Settings.findOneAndUpdate(
      { type },
      {
        type,
        config: mergedConfig,
        updatedBy: req.user?.username || req.user?.email || 'Admin'
      },
      { upsert: true, new: true }
    );
    
    console.log(`✅ Setting '${type}' updated by ${req.user?.username || 'Admin'}`);
    
    res.status(200).json({
      success: true,
      message: 'Setting updated successfully',
      data: {
        type: setting.type,
        value: setting.config,
        updatedBy: setting.updatedBy,
        updatedAt: setting.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating setting',
      error: error.message
    });
  }
};

// Update setting (alternate route - for PUT /settings with body containing type)
exports.updateSettingByBody = async (req, res) => {
  try {
    const { type, value } = req.body;
    
    if (!type || !value) {
      return res.status(400).json({
        success: false,
        message: 'Type and value are required'
      });
    }
    
    // Validate type
    const validTypes = ['working-hours', 'overtime', 'late-policy', 'early-checkin', 'salary-structure', 'leave-policy', 'auto-checkout', 'tax-config', 'ot-rate'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid setting type. Must be one of: ${validTypes.join(', ')}`
      });
    }
    
    // Get current default to merge with new values
    const defaults = Settings.getDefaultSettings();
    const currentDefault = defaults[type] || {};
    
    // Merge new values with defaults
    const mergedConfig = { ...currentDefault, ...value };
    
    const setting = await Settings.findOneAndUpdate(
      { type },
      {
        type,
        config: mergedConfig,
        updatedBy: req.user?.username || req.user?.email || 'Admin'
      },
      { upsert: true, new: true }
    );
    
    console.log(`✅ Setting '${type}' updated by ${req.user?.username || 'Admin'}`);
    
    res.status(200).json({
      success: true,
      message: 'Setting updated successfully',
      data: {
        type: setting.type,
        value: setting.config,
        updatedBy: setting.updatedBy,
        updatedAt: setting.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating setting',
      error: error.message
    });
  }
};

// Reset to default
exports.resetToDefault = async (req, res) => {
  try {
    const { type } = req.params;
    const defaults = Settings.getDefaultSettings();
    
    if (type) {
      // Reset specific type
      if (!defaults[type]) {
        return res.status(400).json({
          success: false,
          message: `Invalid setting type: ${type}`
        });
      }
      
      const setting = await Settings.findOneAndUpdate(
        { type },
        {
          type,
          config: defaults[type],
          updatedBy: req.user?.username || 'System'
        },
        { upsert: true, new: true }
      );
      
      return res.status(200).json({
        success: true,
        message: `Setting '${type}' reset to default`,
        data: setting
      });
    }
    
    // Reset all settings
    const operations = Object.keys(defaults).map(key => ({
      updateOne: {
        filter: { type: key },
        update: {
          type: key,
          config: defaults[key],
          updatedBy: req.user?.username || 'System'
        },
        upsert: true
      }
    }));
    
    await Settings.bulkWrite(operations);
    
    res.status(200).json({
      success: true,
      message: 'All settings reset to default',
      data: defaults
    });
  } catch (error) {
    console.error('Error resetting settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting settings',
      error: error.message
    });
  }
};

// Initialize default settings (create if not exists)
exports.initializeSettings = async (req, res) => {
  try {
    const defaults = Settings.getDefaultSettings();
    const results = [];
    
    for (const [type, config] of Object.entries(defaults)) {
      const existing = await Settings.findOne({ type });
      
      if (!existing) {
        const setting = await Settings.create({
          type,
          config,
          updatedBy: 'System'
        });
        results.push({ type, status: 'created', config: setting.config });
      } else {
        results.push({ type, status: 'exists', config: existing.config });
      }
    }
    
    res.status(200).json({
      success: true,
      message: 'Settings initialized',
      data: results
    });
  } catch (error) {
    console.error('Error initializing settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error initializing settings',
      error: error.message
    });
  }
};


