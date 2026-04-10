import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../config/constants';

// Screens
import MapScreen from '../screens/main/MapScreen';
import ReportScreen from '../screens/main/ReportScreen';
import AlertsScreen from '../screens/main/AlertsScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import ScannerScreen from '../screens/premium/ScannerScreen';
import PairDeviceScreen from '../screens/premium/PairDeviceScreen';
import StatsScreen from '../screens/premium/StatsScreen';
import PaywallScreen from '../screens/subscription/PaywallScreen';
import SettingsScreen from '../screens/main/SettingsScreen';

export type MainTabParamList = {
  Map: undefined;
  Alerts: undefined;
  Report: undefined;
  Profile: undefined;
};

export type MainStackParamList = {
  MainTabs: undefined;
  Scanner: undefined;
  PairDevice: undefined;
  Stats: undefined;
  Paywall: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createStackNavigator<MainStackParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }: { route: { name: keyof MainTabParamList } }) => ({
        tabBarIcon: ({ focused, color, size }: { focused: boolean; color: string; size: number }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'help-circle';

          if (route.name === 'Map') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'Alerts') {
            iconName = focused ? 'notifications' : 'notifications-outline';
          } else if (route.name === 'Report') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray500,
        tabBarStyle: {
          backgroundColor: COLORS.secondary,
          borderTopColor: COLORS.gray800,
          height: 60,
          paddingBottom: 8,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Map" 
        component={MapScreen}
        options={{ tabBarLabel: 'Kaart' }}
      />
      <Tab.Screen 
        name="Alerts" 
        component={AlertsScreen}
        options={{ tabBarLabel: 'Meldingen' }}
      />
      <Tab.Screen 
        name="Report" 
        component={ReportScreen}
        options={{ 
          tabBarLabel: 'Melden',
          tabBarIconStyle: { marginTop: -10 },
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profiel' }}
      />
    </Tab.Navigator>
  );
}

export default function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen 
        name="Scanner" 
        component={ScannerScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen 
        name="PairDevice" 
        component={PairDeviceScreen}
      />
      <Stack.Screen 
        name="Stats" 
        component={StatsScreen}
      />
      <Stack.Screen 
        name="Paywall" 
        component={PaywallScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen}
      />
    </Stack.Navigator>
  );
}
