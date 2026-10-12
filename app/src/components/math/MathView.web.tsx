import { createElement, useEffect, useMemo, useRef, useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme';
import { MATH_HTML } from './mathHtml.generated';

interface Props {
  /** Markdown with $inline$ and $$display$$ LaTeX. */
  markdown: string;
  fontSize?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Web twin of MathView (used by the browser preview): the same bundled KaTeX page in an
 * iframe, driven with postMessage instead of the WebView bridge.
 */
export function MathView({ markdown, fontSize, style }: Props) {
  const theme = useTheme();
  const ref = useRef<HTMLIFrameElement | null>(null);
  const [ready, setReady] = useState(false);
  const [height, setHeight] = useState(0);

  const payload = useMemo(
    () => ({
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
    const onMessage = (e: MessageEvent) => {
      if (!ref.current || e.source !== ref.current.contentWindow || typeof e.data !== 'string') return;
      try {
        const msg = JSON.parse(e.data) as { type?: string; height?: number };
        if (msg.type === 'height' && typeof msg.height === 'number') setHeight(msg.height);
      } catch {
        // ignore unrelated messages
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    if (ready) ref.current?.contentWindow?.postMessage(JSON.stringify({ type: 'render', payload }), '*');
  }, [ready, payload]);

  return (
    <View style={[{ height, opacity: height > 0 ? 1 : 0 }, style]}>
      {createElement('iframe', {
        ref,
        srcDoc: MATH_HTML,
        title: 'Matematik',
        onLoad: () => setReady(true),
        style: { border: 0, width: '100%', height: '100%', background: 'transparent', colorScheme: 'normal', display: 'block' },
      })}
    </View>
  );
}
