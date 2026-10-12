import Svg, { Circle, Path } from 'react-native-svg';
import { View } from 'react-native';
import type { BadgeTier } from '../data/badges';
import { useTheme } from '../theme';
import { Icon, type IconName } from './Icon';

const SCALLOPS = 18;

/** Outline of a stamp-like seal: a circle with soft scallops, on a 100-unit grid. */
function sealPath(): string {
  const c = 50;
  const outer = 49;
  const inner = 44.5;
  const pts: string[] = [];
  for (let i = 0; i < SCALLOPS; i++) {
    const a0 = (i / SCALLOPS) * Math.PI * 2;
    const a1 = ((i + 0.5) / SCALLOPS) * Math.PI * 2;
    const a2 = ((i + 1) / SCALLOPS) * Math.PI * 2;
    const p = (a: number, r: number) => `${(c + Math.cos(a) * r).toFixed(2)} ${(c + Math.sin(a) * r).toFixed(2)}`;
    pts.push(i === 0 ? `M ${p(a0, inner)}` : '');
    pts.push(`Q ${p(a1, outer + 3)} ${p(a2, inner)}`);
  }
  return `${pts.join(' ')} Z`;
}
const SEAL = sealPath();

interface Props {
  icon: IconName;
  tier: BadgeTier;
  size?: number;
  /** Not earned yet: muted, with a lock. */
  locked?: boolean;
}

/** A badge drawn as a scalloped seal with an inner ring and its glyph. */
export function BadgeSeal({ icon, tier, size, locked = false }: Props) {
  const theme = useTheme();
  const s = size ?? theme.layout.minTouch + theme.spacing.xl;
  const fill = locked ? theme.colors.badge.locked : theme.colors.badge[tier];
  const ink = locked ? theme.colors.badge.lockedInk : theme.colors.badge.ink;
  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={s} height={s} viewBox="0 0 100 100" style={{ position: 'absolute' }}>
        <Path d={SEAL} fill={fill} />
        <Circle cx={50} cy={50} r={36} fill="none" stroke={ink} strokeOpacity={0.45} strokeWidth={1.5} strokeDasharray="2 3" />
      </Svg>
      {/* In its own view so it stacks above the absolutely placed seal on web too. */}
      <View>
        <Icon name={locked ? 'lock' : icon} size={s * 0.38} color={ink} />
      </View>
    </View>
  );
}
