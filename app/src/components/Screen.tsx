import { useState, type ReactNode } from 'react';
import { ScrollView, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ContentSizeContext, contentSizeClass, useWindowLayout } from '../lib/layout';
import { useTheme } from '../theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

interface Props {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  /** Pad the top by the safe-area inset (tab screens without a header). */
  safeTop?: boolean;
  /** `wide` for dashboards and lists, `readable` for single-column reading and forms. */
  width?: 'wide' | 'readable';
  /** Small accent mark before the title. */
  titleIcon?: IconName;
}

/**
 * Scrolling page. Content is centered with a max width and its measured width is
 * provided to children (see useContentSize), so grids adapt to iPad, split view and
 * rotation rather than to the device model.
 */
export function Screen({ title, subtitle, children, safeTop = true, width = 'wide', titleIcon }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const win = useWindowLayout();
  const maxWidth = width === 'readable' ? theme.layout.readableWidth : theme.layout.maxContentWidth;
  const [outer, setOuter] = useState(win.width);
  const contentWidth = Math.min(outer - win.padding * 2, maxWidth);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{
        paddingTop: (safeTop ? insets.top : 0) + theme.spacing.lg,
        paddingHorizontal: win.padding,
        paddingBottom: theme.spacing.xxl,
      }}
      onLayout={(e: LayoutChangeEvent) => setOuter(e.nativeEvent.layout.width)}
      // Tab screens pad by the safe area themselves; screens under a native header let iOS adjust.
      contentInsetAdjustmentBehavior={safeTop ? 'never' : 'automatic'}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <ContentSizeContext.Provider value={{ width: contentWidth, size: contentSizeClass(theme, contentWidth) }}>
        <View style={{ width: '100%', maxWidth, alignSelf: 'center', gap: theme.spacing.lg }}>
          {title ? (
            <View style={{ gap: theme.spacing.xs }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                {titleIcon ? <Icon name={titleIcon} size={theme.layout.iconSize.lg} color={theme.colors.accent} /> : null}
                <AppText variant="title" style={{ flexShrink: 1 }}>
                  {title}
                </AppText>
              </View>
              {subtitle ? <AppText color="textMuted">{subtitle}</AppText> : null}
            </View>
          ) : null}
          {children}
        </View>
      </ContentSizeContext.Provider>
    </ScrollView>
  );
}

function Pane({ children, flex }: { children: ReactNode; flex: number }) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  return (
    <ScrollView
      style={{ flex }}
      contentContainerStyle={{ paddingVertical: theme.spacing.lg, paddingBottom: theme.spacing.xxl, gap: theme.spacing.lg }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
    >
      <ContentSizeContext.Provider value={{ width, size: contentSizeClass(theme, width) }}>{children}</ContentSizeContext.Provider>
    </ScrollView>
  );
}

/**
 * Two side-by-side panes that scroll independently (large iPad windows), e.g. the
 * question on the left stays in view while the solution scrolls on the right.
 */
export function SplitScreen({ left, right }: { left: ReactNode; right: ReactNode }) {
  const theme = useTheme();
  const win = useWindowLayout();
  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'row',
        gap: theme.spacing.xl,
        paddingHorizontal: win.padding,
        backgroundColor: theme.colors.background,
      }}
    >
      <Pane flex={theme.layout.splitLeft}>{left}</Pane>
      <Pane flex={1 - theme.layout.splitLeft}>{right}</Pane>
    </View>
  );
}
