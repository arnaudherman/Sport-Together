import { useState } from 'react';
import { ActivityIndicator, Button, StyleSheet, Text, TextInput, View } from 'react-native';

import { useGroupRepository } from '@/core/di/repositories-context';

/** Créer un groupe (avec son code d'invitation) ou en rejoindre un (ADR-0004). */
export function GroupGate({ onReady }: { onReady: (groupId: string) => void }) {
  const groups = useGroupRepository();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; inviteCode?: string } | null>(null);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const group = await groups.createGroup(name);
      setCreated({ id: group.id, inviteCode: group.inviteCode });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function join() {
    setBusy(true);
    setError(null);
    try {
      const group = await groups.joinByCode(code);
      onReady(group.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (created) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Groupe créé 🎉</Text>
        {created.inviteCode ? (
          <Text style={styles.code}>Code d'invitation : {created.inviteCode}</Text>
        ) : null}
        <Text style={styles.hint}>Partage ce code à tes amis pour qu'ils rejoignent.</Text>
        <Button title="Continuer" onPress={() => onReady(created.id)} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ton groupe</Text>

      <Text style={styles.section}>Créer un groupe</Text>
      <TextInput
        style={styles.input}
        placeholder="Nom du groupe"
        value={name}
        onChangeText={setName}
      />
      <Button title="Créer" onPress={create} disabled={busy || !name} />

      <Text style={styles.section}>— ou rejoindre —</Text>
      <TextInput
        style={styles.input}
        placeholder="Code d'invitation"
        autoCapitalize="characters"
        autoCorrect={false}
        value={code}
        onChangeText={setCode}
      />
      <Button title="Rejoindre" onPress={join} disabled={busy || !code} />

      {busy && <ActivityIndicator style={styles.spinner} />}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 10 },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  section: { fontSize: 13, color: '#6B7280', marginTop: 12, textAlign: 'center' },
  code: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  hint: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  spinner: { marginTop: 8 },
  error: { color: '#DC2626', fontSize: 14, textAlign: 'center' },
});
