require('dotenv').config({ path: '../config.env' });

const pushConfigToESP32 = async () => {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: node scripts/pushConfigToESP32.js <esp32IP> <serverIP> [serverPort]');
    console.log('Example: node scripts/pushConfigToESP32.js 192.168.1.101 192.168.1.100 3000');
    process.exit(1);
  }

  const esp32IP = args[0];
  const serverIP = args[1];
  const serverPort = args[2] || '3000';
  const serverUrl = `http://${serverIP}:${serverPort}/api`;
  const fingerprintEndpoint = `${serverUrl}/fingerprint`;

  console.log('========================================');
  console.log('📡 Pushing Config to ESP32');
  console.log('========================================');
  console.log('ESP32 IP:', esp32IP);
  console.log('Server URL:', serverUrl);
  console.log('Fingerprint Endpoint:', fingerprintEndpoint);
  console.log('========================================\n');

  // Try different methods to update ESP32 config
  const methods = [
    {
      name: 'Method 1: /config endpoint',
      url: `http://${esp32IP}/config`,
      method: 'GET',
      params: { url: fingerprintEndpoint }
    },
    {
      name: 'Method 2: /config endpoint (POST)',
      url: `http://${esp32IP}/config`,
      method: 'POST',
      body: JSON.stringify({ url: fingerprintEndpoint })
    },
    {
      name: 'Method 3: /set-config endpoint',
      url: `http://${esp32IP}/set-config`,
      method: 'POST',
      body: JSON.stringify({ 
        serverUrl: serverUrl,
        fingerprintEndpoint: fingerprintEndpoint
      })
    },
    {
      name: 'Method 4: /api/config endpoint',
      url: `http://${esp32IP}/api/config`,
      method: 'POST',
      body: JSON.stringify({ 
        serverUrl: serverUrl,
        fingerprintEndpoint: fingerprintEndpoint
      })
    }
  ];

  for (const method of methods) {
    try {
      console.log(`Trying ${method.name}...`);
      
      let url = method.url;
      if (method.method === 'GET' && method.params) {
        const params = new URLSearchParams(method.params);
        url += '?' + params.toString();
      }

      const options = {
        method: method.method,
        headers: {
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(3000)
      };

      if (method.body) {
        options.body = method.body;
      }

      const response = await fetch(url, options);
      const text = await response.text();
      
      console.log(`✅ Status: ${response.status}`);
      console.log(`   Response: ${text.substring(0, 200)}`);
      console.log('');
      
      if (response.status === 200) {
        console.log('========================================');
        console.log('✅ SUCCESS! Config updated via:', method.name);
        console.log('========================================\n');
        return;
      }
    } catch (error) {
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        console.log(`❌ Timeout (3s)`);
      } else {
        console.log(`❌ Error: ${error.message}`);
      }
      console.log('');
    }
  }

  console.log('========================================');
  console.log('❌ All methods failed!');
  console.log('========================================');
  console.log('ESP32 may not have config endpoint implemented.');
  console.log('');
  console.log('📋 Next Steps:');
  console.log('1. Check ESP32 code has /config endpoint');
  console.log('2. Restart ESP32 after updating code');
  console.log('3. Use ESP32 serial monitor to see logs');
  console.log('4. ESP32 will auto-update when it calls:');
  console.log(`   GET http://${serverIP}:${serverPort}/api/esp32-config`);
  console.log('========================================\n');
};

pushConfigToESP32();



