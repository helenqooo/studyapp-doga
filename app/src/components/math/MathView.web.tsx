import { createElement, useEffect, useRef, useState } from 'react';
import { type StyleProp, type View, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { MATH_HTML } from './mathHtml.generated';
import { handleMathMessage, useMathPayload, useSmoothHeight, type MathViewProps } from './payload';

export type { ChoiceState, ChoiceVerdict } from './payload';

/**
 * Web twin of MathView (used by the browser preview): the same bundled KaTeX page in an
 * iframe, driven with postMessage instead of the WebView bridge.
 */
export function MathView({ style, onChoice, onTyped, onVerdict, ...props }: MathViewProps & { style?: StyleProp<ViewStyle> }) {
  const ref = useRef<HTMLIFrameElement | null>(null);
  const box = useRef<View>(null);
  const [ready, setReady] = useState(false);
  const { shown, setHeight, heightStyle } = useSmoothHeight();
  const payload = useMathPayload(props);
  const handlers = useRef({ onChoice, onTyped, onVerdict });
  handlers.current = { onChoice, onTyped, onVerdict };

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (!ref.current || e.source !== ref.current.contentWindow) return;
      const h = handleMathMessage(e.data, handlers.current, (rect, done) => {
        const frame = ref.current?.getBoundingClientRect();
        if (frame) done({ ...rect, x: frame.left + rect.x, y: frame.top + rect.y });
      });
      if (h !== null) setHeight(h);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
    // setHeight is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (ready) ref.current?.contentWindow?.postMessage(JSON.stringify({ type: 'render', payload }), '*');
  }, [ready, payload]);

  return (
    <Animated.View ref={box} style={[{ opacity: shown ? 1 : 0, overflow: 'hidden' }, heightStyle, style]}>
      {createElement('iframe', {
        ref,
        srcDoc: MATH_HTML,
        title: 'Matematik',
        scrolling: 'no',
        onLoad: () => setReady(true),
        style: { border: 0, width: '100%', height: '100%', background: 'transparent', colorScheme: 'normal', display: 'block' },
      })}
    </Animated.View>
  );
}
