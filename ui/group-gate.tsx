import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useGroupRepository } from '@/core/di/repositories-context';
import type { Group } from '@/domain/entities/group';

/** Choix d'un groupe : liste de mes groupes + créer / rejoindre (ADR-0004). */
export function GroupGate({ onReady }: { onReady: (groupId: string) => void }) {
  const groups = useGroupRepository();
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; inviteCode?: string } | null>(null);

  const loadMine = useCallback(async () => {
    try {
      setMyGroups(await groups.listMyGroups());
    } catch (e) {
      setError((e as Error).message);
    }
  }, [groups]);

  useEffect(() => {
    loadMine();
  }, [loadMine]);

  async function create() {
    const value = name.trim();
    if (value.length === 0) {
      setError('Donne un nom au groupe.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const group = await groups.createGroup(value);
      setCreated({ id: group.id, inviteCode: group.inviteCode });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function join() {
    const value = code.trim();
    if (value.length === 0) {
      setError('Entre un code d\'invitation.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const group = await groups.joinByCode(value);
      onReady(group.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (created) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Groupe créé 🎉</Text>
        {created.inviteCode ? (
          <Text style={styles.code}>Code d'invitation : {created.inviteCode}</Text>
        ) : null}
        <Text style={styles.hint}>Partage ce code à tes amis pour qu'ils rejoignent.</Text>
        <Button title="Continuer" onPress={() => onReady(created.id)} />
        <Button
          title="Retour aux groupes"
          onPress={() => {
            setCreated(null);
            loadMine();
          }}
        />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Tes groupes</Text>
      {myGroups.length === 0 ? (
        <Text style={styles.hint}>
          Aucun groupe pour l'instant — crée-en un ou rejoins celui d'un ami.
        </Text>
      ) : (
        myGroups.map((group) => (
          <Pressable key={group.id} onPress={() => onReady(group.id)} style={styles.groupRow}>
            <Text style={styles.groupName}>{group.name}</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))
      )}

      <Text style={styles.section}>Créer un groupe</Text>
      <TextInput
        style={styles.input}
        placeholder="Nom du groupe"
        value={name}
        onChangeText={setName}
      />
      <Button title="Créer" onPress={create} disabled={busy} />

      <Text style={styles.section}>— ou rejoindre —</Text>
      <TextInput
        style={styles.input}
        placeholder="Code d'invitation"
        autoCapitalize="characters"
        autoCorrect={false}
        value={code}
        onChangeText={setCode}
      />
      <Button title="Rejoindre" onPress={join} disabled={busy} />

      {busy && <ActivityIndicator style={styles.spinner} />}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 10 },
  centered: { flex: 1, justifyContent: 'center', padding: 24, gap: 10 },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  section: { fontSize: 13, color: '#6B7280', marginTop: 16, textAlign: 'center' },
  code: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  hint: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
  groupRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F4F5F7',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  groupName: { fontSize: 16, fontWeight: '600' },
  chevron: { fontSize: 22, color: '#9CA3AF' },
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
