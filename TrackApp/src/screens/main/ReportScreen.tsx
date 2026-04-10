import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { useLocation } from '../../hooks/useLocation';
import { useReports } from '../../hooks/useReports';
import type { MainTabScreenProps } from '../../navigation/types';
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

export default function ReportScreen({ navigation }: MainTabScreenProps<'Report'>): JSX.Element {
  const [type, setType] = useState<ReportType>('speed_camera_mobile');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const { location } = useLocation();
  const { createReport, loading } = useReports(location, 10);

  async function submit() {
    try {
      await createReport(type, description);
      setMessage('Melding opgeslagen');
      setDescription('');
      Alert.alert('Melding verzonden', 'Je melding staat nu live op de kaart.');
      navigation.navigate('Map');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Opslaan mislukt');
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Melding maken</Text>
      <View style={styles.typeGrid}>
        {REPORT_TYPES.map((item) => (
          <View key={item.value} style={styles.typeItem}>
            <Button title={`${item.icon} ${item.label}`} onPress={() => setType(item.value)} variant={type === item.value ? 'primary' : 'secondary'} />
          </View>
        ))}
      </View>
      <Input placeholder="Beschrijving" value={description} onChangeText={setDescription} />
      <Text style={styles.helper}>Locatie: {location ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : 'wordt opgehaald'}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <Button title="Versturen" onPress={submit} loading={loading} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 16, gap: 12 },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: '900' },
  typeGrid: { gap: 8 },
  typeItem: { marginBottom: 2 },
  message: { color: theme.colors.success },
  helper: { color: theme.colors.muted },
});
