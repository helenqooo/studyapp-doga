import Anthropic from '@anthropic-ai/sdk';
import type { Env } from '../env';

/** A failure whose message is safe (and meant) to show to the student. */
export class AiError extends Error {}

type StreamParams = Parameters<Anthropic['beta']['messages']['stream']>[0];

export interface ClaudeRequest {
  system: StreamParams['system'];
  messages: StreamParams['messages'];
  maxTokens: number;
  outputFormat?: NonNullable<StreamParams['output_config']>['format'];
  /** Shown to the student if the model declines. */
  refusalMessage: string;
}

/** Thin wrapper around one Claude call: shared settings, error mapping, text extraction. */
export function createClaude(env: Env) {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 2 });
  const model = env.AI_MODEL;

  async function run(req: ClaudeRequest): Promise<string> {
    const outputConfig = {
      ...(req.outputFormat ? { format: req.outputFormat } : {}),
      ...(env.AI_EFFORT ? { effort: env.AI_EFFORT } : {}),
    };
    let message: Anthropic.Beta.BetaMessage;
    try {
      // Streaming avoids HTTP timeouts when a hard question needs a long think.
      const stream = client.beta.messages.stream({
        model,
        max_tokens: req.maxTokens,
        // On a policy decline, retry server-side on Anthropic's recommended fallback model.
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        thinking: { type: 'adaptive' },
        ...(Object.keys(outputConfig).length ? { output_config: outputConfig } : {}),
        system: req.system,
        messages: req.messages,
      });
      message = await stream.finalMessage();
    } catch (err) {
      if (err instanceof Anthropic.AuthenticationError) {
        throw new AiError('Sunucudaki Anthropic API anahtarı geçersiz.');
      }
      if (err instanceof Anthropic.RateLimitError) {
        throw new AiError('API limiti doldu, biraz sonra tekrar dene.');
      }
      if (err instanceof Anthropic.APIError) {
        throw new AiError(`Claude API hatası (${err.status ?? 'bağlantı'}). Tekrar dene.`, { cause: err });
      }
      throw err;
    }

    if (message.stop_reason === 'refusal') throw new AiError(req.refusalMessage);
    if (message.stop_reason === 'max_tokens') throw new AiError('Yanıt yarıda kesildi. Tekrar dene.');

    return message.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');
  }

  return { model, run };
}

export type Claude = ReturnType<typeof createClaude>;
