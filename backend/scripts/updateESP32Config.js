require('dotenv').config({ path: '../config.env' });
const mongoose = require('mongoose');
const ESP32Config = require('../models/ESP32Config');

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set in environment variables!');
  console.error('Please set MONGODB_URI in your .env or config.env file');
  process.exit(1);
}

const updateESP32Config = async () => {
  try {
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
      console.log('Usage: node scripts/updateESP32Config.js <serverIP> <serverPort> [esp32IP]');
      console.log('Example: node scripts/updateESP32Config.js 192.168.1.100 3000');
      console.log('Example: node scripts/updateESP32Config.js 192.168.1.100 3000 192.168.1.101');
      process.exit(1);
    }

    const serverIP = args[0];
    const serverPort = args[1] || '3000';
    const esp32IP = args[2];
    const serverUrl = `http://${serverIP}:${serverPort}/api`;

    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB connected\n');

    console.log('========================================');
    console.log('📡 Updating ESP32 Config');
    console.log('========================================');
    console.log('Server URL:', serverUrl);
    console.log('ESP32 IP:', esp32IP || 'ALL');
    console.log('========================================\n');

    if (esp32IP) {
      // Update specific ESP32
      const config = await ESP32Config.findOneAndUpdate(
        { esp32Ip: esp32IP },
        {
          serverUrl,
          lastUpdated: new Date()
        },
        { upsert: true, new: true }
      );

      console.log(`✅ Updated config for ESP32 ${esp32IP}`);
      console.log('   Server URL:', config.serverUrl);
    } else {
      // Update all ESP32s
      const result = await ESP32Config.updateMany(
        {},
        {
          serverUrl,
          lastUpdated: new Date()
        }
      );

      console.log(`✅ Updated ${result.modifiedCount} ESP32 config(s)`);
      console.log('   Server URL:', serverUrl);
    }

    // List all configs
    const configs = await ESP32Config.find().sort({ lastSeen: -1 });
    console.log('\n📋 Current ESP32 Configs:');
    console.log('========================================');
    configs.forEach((config, index) => {
      console.log(`${index + 1}. ESP32 IP: ${config.esp32Ip}`);
      console.log(`   Server URL: ${config.serverUrl}`);
      console.log(`   Last Seen: ${config.lastSeen}`);
      console.log(`   Status: ${config.status}`);
      console.log('');
    });

    console.log('========================================');
    console.log('✅ Update completed!');
    console.log('========================================\n');
    console.log('⚠️  ESP32 needs to restart to pick up new config');
    console.log('   Or call GET /api/esp32-config from ESP32');
    console.log('========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

updateESP32Config();



