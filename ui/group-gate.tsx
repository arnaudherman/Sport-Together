import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useGroupRepository } from '@/core/di/repositories-context';
import type { PublicGroup } from '@/domain/entities/group';
import { PrimaryButton } from '@/ui/button';
import { InviteCodeActions } from '@/ui/invite-code-actions';
import { ScreenHeader } from '@/ui/screen-header';
import { Surface } from '@/ui/surface';
import { colors, font, radius } from '@/ui/theme';
import { useAsyncData } from '@/ui/use-async-data';

type Seg = 'mine' | 'discover';

/**
 * Onglet Groupes (DA v2) : mes groupes + DÉCOUVRIR les groupes publics
 * (annuaire + recherche + rejoindre sans code), créer (privé 🔒 ou public 🌍,
 * au choix du créateur) ou rejoindre par code.
 */
export function GroupGate({
  onReady,
  onBack,
}: {
  onReady: (groupId: string) => void;
  /** Absent = écran RACINE de l'onglet Groupes (pas de Retour). */
  onBack?: () => void;
}) {
  const groups = useGroupRepository();
  const [seg, setSeg] = useState<Seg>('mine');
  const [name, setName] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'public'>('private');
  const [code, setCode] = useState('');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; inviteCode?: string } | null>(null);

  const mineLoader = useCallback(() => groups.listMyGroups(), [groups]);
  const { data: myGroups, error: mineError, reload: reloadMine, mounted } = useAsyncData(mineLoader, []);

  const [publics, setPublics] = useState<PublicGroup[]>([]);
  const [publicsLoaded, setPublicsLoaded] = useState(false);

  async function loadPublics(query: string) {
    try {
      const list = await groups.listPublicGroups(query);
      if (mounted.current) {
        setPublics(list);
        setPublicsLoaded(true);
      }
    } catch (e) {
      if (mounted.current) setError((e as Error).message);
    }
  }

  function openDiscover() {
    setSeg('discover');
    if (!publicsLoaded) loadPublics('');
  }

  async function create() {
    const value = name.trim();
    if (value.length === 0) {
      setError('Donne un nom au groupe.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const group = await groups.createGroup(value, visibility);
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
      setError("Entre un code d'invitation.");
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

  async function joinPublic(groupId: string) {
    setBusy(true);
    setError(null);
    try {
      const group = await groups.joinPublicGroup(groupId);
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
        <Text style={styles.hint}>
          {visibility === 'public'
            ? 'Groupe PUBLIC : visible dans l’annuaire, rejoignable sans code.'
            : 'Groupe privé : partage ce code à tes amis pour qu’ils rejoignent.'}
        </Text>
        {created.inviteCode ? <InviteCodeActions code={created.inviteCode} /> : null}
        <PrimaryButton title="Continuer" onPress={() => onReady(created.id)} />
        <Pressable
          onPress={() => {
            setCreated(null);
            reloadMine();
          }}
        >
          <Text style={styles.link}>Retour aux groupes</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Groupes" onBack={onBack} />

      <View style={styles.seg}>
        <Pressable onPress={() => setSeg('mine')} style={styles.segItem} accessibilityRole="tab" accessibilityState={{ selected: seg === 'mine' }}>
          <Text style={[styles.segText, seg === 'mine' && styles.segTextOn]}>Mes groupes</Text>
          {seg === 'mine' ? <View style={styles.segUnderline} /> : null}
        </Pressable>
        <Pressable onPress={openDiscover} style={styles.segItem} accessibilityRole="tab" accessibilityState={{ selected: seg === 'discover' }}>
          <Text style={[styles.segText, seg === 'discover' && styles.segTextOn]}>Découvrir</Text>
          {seg === 'discover' ? <View style={styles.segUnderline} /> : null}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {seg === 'mine' ? (
          <>
            {myGroups.length === 0 ? (
              <Text style={styles.hint}>Aucun groupe — crée-en un, rejoins par code, ou explore l’annuaire public.</Text>
            ) : (
              myGroups.map((group) => (
                <Surface key={group.id}>
                  <Pressable onPress={() => onReady(group.id)} style={styles.groupRow}>
                    <Text style={styles.groupIcon}>{group.visibility === 'public' ? '🌍' : '🔒'}</Text>
                    <Text style={styles.groupName}>{group.name}</Text>
                    <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
                  </Pressable>
                </Surface>
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
            <View style={styles.visRow}>
              <Pressable
                onPress={() => setVisibility('private')}
                style={[styles.visChip, visibility === 'private' && styles.visChipOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: visibility === 'private' }}
              >
                <Text style={[styles.visText, visibility === 'private' && styles.visTextOn]}>🔒 Privé — sur invitation</Text>
              </Pressable>
              <Pressable
                onPress={() => setVisibility('public')}
                style={[styles.visChip, visibility === 'public' && styles.visChipOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: visibility === 'public' }}
              >
                <Text style={[styles.visText, visibility === 'public' && styles.visTextOn]}>🌍 Public — ouvert à tous</Text>
              </Pressable>
            </View>
            <PrimaryButton title="Créer" onPress={create} busy={busy} />

            <Text style={styles.section}>— ou rejoindre par code —</Text>
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
          </>
        ) : (
          <>
            <View style={styles.searchRow}>
              <Ionicons name="search" size={17} color={colors.textFaint} />
              <TextInput
                style={styles.searchInput}
                placeholder="Chercher un groupe public…"
                placeholderTextColor={colors.textFaint}
                value={search}
                onChangeText={(t) => {
                  setSearch(t);
                  loadPublics(t);
                }}
                autoCorrect={false}
              />
            </View>
            {publics.length === 0 && publicsLoaded ? (
              <Text style={styles.hint}>Aucun groupe public trouvé. Crée le tien en 🌍 public !</Text>
            ) : (
              publics.map((g) => (
                <Surface key={g.id}>
                  <View style={styles.groupRow}>
                    <Text style={styles.groupIcon}>🌍</Text>
                    <View style={styles.flex}>
                      <Text style={styles.groupName}>{g.name}</Text>
                      <Text style={styles.members}>{g.memberCount} membres</Text>
                    </View>
                    <Pressable
                      style={({ pressed }) => [styles.joinBtn, pressed && styles.pressed]}
                      onPress={() => joinPublic(g.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Rejoindre ${g.name}`}
                    >
                      <Text style={styles.joinText}>Rejoindre</Text>
                    </Pressable>
                  </View>
                </Surface>
              ))
            )}
          </>
        )}

        {busy ? <ActivityIndicator color={colors.accent} style={styles.spinner} /> : null}
        {error || mineError ? <Text style={styles.error}>{error ?? mineError}</Text> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16 },
  container: { paddingVertical: 8, gap: 10, paddingBottom: 120 },
  centered: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: 24, gap: 12 },
  flex: { flex: 1 },
  title: { ...font.h1, textAlign: 'center', marginBottom: 8 },
  seg: { flexDirection: 'row', gap: 22, paddingHorizontal: 4 },
  segItem: { paddingVertical: 8, minHeight: 44, justifyContent: 'center' },
  segText: { color: colors.textFaint, fontWeight: '600', fontSize: 14.5 },
  segTextOn: { color: colors.text },
  segUnderline: { position: 'absolute', left: 0, right: 0, bottom: 4, height: 3, borderRadius: 2, backgroundColor: colors.accent },
  section: { ...font.label, marginTop: 16, textAlign: 'center' },
  hint: { ...font.body, color: colors.textMuted, textAlign: 'center', marginTop: 8 },
  link: { fontSize: 15, color: colors.accent, fontWeight: '700', textAlign: 'center' },
  groupRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 15 },
  groupIcon: { fontSize: 17 },
  groupName: { ...font.title, flex: 1 },
  members: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  joinBtn: { backgroundColor: colors.accent, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 9, minHeight: 38, justifyContent: 'center' },
  joinText: { color: colors.onAccent, fontWeight: '800', fontSize: 13.5 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  visRow: { flexDirection: 'row', gap: 8 },
  visChip: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center' },
  visChipOn: { backgroundColor: colors.accentSoft },
  visText: { fontSize: 12.5, fontWeight: '600', color: colors.textMuted },
  visTextOn: { color: colors.accent, fontWeight: '700' },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: colors.text,
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: 14, marginTop: 6 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: colors.text },
  spinner: { marginTop: 8 },
  error: { color: colors.danger, fontSize: 14, textAlign: 'center' },
});
