import { useEffect, useRef, useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { useTheme } from '../../theme';
import { MATH_HTML } from './mathHtml.generated';
import { handleMathMessage, useMathPayload, type MathViewProps } from './payload';

export type { ChoiceState } from './payload';

const SOURCE = { html: MATH_HTML };

/**
 * Renders markdown + LaTeX with KaTeX inside a WebView that sizes itself to its content,
 * optionally with answer-choice buttons and a typing animation.
 * KaTeX and its fonts are bundled (see scripts/build-math-html.mjs), so it works offline.
 */
export function MathView({ style, onChoice, onTyped, ...props }: MathViewProps & { style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const ref = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const [height, setHeight] = useState(0);
  const payload = useMathPayload(props);
  // Latest callbacks, so a re-render doesn't need to re-send the page anything.
  const handlers = useRef({ onChoice, onTyped });
  handlers.current = { onChoice, onTyped };

  useEffect(() => {
    if (ready) ref.current?.injectJavaScript(`window.__render(${JSON.stringify(payload)}); true;`);
  }, [ready, payload]);

  const onMessage = (e: WebViewMessageEvent) => {
    const h = handleMathMessage(e.nativeEvent.data, handlers.current);
    if (h !== null) setHeight(h);
  };

  return (
    <View style={[{ height, opacity: height > 0 ? 1 : 0 }, style]}>
      <WebView
        ref={ref}
        source={SOURCE}
        originWhitelist={['*']}
        onLoadEnd={() => setReady(true)}
        onMessage={onMessage}
        // Links inside solutions must not navigate the inline view away.
        onShouldStartLoadWithRequest={(req) => !/^https?:/i.test(req.url)}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        setSupportMultipleWindows={false}
        style={{ backgroundColor: theme.colors.transparent }}
        containerStyle={{ backgroundColor: theme.colors.transparent }}
      />
    </View>
  );
}
