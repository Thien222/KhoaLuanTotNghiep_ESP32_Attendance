import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Space,
  Typography,
  Alert,
  Tag,
  Select,
  Row,
  Col,
  Divider,
  App,
  Switch,
  Tooltip,
  Popconfirm
} from 'antd';
import {
  SettingOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SaveOutlined,
  WifiOutlined,
  CloudServerOutlined,
  ApiOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  getConfig,
  saveConfig,
  resetConfig,
  PRESETS,
  applyPreset,
  testServerConnection,
  testESP32Connection,
  autoDetectServerIP,
  getAPIUrl
} from '../../utils/configManager';
import axios from 'axios';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const IPConfiguration = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [serverConnected, setServerConnected] = useState(null);
  const [esp32Connected, setEsp32Connected] = useState(null);
  const [currentConfig, setCurrentConfig] = useState(getConfig());
  const [autoDetecting, setAutoDetecting] = useState(false);
  
  // Check if this is a standalone page (not inside Settings)
  const isStandalone = location.pathname === '/ip-config';

  useEffect(() => {
    loadCurrentConfig();
    testConnections();
  }, []);

  const loadCurrentConfig = () => {
    const config = getConfig();
    setCurrentConfig(config);
    form.setFieldsValue(config);
  };

  const testConnections = async () => {
    setTesting(true);
    const config = getConfig();
    
    console.log('Testing connections with config:', config);
    
    // Test server
    console.log(`Testing server: http://${config.serverIP}:${config.serverPort}/healthz`);
    const serverOk = await testServerConnection(config.serverIP, config.serverPort);
    setServerConnected(serverOk);
    console.log(`Server connection: ${serverOk ? 'OK' : 'FAILED'}`);
    
    // Test ESP32
    if (config.esp32IP && config.esp32IP.trim() !== '') {
      console.log(`Testing ESP32: http://${config.esp32IP}/healthz`);
      const esp32Ok = await testESP32Connection(config.esp32IP);
      setEsp32Connected(esp32Ok);
      console.log(`ESP32 connection: ${esp32Ok ? 'OK' : 'FAILED'}`);
    } else {
      console.warn('ESP32 IP is not set');
      setEsp32Connected(false);
    }
    
    setTesting(false);
  };

  const handleSave = async (values) => {
    setLoading(true);
    try {
      saveConfig(values);
      setCurrentConfig(values);
      
      // Broadcast new server URL to all ESP32s
      try {
        const API_URL = getAPIUrl();
        const serverUrl = `http://${values.serverIP}:${values.serverPort}/api`;
        
        // Remove /api from API_URL to get base URL
        const baseUrl = API_URL.replace('/api', '');
        const broadcastResponse = await axios.post(`${baseUrl}/api/esp32-broadcast-config`, {
          serverUrl
        });
        
        if (broadcastResponse.data.success) {
          message.success(`Đã lưu cấu hình IP! Đã cập nhật ${broadcastResponse.data.data.updatedCount} ESP32(s). Vui lòng restart ESP32 để áp dụng.`);
        } else {
          message.warning('Đã lưu cấu hình IP, nhưng không thể cập nhật ESP32. Vui lòng restart ESP32.');
        }
      } catch (broadcastError) {
        console.error('Broadcast error:', broadcastError);
        message.warning('Đã lưu cấu hình IP. ESP32 sẽ tự động cập nhật khi restart.');
      }
      
      // If standalone page, navigate back to login after saving
      if (isStandalone) {
        message.success('Đã lưu cấu hình IP! Đang quay về trang đăng nhập...');
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      } else {
        // Auto refresh after 2 seconds if in settings page
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (error) {
      message.error('Lỗi khi lưu cấu hình');
    } finally {
      setLoading(false);
    }
  };

  const handlePresetChange = (presetKey) => {
    const preset = applyPreset(presetKey);
    if (preset) {
      form.setFieldsValue(preset);
      setCurrentConfig(preset);
      message.success(`Đã áp dụng cấu hình: ${preset.name}`);
      
      // Auto test connections
      setTimeout(() => {
        testConnections();
      }, 500);
    }
  };

  const handleAutoDetect = async () => {
    setAutoDetecting(true);
    try {
      message.loading('Đang tự động phát hiện IP server...', 2);
      const detectedIP = await autoDetectServerIP();
      
      if (detectedIP) {
        form.setFieldsValue({
          serverIP: detectedIP
        });
        message.success(`Đã phát hiện server tại: ${detectedIP}`);
      } else {
        message.warning('Không thể tự động phát hiện server. Vui lòng nhập thủ công.');
      }
    } catch (error) {
      message.error('Lỗi khi tự động phát hiện');
    } finally {
      setAutoDetecting(false);
    }
  };

  const handleReset = () => {
    const defaultConfig = resetConfig();
    form.setFieldsValue(defaultConfig);
    setCurrentConfig(defaultConfig);
    message.success('Đã reset về cấu hình mặc định');
  };

  return (
    <div style={isStandalone ? { 
      minHeight: '100vh', 
      padding: '20px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    } : {}}>
      <Card style={isStandalone ? { maxWidth: 1200, margin: '0 auto' } : {}}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Title level={3} style={{ margin: 0 }}>
            <SettingOutlined /> Cấu hình IP & Kết nối
          </Title>
          {isStandalone && (
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/login')}
            >
              Quay lại đăng nhập
            </Button>
          )}
        </div>

        <Alert
          message="💡 Mẹo sử dụng"
          description="Khi thay đổi mạng (ví dụ: từ nhà sang quán cà phê), chỉ cần cập nhật 2 IP mới và lưu. Hệ thống sẽ tự động áp dụng cấu hình mới sau khi refresh."
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        {/* Connection Status */}
        <Card size="small" style={{ marginBottom: 24, background: '#f5f5f5' }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Space>
                <CloudServerOutlined style={{ fontSize: 20 }} />
                <Text strong>Server Backend:</Text>
                {testing ? (
                  <Tag color="processing">Đang kiểm tra...</Tag>
                ) : serverConnected ? (
                  <Tag color="success" icon={<CheckCircleOutlined />}>Đã kết nối</Tag>
                ) : (
                  <Tag color="error" icon={<CloseCircleOutlined />}>Mất kết nối</Tag>
                )}
              </Space>
            </Col>
            <Col xs={24} sm={12}>
              <Space>
                <WifiOutlined style={{ fontSize: 20 }} />
                <Text strong>ESP32:</Text>
                {testing ? (
                  <Tag color="processing">Đang kiểm tra...</Tag>
                ) : esp32Connected ? (
                  <Tag color="success" icon={<CheckCircleOutlined />}>Đã kết nối</Tag>
                ) : (
                  <Tag color="error" icon={<CloseCircleOutlined />}>Mất kết nối</Tag>
                )}
              </Space>
            </Col>
          </Row>
          <Button
            type="link"
            icon={<ReloadOutlined />}
            onClick={testConnections}
            loading={testing}
            style={{ marginTop: 8 }}
          >
            Kiểm tra lại kết nối
          </Button>
        </Card>

        {/* Preset Selection */}
        <Card size="small" title="🎯 Cấu hình nhanh (Presets)" style={{ marginBottom: 24 }}>
          <Space wrap>
            <Select
              placeholder="Chọn môi trường"
              style={{ width: 200 }}
              onChange={handlePresetChange}
            >
              {Object.entries(PRESETS).map(([key, preset]) => (
                <Option key={key} value={key}>
                  {preset.name}
                </Option>
              ))}
            </Select>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleAutoDetect}
              loading={autoDetecting}
            >
              Tự động phát hiện Server
            </Button>
          </Space>
        </Card>

        {/* Configuration Form */}
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          initialValues={currentConfig}
        >
          <Row gutter={[16, 0]}>
            <Col xs={24} md={12}>
              <Card size="small" title={<><CloudServerOutlined /> Server Backend</>}>
                <Form.Item
                  name="serverIP"
                  label="IP Server"
                  rules={[
                    { required: true, message: 'Vui lòng nhập IP server' },
                    { pattern: /^(\d{1,3}\.){3}\d{1,3}$|^localhost$/, message: 'IP không hợp lệ' }
                  ]}
                >
                  <Input placeholder="172.20.10.7" />
                </Form.Item>

                <Form.Item
                  name="serverPort"
                  label="Port Server"
                  rules={[{ required: true, message: 'Vui lòng nhập port' }]}
                >
                  <Input placeholder="3000" />
                </Form.Item>

                <div style={{ marginTop: 16 }}>
                  <Text type="secondary">API URL: </Text>
                  <Text code>{`http://${form.getFieldValue('serverIP') || '...'}:${form.getFieldValue('serverPort') || '...'}/api`}</Text>
                </div>
              </Card>
            </Col>

            <Col xs={24} md={12}>
              <Card size="small" title={<><WifiOutlined /> ESP32 Device</>}>
                <Form.Item
                  name="esp32IP"
                  label="IP ESP32"
                  rules={[
                    { required: true, message: 'Vui lòng nhập IP ESP32' },
                    { pattern: /^(\d{1,3}\.){3}\d{1,3}$/, message: 'IP không hợp lệ' }
                  ]}
                >
                  <Input placeholder="172.20.10.8" />
                </Form.Item>

                <Form.Item
                  name="frontendPort"
                  label="Port Frontend"
                  rules={[{ required: true, message: 'Vui lòng nhập port' }]}
                >
                  <Input placeholder="3001" />
                </Form.Item>

                <div style={{ marginTop: 16 }}>
                  <Text type="secondary">ESP32 URL: </Text>
                  <Text code>{`http://${form.getFieldValue('esp32IP') || '...'}`}</Text>
                </div>
              </Card>
            </Col>
          </Row>

          <Divider />

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={loading}
                size="large"
              >
                Lưu cấu hình
              </Button>
              
              <Popconfirm
                title="Bạn có chắc muốn reset về cấu hình mặc định?"
                onConfirm={handleReset}
                okText="Có"
                cancelText="Không"
              >
                <Button>
                  Reset về mặc định
                </Button>
              </Popconfirm>

              <Button onClick={testConnections} loading={testing}>
                <ReloadOutlined /> Kiểm tra kết nối
              </Button>
            </Space>
          </Form.Item>
        </Form>

        {/* Current Configuration Display */}
        <Card size="small" title="📋 Cấu hình hiện tại" style={{ marginTop: 24 }}>
          <Row gutter={[16, 8]}>
            <Col xs={24} sm={12}>
              <Text strong>Server IP: </Text>
              <Text code>{currentConfig.serverIP}:{currentConfig.serverPort}</Text>
            </Col>
            <Col xs={24} sm={12}>
              <Text strong>ESP32 IP: </Text>
              <Text code>{currentConfig.esp32IP}</Text>
            </Col>
            <Col xs={24} sm={12}>
              <Text strong>API URL: </Text>
              <Text code>{getConfig().serverIP ? `http://${getConfig().serverIP}:${getConfig().serverPort}/api` : 'N/A'}</Text>
            </Col>
            <Col xs={24} sm={12}>
              <Text strong>Frontend Port: </Text>
              <Text code>{currentConfig.frontendPort}</Text>
            </Col>
          </Row>
        </Card>

        {/* Instructions */}
        <Card size="small" title="📖 Hướng dẫn" style={{ marginTop: 24 }}>
          <ol>
            <li>
              <strong>Khi ở nhà:</strong> Sử dụng preset "Nhà" hoặc nhập IP: 172.20.10.7 (Server) và 172.20.10.8 (ESP32)
            </li>
            <li>
              <strong>Khi ở quán cà phê:</strong>
              <ul>
                <li>Kiểm tra IP của laptop: <code>ipconfig</code> (Windows) hoặc <code>ifconfig</code> (Mac/Linux)</li>
                <li>Nhập IP server mới (thường cùng subnet với IP laptop)</li>
                <li>Nhập IP ESP32 mới (nếu ESP32 đang kết nối cùng mạng)</li>
                <li>Click "Lưu cấu hình" và refresh trang</li>
              </ul>
            </li>
            <li>
              <strong>Lưu ý:</strong> ESP32 phải kết nối cùng mạng WiFi với laptop để có thể giao tiếp
            </li>
          </ol>
        </Card>
      </Card>
    </div>
  );
};

export default IPConfiguration;

