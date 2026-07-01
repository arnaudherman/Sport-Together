import { Fragment, useMemo } from 'react';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';

import { graphState, type SkillGraph } from '@/domain/usecases/skill-graph';
import { colors } from '@/ui/theme';

/**
 * Arbre de compétences en holy graph ramifié (DA). Purement visuel : nœuds reliés,
 * branches débloquées en orange, verrouillées en sombre. Le parent gère le scroll.
 */
export function HolyGraph({ graph, unlocked }: { graph: SkillGraph; unlocked: number }) {
  const { nodes, edges } = useMemo(() => graphState(graph, unlocked), [graph, unlocked]);
  const pos = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    for (const n of graph.nodes) map.set(n.id, { x: n.x, y: n.y });
    return map;
  }, [graph]);

  return (
    <Svg width={graph.width} height={graph.height}>
      {edges.map((e) => {
        const a = pos.get(e.from);
        const b = pos.get(e.to);
        if (!a || !b) return null;
        return (
          <Line
            key={`${e.from}-${e.to}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={e.active ? colors.accent : colors.border}
            strokeWidth={2.5}
          />
        );
      })}

      {nodes.map(({ node, state }) => {
        // Verrouillé rendu par l'opacité du cercle, pas par un texte sous-contrasté.
        const labelColor = state === 'available' ? colors.accent : colors.textMuted;
        return (
          <Fragment key={node.id}>
            {state === 'done' ? (
              <>
                <Circle cx={node.x} cy={node.y} r={16} fill={colors.accent} />
                <SvgText x={node.x} y={node.y + 5} fontSize={14} fontWeight="800" fill="#0B0B0D" textAnchor="middle">
                  ✓
                </SvgText>
              </>
            ) : state === 'available' ? (
              <>
                <Circle cx={node.x} cy={node.y} r={17} fill={colors.accentSoft} stroke={colors.accent} strokeWidth={2.5} />
                <Circle cx={node.x} cy={node.y} r={5} fill={colors.accent} />
              </>
            ) : (
              <Circle cx={node.x} cy={node.y} r={14} fill={colors.surfaceElevated} stroke={colors.border} strokeWidth={2} />
            )}
            <SvgText x={node.x} y={node.y + 32} fontSize={11} fontWeight="700" fill={labelColor} textAnchor="middle">
              {node.label}
            </SvgText>
          </Fragment>
        );
      })}
    </Svg>
  );
}
