import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useFeedRepository } from '@/core/di/repositories-context';
import type { FeedItem } from '@/domain/entities/feed';
import { levelForXp, xpFromFeed } from '@/domain/usecases/gamification';
import { skillRadar } from '@/domain/usecases/skill-radar';
import { localDayKey, previousDayKey, streakFromFeed } from '@/domain/usecases/streak';
import { avatarColor, initial, timeAgo } from '@/ui/format';
import { RadarChart } from '@/ui/radar-chart';
import { ScreenState } from '@/ui/screen-state';
import { colors, font, radius } from '@/ui/theme';

const TYPE_LABEL: Record<FeedItem['type'], string> = { session: 'Séance', steps: 'Pas', meal: 'Repas' };
const HEAT_DAYS = 91;

/** Profil d'un membre : stats, assiduité, activité + « Suivre » (hybride). */
export function ProfileScreen({
  groupId,
  targetUserId,
  targetName,
  currentUserId,
  onBack,
}: {
  groupId: string;
  targetUserId: string;
  targetName: string;
  currentUserId: string;
  onBack: () => void;
}) {
  const feedRepo = useFeedRepository();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [following, setFollowing] = useState(false);
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
      const data = await feedRepo.listGroupFeed(groupId);
      if (mounted.current) {
        setItems(data.filter((it) => it.authorId === targetUserId));
        setError(null);
      }
    } catch (e) {
      if (mounted.current) setError((e as Error).message);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [feedRepo, groupId, targetUserId]);

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

  const heat = useMemo(() => {
    const counts = new Map<string, number>();
    for (const it of items) {
      const key = localDayKey(it.createdAt, tz);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const cells: number[] = [];
    let key = localDayKey(new Date().toISOString(), tz);
    for (let i = 0; i < HEAT_DAYS; i += 1) {
      cells.push(counts.get(key) ?? 0);
      key = previousDayKey(key);
    }
    return cells.reverse();
  }, [items, tz]);

  const radar = useMemo(() => skillRadar(items, targetUserId, tz), [items, targetUserId, tz]);

  const av = avatarColor(targetUserId);
  const isMe = targetUserId === currentUserId || targetUserId === 'local-user';
  const recent = items.slice(0, 6);

  function heatColor(n: number): string {
    if (n <= 0) return colors.track;
    if (n === 1) return 'rgba(240,101,47,.35)';
    if (n === 2) return 'rgba(240,101,47,.65)';
    return colors.accent;
  }

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
            <Text style={[styles.avatarText, { color: av.fg }]}>{initial(targetName)}</Text>
          </View>
          {!isMe ? (
            <Pressable
              style={[styles.follow, following && styles.followOn]}
              onPress={() => setFollowing((f) => !f)}
            >
              <Ionicons
                name={following ? 'checkmark' : 'add'}
                size={16}
                color={following ? colors.text : '#0B0B0D'}
              />
              <Text style={[styles.followText, following && styles.followTextOn]}>
                {following ? 'Suivi' : 'Suivre'}
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.nameRow}>
          <Text style={styles.name}>{isMe ? 'Moi' : targetName}</Text>
          <View style={styles.levelPill}>
            <Text style={styles.levelText}>Niveau {level}</Text>
          </View>
        </View>
        {!isMe ? <Text style={styles.followHint}>Suivre au-delà du groupe — bientôt persistant.</Text> : null}

        <View style={styles.statGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{items.length}</Text>
            <Text style={styles.statLabel}>Goals</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{xp}</Text>
            <Text style={styles.statLabel}>XP total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>🔥 {streak}</Text>
            <Text style={styles.statLabel}>Série (j)</Text>
          </View>
        </View>

        <Text style={styles.section}>Compétences · 30 j</Text>
        <View style={styles.radarCard}>
          <RadarChart axes={radar} size={240} />
        </View>

        <Text style={styles.section}>Assiduité · 90 j</Text>
        <View style={styles.card}>
          <View style={styles.heat}>
            {heat.map((n, i) => (
              <View key={i} style={[styles.cell, { backgroundColor: heatColor(n) }]} />
            ))}
          </View>
        </View>

        <Text style={styles.section}>Activité récente</Text>
        {recent.length === 0 ? (
          <Text style={styles.empty}>Rien pour l'instant.</Text>
        ) : (
          <View style={styles.card}>
            {recent.map((it, i) => (
              <View key={it.id} style={[styles.actRow, i === recent.length - 1 && styles.actLast]}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{TYPE_LABEL[it.type]}</Text>
                </View>
                <Text style={styles.actSummary} numberOfLines={1}>{it.summary}</Text>
                <Text style={styles.actTime}>{timeAgo(it.createdAt)}</Text>
              </View>
            ))}
          </View>
        )}
        </ScrollView>
      </ScreenState>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, paddingBottom: 8 },
  backRow: { flexDirection: 'row', alignItems: 'center', width: 80 },
  back: { fontSize: 15, color: colors.accent, fontWeight: '700' },
  title: { ...font.h1 },
  spacer: { width: 80 },
  scroll: { paddingBottom: 32 },
  cover: { height: 110, borderRadius: radius.lg, backgroundColor: '#241a12' },
  headRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: -28, paddingHorizontal: 4 },
  avatar: { width: 64, height: 64, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.bg },
  avatarText: { fontSize: 24, fontWeight: '800' },
  follow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.accent, borderRadius: radius.pill, paddingHorizontal: 20, paddingVertical: 12, minHeight: 44, justifyContent: 'center', marginBottom: 4 },
  followOn: { backgroundColor: colors.surfaceElevated },
  followText: { color: '#0B0B0D', fontWeight: '800' },
  followTextOn: { color: colors.text },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingHorizontal: 4 },
  name: { ...font.h1 },
  levelPill: { backgroundColor: colors.surfaceElevated, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  levelText: { fontSize: 12, fontWeight: '700', color: colors.text },
  followHint: { fontSize: 12, color: colors.textFaint, marginTop: 6, paddingHorizontal: 4 },
  statGrid: { flexDirection: 'row', gap: 10, marginTop: 16 },
  statCard: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 14, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.text },
  statLabel: { ...font.label, marginTop: 4 },
  section: { ...font.label, marginTop: 20, marginBottom: 10 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 14 },
  radarCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 14, alignItems: 'center' },
  heat: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  cell: { width: 18, height: 18, borderRadius: 4 },
  actRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border },
  actLast: { borderBottomWidth: 0 },
  badge: { backgroundColor: colors.surfaceElevated, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
  actSummary: { ...font.body, flex: 1 },
  actTime: { fontSize: 12, color: colors.textFaint },
  empty: { color: colors.textMuted, textAlign: 'center' },
});
