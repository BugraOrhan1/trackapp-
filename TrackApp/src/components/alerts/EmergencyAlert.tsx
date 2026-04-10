import React from 'react';
import AlertBanner from './AlertBanner';

export default function EmergencyAlert(props: { distance?: string; onDismiss?: () => void }): JSX.Element {
  return <AlertBanner title="Hulpdienst in de buurt" distance={props.distance} onDismiss={props.onDismiss} color="#FFD700" />;
}
