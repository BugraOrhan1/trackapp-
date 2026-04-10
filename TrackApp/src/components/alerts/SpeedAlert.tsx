import React from 'react';
import AlertBanner from './AlertBanner';

export default function SpeedAlert(props: { distance?: string; onDismiss?: () => void }): JSX.Element | null {
  if (!props.onDismiss) return null;

  return (
    <AlertBanner
      alert={{
        id: 'speed-alert',
        type: 'speed_camera',
        title: 'Flitser in de buurt',
        message: 'Rijd rustig en let op de limiet.',
        distance: Number(props.distance?.replace(/[^0-9.]/g, '') ?? '0'),
        color: '#FF1744',
      }}
      onDismiss={props.onDismiss}
    />
  );
}
