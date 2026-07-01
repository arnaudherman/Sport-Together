import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useFollowRepository, useGroupRepository } from '@/core/di/repositories-context';
import type { GroupMember } from '@/domain/entities/group';
import { avatarColor, handle, initial } from '@/ui/format';
import { ScreenState } from '@/ui/screen-state';
import { colors, font, radius } from '@/ui/theme';

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
  onBack: () => void;
  onOpenProfile: (id: string, name: string) => void;
  onJoinGroup: () => void;
}) {
  const groupRepo = useGroupRepository();
  const followRepo = useFollowRepository();
  const [people, setPeople] = useState<GroupMember[]>([]);
  const [followed, setFollowed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    try {
      const groups = await groupRepo.listMyGroups();
      const membersByGroup = await Promise.all(groups.map((g) => groupRepo.listMembers(g.id)));
      const following = await followRepo.listFollowing();
      const byId = new Map<string, GroupMember>();
      for (const list of membersByGroup) {
        for (const m of list) if (m.id !== userId) byId.set(m.id, m);
      }
      if (mounted.current) {
        setPeople([...byId.values()]);
        setFollowed(new Set(following));
        setError(null);
      }
    } catch (e) {
      if (mounted.current) setError((e as Error).message);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [groupRepo, followRepo, userId]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(id: string) {
    const isFollowed = followed.has(id);
    setFollowed((prev) => {
      const next = new Set(prev);
      if (isFollowed) next.delete(id);
      else next.add(id);
      return next;
    });
    try {
      if (isFollowed) await followRepo.unfollow(id);
      else await followRepo.follow(id);
    } catch (e) {
      setFollowed((prev) => {
        const next = new Set(prev);
        if (isFollowed) next.add(id);
        else next.delete(id);
        return next;
      });
      if (mounted.current) setError((e as Error).message);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Pressable onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 8, right: 16 }} style={styles.backRow} accessibilityRole="button" accessibilityLabel="Retour">
          <Ionicons name="chevron-back" size={20} color={colors.accent} />
          <Text style={styles.back}>Retour</Text>
        </Pressable>
        <Text style={styles.title}>Découvrir</Text>
        <View style={styles.spacer} />
      </View>

      <ScreenState loading={loading} error={error} hasData={people.length > 0} onRetry={load}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.hint}>Des membres de tes groupes à suivre pour enrichir ton fil.</Text>
          {people.length === 0 ? (
            <Pressable style={styles.emptyCta} onPress={onJoinGroup} accessibilityRole="button" accessibilityLabel="Rejoindre un groupe">
              <Ionicons name="people-outline" size={26} color={colors.accent} />
              <Text style={styles.emptyTitle}>Personne à suggérer</Text>
              <Text style={styles.empty}>Les suggestions viennent des membres de tes groupes. Rejoins-en un pour découvrir des gens à suivre.</Text>
              <Text style={styles.emptyLink}>Rejoindre un groupe →</Text>
            </Pressable>
          ) : (
            people.map((p, i) => {
              const av = avatarColor(p.id);
              const isFollowed = followed.has(p.id);
              return (
                <View key={p.id} style={[styles.row, i === people.length - 1 && styles.rowLast]}>
                  <Pressable style={styles.who} onPress={() => onOpenProfile(p.id, p.pseudo)}>
                    <View style={[styles.avatar, { backgroundColor: av.bg }]}>
                      <Text style={[styles.avatarText, { color: av.fg }]}>{initial(p.pseudo)}</Text>
                    </View>
                    <View>
                      <Text style={styles.name}>{p.pseudo}</Text>
                      <Text style={styles.handle}>{handle(p.pseudo)}</Text>
                    </View>
                  </Pressable>
                  <Pressable
                    style={[styles.follow, isFollowed && styles.followOn]}
                    onPress={() => toggle(p.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isFollowed }}
                    accessibilityLabel={isFollowed ? `Ne plus suivre ${p.pseudo}` : `Suivre ${p.pseudo}`}
                  >
                    <Text style={[styles.followText, isFollowed && styles.followTextOn]}>
                      {isFollowed ? 'Suivi' : 'Suivre'}
                    </Text>
                  </Pressable>
                </View>
              );
            })
          )}
        </ScrollView>
      </ScreenState>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, paddingBottom: 8 },
  backRow: { flexDirection: 'row', alignItems: 'center', width: 90 },
  back: { fontSize: 15, color: colors.accent, fontWeight: '700' },
  title: { ...font.h1 },
  spacer: { width: 90 },
  scroll: { paddingBottom: 32 },
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
  avatar: { width: 44, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 17, fontWeight: '800' },
  name: { ...font.title, fontWeight: '800' },
  handle: { fontSize: 13, color: colors.textMuted },
  follow: { backgroundColor: colors.accent, borderRadius: radius.pill, paddingHorizontal: 20, paddingVertical: 10, minHeight: 40, justifyContent: 'center' },
  followOn: { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border },
  followText: { color: colors.onAccent, fontWeight: '800', fontSize: 14 },
  followTextOn: { color: colors.text },
});
