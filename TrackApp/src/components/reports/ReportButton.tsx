import React from 'react';
import Button from '../common/Button';

export default function ReportButton({ title, onPress }: { title: string; onPress: () => void }): JSX.Element {
  return <Button title={title} onPress={onPress} />;
}
