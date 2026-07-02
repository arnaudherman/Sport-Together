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
import { isPerfectDay } from '@/domain/usecases/perfect-day';
import { currentStreak, localDayKey, perfectDays, previousDayKey } from '@/domain/usecases/streak';
import { timeAgo } from '@/ui/format';
import { Avatar } from '@/ui/avatar';
import { InviteCodeActions } from '@/ui/invite-code-actions';
import { ScreenHeader } from '@/ui/screen-header';
import { ScreenState } from '@/ui/screen-state';
import { cardShadow, colors, font, gradients, radius } from '@/ui/theme';
import { useAsyncData } from '@/ui/use-async-data';

/** Écran Groupe : présence du jour vivante + entraide + streak collectif. */
export function GroupScreen({
  groupId,
  groupName,
  visibility,
  isCreator,
  userId,
  onBack,
  onOpenProfile,
  onLeft,
  onChanged,
}: {
  groupId: string;
  groupName: string;
  visibility?: 'private' | 'public';
  /** Créateur = droits de gestion (renommer, régénérer le code, supprimer). */
  isCreator: boolean;
  userId: string;
  onBack: () => void;
  onOpenProfile: (id: string, name: string) => void;
  /** Appelé après avoir quitté OU supprimé le groupe (recharger + revenir). */
  onLeft: () => void;
  /** Appelé après un changement de méta (renommage) pour rafraîchir la liste. */
  onChanged: () => void;
}) {
  const groupRepo = useGroupRepository();
  const feedRepo = useFeedRepository();
  const notif = useNotificationRepository();
  const [nudged, setNudged] = useState<Set<string>>(new Set());
  const [invite, setInvite] = useState<string | null>(null);

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
  const todayItems = useMemo(
    () => items.filter((it) => localDayKey(it.createdAt, tz) === todayKey),
    [items, tz, todayKey],
  );
  const perfectToday = isPerfectDay(members.map((m) => m.id), todayItems);

  // 7 derniers jours : lesquels ont été « parfaits » (tous les membres ont participé) ?
  const weekPerfect = useMemo(() => {
    const byDay = new Map<string, Set<string>>();
    for (const it of items) {
      const key = localDayKey(it.createdAt, tz);
      const s = byDay.get(key) ?? new Set<string>();
      s.add(it.authorId);
      byDay.set(key, s);
    }
    const perfect = perfectDays(members.map((m) => m.id), byDay);
    const days: { key: string; perfect: boolean }[] = [];
    let cursor = todayKey;
    for (let i = 0; i < 7; i += 1) {
      days.unshift({ key: cursor, perfect: perfect.has(cursor) });
      cursor = previousDayKey(cursor);
    }
    return days;
  }, [items, members, tz, todayKey]);

  async function nudge(memberId: string) {
    try {
      await notif.nudge(memberId, groupId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (mounted.current) setNudged((prev) => new Set(prev).add(memberId));
    } catch (e) {
      if (mounted.current) setError((e as Error).message);
    }
  }

  async function showInvite() {
    try {
      setInvite(await groupRepo.getInvite(groupId));
    } catch (e) {
      if (mounted.current) setError((e as Error).message);
    }
  }

  async function rotateInvite() {
    try {
      setInvite(await groupRepo.rotateInviteCode(groupId));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {
      if (mounted.current) setError((e as Error).message);
    }
  }

  async function toggleVisibility() {
    try {
      await groupRepo.setVisibility(groupId, visibility === 'public' ? 'private' : 'public');
      onChanged();
    } catch (e) {
      if (mounted.current) setError((e as Error).message);
    }
  }

  function promptRename() {
    // Alert.prompt est iOS-only — assumé (iOS-first, ADR-0003).
    Alert.prompt('Renommer le groupe', undefined, async (name) => {
      const value = (name ?? '').trim();
      if (!value) return;
      try {
        await groupRepo.renameGroup(groupId, value);
        onChanged();
      } catch (e) {
        if (mounted.current) setError((e as Error).message);
      }
    });
  }

  function confirmDeleteGroup() {
    Alert.alert('Supprimer ce groupe ?', 'Tout son fil et ses appartenances seront supprimés pour tous les membres. Irréversible.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Vraiment sûr ?', `« ${groupName} » sera définitivement supprimé.`, [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Supprimer définitivement',
              style: 'destructive',
              onPress: async () => {
                try {
                  await groupRepo.deleteGroup(groupId);
                  onLeft();
                } catch (e) {
                  if (mounted.current) setError((e as Error).message);
                }
              },
            },
          ]),
      },
    ]);
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
      <ScreenHeader title={groupName || 'Ton groupe'} onBack={onBack} />

      <ScreenState loading={loading} error={error} hasData={members.length > 0} onRetry={reload}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <LinearGradient
            colors={gradients.panel}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.6, y: 1 }}
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

            {perfectToday ? (
              <View style={styles.perfectBanner}>
                <Text style={styles.perfectText}>✨ Journée parfaite — tout le monde a participé !</Text>
              </View>
            ) : null}

            <View style={styles.weekRow} accessibilityLabel="Journées parfaites des 7 derniers jours">
              {weekPerfect.map((d) => (
                <Ionicons
                  key={d.key}
                  name={d.perfect ? 'star' : 'star-outline'}
                  size={16}
                  color={d.perfect ? colors.gold : colors.textFaint}
                />
              ))}
              <Text style={styles.weekLabel}>7 derniers jours</Text>
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
              const last = lastByAuthor.get(m.id);
              return (
                <Pressable
                  key={m.id}
                  onPress={() => onOpenProfile(m.id, m.pseudo)}
                  style={[styles.member, i === members.length - 1 && styles.memberLast]}
                >
                  <Avatar name={m.pseudo} seed={m.id} size={38} url={m.avatarUrl} />
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

          <View style={styles.inviteCard}>
            <Text style={styles.section}>Inviter des amis</Text>
            {invite ? (
              <>
                <InviteCodeActions code={invite} />
                {isCreator ? (
                  <Pressable onPress={rotateInvite} hitSlop={8} accessibilityRole="button" accessibilityLabel="Régénérer le code">
                    <Text style={styles.manageLink}>↻ Régénérer le code (invalide l&apos;ancien)</Text>
                  </Pressable>
                ) : null}
              </>
            ) : (
              <Pressable
                style={({ pressed }) => [styles.inviteBtn, pressed && styles.pressed]}
                onPress={showInvite}
                accessibilityRole="button"
                accessibilityLabel="Afficher le code d'invitation"
              >
                <Ionicons name="person-add-outline" size={17} color={colors.accent} />
                <Text style={styles.inviteBtnText}>Afficher le code d&apos;invitation</Text>
              </Pressable>
            )}
          </View>

          {isCreator ? (
            <>
              <Pressable onPress={promptRename} hitSlop={8} accessibilityRole="button" accessibilityLabel="Renommer le groupe">
                <Text style={styles.manageLink}>✏️ Renommer le groupe</Text>
              </Pressable>
              <Pressable onPress={toggleVisibility} hitSlop={8} accessibilityRole="button" accessibilityLabel="Changer la visibilité du groupe">
                <Text style={styles.manageLink}>
                  {visibility === 'public' ? '🔒 Repasser le groupe en privé' : '🌍 Rendre le groupe public (annuaire)'}
                </Text>
              </Pressable>
            </>
          ) : null}

          <Pressable
            style={({ pressed }) => [styles.leave, pressed && styles.pressed]}
            onPress={isCreator ? confirmDeleteGroup : confirmLeave}
            accessibilityRole="button"
            accessibilityLabel={isCreator ? 'Supprimer le groupe' : 'Quitter le groupe'}
          >
            <Ionicons name={isCreator ? 'trash-outline' : 'exit-outline'} size={17} color={colors.danger} />
            <Text style={styles.leaveText}>{isCreator ? 'Supprimer le groupe' : 'Quitter le groupe'}</Text>
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
    
  },
  leaveText: { color: colors.danger, fontWeight: '800', fontSize: 15 },
  inviteCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, gap: 12, marginTop: 18, ...cardShadow },
  inviteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, minHeight: 44, borderRadius: radius.pill, backgroundColor: colors.accentSoft },
  inviteBtnText: { color: colors.accent, fontWeight: '800', fontSize: 15 },
  manageLink: { color: colors.textMuted, fontWeight: '700', fontSize: 14, textAlign: 'center', paddingVertical: 10 },
  perfectBanner: { backgroundColor: colors.accentSoft, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 8, marginTop: 12 },
  perfectText: { color: colors.accent, fontWeight: '700', fontSize: 13 },
  weekRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  weekLabel: { ...font.label, marginLeft: 6 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  link: { fontSize: 14, color: colors.textMuted, fontWeight: '700', width: 70, textAlign: 'right' },
  scroll: { paddingBottom: 32, gap: 12 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, ...cardShadow },
  heroCard: { borderRadius: radius.lg, padding: 18, ...cardShadow },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  alignEnd: { alignItems: 'flex-end' },
  label: { ...font.label, marginTop: 4 },
  bigStat: { ...font.stat },
  muted: { color: colors.textMuted, fontSize: 18, fontWeight: '700' },
  quest: {
    backgroundColor: colors.surface,
    
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
