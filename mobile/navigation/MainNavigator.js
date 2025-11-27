import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/HomeScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import PayrollScreen from '../screens/PayrollScreen';
import LeaveScreen from '../screens/LeaveScreen';
import ProfileScreen from '../screens/ProfileScreen';
import LeaveDetailScreen from '../screens/LeaveDetailScreen';
import ApplyLeaveScreen from '../screens/ApplyLeaveScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function LeaveStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="LeaveList" 
        component={LeaveScreen}
        options={{ title: 'Đơn nghỉ phép' }}
      />
      <Stack.Screen 
        name="LeaveDetail" 
        component={LeaveDetailScreen}
        options={{ title: 'Chi tiết đơn nghỉ phép' }}
      />
      <Stack.Screen 
        name="ApplyLeave" 
        component={ApplyLeaveScreen}
        options={{ title: 'Tạo đơn nghỉ phép' }}
      />
    </Stack.Navigator>
  );
}

export default function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Attendance') {
            iconName = focused ? 'time' : 'time-outline';
          } else if (route.name === 'Payroll') {
            iconName = focused ? 'cash' : 'cash-outline';
          } else if (route.name === 'Leave') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#1890ff',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ title: 'Trang chủ' }}
      />
      <Tab.Screen 
        name="Attendance" 
        component={AttendanceScreen}
        options={{ title: 'Chấm công' }}
      />
      <Tab.Screen 
        name="Payroll" 
        component={PayrollScreen}
        options={{ title: 'Bảng lương' }}
      />
      <Tab.Screen 
        name="Leave" 
        component={LeaveStack}
        options={{ title: 'Nghỉ phép' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Hồ sơ' }}
      />
    </Tab.Navigator>
  );
}



