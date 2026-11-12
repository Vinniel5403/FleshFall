/**
 * FleshFall JSON API (no framework).
 * Public GET routes are read-only game data. `/api/account/*` is private: only the website's
 * server (Vercel route handlers) calls it, with `Authorization: Bearer <API_SECRET>`.
 */
import { timingSafeEqual } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { isUserId } from '../game/account.js';
import * as account from './account.js';
import * as api from './api.js';

function json(res: ServerResponse, code: number, body: unknown) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

function authorized(req: IncomingMessage, secret: string): boolean {
  const got = Buffer.from(req.headers.authorization ?? '');
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

async function readJson(req: IncomingMessage, limit = 16_384): Promise<Record<string, unknown>> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const c of req as AsyncIterable<Buffer>) {
    size += c.length;
    if (size > limit) throw new Error('body too large');
    chunks.push(c);
  }
  const v: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

export interface ApiOptions {
  players: api.PlayerSource;
  /** Present only inside the bot (needs the live store + Discord client). */
  gate?: account.GuildGate;
  secret?: string;
}

async function handleAccount(req: IncomingMessage, res: ServerResponse, p: string, o: ApiOptions) {
  if (!o.gate || !o.secret) return json(res, 503, { error: 'account api disabled' });
  if (!authorized(req, o.secret)) return json(res, 401, { error: 'unauthorized' });
  if (req.method !== 'POST') return json(res, 405, { error: 'method not allowed' });
  const b = await readJson(req, 65_536).catch(() => null);
  if (!b) return json(res, 400, { error: 'bad json' });
  const uid = b.userId;
  if (!isUserId(uid)) return json(res, 400, { error: 'bad user' });
  let r: { code: number; body: unknown };
  switch (p) {
    case '/api/account/get': r = await account.getAccount(o.gate, uid); break;
    case '/api/account/create': r = await account.createAccount(o.gate, uid, b); break;
    case '/api/account/join': r = await account.joinGuild(o.gate, uid, b); break;
    case '/api/account/image/add': r = account.addImage(uid, b); break;
    case '/api/account/image/remove': r = account.removeImage(uid, b); break;
    case '/api/account/sprite/set': r = account.setSprite(uid, b); break;
    case '/api/account/sprite/clear': r = account.clearSprite(uid); break;
    default: r = { code: 404, body: { error: 'not found' } };
  }
  return json(res, r.code, r.body);
}

export function startApi(port: number, opts: ApiOptions) {
  const { players } = opts;
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const p = url.pathname;
    try {
      if (p.startsWith('/api/account/')) return await handleAccount(req, res, p, opts);
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
        return json(res, 404, { error: 'not found' });
      }
      return json(res, 404, { error: 'not found' });
    } catch (e) {
      console.warn('web error', (e as Error).message);
      return json(res, 500, { error: 'server error' });
    }
  });
  server.listen(port, () => console.log(`🌐 api on http://localhost:${port}/api${opts.gate ? ' (+ account)' : ''}`));
  return server;
}
