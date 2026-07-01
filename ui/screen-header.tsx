import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, font } from '@/ui/theme';

/**
 * En-tête d'écran secondaire partagé : « ‹ Retour » + titre centré (+ slot droit
 * optionnel). Centralise le bloc jusque-là copié-collé (avec des largeurs divergentes)
 * dans comments / account / discover, etc.
 */
export function ScreenHeader({
  title,
  onBack,
  right,
}: {
  title: string;
  /** Absent = écran RACINE d'un onglet (pas de Retour). */
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.row}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          hitSlop={{ top: 12, bottom: 12, left: 8, right: 16 }}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <Ionicons name="chevron-back" size={20} color={colors.accent} />
          <Text style={styles.backText}>Retour</Text>
        </Pressable>
      ) : (
        <View style={styles.back} />
      )}
      <Text style={styles.title}>{title}</Text>
      <View style={styles.side}>{right}</View>
    </View>
  );
}

const SIDE = 92;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, paddingBottom: 8 },
  back: { flexDirection: 'row', alignItems: 'center', width: SIDE },
  backText: { fontSize: 15, color: colors.accent, fontWeight: '700' },
  title: { ...font.h1 },
  side: { width: SIDE, alignItems: 'flex-end' },
});
