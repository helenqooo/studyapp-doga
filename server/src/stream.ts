import type { FastifyReply, FastifyRequest } from 'fastify';

// Chat replies can stream: a client that sends "Accept: application/x-ndjson" gets one
// JSON object per line as the reply is written ({type: "delta", text}), then a final
// {type: "done", ...} or {type: "error", error}. Other clients get one JSON response.

export function wantsStream(req: FastifyRequest): boolean {
  return (req.headers.accept ?? '').includes('application/x-ndjson');
}

export function openStream(reply: FastifyReply) {
  reply.hijack();
  const res = reply.raw;
  res.writeHead(200, {
    'Content-Type': 'application/x-ndjson; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    // Reverse proxies (nginx, Caddy) must not hold the stream back.
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders?.();
  let open = true;
  res.on('close', () => {
    open = false;
  });
  return {
    send(obj: unknown) {
      // The student may leave mid-reply; the reply is still saved, only not sent.
      if (open && !res.writableEnded) res.write(`${JSON.stringify(obj)}\n`);
    },
    end() {
      if (!res.writableEnded) res.end();
    },
  };
}
