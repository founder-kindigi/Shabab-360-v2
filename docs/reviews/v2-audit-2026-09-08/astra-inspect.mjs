import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import http from 'node:http';
const dir = 'docs/reviews/v2-audit-2026-09-08';
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
if (process.argv[2] === 'serve') {
  const html = fs.readFileSync(`${dir}/astra-minutes-fixture.html`);
  const server = http.createServer((req, res) => {
    if (req.url !== '/minutes') { res.writeHead(404); return res.end(); }
    // Same script policy as next.config.ts; no app session or database involved.
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'" });
    res.end(html);
  });
  server.listen(4309, '127.0.0.1', () => console.log('Synthetic minutes fixture: http://127.0.0.1:4309/minutes'));
} else {
  const changed = execFileSync('git', ['diff', '--name-only', '--', 'src'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  const added = execFileSync('git', ['ls-files', '--others', '--exclude-standard', '--', 'src'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  const files = [...changed, ...added].sort().map(file => ({ file, sha256: hash(fs.readFileSync(file)) }));
  const sql = walk('prisma/postgres/migrations').filter(f => f.endsWith('.sql')).map(f => fs.readFileSync(f, 'utf8')).join('\n');
  const schema = fs.readFileSync('prisma/postgres/schema.prisma', 'utf8');
  const modeled = [...schema.matchAll(/model\s+(\w+)\s*\{([\s\S]*?)\n\}/g)].map(m => ({ model: m[1], table: m[2].match(/@@map\("([^"]+)"\)/)?.[1] || m[1] }));
  const created = [...sql.matchAll(/CREATE\s+TABLE\s+(?:IF NOT EXISTS\s+)?"([^"]+)"/gi)].map(m => m[1]);
  const sourceImports = walk('src').filter(f => /\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(f) && !f.endsWith('.test.ts')).filter(f => fs.readFileSync(f, 'utf8').includes('portal-raw-dataset'));
  const result = { base: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), diffIdentity: hash(JSON.stringify(files)), files, sourceDatasetReferences: sourceImports, postgres: { modeledCount: modeled.length, migrationFiles: walk('prisma/postgres/migrations').filter(f => f.endsWith('.sql')).length, missingCreation: modeled.filter(m => !created.includes(m.table)) } };
  fs.writeFileSync(`${dir}/astra-candidate-manifest.json`, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ ...result, files: files.length }, null, 2));
}
