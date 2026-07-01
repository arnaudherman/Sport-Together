import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuthRepository } from '@/core/di/repositories-context';
import { PrimaryButton } from '@/ui/button';
import { colors, font, radius } from '@/ui/theme';

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
      <Text style={styles.subtitle}>On progresse ensemble. Connecte-toi.</Text>

      {step === 'email' ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="ton@email.com"
            placeholderTextColor={colors.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <PrimaryButton title="Recevoir un code" onPress={sendCode} disabled={!email} busy={busy} />
        </>
      ) : (
        <>
          <Text style={styles.hint}>Code envoyé à {email}</Text>
          <TextInput
            style={styles.input}
            placeholder="123456"
            placeholderTextColor={colors.textFaint}
            keyboardType="number-pad"
            value={code}
            onChangeText={setCode}
          />
          <PrimaryButton title="Valider" onPress={verify} disabled={!code} busy={busy} />
        </>
      )}

      {busy ? <ActivityIndicator color={colors.accent} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: 24, gap: 12 },
  title: { ...font.display, textAlign: 'center' },
  subtitle: { ...font.body, color: colors.textMuted, textAlign: 'center', marginBottom: 12 },
  hint: { ...font.body, color: colors.textMuted },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: colors.text,
  },
  error: { color: '#FCA5A5', fontSize: 14, textAlign: 'center' },
});
