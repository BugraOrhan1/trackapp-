import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { register } from '../../services/auth';
import { theme } from '../../config/theme';

export default function RegisterScreen(): JSX.Element {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleRegister() {
    setLoading(true);
    setMessage(null);
    try {
      await register(email.trim(), password, username.trim());
      setMessage('Account aangemaakt. Controleer je e-mail voor verificatie.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Registratie mislukt');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Account aanmaken</Text>
      <Input placeholder="Gebruikersnaam" value={username} onChangeText={setUsername} />
      <Input placeholder="E-mail" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <Input placeholder="Wachtwoord" secureTextEntry value={password} onChangeText={setPassword} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <Button title="Registreren" onPress={handleRegister} loading={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: 24, justifyContent: 'center', gap: 12 },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: '900', marginBottom: 12 },
  message: { color: theme.colors.success },
});
