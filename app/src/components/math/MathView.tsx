import { useEffect, useMemo, useRef, useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { useTheme } from '../../theme';
import { MATH_HTML } from './mathHtml.generated';

interface Props {
  /** Markdown with $inline$ and $$display$$ LaTeX. */
  markdown: string;
  fontSize?: number;
  style?: StyleProp<ViewStyle>;
}

const SOURCE = { html: MATH_HTML };

/**
 * Renders markdown + LaTeX with KaTeX inside a WebView that sizes itself to its content.
 * KaTeX and its fonts are bundled (see scripts/build-math-html.mjs), so it works offline.
 */
export function MathView({ markdown, fontSize, style }: Props) {
  const theme = useTheme();
  const ref = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const [height, setHeight] = useState(0);

  const payload = useMemo(
    () =>
      JSON.stringify({
        markdown,
        vars: {
          text: theme.colors.text,
          muted: theme.colors.textMuted,
          accent: theme.colors.primaryText,
          'answer-bg': theme.colors.primarySoft,
          border: theme.colors.border,
          'code-bg': theme.colors.surfaceAlt,
          'font-size': `${fontSize ?? theme.fontSize.md}px`,
        },
      }),
    [markdown, theme, fontSize],
  );

  useEffect(() => {
    if (ready) ref.current?.injectJavaScript(`window.__render(${payload}); true;`);
  }, [ready, payload]);

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data) as { type?: string; height?: number };
      if (msg.type === 'height' && typeof msg.height === 'number') setHeight(msg.height);
    } catch {
      // ignore unrelated messages
    }
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
