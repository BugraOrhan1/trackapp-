import { createNavigationContainerRef } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  Map: undefined;
  Reports: undefined;
  Alerts: undefined;
  Profile: undefined;
  Settings: undefined;
  Scanner: undefined;
  Paywall: undefined;
  Stats: undefined;
};

export const navigationRef = createNavigationContainerRef();
