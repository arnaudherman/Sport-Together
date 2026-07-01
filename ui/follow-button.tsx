import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useFollowRepository } from '@/core/di/repositories-context';
import { colors, radius } from '@/ui/theme';

/**
 * Bouton Suivre / Suivi SELF-CONTAINED (charge son état `isFollowing` et gère le toggle
 * optimiste avec rollback). Mutualise la logique jusque-là dupliquée entre le profil et
 * l'écran Découvrir. Réutilisable en liste (chaque bouton est autonome).
 */
export function FollowButton({
  targetId,
  targetName,
  onError,
}: {
  targetId: string;
  targetName: string;
  onError?: (message: string) => void;
}) {
  const followRepo = useFollowRepository();
  const [following, setFollowing] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    followRepo
      .isFollowing(targetId)
      .then((f) => {
        if (mounted.current) setFollowing(f);
      })
      .catch(() => {});
    return () => {
      mounted.current = false;
    };
  }, [followRepo, targetId]);

  async function toggle() {
    const next = !following;
    setFollowing(next); // optimiste
    try {
      if (next) await followRepo.follow(targetId);
      else await followRepo.unfollow(targetId);
    } catch (e) {
      if (mounted.current) setFollowing(!next); // rollback
      onError?.((e as Error).message);
    }
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.btn, following && styles.btnOn, pressed && styles.pressed]}
      onPress={toggle}
      accessibilityRole="button"
      accessibilityState={{ selected: following }}
      accessibilityLabel={following ? `Ne plus suivre ${targetName}` : `Suivre ${targetName}`}
    >
      <Ionicons name={following ? 'checkmark' : 'add'} size={15} color={following ? colors.text : colors.onAccent} />
      <Text style={[styles.text, following && styles.textOn]}>{following ? 'Suivi' : 'Suivre'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: 18,
    paddingVertical: 10,
    minHeight: 40,
    justifyContent: 'center',
  },
  btnOn: { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  text: { color: colors.onAccent, fontWeight: '800', fontSize: 14 },
  textOn: { color: colors.text },
});
