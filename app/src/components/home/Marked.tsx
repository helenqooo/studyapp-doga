import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { useTheme } from '../../theme';
import { Highlight } from '../Highlight';

/**
 * A Highlight clipped to its own swipe (the text plus the lead-in and tail). Works around
 * the undrawn Highlight showing a sliver of its slanted band left of the text, which reads
 * as a stray mark in dark mode. Layout is unchanged: the clip's padding is offset by margins.
 */
// TODO(P0): drop this wrapper once Highlight's clip is 0 wide at progress 0.
export function Marked(props: ComponentProps<typeof Highlight>) {
  const theme = useTheme();
  const { leadIn, tail } = theme.layout.highlight;
  return (
    <View style={{ overflow: 'hidden', alignSelf: 'flex-start', paddingLeft: leadIn, paddingRight: tail, marginLeft: -leadIn, marginRight: -tail }}>
      <Highlight {...props} />
    </View>
  );
}
