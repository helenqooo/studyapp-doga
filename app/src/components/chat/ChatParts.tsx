import { useId, useState } from 'react';
import { Platform, ScrollView, TextInput, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent, type ViewStyle } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useReducedMotion, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { ASSISTANT_NAME } from '../../brand';
import { useFontScale, useWindowLayout } from '../../lib/layout';
import type { ChatRow } from '../../lib/useStreamingChat';
import { elevated, font, fontSizeTablet, useTheme } from '../../theme';
import { AppText } from '../AppText';
import { Bubble } from '../Bubble';
import { Card, ListRow } from '../Card';
import { Chip } from '../Chip';
import { Icon, type IconName } from '../Icon';
import { MathView } from '../math/MathView';
import { Mascot, type MascotMood } from '../mascot/Mascot';
import { Loader } from '../motion/Loader';
import { PressableScale } from '../motion/PressableScale';
import { ease } from '../motion/presets';
import { Section } from '../SectionHeader';

// TOKEN-PENDING: motion.duration.rmFade = 120 (the Reduce Motion cross-fade, spec 0.7 / 5.6)
const RM_FADE_MS = 120;
// TOKEN-PENDING: layout.chat.composerMin = { compact: 48, tablet: 56 } (the composer well's single-line height, spec 7.6; 56 matches TextField on a tablet)
const COMPOSER_MIN = { compact: 48, tablet: 56 };
// TOKEN-PENDING: layout.chat.promptLines = 2 (the starter sheets on a tall tablet window are as tall as a two-line question, so the 2×2 reads even)
const PROMPT_LINES = 2;
// TOKEN-PENDING: layout.chat.promptTallMin = 900 (a window at least this tall stacks each starter's icon over its question; a shorter one, a landscape iPad, lays them in a row so the 2×2 stays above the composer)
const PROMPT_TALL_MIN = 900;
// TOKEN-PENDING: layout.chat.promptRow = 72 (a row starter's least height)
const PROMPT_ROW = 72;
// TOKEN-PENDING: layout.chat.replySizeTablet = 18 (Lumi's Lora words on a tablet: Lora's small x-height reads a size under the student's 17 pt Poppins; a phone keeps body)
const REPLY_SIZE_TABLET = 18;
// TOKEN-PENDING: layout.chat.edgeFade = 48 (the fade over the clipped end of the fact scroller)
const EDGE_FADE = 48;
// TOKEN-PENDING: layout.chat.composerLines = 4 (the composer grows up to this many lines, spec 7.6)
const COMPOSER_LINES = 4;
// TOKEN-PENDING: layout.chat.userBubbleMax = '85%' (the student's bubble's widest, as a share of the thread)
const USER_BUBBLE_MAX = '85%';

/** A starter question shown as a card in the empty assistant (icon plus text). */
export interface ChatPrompt {
  text: string;
  icon: IconName;
}

/** Something Lumi knows about the student; tapping it asks `prompt`. */
export interface ChatContextItem {
  key: string;
  icon: IconName;
  /** The fact: "Serin 6 gün". */
  label: string;
  /** What tapping asks, shortly: "Seriyi nasıl korurum?" */
  hint: string;
  /** The message that is sent. */
  prompt: string;
  /** Raw ink for the icon (defaults to primaryText). */
  tint?: string;
}

/**
 * One message. The student's bubble is primarySoft on the right; replies read like a page
 * (no bubble) next to Lumi. `avatar`: `live` reacts with `avatarMood`, `still` is a quiet
 * Lumi, `none` keeps the indent (a follow-up reply in the same group).
 */
export function ChatBubble({
  row,
  avatar = 'still',
  avatarMood,
  onTyped,
}: {
  row: ChatRow;
  avatar?: 'live' | 'still' | 'none';
  avatarMood?: MascotMood;
  onTyped?: () => void;
}) {
  const theme = useTheme();
  const fs = useFontScale();
  const { tablet } = useWindowLayout();
  if (row.role === 'user') {
    return (
      <View
        style={{
          alignSelf: 'flex-end',
          maxWidth: USER_BUBBLE_MAX,
          backgroundColor: theme.colors.primarySoft,
          borderRadius: theme.radius.lg,
          borderBottomRightRadius: theme.radius.sm,
          borderCurve: 'continuous',
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
        }}
      >
        <AppText selectable>{row.content}</AppText>
      </View>
    );
  }
  const size = theme.layout.chatAvatar;
  return (
    <View style={{ alignSelf: 'stretch', flexDirection: 'row', gap: theme.spacing.sm }}>
      <View style={{ width: size, height: size }} aria-hidden>
        {avatar === 'none' ? null : (
          <Mascot size={size} mood={avatar === 'live' ? (avatarMood ?? 'idle') : 'idle'} still={avatar !== 'live'} />
        )}
      </View>
      <View style={{ flex: 1, paddingTop: theme.spacing.xxs }}>
        {row.live === 'waiting' ? (
          <View accessible accessibilityLabel={`${ASSISTANT_NAME} yazıyor`}>
            <Loader style={{ alignSelf: 'flex-start', paddingVertical: theme.spacing.sm }} />
          </View>
        ) : null}
        {/* Mounted while waiting too, so the page is loaded when the first words come. */}
        <MathView
          markdown={row.content}
          fontSize={tablet ? REPLY_SIZE_TABLET : fs.md}
          typing={row.live === 'streaming' ? 'stream' : row.live === 'done' ? 'type' : 'off'}
          onTyped={onTyped}
        />
      </View>
    </View>
  );
}

