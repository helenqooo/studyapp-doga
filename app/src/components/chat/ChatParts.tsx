import { useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { ASSISTANT_NAME } from '../../brand';
import type { ChatRow } from '../../lib/useStreamingChat';
import { font, useTheme } from '../../theme';
import { AppText } from '../AppText';
import { Icon } from '../Icon';
import { MathView } from '../math/MathView';
import { Mascot, type MascotMood } from '../mascot/Mascot';

/** Three dots bouncing in turn: the reply hasn't started yet. */
export function TypingDots() {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  return (
    <View
      accessibilityLabel={`${ASSISTANT_NAME} yazıyor`}
      style={{ flexDirection: 'row', gap: theme.spacing.xs, paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.xxs }}
    >
      {[0, 1, 2].map((i) => (
        <Dot key={i} index={i} still={reduceMotion} />
      ))}
    </View>
  );
}

function Dot({ index, still }: { index: number; still: boolean }) {
  const theme = useTheme();
  const t = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    const d = theme.motion.duration.base;
    t.value = withDelay(
      index * (d / 2),
      withRepeat(withSequence(withTiming(1, { duration: d, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: d, easing: Easing.in(Easing.quad) }), withTiming(0, { duration: d })), -1),
    );
  }, [index, still, t, theme.motion.duration.base]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: -theme.layout.chatDot * t.value }], opacity: 0.45 + 0.55 * t.value }));
  return (
    <Animated.View
      style={[
        { width: theme.layout.chatDot, height: theme.layout.chatDot, borderRadius: theme.radius.pill, backgroundColor: theme.colors.primaryText },
        style,
      ]}
    />
  );
}

/** One message. A live reply types out; the newest reply's avatar reacts. */
export function ChatBubble({ row, avatarMood, onTyped }: { row: ChatRow; avatarMood?: MascotMood; onTyped?: () => void }) {
  const theme = useTheme();
  if (row.role === 'user') {
    return (
      <View
        style={{
          alignSelf: 'flex-end',
          maxWidth: '85%',
          backgroundColor: theme.colors.primarySoft,
          borderRadius: theme.radius.lg,
          borderBottomRightRadius: theme.radius.sm,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
        }}
      >
        <AppText selectable>{row.content}</AppText>
      </View>
    );
  }
  // Replies read like a page (no bubble), next to the assistant.
  return (
    <View style={{ alignSelf: 'stretch', flexDirection: 'row', gap: theme.spacing.sm }}>
      <View style={{ width: theme.layout.chatAvatar, height: theme.layout.chatAvatar }}>
        <Mascot size={theme.layout.chatAvatar} mood={avatarMood ?? 'idle'} still={!avatarMood} />
      </View>
      <View style={{ flex: 1, paddingTop: theme.spacing.xxs }}>
        {row.live === 'waiting' ? <TypingDots /> : null}
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

/** Text box and send button. */
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
  const [focused, setFocused] = useState(false);
  const canSend = !busy && !!value.trim();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing.sm }}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        multiline
        maxLength={2000}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabel="Mesajın"
        style={{
          flex: 1,
          minHeight: theme.layout.minTouch,
          maxHeight: theme.layout.minTouch * 3,
          paddingHorizontal: theme.spacing.md,
          paddingTop: theme.spacing.md,
          paddingBottom: theme.spacing.md,
          borderRadius: theme.radius.lg,
          backgroundColor: theme.colors.surfaceAlt,
          borderWidth: theme.layout.borderWidth,
          borderColor: focused ? theme.colors.primaryText : theme.colors.transparent,
          color: theme.colors.text,
          fontSize: theme.fontSize.md,
          ...font('sans'),
        }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Gönder"
        accessibilityState={{ disabled: !canSend }}
        disabled={!canSend}
        onPress={onSend}
        style={{
          width: theme.layout.minTouch,
          height: theme.layout.minTouch,
          borderRadius: theme.radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: canSend ? theme.colors.primary : theme.colors.surfaceAlt,
        }}
      >
        <Icon name="arrow-up" size={theme.layout.iconSize.md} color={canSend ? theme.colors.textOnAccent : theme.colors.textMuted} />
      </Pressable>
    </View>
  );
}
