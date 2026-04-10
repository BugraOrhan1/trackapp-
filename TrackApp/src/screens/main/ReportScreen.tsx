import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { createReport } from '../../services/reports';
import { theme } from '../../config/theme';
import type { ReportType } from '../../types';

const REPORT_TYPES: Array<{ label: string; value: ReportType; icon: string }> = [
  { label: 'Mobiele flitser', value: 'speed_camera_mobile', icon: '📸' },
  { label: 'Politiecontrole', value: 'police_control', icon: '🚔' },
  { label: 'Wegwerkzaamheden', value: 'roadwork', icon: '🚧' },
  { label: 'File', value: 'traffic_jam', icon: '🚗' },
  { label: 'Ongeluk', value: 'accident', icon: '⚠️' },
  { label: 'Gevaar', value: 'danger', icon: '❗' },
];

export default function ReportScreen(): JSX.Element {
  const [type, setType] = useState<ReportType>('speed_camera_mobile');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  async function submit() {
    try {
      await createReport({ type, latitude: 52.0, longitude: 4.7, description });
      setMessage('Melding opgeslagen');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Opslaan mislukt');
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Melding maken</Text>
      <View style={styles.typeGrid}>
        {REPORT_TYPES.map((item) => (
          <Button key={item.value} title={`${item.icon} ${item.label}`} onPress={() => setType(item.value)} variant={type === item.value ? 'primary' : 'secondary'} />
        ))}
      </View>
      <Input placeholder="Beschrijving" value={description} onChangeText={setDescription} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <Button title="Versturen" onPress={submit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 16, gap: 12 },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: '900' },
  typeGrid: { gap: 8 },
  message: { color: theme.colors.success },
});
