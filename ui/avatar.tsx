import { StyleSheet, Text, View } from 'react-native';

import { avatarColor, initial } from '@/ui/format';
import { radius } from '@/ui/theme';

/**
 * Avatar déterministe partagé (cercle coloré + initiale). Centralise le rendu jusque-là
 * dupliqué dans ~10 écrans. `seed` fixe la couleur (souvent l'id) ; `name` donne l'initiale.
 */
export function Avatar({ name, seed, size = 42 }: { name: string; seed?: string; size?: number }) {
  const c = avatarColor(seed ?? name);
  return (
    <View
      style={[styles.base, { width: size, height: size, borderRadius: radius.pill, backgroundColor: c.bg }]}
    >
      <Text style={[styles.text, { color: c.fg, fontSize: Math.round(size * 0.4) }]}>{initial(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  text: { fontWeight: '800' },
});
