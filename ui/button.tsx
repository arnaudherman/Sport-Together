import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { colors, font, radius } from '@/ui/theme';

/** CTA principal (DA) : pilule orange pleine. */
export function PrimaryButton({
  title,
  onPress,
  disabled,
  busy,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  const off = disabled || busy;
  return (
    <Pressable
      style={({ pressed }) => [styles.primary, off && styles.dim, pressed && styles.pressed]}
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!off, busy: !!busy }}
    >
      {busy ? <ActivityIndicator color={colors.onAccent} /> : <Text style={styles.primaryText}>{title}</Text>}
    </Pressable>
  );
}

/** Bouton secondaire discret (DA). */
export function GhostButton({
  title,
  onPress,
  disabled,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.ghost, disabled && styles.dim, pressed && styles.pressed]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!disabled }}
    >
      <Text style={styles.ghostText}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primary: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryText: { ...font.title, color: colors.onAccent },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
  ghost: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: 13,
    alignItems: 'center',
  },
  ghostText: { ...font.title, color: colors.text },
  dim: { opacity: 0.5 },
});
