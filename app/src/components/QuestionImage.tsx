import { useState } from 'react';
import { Image, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { authHeaders, questionImageUrl } from '../api/client';
import { useSolveStore } from '../store/solveStore';
import { useTheme } from '../theme';

interface Props {
  questionId: string;
  /** `thumb` is a small square; the others set the collapsed height, and tapping expands. */
  size?: 'thumb' | 'compact' | 'regular' | 'large';
  style?: StyleProp<ViewStyle>;
}

/** The question photo: the local cropped copy when we have it, otherwise fetched with auth. */
export function QuestionImage({ questionId, size = 'regular', style }: Props) {
  const theme = useTheme();
  const local = useSolveStore((s) => s.localImages[questionId]);
  const [expanded, setExpanded] = useState(false);
  const source = local ? { uri: local.uri } : { uri: questionImageUrl(questionId), headers: authHeaders };

  if (size === 'thumb') {
    const side = theme.layout.minTouch + theme.spacing.md;
    return (
      <View
        style={[
          { width: side, height: side, borderRadius: theme.radius.sm, overflow: 'hidden', backgroundColor: theme.colors.surfaceAlt },
          style,
        ]}
      >
        <Image source={source} resizeMode="cover" style={{ flex: 1 }} />
      </View>
    );
  }

  const rows = { compact: 3, regular: 5, large: 8 }[size];
  return (
    <Pressable
      accessibilityRole="imagebutton"
      accessibilityLabel={expanded ? 'Görseli küçült' : 'Görseli büyüt'}
      onPress={() => setExpanded((e) => !e)}
      style={[
        {
          height: theme.layout.minTouch * (expanded ? 11 : rows),
          borderRadius: theme.radius.md,
          overflow: 'hidden',
          backgroundColor: theme.colors.surfaceAlt,
        },
        style,
      ]}
    >
      <Image source={source} resizeMode="contain" style={{ flex: 1 }} />
    </Pressable>
  );
}
