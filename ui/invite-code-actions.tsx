import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { GhostButton } from '@/ui/button';
import { colors, font } from '@/ui/theme';

/**
 * Affichage + actions du code d'invitation (Copier / Partager) — partagé entre
 * la création de groupe (group-gate) et l'écran groupe (ré-inviter plus tard).
 */
export function InviteCodeActions({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await Clipboard.setStringAsync(code);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function share() {
    Share.share({ message: `Rejoins mon groupe sur Sport Together avec le code ${code} 💪` }).catch(() => {});
  }

  return (
    <View style={styles.wrap}>
      <Pressable onPress={copy} accessibilityRole="button" accessibilityLabel="Copier le code d'invitation">
        <Text style={styles.code}>{code}</Text>
      </Pressable>
      <View style={styles.row}>
        <View style={styles.btn}>
          <GhostButton title={copied ? 'Copié ✓' : 'Copier le code'} onPress={copy} />
        </View>
        <View style={styles.btn}>
          <GhostButton title="Partager" onPress={share} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  code: { ...font.display, color: colors.accent, textAlign: 'center', letterSpacing: 2 },
  row: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1 },
});
