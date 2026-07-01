import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { cardShadow, gradients, radius } from '@/ui/theme';

/**
 * Carte « Obsidienne » (DA v2) : surface en dégradé + ombre douce + highlight 1px
 * en haut — JAMAIS de bordure dure. Remplace les anciennes cartes borderWidth.
 */
export function Surface({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.shadow, style]}>
      <LinearGradient
        colors={gradients.panel}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={styles.grad}
      >
        <View style={styles.highlight} />
        {children}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: { ...cardShadow, borderRadius: radius.lg },
  grad: { borderRadius: radius.lg, overflow: 'hidden' },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
});
