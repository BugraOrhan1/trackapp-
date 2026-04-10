import React from 'react';
import { useAuth } from '../hooks/useAuth';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import Loading from '../components/common/Loading';

export default function RootNavigator(): JSX.Element {
  const { initializing, user } = useAuth();

  if (initializing) {
    return <Loading label="TrackApp laden..." />;
  }

  return user ? <MainNavigator /> : <AuthNavigator />;
}
