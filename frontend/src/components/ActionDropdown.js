/**
 * ActionDropdown Component
 * 
 * A reusable dropdown menu for table row actions.
 * Replaces discrete action buttons (Edit, Delete, View) with a compact dropdown.
 * 
 * Usage:
 * <ActionDropdown
 *   items={[
 *     { key: 'view', label: 'Xem chi tiết', icon: <EyeOutlined />, onClick: () => handleView(record) },
 *     { key: 'edit', label: 'Chỉnh sửa', icon: <EditOutlined />, onClick: () => handleEdit(record) },
 *     { type: 'divider' },
 *     { key: 'delete', label: 'Xóa', icon: <DeleteOutlined />, danger: true, onClick: () => handleDelete(record) }
 *   ]}
 * />
 */

import React from 'react';
import { Dropdown, Button, Space } from 'antd';
import { MoreOutlined, EllipsisOutlined } from '@ant-design/icons';

const ActionDropdown = ({ 
  items = [], 
  trigger = ['click'],
  placement = 'bottomRight',
  buttonType = 'text',
  buttonSize = 'small',
  buttonIcon = <MoreOutlined style={{ fontSize: 16 }} />,
  label = ''
}) => {
  // Transform items to Antd Dropdown format
  const menuItems = items.map((item, index) => {
    if (item.type === 'divider') {
      return { type: 'divider', key: `divider-${index}` };
    }
    
    return {
      key: item.key,
      label: (
        <Space size={8}>
          {item.icon}
          <span>{item.label}</span>
        </Space>
      ),
      onClick: item.onClick,
      danger: item.danger || false,
      disabled: item.disabled || false
    };
  });

  return (
    <Dropdown
      menu={{ items: menuItems }}
      trigger={trigger}
      placement={placement}
    >
      <Button 
        type={buttonType} 
        size={buttonSize}
        icon={buttonIcon}
        style={{ 
          padding: '4px 8px',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {label && <span style={{ marginLeft: 4 }}>{label}</span>}
      </Button>
    </Dropdown>
  );
};

// Pre-configured variants
export const TableActionDropdown = (props) => (
  <ActionDropdown
    buttonIcon={<EllipsisOutlined style={{ fontSize: 18 }} />}
    buttonType="text"
    {...props}
  />
);

export default ActionDropdown;











