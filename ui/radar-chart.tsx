import Svg, { Line, Polygon, Text as SvgText } from 'react-native-svg';

import type { RadarAxis } from '@/domain/usecases/skill-radar';
import { colors } from '@/ui/theme';

/** Radar de compétences (DA) : trame sombre + polygone orange. Purement visuel. */
export function RadarChart({ axes, size = 230 }: { axes: RadarAxis[]; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 34; // marge pour les labels
  const n = axes.length;

  const angle = (i: number): number => (Math.PI * 2 * i) / n - Math.PI / 2; // départ en haut
  const point = (i: number, r: number): [number, number] => [
    cx + r * Math.cos(angle(i)),
    cy + r * Math.sin(angle(i)),
  ];
  const ring = (frac: number): string =>
    axes.map((_, i) => point(i, radius * frac).join(',')).join(' ');
  const dataPoints = axes
    .map((ax, i) => point(i, radius * (ax.value / 10)).join(','))
    .join(' ');

  return (
    <Svg width={size} height={size}>
      {[1, 0.66, 0.33].map((frac) => (
        <Polygon key={frac} points={ring(frac)} fill="none" stroke={colors.border} strokeWidth={1} />
      ))}
      {axes.map((ax, i) => {
        const [x, y] = point(i, radius);
        return <Line key={ax.label} x1={cx} y1={cy} x2={x} y2={y} stroke={colors.border} strokeWidth={1} />;
      })}
      <Polygon points={dataPoints} fill="rgba(240,101,47,0.28)" stroke={colors.accent} strokeWidth={2} />
      {axes.map((ax, i) => {
        const [x, y] = point(i, radius + 16);
        return (
          <SvgText
            key={ax.label}
            x={x}
            y={y}
            fill={colors.textMuted}
            fontSize={9}
            fontWeight="700"
            textAnchor="middle"
          >
            {ax.label.toUpperCase()}
          </SvgText>
        );
      })}
    </Svg>
  );
}
