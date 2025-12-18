import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, AuthContext } from './contexts/AuthContext';
import AuthNavigator from './navigation/AuthNavigator';
import MainNavigator from './navigation/MainNavigator';
import CompleteProfileScreen from './screens/CompleteProfileScreen';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { isAuthenticated, loading, user } = React.useContext(AuthContext);

  if (loading) {
    return null; // Or a loading screen
  }

  // Check if user needs to complete profile
  // Check both user.profileCompleted (from login response) and user.employee?.profileCompleted
  const profileCompleted = user?.profileCompleted !== false && user?.employee?.profileCompleted !== false;
  const needsProfileCompletion = isAuthenticated &&
    !profileCompleted &&
    user?.role !== 'admin' && 
    user?.role !== 'manager' &&
    user?.role !== 'accountant'; // Only employees need to complete profile

  if (!isAuthenticated) {
    return (
      <NavigationContainer>
        <AuthNavigator />
      </NavigationContainer>
    );
  }

  if (needsProfileCompletion) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      <MainNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <AppNavigator />
    </AuthProvider>
  );
}