/**
 * The composer: a flat well that starts as one line (48 pt, 56 on a tablet) and grows to four, and the send
 * bubble beside its last line. The bubble is marked (scribbled in) once there is something
 * to send, and erased again when the well empties.
 */
export function ChatComposer({
  value,
  onChange,
  onSend,
  busy,
  placeholder,
}: {
  value: string;
  onChange: (text: string) => void;
  onSend: () => void;
  busy: boolean;
  placeholder: string;
}) {
  const theme = useTheme();
  const fs = useFontScale();
  const { tablet, touch } = useWindowLayout();
  const reduceMotion = useReducedMotion();
  const [focused, setFocused] = useState(false);
  const canSend = !busy && !!value.trim();

  const composerMin = tablet ? COMPOSER_MIN.tablet : COMPOSER_MIN.compact;
  const body = theme.typography.body;
  const lineHeight = Math.round(fs.md * body.lineRatio);
  const padY = Math.max(0, (composerMin - lineHeight) / 2);
  const maxHeight = padY * 2 + lineHeight * COMPOSER_LINES;
  const well = elevated(theme, 'flat');

  // Focus draws a graphite edge on the well; it cross-fades in and out (client rule 0.7).
  const edge = focused ? theme.colors.mark : well.backgroundColor;
  const fade = { duration: reduceMotion ? RM_FADE_MS : theme.motion.duration.base, easing: ease('standard'), reduceMotion: ReduceMotion.Never };
  const edgeStyle = useAnimatedStyle(() => ({ borderColor: withTiming(edge, fade) }), [edge, reduceMotion]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing.sm }}>
      <Animated.View
        style={[
          {
            flex: 1,
            backgroundColor: well.backgroundColor,
            borderRadius: theme.radius.lg,
            borderCurve: 'continuous',
            borderWidth: theme.layout.selectedBorder,
          },
          edgeStyle,
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textMuted}
          multiline
          // The web's textarea starts at two rows; native grows from one line by itself.
          numberOfLines={Platform.OS === 'web' ? 1 : undefined}
          maxLength={2000}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel="Mesajın"
          style={{
            minHeight: composerMin - theme.layout.selectedBorder * 2,
            maxHeight,
            paddingHorizontal: theme.spacing.md,
            paddingTop: padY - theme.layout.selectedBorder,
            paddingBottom: padY - theme.layout.selectedBorder,
            color: theme.colors.text,
            fontSize: fs.md,
            lineHeight,
            ...font('sans'),
            // The well's edge shows focus; the browser's own ring would double it.
            ...(Platform.OS === 'web' ? { outlineWidth: 0 } : null),
          }}
        />
      </Animated.View>
      <PressableScale
        kind="bubble"
        accessibilityRole="button"
        accessibilityLabel="Gönder"
        accessibilityState={{ disabled: !canSend }}
        disabled={!canSend}
        onPress={onSend}
        style={{ minWidth: touch, height: composerMin, alignItems: 'center', justifyContent: 'center' }}
      >
        <Bubble size="letter" filled={canSend} tone="mark">
          {(c) => (
            <Icon
              name="arrow-up"
              size={theme.layout.iconSize.md}
              weight="bold"
              // The empty bubble's icon is muted; the marked one takes the mark's ink.
              color={c === theme.colors.text ? theme.colors.textMuted : c}
            />
          )}
        </Bubble>
      </PressableScale>
    </View>
  );
}

/**
 * The empty assistant's starters. Tablet: a 2×2 grid of sheets, of one height in each row. A
 * tall window stacks the icon over the question; a short one (a landscape iPad) sets the icon
 * beside it, so the whole grid sits above the composer. Phone: one sheet of rows (a 2×2 grid
 * would break every question over three lines).
 */
