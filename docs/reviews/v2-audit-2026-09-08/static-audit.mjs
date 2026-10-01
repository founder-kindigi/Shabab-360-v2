// Read-only source inventory. No database, credential, or personal field values are printed.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const walk = (dir) => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((entry) => {
  const file = `${dir}/${entry.name}`;
  return entry.isDirectory() ? walk(file) : [file];
});
const routes = walk('src/app/api').filter((file) => file.endsWith('/route.ts'));
const routeInventory = routes.map((file) => {
  const source = read(file);
  return {
    file,
    methods: [...source.matchAll(/export async function (GET|POST|PUT|PATCH|DELETE)/g)].map((match) => match[1]),
    // These are search aids, not proof of adequate or missing authorization.
    mentionsCapabilityGate: /requireCapability|userHasCapability/.test(source),
    mentionsScopeGate: /requireResourceScope|canAccess|verify\w*Access|resolveActorCity|verifyCalling/.test(source),
  };
});
const migrationFiles = walk('prisma/postgres/migrations').filter((file) => file.endsWith('/migration.sql'));
const migrations = migrationFiles.map(read).join('\n');
const mappedTables = [...read('prisma/postgres/schema.prisma').matchAll(/@@map\("([^"]+)"\)/g)].map((match) => match[1]);
const createdTables = new Set([...migrations.matchAll(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?"([^"]+)"/gi)].map((match) => match[1]));
const missingMigrationTables = mappedTables.filter((table) => !createdTables.has(table));
const sourceFiles = walk('src').filter((file) => /\.(tsx?|mjs|js)$/.test(file) && !/\.test\./.test(file));
const clientDatasetImports = sourceFiles.filter((file) => {
  const source = read(file);
  return /^['"]use client['"];/.test(source.trim()) && /import .*portal-raw-dataset\.json/.test(source);
});
const dataset = JSON.parse(read('src/lib/import-framework/portal-raw-dataset.json'));
const serviceWorkerCallers = sourceFiles.filter((file) => file !== 'src/hooks/use-service-worker.ts' && /useServiceWorker|serviceWorker\.register/.test(read(file)));
const clientBundleVerification = fs.existsSync(path.join(root, '.next/static/chunks'))
  ? walk('.next/static/chunks').filter((file) => file.endsWith('.js')).flatMap((file) => {
    const source = read(file);
    if (!source.includes('medicalIssue') || !source.includes('rawFields')) return [];
    return [{
      file,
      matchingMobileRows: dataset.filter((row) => row.mobile && source.includes(JSON.stringify(row.mobile))).length,
      matchingAddressRows: dataset.filter((row) => row.address && source.includes(JSON.stringify(row.address))).length,
    }];
  }) : [];
const result = {
  auditedCommit: execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  compiledAssetNote: 'Existing local build assets were inspected; their source commit is not inferred from current HEAD.',
  routeFiles: routes.length,
  handlers: routeInventory.reduce((sum, route) => sum + route.methods.length, 0),
  postgresModels: mappedTables.length,
  postgresMigrationFiles: migrationFiles.length,
  missingMigrationTables,
  clientDatasetImports,
  clientBundleVerification,
  bundledDatasetRows: dataset.length,
  bundledDatasetFieldNames: Object.keys(dataset[0] || {}),
  serviceWorkerCallers,
  routeInventory,
};
fs.writeFileSync(new URL('./static-inventory.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ ...result, routeInventory: undefined, bundledDatasetFieldNames: undefined }, null, 2));
