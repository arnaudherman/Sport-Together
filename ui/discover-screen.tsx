import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useGroupRepository, useProfileRepository } from '@/core/di/repositories-context';
import type { GroupMember } from '@/domain/entities/group';
import type { ProfileSearchResult } from '@/domain/repositories/profile-repository';
import { Avatar } from '@/ui/avatar';
import { FollowButton } from '@/ui/follow-button';
import { handle } from '@/ui/format';
import { ScreenHeader } from '@/ui/screen-header';
import { ScreenState } from '@/ui/screen-state';
import { colors, font, radius } from '@/ui/theme';
import { useAsyncData } from '@/ui/use-async-data';
import { useDebounced } from '@/ui/use-debounced';

/**
 * Découvrir des gens à suivre : les membres de tes groupes que tu ne suis pas
 * encore (solo-first : alimente ton fil « Abonnements » sans backend dédié).
 */
export function DiscoverScreen({
  userId,
  onBack,
  onOpenProfile,
  onJoinGroup,
}: {
  userId: string;
  onBack?: () => void;
  onOpenProfile: (id: string, name: string) => void;
  onJoinGroup: () => void;
}) {
  const groupRepo = useGroupRepository();
  const profileRepo = useProfileRepository();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProfileSearchResult[]>([]);

  const fireSearch = useDebounced(async (q: string) => {
    try {
      setResults(await profileRepo.searchProfiles(q));
    } catch (e) {
      setError((e as Error).message);
    }
  });

  function runSearch(q: string) {
    setQuery(q);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    fireSearch(q);
  }

  const loader = useCallback(async () => {
    const groups = await groupRepo.listMyGroups();
    const membersByGroup = await Promise.all(groups.map((g) => groupRepo.listMembers(g.id)));
    const byId = new Map<string, GroupMember>();
    for (const list of membersByGroup) {
      for (const m of list) if (m.id !== userId) byId.set(m.id, m);
    }
    return [...byId.values()];
  }, [groupRepo, userId]);
  const { data: people, loading, error, setError, reload } = useAsyncData<GroupMember[]>(loader, []);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Découvrir" onBack={onBack} />

      <ScreenState loading={loading} error={error} hasData={people.length > 0} onRetry={reload}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.searchRow}>
            <Ionicons name="search" size={17} color={colors.textFaint} />
            <TextInput
              style={styles.searchInput}
              placeholder="Chercher quelqu'un par pseudo…"
              placeholderTextColor={colors.textFaint}
              value={query}
              onChangeText={runSearch}
              autoCorrect={false}
              autoCapitalize="none"
            />
          </View>

          {results.length > 0 ? (
            <View style={styles.results}>
              {results.map((p2, i) => (
                <View key={p2.id} style={[styles.row, i === results.length - 1 && styles.rowLast]}>
                  <Pressable style={styles.who} onPress={() => onOpenProfile(p2.id, p2.pseudo)}>
                    <Avatar name={p2.pseudo} seed={p2.id} size={44} url={p2.avatarUrl} />
                    <View>
                      <Text style={styles.name}>{p2.pseudo}</Text>
                      <Text style={styles.handle}>{handle(p2.pseudo)}</Text>
                    </View>
                  </Pressable>
                  <FollowButton targetId={p2.id} targetName={p2.pseudo} onError={setError} />
                </View>
              ))}
            </View>
          ) : query.trim().length >= 2 ? (
            <Text style={styles.hint}>Personne ne correspond à « {query.trim()} ».</Text>
          ) : null}

          <Text style={styles.hint}>Des membres de tes groupes à suivre pour enrichir ton fil.</Text>
          {people.length === 0 ? (
            <Pressable style={styles.emptyCta} onPress={onJoinGroup} accessibilityRole="button" accessibilityLabel="Rejoindre un groupe">
              <Ionicons name="people-outline" size={26} color={colors.accent} />
              <Text style={styles.emptyTitle}>Personne à suggérer</Text>
              <Text style={styles.empty}>Les suggestions viennent des membres de tes groupes. Rejoins-en un pour découvrir des gens à suivre.</Text>
              <Text style={styles.emptyLink}>Rejoindre un groupe →</Text>
            </Pressable>
          ) : (
            people.map((p, i) => (
              <View key={p.id} style={[styles.row, i === people.length - 1 && styles.rowLast]}>
                <Pressable style={styles.who} onPress={() => onOpenProfile(p.id, p.pseudo)}>
                  <Avatar name={p.pseudo} seed={p.id} size={44} url={p.avatarUrl} />
                  <View>
                    <Text style={styles.name}>{p.pseudo}</Text>
                    <Text style={styles.handle}>{handle(p.pseudo)}</Text>
                  </View>
                </Pressable>
                <FollowButton targetId={p.id} targetName={p.pseudo} onError={setError} />
              </View>
            ))
          )}
        </ScrollView>
      </ScreenState>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16 },
  scroll: { paddingBottom: 120 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: 14, marginTop: 6 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: colors.text },
  results: { marginTop: 4 },
  hint: { color: colors.textMuted, fontSize: 14, marginVertical: 12 },
  empty: { color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  emptyCta: { alignItems: 'center', gap: 8, marginTop: 32, padding: 22, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  emptyTitle: { ...font.title },
  emptyLink: { color: colors.accent, fontWeight: '800', fontSize: 15, marginTop: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLast: { borderBottomWidth: 0 },
  who: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  name: { ...font.title, fontWeight: '800' },
  handle: { fontSize: 13, color: colors.textMuted },
});
