import React from 'react';
import AlertBanner from './AlertBanner';

export default function EmergencyAlert(props: { distance?: string; onDismiss?: () => void }): JSX.Element | null {
  if (!props.onDismiss) return null;

  return (
    <AlertBanner
      alert={{
        id: 'emergency-alert',
        type: 'emergency',
        title: 'Hulpdienst in de buurt',
        message: 'Er is een premium emergency detection actief.',
        distance: Number(props.distance?.replace(/[^0-9.]/g, '') ?? '0'),
        color: '#FFD700',
      }}
      onDismiss={props.onDismiss}
    />
  );
}
