// Read-only public smoke checks. No credentials or mutation requests are sent.
import { writeFile } from 'node:fs/promises';

const frontend = (process.env.COURSEHUB_FRONTEND_URL || 'https://group36-coursehub.vercel.app').replace(/\/$/, '');
const backend = (process.env.COURSEHUB_BACKEND_URL || 'https://coursehub-backend-ahz2.onrender.com').replace(/\/$/, '');
const output = process.argv[2];
const cases = [];

async function get(origin, path) {
  const started = Date.now();
  const response = await fetch(`${origin}${path}`, { redirect: 'follow', signal: AbortSignal.timeout(120_000) });
  const body = await response.text();
  return { response, body, durationMs: Date.now() - started };
}

async function check(id, origin, path, verify) {
  try {
    const { response, body, durationMs } = await get(origin, path);
    const detail = verify(response, body);
    cases.push({ id, result: detail === true ? 'pass' : 'fail', status: response.status, durationMs,
      evidence: detail === true ? `${new URL(path, origin)} → HTTP ${response.status}` : String(detail) });
  } catch (error) {
    cases.push({ id, result: 'blocked', evidence: `${error.name}: ${error.message}` });
  }
}

const html = (response, body) => response.status === 200 && response.headers.get('content-type')?.includes('text/html') && body.includes('id="root"') || 'Expected HTTP 200 CourseHub HTML';
const json = (response, body, predicate) => {
  if (response.status !== 200 || !response.headers.get('content-type')?.includes('application/json')) return `Expected HTTP 200 JSON, got ${response.status} ${response.headers.get('content-type')}`;
  try { return predicate(JSON.parse(body)) || 'Unexpected JSON shape'; }
  catch { return 'Invalid JSON'; }
};

await check('render-liveness', backend, '/api/v1/system/liveness', (r, b) => json(r, b, (data) => data.status === 'UP'));
await Promise.all([
check('home', frontend, '/', html),
check('hero-asset', frontend, '/images/coursehub-learning-orbit.webp', (r) => r.status === 200 && r.headers.get('content-type')?.includes('image/webp') || 'Expected HTTP 200 WebP'),
check('match-direct', frontend, '/match', html),
check('match-refresh', frontend, '/match', html),
check('vercel-liveness', frontend, '/api/v1/system/liveness', (r, b) => json(r, b, (data) => data.status === 'UP')),
check('swagger-ui', backend, '/swagger-ui/index.html', (r, b) => r.status === 200 && b.includes('Swagger UI') || 'Expected HTTP 200 Swagger UI'),
check('catalog-courses', frontend, '/api/v1/courses?page=0&size=1', (r, b) => json(r, b, (data) => Array.isArray(data.content))),
check('catalog-categories', frontend, '/api/v1/catalog/categories', (r, b) => json(r, b, Array.isArray)),
check('catalog-platforms', frontend, '/api/v1/catalog/platforms', (r, b) => json(r, b, Array.isArray)),
check('matcher-openapi', backend, '/v3/api-docs', (r, b) => json(r, b, (data) => Boolean(data.paths?.['/api/v1/course-matches']?.post))),
check('guest-me', frontend, '/api/v1/me', (r) => r.status === 401 || `Expected HTTP 401, got ${r.status}`),
check('guest-admin', frontend, '/api/v1/admin/courses', (r) => [401, 403].includes(r.status) || `Expected HTTP 401/403, got ${r.status}`),
check('csrf-cookie', frontend, '/api/v1/auth/csrf', (r, b) => {
  const validJson = json(r, b, (data) => Boolean(data.token));
  if (validJson !== true) return validJson;
  const cookie = r.headers.getSetCookie().find((value) => value.startsWith('XSRF-TOKEN='));
  return cookie && /;\s*Secure(?:;|$)/i.test(cookie) ? true : 'Missing Secure XSRF-TOKEN cookie';
}),
]);

const report = { observedAt: new Date().toISOString(), frontend, backend, method: 'GET only', cases,
  counts: Object.fromEntries(['pass', 'fail', 'blocked'].map((result) => [result, cases.filter((item) => item.result === result).length])) };
const encoded = `${JSON.stringify(report, null, 2)}\n`;
if (output) await writeFile(output, encoded);
process.stdout.write(encoded);
process.exitCode = report.counts.fail || report.counts.blocked ? 1 : 0;
