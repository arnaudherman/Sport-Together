import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useFeedRepository } from '@/core/di/repositories-context';
import { EMPTY_REACTIONS, type FeedItem } from '@/domain/entities/feed';
import { levelForXp, xpFromFeed } from '@/domain/usecases/gamification';
import { MUSCU_GRAPH, sessionsUnlocked } from '@/domain/usecases/skill-graph';
import { streakFromFeed } from '@/domain/usecases/streak';
import { avatarColor, handle, initial } from '@/ui/format';
import { FeedItemCard } from '@/ui/feed-item-card';
import { HolyGraph } from '@/ui/holy-graph';
import { ScreenState } from '@/ui/screen-state';
import { colors, font, radius } from '@/ui/theme';

type Tab = 'publications' | 'competences' | 'medias';

/** Profil type Twitter : fil de posts + arbre de compétences (holy graph). */
export function ProfileScreen({
  targetUserId,
  targetName,
  currentUserId,
  groups,
  onBack,
  onOpenGroup,
  onJoinGroup,
}: {
  targetUserId: string;
  targetName: string;
  currentUserId: string;
  groups: { id: string; name: string }[];
  onBack: () => void;
  onOpenGroup: (id: string) => void;
  onJoinGroup: () => void;
}) {
  const feedRepo = useFeedRepository();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [following, setFollowing] = useState(false);
  const [tab, setTab] = useState<Tab>('publications');
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
      const data = await feedRepo.listHomeFeed();
      if (mounted.current) {
        setItems(data.filter((it) => it.authorId === targetUserId));
        setError(null);
      }
    } catch (e) {
      if (mounted.current) setError((e as Error).message);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [feedRepo, targetUserId]);

  useEffect(() => {
    load();
  }, [load]);

  const tz = -new Date().getTimezoneOffset();
  const xp = useMemo(() => xpFromFeed(items, targetUserId), [items, targetUserId]);
  const level = levelForXp(xp);
  const streak = useMemo(
    () => streakFromFeed(items, targetUserId, tz, new Date().toISOString()),
    [items, targetUserId, tz],
  );
  const unlocked = useMemo(() => sessionsUnlocked(items, targetUserId), [items, targetUserId]);
  const bravos = useMemo(() => {
    let n = 0;
    for (const it of items) {
      const r = it.reactions ?? EMPTY_REACTIONS;
      n += r.kudos + r.encouragement;
    }
    return n;
  }, [items]);

  const av = avatarColor(targetUserId);
  const isMe = targetUserId === currentUserId || targetUserId === 'local-user';
  const name = isMe ? 'Moi' : targetName;

  const TABS: { key: Tab; label: string }[] = [
    { key: 'publications', label: 'Publications' },
    { key: 'competences', label: 'Compétences' },
    { key: 'medias', label: 'Médias' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Pressable onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 8, right: 16 }} style={styles.backRow}>
          <Ionicons name="chevron-back" size={20} color={colors.accent} />
          <Text style={styles.back}>Retour</Text>
        </Pressable>
        <Text style={styles.title}>Profil</Text>
        <View style={styles.spacer} />
      </View>

      <ScreenState loading={loading} error={error} hasData={items.length > 0} onRetry={load}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <LinearGradient
            colors={['#1a2733', '#3b4a3a', '#6b4a2a', '#241a12']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cover}
          />
          <View style={styles.headRow}>
            <View style={[styles.avatar, { backgroundColor: av.bg }]}>
              <Text style={[styles.avatarText, { color: av.fg }]}>{initial(name)}</Text>
            </View>
            {!isMe ? (
              <Pressable
                style={[styles.follow, following && styles.followOn]}
                onPress={() => setFollowing((f) => !f)}
              >
                <Ionicons name={following ? 'checkmark' : 'add'} size={16} color={following ? colors.text : '#0B0B0D'} />
                <Text style={[styles.followText, following && styles.followTextOn]}>
                  {following ? 'Suivi' : 'Suivre'}
                </Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.nameRow}>
            <Text style={styles.name}>{name}</Text>
            <View style={styles.levelPill}>
              <Text style={styles.levelText}>Niveau {level}</Text>
            </View>
          </View>
          <View style={styles.handleRow}>
            <Text style={styles.handle}>{handle(name)}</Text>
            {streak > 0 ? (
              <>
                <Text style={styles.dot}>·</Text>
                <Ionicons name="flame" size={13} color={colors.accent} />
                <Text style={styles.streak}>{streak} jours</Text>
              </>
            ) : null}
          </View>
          <Text style={styles.bio}>🏋️ On progresse ensemble, un palier à la fois.</Text>
          <View style={styles.stats}>
            <Text style={styles.statText}><Text style={styles.statNum}>{items.length}</Text> publications</Text>
            <Text style={styles.statText}><Text style={styles.statNum}>{bravos}</Text> bravos</Text>
            <Text style={styles.statText}><Text style={styles.statNum}>{xp}</Text> XP</Text>
          </View>

          <View style={styles.grp}>
            <Text style={styles.grpLabel}>Groupes</Text>
            {groups.map((g) => (
              <Pressable key={g.id} onPress={() => onOpenGroup(g.id)} style={styles.gcard}>
                <Text style={styles.gcardText}>🔒 {g.name}</Text>
              </Pressable>
            ))}
            <Pressable onPress={onJoinGroup} style={[styles.gcard, styles.gcardAdd]}>
              <Text style={styles.gcardAddText}>＋ Rejoindre</Text>
            </Pressable>
          </View>

          <View style={styles.tabs}>
            {TABS.map((t) => (
              <Pressable key={t.key} onPress={() => setTab(t.key)} style={styles.tab}>
                <Text style={[styles.tabText, tab === t.key && styles.tabTextOn]}>{t.label}</Text>
                {tab === t.key ? <View style={styles.tabUnderline} /> : null}
              </Pressable>
            ))}
          </View>

          {tab === 'publications' ? (
            items.length === 0 ? (
              <Text style={styles.empty}>Aucune publication.</Text>
            ) : (
              <View style={styles.posts}>
                {items.map((it) => (
                  <FeedItemCard key={it.id} item={it} />
                ))}
              </View>
            )
          ) : tab === 'competences' ? (
            <View style={styles.graphWrap}>
              <Text style={styles.graphSum}>
                <Text style={styles.accent}>{unlocked}</Text>
                <Text style={styles.muted}>/{MUSCU_GRAPH.nodes.length}</Text> paliers · arbre Corps
              </Text>
              <HolyGraph graph={MUSCU_GRAPH} unlocked={unlocked} />
            </View>
          ) : (
            <Text style={styles.empty}>Photos-preuves à venir 📷</Text>
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
  scroll: { paddingBottom: 40 },
  cover: { height: 116, borderRadius: radius.lg },
  headRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: -32, paddingHorizontal: 4 },
  avatar: { width: 72, height: 72, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.bg },
  avatarText: { fontSize: 27, fontWeight: '800' },
  follow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.accent, borderRadius: radius.pill, paddingHorizontal: 20, paddingVertical: 11, minHeight: 44, justifyContent: 'center', marginBottom: 4 },
  followOn: { backgroundColor: colors.surfaceElevated },
  followText: { color: '#0B0B0D', fontWeight: '800' },
  followTextOn: { color: colors.text },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingHorizontal: 4 },
  name: { ...font.h1 },
  levelPill: { backgroundColor: colors.surfaceElevated, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  levelText: { fontSize: 12, fontWeight: '700', color: colors.text },
  handleRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3, paddingHorizontal: 4 },
  handle: { fontSize: 14, color: colors.textMuted },
  dot: { color: colors.textMuted },
  streak: { fontSize: 14, color: colors.accent, fontWeight: '700' },
  bio: { ...font.body, marginTop: 8, paddingHorizontal: 4 },
  stats: { flexDirection: 'row', gap: 16, marginTop: 10, paddingHorizontal: 4 },
  statText: { fontSize: 13, color: colors.textMuted },
  statNum: { color: colors.text, fontWeight: '800' },
  grp: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 12, paddingHorizontal: 4 },
  grpLabel: { ...font.label, marginRight: 2 },
  gcard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 },
  gcardText: { fontSize: 13, fontWeight: '700', color: colors.text },
  gcardAdd: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  gcardAddText: { fontSize: 13, fontWeight: '700', color: colors.accent },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, marginTop: 16 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabText: { fontSize: 14, fontWeight: '700', color: colors.textMuted },
  tabTextOn: { color: colors.text },
  tabUnderline: { position: 'absolute', bottom: -1, height: 3, width: 40, borderRadius: 3, backgroundColor: colors.accent },
  posts: { gap: 12, marginTop: 14 },
  graphWrap: { alignItems: 'center', marginTop: 14 },
  graphSum: { ...font.body, color: colors.textMuted, marginBottom: 6 },
  accent: { color: colors.accent, fontWeight: '800' },
  muted: { color: colors.textMuted },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 30 },
});
