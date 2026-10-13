import { useState, type ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { elevated, useTheme } from '../theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { Kareli } from './Kareli';
import { PressableScale } from './motion/PressableScale';

// TOKEN-PENDING: layout.viewfinder = { stroke: 3, arm: 22, inset: 12 } (spec 3 Viewfinder: 3 pt L-corners, 22 pt arms)
const VIEWFINDER = { stroke: 3, arm: 22, inset: 12 } as const;

const RATIO = { '4:3': 4 / 3, '16:10': 16 / 10 } as const;

interface Props {
  aspect: keyof typeof RATIO;
  /** A short line in the middle (e.g. "Soruyu çerçeveye al"). */
  label?: string;
  /** The icon above the label; default `camera`. */
  icon?: IconName;
  onPress?: () => void;
  /** Content drawn inside the frame (e.g. a sample question sketch) instead of the label. */
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** A flat well with graph paper inside and four optik camera corners: "put the question here". */
export function Viewfinder({ aspect, label, icon = 'camera', onPress, children, style }: Props) {
  const theme = useTheme();
  const [height, setHeight] = useState(0);
  const { stroke, arm, inset } = VIEWFINDER;
  const color = theme.colors.optik;
  const r = theme.radius.xs;

  const onLayout = (e: LayoutChangeEvent) => {
    const h = Math.round(e.nativeEvent.layout.height);
    if (h !== height) setHeight(h);
  };

  const corner = (v: 'top' | 'bottom', hz: 'left' | 'right') => (
    <View
      key={v + hz}
      style={{
        position: 'absolute',
        [v]: inset,
        [hz]: inset,
        width: arm,
        height: arm,
        borderColor: color,
        [v === 'top' ? 'borderTopWidth' : 'borderBottomWidth']: stroke,
        [hz === 'left' ? 'borderLeftWidth' : 'borderRightWidth']: stroke,
        [`border${v === 'top' ? 'Top' : 'Bottom'}${hz === 'left' ? 'Left' : 'Right'}Radius`]: r,
      }}
    />
  );

  const body = (
    <>
      <View pointerEvents="none" aria-hidden style={[StyleSheet.absoluteFill, { borderRadius: theme.radius.lg, overflow: 'hidden' }]}>
        {height > 0 ? <Kareli height={height} fade={false} /> : null}
      </View>
      {corner('top', 'left')}
      {corner('top', 'right')}
      {corner('bottom', 'left')}
      {corner('bottom', 'right')}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm, padding: inset + arm }}>
        {children ?? (
          <>
            <Icon name={icon} size={theme.layout.system.iconSize.lg} color={theme.colors.textMuted} />
            {label ? (
              <AppText variant="caption" color="textMuted" align="center">
                {label}
              </AppText>
            ) : null}
          </>
        )}
      </View>
    </>
  );

  const box: ViewStyle = { ...elevated(theme, 'flat'), width: '100%', aspectRatio: RATIO[aspect] };
  if (onPress) {
    return (
      <PressableScale kind="card" accessibilityRole="button" accessibilityLabel={label ?? 'Fotoğraf çek'} onPress={onPress} onLayout={onLayout} style={[box, style]}>
        {body}
      </PressableScale>
    );
  }
  return (
    <View onLayout={onLayout} style={[box, style]}>
      {body}
    </View>
  );
}
