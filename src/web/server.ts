/**
 * FleshFall JSON API for the Next.js site in web/ (no framework).
 * The site proxies /api/* here (see web/next.config.ts).
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import * as api from './api.js';

function json(res: ServerResponse, code: number, body: unknown) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 10_000) throw new Error('body too large');
  }
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
}

export function startApi(port: number, players: api.PlayerSource) {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const p = url.pathname;
    try {
      if (p.startsWith('/api/')) {
        if (req.method === 'GET') {
          switch (p) {
            case '/api/status': return json(res, 200, api.status(players));
            case '/api/world': return json(res, 200, api.world());
            case '/api/icons': return json(res, 200, api.icons());
            case '/api/roles': return json(res, 200, api.roles());
            case '/api/items': return json(res, 200, api.items());
            case '/api/bestiary': return json(res, 200, api.bestiary());
            case '/api/leaderboard': return json(res, 200, api.leaderboard(players));
          }
        }
        if (req.method === 'POST') {
          const body = await readBody(req);
          if (p === '/api/demo/start') return json(res, 200, api.demoStart(body));
          if (p === '/api/demo/act') return json(res, 200, api.demoAct(body));
        }
        return json(res, 404, { error: 'not found' });
      }
      return json(res, 404, { error: 'not found' });
    } catch (e) {
      console.warn('web error', (e as Error).message);
      return json(res, 500, { error: 'server error' });
    }
  });
  server.listen(port, () => console.log(`🌐 api on http://localhost:${port}/api`));
  return server;
}
