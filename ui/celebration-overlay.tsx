import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Modal, StyleSheet, Text, View } from 'react-native';

import type { Celebration } from '@/domain/usecases/celebration';
import { PrimaryButton } from '@/ui/button';
import { colors, font, gradients, radius } from '@/ui/theme';

/**
 * Overlay de récompense (DA) affiché après un log qui fait monter de niveau ou franchir
 * un palier d'arbre — le pic du core loop. Modal plein écran, carte dégradée animée.
 */
export function CelebrationOverlay({
  celebration,
  onDismiss,
}: {
  celebration: Celebration;
  onDismiss: () => void;
}) {
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!celebration) return;
    scale.setValue(0.85);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 6, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [celebration, scale, opacity]);

  if (!celebration) return null;
  const isLevel = celebration.kind === 'level';
  const title = isLevel ? `Niveau ${celebration.level} !` : celebration.label;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.card, { opacity, transform: [{ scale }] }]}>
          <LinearGradient colors={['#2c1d12', '#191411']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.grad}>
            <LinearGradient colors={gradients.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.badge}>
              <Ionicons name={isLevel ? 'trophy' : 'ribbon'} size={38} color={colors.onAccent} />
            </LinearGradient>
            <Text style={styles.kicker}>{isLevel ? 'LEVEL UP' : 'NOUVEAU PALIER'}</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>
              {isLevel ? 'Ta progression grimpe — continue sur ta lancée. 💪' : 'Un palier de ton arbre de compétences est franchi.'}
            </Text>
            <PrimaryButton title="Continuer" onPress={onDismiss} />
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  card: { width: '100%', maxWidth: 380, borderRadius: radius.lg, overflow: 'hidden' },
  grad: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 28, alignItems: 'center', gap: 12 },
  badge: { width: 72, height: 72, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  kicker: { ...font.label, color: colors.accent },
  title: { ...font.display, textAlign: 'center' },
  subtitle: { ...font.body, color: colors.textMuted, textAlign: 'center', marginBottom: 8 },
});
