import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, gradients, radius } from '@/ui/theme';

export type TabKey = 'home' | 'discover' | 'groups' | 'me';

const TABS: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap; iconOn: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'home', label: 'Accueil', icon: 'home-outline', iconOn: 'home' },
  { key: 'discover', label: 'Découvrir', icon: 'compass-outline', iconOn: 'compass' },
  { key: 'groups', label: 'Groupes', icon: 'people-outline', iconOn: 'people' },
  { key: 'me', label: 'Profil', icon: 'person-outline', iconOn: 'person' },
];

/**
 * Tab bar « Obsidienne » (DA v2) : 5 emplacements — 4 onglets + le ＋ central en
 * pilule dégradée qui ouvre le composer. Persistante sur les écrans racine.
 */
export function TabBar({
  active,
  onTab,
  onCompose,
}: {
  active: TabKey;
  onTab: (tab: TabKey) => void;
  onCompose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const left = TABS.slice(0, 2);
  const right = TABS.slice(2);

  const renderTab = (t: (typeof TABS)[number]) => {
    const on = active === t.key;
    return (
      <Pressable
        key={t.key}
        style={styles.tab}
        onPress={() => onTab(t.key)}
        accessibilityRole="tab"
        accessibilityState={{ selected: on }}
        accessibilityLabel={t.label}
      >
        <Ionicons name={on ? t.iconOn : t.icon} size={22} color={on ? colors.text : colors.textFaint} />
        <Text style={[styles.label, on && styles.labelOn]}>{t.label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom - 6, 6) }]}>
      {left.map(renderTab)}
      <Pressable
        style={({ pressed }) => [styles.plusWrap, pressed && styles.pressed]}
        onPress={onCompose}
        accessibilityRole="button"
        accessibilityLabel="Publier une activité"
      >
        <LinearGradient colors={gradients.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.plus}>
          <Ionicons name="add" size={27} color={colors.onAccent} />
        </LinearGradient>
      </Pressable>
      {right.map(renderTab)}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    paddingTop: 10,
    backgroundColor: 'rgba(13,15,21,0.96)',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tab: { alignItems: 'center', width: 62, gap: 3, minHeight: 44 },
  label: { fontSize: 10, fontWeight: '600', color: colors.textFaint },
  labelOn: { color: colors.text },
  plusWrap: {
    marginTop: -14,
    borderRadius: radius.pill,
    shadowColor: colors.accent,
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  plus: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.9, transform: [{ scale: 0.96 }] },
});
