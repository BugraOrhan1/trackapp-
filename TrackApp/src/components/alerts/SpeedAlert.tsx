import React from 'react';
import AlertBanner from './AlertBanner';

export default function SpeedAlert(props: { distance?: string; onDismiss?: () => void }): JSX.Element {
  return <AlertBanner title="Flitser in de buurt" distance={props.distance} onDismiss={props.onDismiss} color="#FF1744" />;
}
