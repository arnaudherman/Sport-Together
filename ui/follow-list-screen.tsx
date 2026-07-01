import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useFollowRepository, useProfileRepository } from '@/core/di/repositories-context';
import { Avatar } from '@/ui/avatar';
import { FollowButton } from '@/ui/follow-button';
import { handle } from '@/ui/format';
import { ScreenHeader } from '@/ui/screen-header';
import { ScreenState } from '@/ui/screen-state';
import { colors, font } from '@/ui/theme';
import { useAsyncData } from '@/ui/use-async-data';

export type FollowListKind = 'following' | 'followers';

interface Person {
  id: string;
  pseudo: string;
}

/** Liste « Abonnements » (que je suis) ou « Abonnés » (qui me suivent). */
export function FollowListScreen({
  kind,
  onBack,
  onOpenProfile,
}: {
  kind: FollowListKind;
  onBack: () => void;
  onOpenProfile: (id: string, name: string) => void;
}) {
  const followRepo = useFollowRepository();
  const profileRepo = useProfileRepository();

  const loader = useCallback(async () => {
    const ids = kind === 'following' ? await followRepo.listFollowing() : await followRepo.listFollowers();
    const profiles = await Promise.all(ids.map((id) => profileRepo.getProfile(id).catch(() => null)));
    return ids.map((id, i): Person => ({ id, pseudo: profiles[i]?.pseudo ?? 'Membre' }));
  }, [followRepo, profileRepo, kind]);
  const { data: people, loading, error, setError, reload } = useAsyncData<Person[]>(loader, []);

  const title = kind === 'following' ? 'Abonnements' : 'Abonnés';

  return (
    <View style={styles.container}>
      <ScreenHeader title={title} onBack={onBack} />
      <ScreenState loading={loading} error={error} hasData={people.length > 0} onRetry={reload}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {people.length === 0 ? (
            <Text style={styles.empty}>
              {kind === 'following' ? 'Tu ne suis encore personne.' : 'Personne ne te suit encore.'}
            </Text>
          ) : (
            people.map((p, i) => (
              <View key={p.id} style={[styles.row, i === people.length - 1 && styles.rowLast]}>
                <Pressable style={styles.who} onPress={() => onOpenProfile(p.id, p.pseudo)}>
                  <Avatar name={p.pseudo} seed={p.id} size={44} />
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
  scroll: { paddingBottom: 32 },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 32 },
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
