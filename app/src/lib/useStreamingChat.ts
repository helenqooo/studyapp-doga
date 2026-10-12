import { useCallback, useEffect, useRef, useState } from 'react';
import type { OnDelta } from '../api/client';
import type { ChatExchange, ChatMessage } from '../api/types';

/** The exchange in flight: the student's message and the reply as it arrives. */
export interface LiveExchange {
  key: string;
  user: string;
  text: string;
  status: 'waiting' | 'streaming' | 'done' | 'error';
  result?: ChatExchange;
  error?: string;
}

type Send = (content: string, onDelta: OnDelta, signal: AbortSignal) => Promise<ChatExchange>;

/**
 * Sends a chat message and follows its streamed reply. Pieces are gathered and passed
 * on about 20 times a second, which is plenty for the typing animation.
 */
export function useStreamingChat(send: Send, onDone: (result: ChatExchange) => void) {
  const [live, setLive] = useState<LiveExchange | null>(null);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);

  const submit = useCallback(
    async (content: string): Promise<boolean> => {
      abort.current?.abort();
      const ctrl = new AbortController();
      abort.current = ctrl;
      const key = `live-${Date.now()}`;
      const update = (patch: Partial<LiveExchange>) => setLive((l) => (l && l.key === key ? { ...l, ...patch } : l));
      setLive({ key, user: content, text: '', status: 'waiting' });

      let text = '';
      let timer: ReturnType<typeof setTimeout> | null = null;
      const flush = () => {
        timer = null;
        update({ text, status: 'streaming' });
      };
      try {
        const result = await send(
          content,
          (delta) => {
            text += delta;
            if (!timer) timer = setTimeout(flush, 50);
          },
          ctrl.signal,
        );
        if (timer) clearTimeout(timer);
        update({ text: result.assistantMessage.content, status: 'done', result });
        onDone(result);
        return true;
      } catch (e) {
        if (timer) clearTimeout(timer);
        if (ctrl.signal.aborted) return false;
        update({ status: 'error', error: e instanceof Error ? e.message : 'Yanıt alınamadı.' });
        return false;
      }
    },
    [send, onDone],
  );

  return { live, submit, dismiss: useCallback(() => setLive(null), []) };
}

/** One row of the conversation as drawn, with a key that survives the live → stored switch. */
export interface ChatRow {
  key: string;
  role: 'user' | 'assistant';
  content: string;
  /** The reply that just arrived (it types out); `waiting` before its first words. */
  live?: 'waiting' | 'streaming' | 'done';
}

/**
 * The stored thread plus the exchange in flight. The live reply keeps its key once the
 * stored copy arrives, so its view (and its typing animation) carries on, not restarts.
 */
export function chatRows(stored: ChatMessage[], live: LiveExchange | null): ChatRow[] {
  const rows: ChatRow[] = [];
  const ids = live?.result ? { user: live.result.userMessage.id, assistant: live.result.assistantMessage.id } : null;
  for (const m of stored) {
    if (ids && m.id === ids.user) rows.push({ key: `${live!.key}-u`, role: 'user', content: m.content });
    else if (ids && m.id === ids.assistant) rows.push({ key: live!.key, role: 'assistant', content: m.content, live: 'done' });
    else rows.push({ key: m.id, role: m.role, content: m.content });
  }
  if (live && !(ids && stored.some((m) => m.id === ids.assistant))) {
    rows.push({ key: `${live.key}-u`, role: 'user', content: live.user });
    if (live.status !== 'error') {
      rows.push({ key: live.key, role: 'assistant', content: live.text, live: live.status === 'done' ? 'done' : live.status });
    }
  }
  return rows;
}
