import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';

import { useGroupRepository } from '@/core/di/repositories-context';
import type { Group } from '@/domain/entities/group';
import { GhostButton, PrimaryButton } from '@/ui/button';
import { colors, font, radius } from '@/ui/theme';

/** Rejoindre / créer un groupe (add-on solo-first, ADR-0004). */
export function GroupGate({
  onReady,
  onBack,
}: {
  onReady: (groupId: string) => void;
  onBack: () => void;
}) {
  const groups = useGroupRepository();
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; inviteCode?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    if (!created?.inviteCode) return;
    await Clipboard.setStringAsync(created.inviteCode);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareCode() {
    if (!created?.inviteCode) return;
    Share.share({
      message: `Rejoins mon groupe sur Sport Together avec le code ${created.inviteCode} 💪`,
    }).catch(() => {});
  }

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
          <>
            <Pressable onPress={copyCode} accessibilityRole="button" accessibilityLabel="Copier le code d'invitation">
              <Text style={styles.code}>{created.inviteCode}</Text>
            </Pressable>
            <Text style={styles.hint}>Partage ce code à tes amis pour qu'ils rejoignent.</Text>
            <View style={styles.shareRow}>
              <View style={styles.shareBtn}>
                <GhostButton title={copied ? 'Copié ✓' : 'Copier le code'} onPress={copyCode} />
              </View>
              <View style={styles.shareBtn}>
                <GhostButton title="Partager" onPress={shareCode} />
              </View>
            </View>
          </>
        ) : null}
        <PrimaryButton title="Continuer" onPress={() => onReady(created.id)} />
        <Pressable
          onPress={() => {
            setCreated(null);
            loadMine();
          }}
        >
          <Text style={styles.link}>Retour aux groupes</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Pressable onPress={onBack} hitSlop={10} style={styles.backRow}>
        <Text style={styles.link}>‹ Retour</Text>
      </Pressable>
      <Text style={styles.title}>Tes groupes</Text>
      {myGroups.length === 0 ? (
        <Text style={styles.hint}>Aucun groupe — crée-en un ou rejoins celui d'un ami.</Text>
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
        placeholderTextColor={colors.textFaint}
        value={name}
        onChangeText={setName}
      />
      <PrimaryButton title="Créer" onPress={create} busy={busy} />

      <Text style={styles.section}>— ou rejoindre —</Text>
      <TextInput
        style={styles.input}
        placeholder="Code d'invitation"
        placeholderTextColor={colors.textFaint}
        autoCapitalize="characters"
        autoCorrect={false}
        value={code}
        onChangeText={setCode}
      />
      <PrimaryButton title="Rejoindre" onPress={join} busy={busy} />

      {busy ? <ActivityIndicator color={colors.accent} style={styles.spinner} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 24, gap: 10 },
  centered: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: 24, gap: 12 },
  title: { ...font.h1, textAlign: 'center', marginBottom: 8 },
  section: { ...font.label, marginTop: 16, textAlign: 'center' },
  code: { ...font.display, color: colors.accent, textAlign: 'center', letterSpacing: 2 },
  shareRow: { flexDirection: 'row', gap: 10 },
  shareBtn: { flex: 1 },
  hint: { ...font.body, color: colors.textMuted, textAlign: 'center' },
  link: { fontSize: 15, color: colors.accent, fontWeight: '700', textAlign: 'center' },
  backRow: { alignSelf: 'flex-start', marginBottom: 4 },
  groupRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  groupName: { ...font.title },
  chevron: { fontSize: 22, color: colors.textFaint },
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
  spinner: { marginTop: 8 },
  error: { color: colors.danger, fontSize: 14, textAlign: 'center' },
});
