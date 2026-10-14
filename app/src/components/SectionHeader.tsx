import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { AppText } from './AppText';
import { Button } from './Button';
import type { CardAction } from './Card';
import { Highlight } from './Highlight';

interface Props {
  title: string;
  /** A count after the title (e.g. questions in the group). */
  count?: number | string;
  /** A small ghost action at the right. */
  action?: CardAction;
  /** A static highlighter swipe under the title in this raw color (a subject soft tint). */
  swipe?: string;
  style?: StyleProp<ViewStyle>;
}

/** A heading that sits on the paper above a group of sheets (replaces muted card titles). */
export function SectionHeader({ title, count, action, swipe, style }: Props) {
  const theme = useTheme();
  const heading = (
    <AppText variant="heading" numberOfLines={1} accessibilityRole="header">
      {title}
    </AppText>
  );
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, minHeight: theme.layout.system.minTouch }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.sm, flexShrink: 1, flexGrow: 1 }}>
        {swipe ? (
          // Highlight's own wrap aligns to flex-start; baseline keeps the count on the title's line.
          <Highlight drawn tone={swipe} ink={theme.colors.text} style={{ alignSelf: 'baseline', flexShrink: 1 }}>
            {heading}
          </Highlight>
        ) : (
          <View style={{ flexShrink: 1 }}>{heading}</View>
        )}
        {count !== undefined ? (
          <AppText variant="label" color="textMuted" tabular>
            {count}
          </AppText>
        ) : null}
      </View>
      {action ? (
        <Button variant="ghost" size="sm" label={action.label} icon={action.icon} onPress={action.onPress} style={{ marginRight: -theme.spacing.md }} />
      ) : null}
    </View>
  );
}
