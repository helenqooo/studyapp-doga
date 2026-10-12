import { createElement, useEffect, useRef, useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { MATH_HTML } from './mathHtml.generated';
import { handleMathMessage, useMathPayload, type MathViewProps } from './payload';

export type { ChoiceState } from './payload';

/**
 * Web twin of MathView (used by the browser preview): the same bundled KaTeX page in an
 * iframe, driven with postMessage instead of the WebView bridge.
 */
export function MathView({ style, onChoice, onTyped, ...props }: MathViewProps & { style?: StyleProp<ViewStyle> }) {
  const ref = useRef<HTMLIFrameElement | null>(null);
  const [ready, setReady] = useState(false);
  const [height, setHeight] = useState(0);
  const payload = useMathPayload(props);
  const handlers = useRef({ onChoice, onTyped });
  handlers.current = { onChoice, onTyped };

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (!ref.current || e.source !== ref.current.contentWindow) return;
      const h = handleMathMessage(e.data, handlers.current);
      if (h !== null) setHeight(h);
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
        scrolling: 'no',
        onLoad: () => setReady(true),
        style: { border: 0, width: '100%', height: '100%', background: 'transparent', colorScheme: 'normal', display: 'block' },
      })}
    </View>
  );
}
