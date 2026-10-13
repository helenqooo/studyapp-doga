import { useState } from 'react';
import { Platform, ScrollView, TextInput, View } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useReducedMotion, withTiming } from 'react-native-reanimated';
import { ASSISTANT_NAME } from '../../brand';
import { useFontScale, useWindowLayout } from '../../lib/layout';
import type { ChatRow } from '../../lib/useStreamingChat';
import { elevated, font, useTheme } from '../../theme';
import { AppText } from '../AppText';
import { Bubble } from '../Bubble';
import { Card } from '../Card';
import { Chip } from '../Chip';
import { Icon, type IconName } from '../Icon';
import { MathView } from '../math/MathView';
import { Mascot, type MascotMood } from '../mascot/Mascot';
import { Loader } from '../motion/Loader';
import { PressableScale } from '../motion/PressableScale';
import { ease } from '../motion/presets';

// TOKEN-PENDING: motion.duration.rmFade = 120 (the Reduce Motion cross-fade, spec 0.7 / 5.6)
const RM_FADE_MS = 120;
// TOKEN-PENDING: layout.chat.composerMin = 48 (the composer well's single-line height, spec 7.6)
const COMPOSER_MIN = 48;
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
          typing={row.live === 'streaming' ? 'stream' : row.live === 'done' ? 'type' : 'off'}
          onTyped={onTyped}
        />
      </View>
    </View>
  );
}

/**
 * The composer: a flat well that starts as one 48 pt line and grows to four, and the send
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
  const reduceMotion = useReducedMotion();
  const [focused, setFocused] = useState(false);
  const canSend = !busy && !!value.trim();

  const body = theme.typography.body;
  const lineHeight = Math.round(fs.md * body.lineRatio);
  const padY = Math.max(0, (COMPOSER_MIN - lineHeight) / 2);
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
            minHeight: COMPOSER_MIN - theme.layout.selectedBorder * 2,
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
        style={{ minWidth: theme.layout.minTouch, height: COMPOSER_MIN, alignItems: 'center', justifyContent: 'center' }}
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

/** The empty assistant's starters: a centered 2×2 grid of cards (icon plus text). */
export function PromptGrid({ prompts, onPick }: { prompts: ChatPrompt[]; onPick: (text: string) => void }) {
  const theme = useTheme();
  const rows: ChatPrompt[][] = [];
  for (let i = 0; i < prompts.length; i += 2) rows.push(prompts.slice(i, i + 2));
  return (
    <View style={{ width: '100%', maxWidth: theme.layout.readableWidth, alignSelf: 'center', gap: theme.spacing.md }}>
      {rows.map((pair) => (
        <View key={pair.map((p) => p.text).join('|')} style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          {pair.map((p) => (
            <View key={p.text} style={{ flex: 1 }}>
              <Card onPress={() => onPick(p.text)} accessibilityLabel={p.text} style={{ flex: 1 }}>
                <Icon name={p.icon} duotone color={theme.colors.primaryText} />
                <AppText weight="medium">{p.text}</AppText>
              </Card>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

/**
 * Landscape: "Lumi'nin bildikleri", a column of sheets that each ask about one fact. Without
 * `onPick` (no messages left) they are plain facts: no press, no question hint.
 */
export function ContextSheets({ items, onPick }: { items: ChatContextItem[]; onPick?: (prompt: string) => void }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.md }}>
      <AppText variant="heading" accessibilityRole="header">
        {ASSISTANT_NAME}&apos;nin bildikleri
      </AppText>
      {items.map((item) => (
        <Card
          key={item.key}
          onPress={onPick ? () => onPick(item.prompt) : undefined}
          accessibilityLabel={onPick ? `${item.label}. ${item.hint}` : item.label}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md }}>
            <Icon name={item.icon} duotone color={item.tint ?? theme.colors.primaryText} />
            <View style={{ flex: 1, gap: theme.spacing.xxs }}>
              <AppText weight="semibold">{item.label}</AppText>
              {onPick ? (
                <AppText variant="caption" color="textMuted">
                  {item.hint}
                </AppText>
              ) : null}
            </View>
          </View>
        </Card>
      ))}
    </View>
  );
}

/** Portrait and phone: the same facts as a horizontal row of chips above the thread. */
export function ContextChips({ items, onPick }: { items: ChatContextItem[]; onPick: (prompt: string) => void }) {
  const theme = useTheme();
  const { margin } = useWindowLayout();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // Bleeds to the screen edges so chips scroll out under the margin, not into a wall.
      style={{ marginHorizontal: -margin, flexGrow: 0 }}
      contentContainerStyle={{ paddingHorizontal: margin, gap: theme.spacing.sm }}
      accessibilityLabel={`${ASSISTANT_NAME}'nin bildikleri`}
    >
      {items.map((item) => (
        <Chip key={item.key} label={item.label} icon={item.icon} onPress={() => onPick(item.prompt)} />
      ))}
    </ScrollView>
  );
}
