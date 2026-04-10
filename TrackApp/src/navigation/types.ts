import { createNavigationContainerRef, type CompositeScreenProps, type NavigatorScreenParams } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { StackScreenProps } from '@react-navigation/stack';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  Map: undefined;
  Alerts: undefined;
  Report: undefined;
  Profile: undefined;
};

export type MainStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  Scanner: undefined;
  PairDevice: undefined;
  Stats: undefined;
  Paywall: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList> | undefined;
  Main: NavigatorScreenParams<MainStackParamList> | undefined;
};

export type AuthScreenProps<T extends keyof AuthStackParamList> = StackScreenProps<AuthStackParamList, T>;

export type MainTabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  StackScreenProps<MainStackParamList>
>;

export type MainStackScreenProps<T extends keyof MainStackParamList> = StackScreenProps<MainStackParamList, T>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

export const navigationRef = createNavigationContainerRef<RootStackParamList>();