export function PromptGrid({ prompts, onPick }: { prompts: ChatPrompt[]; onPick: (text: string) => void }) {
  const theme = useTheme();
  const { tablet, sheetPadding, height } = useWindowLayout();
  if (!tablet) {
    return (
      <Card divided>
        {prompts.map((p) => (
          <ListRow key={p.text} icon={p.icon} title={p.text} chevron={false} onPress={() => onPick(p.text)} />
        ))}
      </Card>
    );
  }
  const tall = height >= PROMPT_TALL_MIN;
  const lineHeight = Math.round(fontSizeTablet.md * theme.typography.body.lineRatio);
  const sheet: ViewStyle = tall
    ? { flex: 1, minHeight: sheetPadding * 2 + theme.layout.iconSize.md + theme.spacing.md + lineHeight * PROMPT_LINES, justifyContent: 'space-between' }
    : { flex: 1, minHeight: PROMPT_ROW, paddingVertical: theme.spacing.md, flexDirection: 'row', alignItems: 'center' };
  const rows: ChatPrompt[][] = [];
  for (let i = 0; i < prompts.length; i += 2) rows.push(prompts.slice(i, i + 2));
  return (
    <View style={{ width: '100%', maxWidth: theme.layout.readableWidth, alignSelf: 'center', gap: theme.spacing.md }}>
      {rows.map((pair) => (
        <View key={pair.map((p) => p.text).join('|')} style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          {pair.map((p) => (
            <View key={p.text} style={{ flex: 1 }}>
              <Card onPress={() => onPick(p.text)} accessibilityLabel={p.text} style={sheet}>
                <Icon name={p.icon} duotone color={theme.colors.primaryText} />
                <AppText weight="medium" style={tall ? null : { flex: 1 }}>
                  {p.text}
                </AppText>
              </Card>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

/**
 * Landscape: "Lumi'nin bildikleri", one sheet of rows that each ask about one fact. Without
 * `onPick` (no messages left) they are plain facts: no press, no question hint. The column is
 * narrow, so a row is the icon at its own width and the words: no leading slot, no chevron
 * (the hint already says what a tap asks).
 */
export function ContextSheets({ items, onPick }: { items: ChatContextItem[]; onPick?: (prompt: string) => void }) {
  const theme = useTheme();
  return (
    <Section title={`${ASSISTANT_NAME}'nin bildikleri`}>
      <Card divided>
        {items.map((item) => (
          <ListRow
            key={item.key}
            leading={<Icon name={item.icon} duotone color={item.tint ?? theme.colors.primaryText} />}
            title={item.label}
            detail={onPick ? item.hint : undefined}
            onPress={onPick ? () => onPick(item.prompt) : undefined}
            chevron={false}
            accessibilityLabel={onPick ? `${item.label}. ${item.hint}` : item.label}
          />
        ))}
      </Card>
    </Section>
  );
}

/**
 * Portrait and phone: the same facts as chips. A tablet wraps them onto as many lines as they
 * need; a phone scrolls them sideways, and a soft fade over the clipped end shows there is
 * more. `heading` puts "Lumi'nin bildikleri" over them (the empty chat).
 */
export function ContextChips({ items, onPick, heading = false }: { items: ChatContextItem[]; onPick: (prompt: string) => void; heading?: boolean }) {
  const theme = useTheme();
  const { margin, tablet } = useWindowLayout();
  const [scroll, setScroll] = useState({ x: 0, view: 0, content: 0 });
  const title = `${ASSISTANT_NAME}'nin bildikleri`;
  const chips = items.map((item) => <Chip key={item.key} label={item.label} icon={item.icon} onPress={() => onPick(item.prompt)} />);

  const row = tablet ? (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }} accessibilityLabel={heading ? undefined : title}>
      {chips}
    </View>
  ) : (
    // Bleeds to the screen edges so chips scroll out under the margin, not into a wall.
    <View style={{ marginHorizontal: -margin }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ paddingHorizontal: margin, gap: theme.spacing.sm }}
        accessibilityLabel={title}
        scrollEventThrottle={32}
        onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
          const x = Math.round(e.nativeEvent.contentOffset.x);
          if (x !== scroll.x) setScroll((s) => ({ ...s, x }));
        }}
        onLayout={(e: LayoutChangeEvent) => {
          const view = Math.round(e.nativeEvent.layout.width);
          setScroll((s) => (s.view === view ? s : { ...s, view }));
        }}
        onContentSizeChange={(w) => {
          const content = Math.round(w);
          setScroll((s) => (s.content === content ? s : { ...s, content }));
        }}
      >
        {chips}
      </ScrollView>
      <EdgeFade side="left" shown={scroll.x > 1} />
      <EdgeFade side="right" shown={scroll.view > 0 && scroll.x + scroll.view < scroll.content - 1} />
    </View>
  );
  if (!heading) return row;
  return (
    <Section title={title} style={{ gap: theme.spacing.xs }}>
      {row}
    </Section>
  );
}

/** Paper fading in over one end of a sideways scroller; it cross-fades in and out. */
function EdgeFade({ side, shown }: { side: 'left' | 'right'; shown: boolean }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const id = `edge${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const fade = { duration: reduceMotion ? RM_FADE_MS : theme.motion.duration.base, easing: ease('standard'), reduceMotion: ReduceMotion.Never };
  const style = useAnimatedStyle(() => ({ opacity: withTiming(shown ? 1 : 0, fade) }), [shown, reduceMotion]);
  const paper = theme.colors.background;
  return (
    <Animated.View
      pointerEvents="none"
      aria-hidden
      style={[{ position: 'absolute', top: 0, bottom: 0, width: EDGE_FADE }, side === 'left' ? { left: 0 } : { right: 0 }, style]}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={id} x1={side === 'right' ? 0 : 1} y1="0" x2={side === 'right' ? 1 : 0} y2="0">
            <Stop offset="0" stopColor={paper} stopOpacity={0} />
            <Stop offset="1" stopColor={paper} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}
