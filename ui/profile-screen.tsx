import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { useFeedRepository, useFollowRepository, useProfileRepository } from '@/core/di/repositories-context';
import { EMPTY_REACTIONS, type FeedItem } from '@/domain/entities/feed';
import type { Profile } from '@/domain/entities/profile';
import { levelForXp, xpBreakdown } from '@/domain/usecases/gamification';
import { streakFromFeed } from '@/domain/usecases/streak';
import { avatarColor, handle, initial } from '@/ui/format';
import { FeedItemCard } from '@/ui/feed-item-card';
import { FollowButton } from '@/ui/follow-button';
import type { FollowListKind } from '@/ui/follow-list-screen';
import { LifeProgress } from '@/ui/life-progress';
import { TrendChart } from '@/ui/trend-chart';
import { ScreenState } from '@/ui/screen-state';
import { colors, font, gradients, radius } from '@/ui/theme';
import { useAsyncData } from '@/ui/use-async-data';

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
  onOpenAccount,
  onOpenComments,
  onOpenFollowList,
}: {
  targetUserId: string;
  targetName: string;
  currentUserId: string;
  groups: { id: string; name: string }[];
  onBack?: () => void;
  onOpenGroup: (id: string) => void;
  onJoinGroup: () => void;
  onOpenAccount: () => void;
  onOpenComments: (item: FeedItem) => void;
  onOpenFollowList: (kind: FollowListKind) => void;
}) {
  const feedRepo = useFeedRepository();
  const profileRepo = useProfileRepository();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tab, setTab] = useState<Tab>('publications');

  const loader = useCallback(() => feedRepo.listUserFeed(targetUserId), [feedRepo, targetUserId]);
  const { data: items, setData: setItems, loading, error, setError, reload, mounted } = useAsyncData<FeedItem[]>(loader, []);

  useEffect(() => {
    profileRepo
      .getProfile(targetUserId)
      .then((p) => {
        if (mounted.current) setProfile(p);
      })
      .catch(() => {});
  }, [profileRepo, targetUserId, mounted]);

  // Compteurs abonnements/abonnés (sur SON profil — la RLS ne montre que les siens).
  const followRepo = useFollowRepository();
  const [counts, setCounts] = useState<{ following: number; followers: number } | null>(null);
  useEffect(() => {
    if (targetUserId !== currentUserId) return;
    Promise.all([followRepo.listFollowing(), followRepo.listFollowers()])
      .then(([following, followers]) => {
        if (mounted.current) setCounts({ following: following.length, followers: followers.length });
      })
      .catch(() => {});
  }, [followRepo, targetUserId, currentUserId, mounted]);

  const tz = -new Date().getTimezoneOffset();
  const xpDetail = useMemo(() => xpBreakdown(items, targetUserId, tz), [items, targetUserId, tz]);
  const xp = xpDetail.total;
  const level = levelForXp(xp);
  const streak = useMemo(
    () => streakFromFeed(items, targetUserId, tz, new Date().toISOString()),
    [items, targetUserId, tz],
  );
  const bravos = useMemo(() => {
    let n = 0;
    for (const it of items) {
      const r = it.reactions ?? EMPTY_REACTIONS;
      n += r.kudos + r.encouragement;
    }
    return n;
  }, [items]);

  const coverUrl = useMemo(() => items.find((i) => i.photoUrl)?.photoUrl, [items]);
  const av = avatarColor(targetUserId);
  const isMe = targetUserId === currentUserId;
  const name = isMe ? 'Moi' : profile?.pseudo ?? targetName;

  function confirmDelete(post: FeedItem) {
    Alert.alert('Supprimer cette publication ?', 'Cette action est définitive.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          const snapshot = items;
          setItems((prev) => prev.filter((i) => i.id !== post.id)); // optimistic
          try {
            await feedRepo.deletePost(post.id);
          } catch (e) {
            if (mounted.current) {
              setItems(snapshot);
              setError((e as Error).message);
            }
          }
        },
      },
    ]);
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'publications', label: 'Publications' },
    { key: 'competences', label: 'Compétences' },
    { key: 'medias', label: 'Médias' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 8, right: 16 }} style={styles.backRow}>
            <Ionicons name="chevron-back" size={20} color={colors.accent} />
            <Text style={styles.back}>Retour</Text>
          </Pressable>
        ) : (
          <View style={styles.backRow} />
        )}
        <Text style={styles.title}>Profil</Text>
        <View style={styles.spacer} />
      </View>

      <ScreenState loading={loading} error={error} hasData={items.length > 0} onRetry={reload}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {coverUrl ? (
            <View style={styles.cover}>
              <Image source={{ uri: coverUrl }} style={styles.coverImg} contentFit="cover" transition={200} />
              <LinearGradient
                colors={['rgba(10,12,16,0.15)', 'rgba(10,12,16,0.9)']}
                style={styles.coverImg}
              />
            </View>
          ) : (
            <LinearGradient
              colors={gradients.panel}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cover}
            />
          )}
          <View style={styles.headRow}>
            <View style={[styles.avatar, { backgroundColor: av.bg }]}>
              <Text style={[styles.avatarText, { color: av.fg }]}>{initial(name)}</Text>
            </View>
            {!isMe ? (
              <FollowButton targetId={targetUserId} targetName={name} onError={setError} />
            ) : (
              <Pressable style={styles.settings} onPress={onOpenAccount} accessibilityRole="button" accessibilityLabel="Compte">
                <Ionicons name="settings-outline" size={16} color={colors.text} />
                <Text style={styles.settingsText}>Compte</Text>
              </Pressable>
            )}
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
          {profile?.bio ? (
            <Text style={styles.bio}>{profile.bio}</Text>
          ) : isMe ? (
            <Pressable onPress={onOpenAccount}>
              <Text style={styles.bioAdd}>＋ Ajoute une bio</Text>
            </Pressable>
          ) : null}
          <View style={styles.heroRow}>
            <View style={styles.hero}>
              <Text style={styles.heroNum}>{items.length}</Text>
              <Text style={styles.heroLabel}>Publications</Text>
            </View>
            <View style={styles.hero}>
              <Text style={[styles.heroNum, styles.heroAccent]}>{streak}</Text>
              <Text style={styles.heroLabel}>Jours de suite</Text>
            </View>
            <View style={styles.hero}>
              <Text style={styles.heroNum}>{xp}</Text>
              <Text style={styles.heroLabel}>XP · {bravos} bravos</Text>
            </View>
          </View>

          <View style={styles.trend}>
            <TrendChart items={items} userId={targetUserId} />
          </View>

          {isMe ? (
            <View style={styles.stats}>
              <Pressable onPress={() => onOpenFollowList('following')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Voir mes abonnements">
                <Text style={styles.statText}><Text style={styles.statNum}>{counts?.following ?? 0}</Text> abonnements</Text>
              </Pressable>
              <Pressable onPress={() => onOpenFollowList('followers')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Voir mes abonnés">
                <Text style={styles.statText}><Text style={styles.statNum}>{counts?.followers ?? 0}</Text> abonnés</Text>
              </Pressable>
            </View>
          ) : null}

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
              <Pressable
                key={t.key}
                onPress={() => setTab(t.key)}
                style={styles.tab}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === t.key }}
                accessibilityLabel={t.label}
              >
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
                  <FeedItemCard
                    key={it.id}
                    item={it}
                    onOpenComments={() => onOpenComments(it)}
                    onShare={() => Share.share({ message: `${it.authorName} sur Sport Together : ${it.summary} 💪` }).catch(() => {})}
                    onDelete={isMe ? () => confirmDelete(it) : undefined}
                    earnedXp={xpDetail.byItem.get(it.id)}
                  />
                ))}
              </View>
            )
          ) : tab === 'competences' ? (
            <View style={styles.lifeWrap}>
              <LifeProgress items={items} userId={targetUserId} />
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
  settings: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 10, minHeight: 44, marginBottom: 4 },
  settingsText: { color: colors.text, fontWeight: '700', fontSize: 14 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingHorizontal: 4 },
  name: { ...font.h1 },
  levelPill: { backgroundColor: colors.surfaceElevated, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  levelText: { fontSize: 12, fontWeight: '700', color: colors.text },
  handleRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3, paddingHorizontal: 4 },
  handle: { fontSize: 14, color: colors.textMuted },
  dot: { color: colors.textMuted },
  streak: { fontSize: 14, color: colors.accent, fontWeight: '700' },
  bio: { ...font.body, marginTop: 8, paddingHorizontal: 4 },
  bioAdd: { ...font.body, color: colors.accent, fontWeight: '700', marginTop: 8, paddingHorizontal: 4 },
  coverImg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  heroRow: { flexDirection: 'row', gap: 26, marginTop: 16, paddingHorizontal: 4 },
  hero: {},
  heroNum: { ...font.stat, fontSize: 38 },
  heroAccent: { color: colors.accent },
  heroLabel: { ...font.label, fontSize: 10, marginTop: 2 },
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
  lifeWrap: { marginTop: 14 },
  trend: { marginTop: 16 },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 30 },
});
