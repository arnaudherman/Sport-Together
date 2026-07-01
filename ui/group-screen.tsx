import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  useFeedRepository,
  useGroupRepository,
  useNotificationRepository,
} from '@/core/di/repositories-context';
import type { FeedItem } from '@/domain/entities/feed';
import type { GroupMember } from '@/domain/entities/group';
import { currentStreak, localDayKey } from '@/domain/usecases/streak';
import { avatarColor, initial, timeAgo } from '@/ui/format';
import { ScreenHeader } from '@/ui/screen-header';
import { ScreenState } from '@/ui/screen-state';
import { colors, font, radius } from '@/ui/theme';
import { useAsyncData } from '@/ui/use-async-data';

/** Écran Groupe : présence du jour vivante + entraide + streak collectif. */
export function GroupScreen({
  groupId,
  userId,
  onBack,
  onOpenProfile,
  onLeft,
}: {
  groupId: string;
  userId: string;
  onBack: () => void;
  onOpenProfile: (id: string, name: string) => void;
  /** Appelé après avoir quitté le groupe (recharger la liste + revenir en arrière). */
  onLeft: () => void;
}) {
  const groupRepo = useGroupRepository();
  const feedRepo = useFeedRepository();
  const notif = useNotificationRepository();
  const [nudged, setNudged] = useState<Set<string>>(new Set());

  const loader = useCallback(async () => {
    const [members, items] = await Promise.all([
      groupRepo.listMembers(groupId),
      feedRepo.listGroupFeed(groupId),
    ]);
    return { members, items };
  }, [groupRepo, feedRepo, groupId]);
  const { data, loading, error, setError, reload, mounted } = useAsyncData(loader, {
    members: [] as GroupMember[],
    items: [] as FeedItem[],
  });
  const { members, items } = data;

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

  // Streak = jours consécutifs où le groupe a de l'activité (≥ 1 membre a loggé) —
  // motivant et atteignable, vs « tout le monde chaque jour » qui reste collé à 0.
  const groupStreak = useMemo(() => {
    const activeDays = new Set<string>();
    for (const it of items) activeDays.add(localDayKey(it.createdAt, tz));
    return currentStreak(activeDays, todayKey);
  }, [items, tz, todayKey]);

  const perfectCount = members.filter((m) => loggedToday.has(m.id)).length;

  async function nudge(memberId: string) {
    try {
      await notif.nudge(memberId, groupId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (mounted.current) setNudged((prev) => new Set(prev).add(memberId));
    } catch (e) {
      if (mounted.current) setError((e as Error).message);
    }
  }

  function confirmLeave() {
    Alert.alert('Quitter ce groupe ?', 'Tu ne verras plus son activité. Tu pourras revenir avec un code d\'invitation.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Quitter',
        style: 'destructive',
        onPress: async () => {
          try {
            await groupRepo.leaveGroup(groupId);
            onLeft();
          } catch (e) {
            if (mounted.current) setError((e as Error).message);
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Ton groupe" onBack={onBack} />

      <ScreenState loading={loading} error={error} hasData={members.length > 0} onRetry={reload}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <LinearGradient
            colors={['#2c1d12', '#191411']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.between}>
              <View>
                <View style={styles.streakRow}>
                  <Ionicons name="flame" size={26} color={colors.accent} />
                  <Text style={styles.bigStat}>{groupStreak}</Text>
                </View>
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
          </LinearGradient>

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
              const isMe = m.id === userId;
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
                    <Ionicons name="checkmark-circle" size={24} color={colors.success} />
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

          <Pressable
            style={({ pressed }) => [styles.leave, pressed && styles.pressed]}
            onPress={confirmLeave}
            accessibilityRole="button"
            accessibilityLabel="Quitter le groupe"
          >
            <Ionicons name="exit-outline" size={17} color={colors.danger} />
            <Text style={styles.leaveText}>Quitter le groupe</Text>
          </Pressable>
        </ScrollView>
      </ScreenState>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16 },
  leave: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
    paddingVertical: 13,
    minHeight: 44,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  leaveText: { color: colors.danger, fontWeight: '800', fontSize: 15 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  link: { fontSize: 14, color: colors.textMuted, fontWeight: '700', width: 70, textAlign: 'right' },
  scroll: { paddingBottom: 32, gap: 12 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 16 },
  heroCard: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 18 },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  alignEnd: { alignItems: 'flex-end' },
  label: { ...font.label, marginTop: 4 },
  bigStat: { ...font.stat },
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
  soonText: { fontSize: 10, fontWeight: '700', color: colors.textMuted, letterSpacing: 1 },
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
  sent: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  miniCta: { backgroundColor: colors.accentSoft, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 11, minHeight: 44, justifyContent: 'center' },
  miniCtaText: { color: colors.accent, fontWeight: '700', fontSize: 13 },
});
