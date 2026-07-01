import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  useFeedRepository,
  useGroupRepository,
  useNotificationRepository,
} from '@/core/di/repositories-context';
import type { FeedItem } from '@/domain/entities/feed';
import type { GroupMember } from '@/domain/entities/group';
import { currentStreak, localDayKey, perfectDays } from '@/domain/usecases/streak';
import { avatarColor, initial, timeAgo } from '@/ui/format';
import { ScreenState } from '@/ui/screen-state';
import { colors, font, radius } from '@/ui/theme';

/** Écran Groupe : présence du jour vivante + entraide + streak collectif. */
export function GroupScreen({
  groupId,
  userId,
  onBack,
  onChangeGroup,
  onOpenProfile,
}: {
  groupId: string;
  userId: string;
  onBack: () => void;
  onChangeGroup: () => void;
  onOpenProfile: (id: string, name: string) => void;
}) {
  const groupRepo = useGroupRepository();
  const feedRepo = useFeedRepository();
  const notif = useNotificationRepository();
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [nudged, setNudged] = useState<Set<string>>(new Set());
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
      const [m, f] = await Promise.all([
        groupRepo.listMembers(groupId),
        feedRepo.listGroupFeed(groupId),
      ]);
      if (mounted.current) {
        setMembers(m);
        setItems(f);
        setError(null);
      }
    } catch (e) {
      if (mounted.current) setError((e as Error).message);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [groupRepo, feedRepo, groupId]);

  useEffect(() => {
    load();
  }, [load]);

  const tz = -new Date().getTimezoneOffset();
  const todayKey = localDayKey(new Date().toISOString(), tz);

  const loggedToday = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) {
      if (localDayKey(it.createdAt, tz) === todayKey) set.add(it.authorId);
    }
    return set;
  }, [items, tz, todayKey]);

  const lastByAuthor = useMemo(() => {
    const map = new Map<string, FeedItem>();
    for (const it of items) if (!map.has(it.authorId)) map.set(it.authorId, it);
    return map;
  }, [items]);

  const groupStreak = useMemo(() => {
    const byDay = new Map<string, Set<string>>();
    for (const it of items) {
      const key = localDayKey(it.createdAt, tz);
      const s = byDay.get(key) ?? new Set<string>();
      s.add(it.authorId);
      byDay.set(key, s);
    }
    return currentStreak(perfectDays(members.map((m) => m.id), byDay), todayKey);
  }, [items, members, tz, todayKey]);

  const perfectCount = members.filter((m) => loggedToday.has(m.id)).length;

  async function nudge(memberId: string) {
    try {
      await notif.nudge(memberId, groupId);
      if (mounted.current) setNudged((prev) => new Set(prev).add(memberId));
    } catch (e) {
      if (mounted.current) setError((e as Error).message);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Pressable onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 8, right: 16 }}>
          <Text style={styles.back}>‹ Retour</Text>
        </Pressable>
        <Text style={styles.title}>Ton groupe</Text>
        <Pressable onPress={onChangeGroup} hitSlop={{ top: 12, bottom: 12, left: 16, right: 8 }}>
          <Text style={styles.link}>Changer</Text>
        </Pressable>
      </View>

      <ScreenState loading={loading} error={error} hasData={members.length > 0} onRetry={load}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.card}>
            <View style={styles.between}>
              <View>
                <Text style={styles.bigStat}>
                  <Text style={styles.flame}>🔥 {groupStreak}</Text>
                </Text>
                <Text style={styles.label}>Jours de streak groupe</Text>
              </View>
              <View style={styles.alignEnd}>
                <Text style={styles.bigStat}>
                  {perfectCount}
                  <Text style={styles.muted}>/{members.length}</Text>
                </Text>
                <Text style={styles.label}>Journée parfaite</Text>
              </View>
            </View>
          </View>

          <View style={styles.quest}>
            <View style={styles.questHead}>
              <Text style={styles.questLabel}>Quête d'entraide</Text>
              <View style={styles.soon}>
                <Text style={styles.soonText}>Bientôt</Text>
              </View>
            </View>
            <Text style={styles.questTitle}>Aide un ami à débloquer un palier</Text>
            <Text style={styles.questSub}>
              Lance une quête (« aider Léa à passer 15 tractions ») — l'ami progresse, et toi tu
              gagnes de l'XP de mentor.
            </Text>
          </View>

          <Text style={styles.section}>Membres · aujourd'hui</Text>
          <View style={styles.card}>
            {members.map((m, i) => {
              const done = loggedToday.has(m.id);
              const isMe = m.id === userId || m.id === 'local-user';
              const av = avatarColor(m.id);
              const last = lastByAuthor.get(m.id);
              return (
                <Pressable
                  key={m.id}
                  onPress={() => onOpenProfile(m.id, m.pseudo)}
                  style={[styles.member, i === members.length - 1 && styles.memberLast]}
                >
                  <View style={[styles.avatar, { backgroundColor: av.bg }]}>
                    <Text style={[styles.avatarText, { color: av.fg }]}>{initial(m.pseudo)}</Text>
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{isMe ? 'Moi' : m.pseudo}</Text>
                    {done && last ? (
                      <Text style={styles.memberSub} numberOfLines={1}>
                        {last.summary} · {timeAgo(last.createdAt)}
                      </Text>
                    ) : (
                      <Text style={styles.memberSubFaint}>pas encore aujourd'hui</Text>
                    )}
                  </View>
                  {done ? (
                    <Text style={styles.done}>✓</Text>
                  ) : isMe ? null : nudged.has(m.id) ? (
                    <Text style={styles.sent}>✨ envoyé</Text>
                  ) : (
                    <Pressable style={styles.miniCta} onPress={() => nudge(m.id)} hitSlop={8}>
                      <Text style={styles.miniCtaText}>💪 Encourager</Text>
                    </Pressable>
                  )}
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </ScreenState>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 8,
  },
  back: { fontSize: 15, color: colors.accent, fontWeight: '700', width: 70 },
  title: { ...font.h1 },
  link: { fontSize: 14, color: colors.textMuted, fontWeight: '700', width: 70, textAlign: 'right' },
  scroll: { paddingBottom: 32, gap: 12 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 16 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  alignEnd: { alignItems: 'flex-end' },
  label: { ...font.label, marginTop: 4 },
  bigStat: { fontSize: 30, fontWeight: '800', color: colors.text },
  flame: { color: colors.accent },
  muted: { color: colors.textMuted, fontSize: 18, fontWeight: '700' },
  quest: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 16,
    gap: 6,
  },
  questHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  questLabel: { ...font.label, color: colors.textMuted },
  soon: { backgroundColor: colors.surfaceElevated, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  soonText: { fontSize: 10, fontWeight: '700', color: colors.textFaint, letterSpacing: 1 },
  questTitle: { ...font.title, marginTop: 2 },
  questSub: { fontSize: 13, color: colors.textMuted, lineHeight: 19 },
  section: { ...font.label, marginTop: 8 },
  member: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  memberLast: { borderBottomWidth: 0 },
  avatar: { width: 38, height: 38, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '800' },
  memberInfo: { flex: 1, gap: 2 },
  memberName: { ...font.title },
  memberSub: { fontSize: 13, color: colors.textMuted },
  memberSubFaint: { fontSize: 13, color: colors.textFaint },
  done: { color: colors.success, fontSize: 18, fontWeight: '800' },
  sent: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  miniCta: { backgroundColor: colors.accentSoft, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 11, minHeight: 44, justifyContent: 'center' },
  miniCtaText: { color: colors.accent, fontWeight: '700', fontSize: 13 },
});
