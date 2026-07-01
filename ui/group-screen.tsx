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
import { avatarColor, initial } from '@/ui/format';
import { colors, font, radius } from '@/ui/theme';

/** Écran Groupe : présence du jour + entraide (encourager) + streak collectif. */
export function GroupScreen({
  groupId,
  userId,
  onBack,
  onChangeGroup,
}: {
  groupId: string;
  userId: string;
  onBack: () => void;
  onChangeGroup: () => void;
}) {
  const groupRepo = useGroupRepository();
  const feedRepo = useFeedRepository();
  const notif = useNotificationRepository();
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [nudged, setNudged] = useState<Set<string>>(new Set());
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
        <Pressable onPress={onBack} hitSlop={8}>
          <Text style={styles.back}>‹ Retour</Text>
        </Pressable>
        <Text style={styles.title}>Ton groupe</Text>
        <Pressable onPress={onChangeGroup} hitSlop={8}>
          <Text style={styles.link}>Changer</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <View style={styles.between}>
            <View>
              <Text style={styles.label}>Streak de groupe</Text>
              <Text style={styles.bigStat}>
                <Text style={styles.flame}>🔥 {groupStreak}</Text> j
              </Text>
            </View>
            <View style={styles.alignEnd}>
              <Text style={styles.label}>Journée parfaite</Text>
              <Text style={styles.bigStat}>
                {perfectCount}
                <Text style={styles.muted}>/{members.length}</Text>
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.quest}>
          <Text style={styles.questLabel}>Quête d'entraide</Text>
          <Text style={styles.questTitle}>Aide un ami à débloquer un palier</Text>
          <Text style={styles.questSub}>
            Bientôt : lance une quête (« aider Léa à passer 15 tractions ») — l'ami progresse,
            et toi tu gagnes de l'XP de mentor.
          </Text>
        </View>

        <Text style={styles.section}>Membres · aujourd'hui</Text>
        <View style={styles.card}>
          {members.map((m, i) => {
            const done = loggedToday.has(m.id);
            const isMe = m.id === userId || m.id === 'local-user';
            const av = avatarColor(m.id);
            return (
              <View key={m.id} style={[styles.member, i === members.length - 1 && styles.memberLast]}>
                <View style={[styles.avatar, { backgroundColor: av.bg }]}>
                  <Text style={[styles.avatarText, { color: av.fg }]}>{initial(m.pseudo)}</Text>
                </View>
                <Text style={styles.memberName}>{isMe ? 'Moi' : m.pseudo}</Text>
                {done ? (
                  <Text style={styles.done}>✓ loggé</Text>
                ) : isMe ? (
                  <Text style={styles.muted}>pas encore</Text>
                ) : nudged.has(m.id) ? (
                  <Text style={styles.sent}>✨ envoyé</Text>
                ) : (
                  <Pressable style={styles.miniCta} onPress={() => nudge(m.id)}>
                    <Text style={styles.miniCtaText}>💪 Encourager</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
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
  link: { fontSize: 14, color: colors.accent, fontWeight: '700', width: 70, textAlign: 'right' },
  scroll: { paddingBottom: 32, gap: 12 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 16 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  alignEnd: { alignItems: 'flex-end' },
  label: { ...font.label },
  bigStat: { fontSize: 26, fontWeight: '800', color: colors.text, marginTop: 4 },
  flame: { color: colors.accent },
  muted: { color: colors.textMuted, fontSize: 16, fontWeight: '700' },
  quest: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.lg,
    padding: 16,
    gap: 6,
  },
  questLabel: { ...font.label, color: colors.accent },
  questTitle: { ...font.title, marginTop: 2 },
  questSub: { fontSize: 13, color: colors.textMuted, lineHeight: 19 },
  section: { ...font.label, marginTop: 8 },
  member: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  memberLast: { borderBottomWidth: 0 },
  avatar: { width: 34, height: 34, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: '800' },
  memberName: { ...font.title, flex: 1 },
  done: { color: colors.success, fontSize: 13, fontWeight: '700' },
  sent: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  miniCta: { backgroundColor: colors.accentSoft, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 7 },
  miniCtaText: { color: colors.accent, fontWeight: '700', fontSize: 13 },
  error: { color: '#FCA5A5', fontSize: 14 },
});
