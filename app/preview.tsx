import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { FeedView } from '@/ui/feed-view';
import { GroupScreen } from '@/ui/group-screen';
import { LogScreen } from '@/ui/log-screen';
import { ProfileScreen } from '@/ui/profile-screen';
import { SkillTreeScreen } from '@/ui/skill-tree-screen';

// Route de PREVIEW (dev-only) : rend les écrans réels avec des données mock pour
// les captures. Non destinée à la production.
const noop = () => {};

const SCREENS: { label: string; node: ReactNode }[] = [
  {
    label: 'Feed',
    node: (
      <FeedView
        groupId="demo-group"
        userId="local-user"
        pseudo="Toi"
        onOpenGroup={noop}
        onOpenProfile={noop}
        onOpenLog={noop}
        onOpenSkills={noop}
      />
    ),
  },
  {
    label: 'Groupe',
    node: (
      <GroupScreen
        groupId="demo-group"
        userId="local-user"
        onBack={noop}
        onChangeGroup={noop}
        onOpenProfile={noop}
      />
    ),
  },
  {
    label: 'Profil',
    node: (
      <ProfileScreen
        groupId="demo-group"
        targetUserId="u-lea"
        targetName="Léa"
        currentUserId="local-user"
        onBack={noop}
      />
    ),
  },
  {
    label: 'Progression',
    node: <SkillTreeScreen groupId="demo-group" userId="local-user" onBack={noop} onLog={noop} />,
  },
  {
    label: 'Logger',
    node: <LogScreen groupId="demo-group" onDone={noop} onCancel={noop} />,
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
