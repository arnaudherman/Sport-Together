import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

import { colors, gradients } from '@/ui/theme';

/**
 * Anneau de données (DA v2, signature Whoop) : progression en dégradé accent sur
 * un track discret, valeur ULTRA-LIGHT au centre, légende UPPERCASE en dessous.
 */
export function Ring({
  ratio,
  value,
  caption,
  size = 74,
  stroke = 7,
}: {
  /** 0..1 — part de l'anneau remplie. */
  ratio: number;
  value: string;
  caption?: string;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2 - 2;
  const c = 2 * Math.PI * r;
  const filled = Math.max(0.02, Math.min(1, ratio)) * c;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={gradients.accent[0]} />
            <Stop offset="1" stopColor={gradients.accent[1]} />
          </SvgGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colors.track} strokeWidth={stroke} />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#ring)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={[styles.value, { fontSize: size * 0.24 }]}>{value}</Text>
        {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  value: { color: colors.text, fontWeight: '200', letterSpacing: -0.5 },
  caption: { color: colors.textMuted, fontSize: 8, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginTop: 1 },
});
