import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { FeedItem } from '@/domain/entities/feed';
import { MUSCU_GRAPH } from '@/domain/usecases/skill-graph';
import { CommentsScreen } from '@/ui/comments-screen';
import { DiscoverScreen } from '@/ui/discover-screen';
import { FeedView } from '@/ui/feed-view';
import { GroupScreen } from '@/ui/group-screen';
import { HolyGraph } from '@/ui/holy-graph';
import { LogScreen } from '@/ui/log-screen';
import { ProfileScreen } from '@/ui/profile-screen';

// Route de PREVIEW (dev-only) : rend les écrans réels avec des données mock pour
// les captures. Non destinée à la production.
const noop = () => {};
const DEMO_GROUPS = [
  { id: 'demo-group', name: 'The Crew' },
  { id: 'les-costauds', name: 'Les Costauds' },
];
const DEMO_POST: FeedItem = {
  id: 'd0-lea-s',
  groupId: 'demo-group',
  authorId: 'u-lea',
  authorName: 'Léa',
  type: 'session',
  createdAt: new Date(Date.now() - 12 * 60_000).toISOString(),
  summary: '30 min de renforcement',
  groupName: 'The Crew',
};

const SCREENS: { label: string; node: ReactNode }[] = [
  {
    label: 'Accueil',
    node: <FeedView userId="local-user" pseudo="Toi" onOpenProfile={noop} onOpenLog={noop} onOpenComments={noop} onOpenDiscover={noop} onOpenGroup={noop} onOpenGroups={noop} />,
  },
  {
    label: 'Groupe',
    node: <GroupScreen groupId="demo-group" groupName="The Crew" isCreator userId="local-user" onBack={noop} onOpenProfile={noop} onLeft={noop} onChanged={noop} />,
  },
  {
    label: 'Profil',
    node: (
      <ProfileScreen
        targetUserId="u-lea"
        targetName="Léa"
        currentUserId="local-user"
        groups={DEMO_GROUPS}
        onBack={noop}
        onOpenGroup={noop}
        onJoinGroup={noop}
        onOpenAccount={noop}
        onOpenComments={noop}
        onOpenFollowList={noop}
      />
    ),
  },
  {
    label: 'Compétences',
    node: (
      <View style={{ flex: 1, backgroundColor: '#0B0B0D' }}>
        <ScrollView contentContainerStyle={{ alignItems: 'center', paddingVertical: 16 }}>
          <HolyGraph graph={MUSCU_GRAPH} unlocked={3} />
        </ScrollView>
      </View>
    ),
  },
  {
    label: 'Découvrir',
    node: <DiscoverScreen userId="local-user" onBack={noop} onOpenProfile={noop} onJoinGroup={noop} />,
  },
  {
    label: 'Réponses',
    node: <CommentsScreen item={DEMO_POST} currentUserId="local-user" onBack={noop} />,
  },
  {
    label: 'Publier',
    node: <LogScreen groups={[{ id: 'demo-group', name: 'The Crew' }]} userId="local-user" pseudo="Toi" onDone={noop} onCancel={noop} />,
  },
];

export default function Preview() {
  return (
    <ScrollView horizontal contentContainerStyle={styles.row}>
      {SCREENS.map((s) => (
        <View key={s.label} style={styles.col}>
          <Text style={styles.caption}>{s.label}</Text>
          <View style={styles.phone}>{s.node}</View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { backgroundColor: '#060608', padding: 24, gap: 22 },
  col: { gap: 10 },
  caption: { color: '#8A8784', fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', paddingLeft: 4 },
  phone: { width: 390, height: 820, borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: '#222' },
});
