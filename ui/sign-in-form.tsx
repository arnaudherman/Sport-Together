import { useState } from 'react';
import { ActivityIndicator, Button, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuthRepository } from '@/core/di/repositories-context';

/** Connexion par magic link / code OTP e-mail (ADR-0005). */
export function SignInForm() {
  const auth = useAuthRepository();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode() {
    setBusy(true);
    setError(null);
    try {
      await auth.requestEmailOtp(email);
      setStep('code');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    setError(null);
    try {
      await auth.verifyEmailOtp(email, code);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sport Together</Text>
      <Text style={styles.subtitle}>Connecte-toi pour rejoindre ton groupe</Text>

      {step === 'email' ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="ton@email.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <Button title="Recevoir un code" onPress={sendCode} disabled={busy || !email} />
        </>
      ) : (
        <>
          <Text style={styles.hint}>Code envoyé à {email}</Text>
          <TextInput
            style={styles.input}
            placeholder="123456"
            keyboardType="number-pad"
            value={code}
            onChangeText={setCode}
          />
          <Button title="Valider" onPress={verify} disabled={busy || !code} />
        </>
      )}

      {busy && <ActivityIndicator style={styles.spinner} />}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 28, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#6B7280', textAlign: 'center', marginBottom: 12 },
  hint: { fontSize: 14, color: '#6B7280' },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  spinner: { marginTop: 8 },
  error: { color: '#DC2626', fontSize: 14 },
});
