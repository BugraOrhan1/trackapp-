import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { forgotPassword } from '../../services/auth';
import { theme } from '../../config/theme';

export default function ForgotPasswordScreen(): JSX.Element {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    setLoading(true);
    setMessage(null);
    try {
      await forgotPassword(email.trim());
      setMessage('Resetlink verzonden.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Reset mislukt');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wachtwoord vergeten</Text>
      <Input placeholder="E-mail" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <Button title="Reset link sturen" onPress={handleReset} loading={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: 24, justifyContent: 'center', gap: 12 },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: '900', marginBottom: 12 },
  message: { color: theme.colors.muted },
});
