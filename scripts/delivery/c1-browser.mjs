// Isolated functional preview: actual candidate component + real React Query.
// Synthetic session/API only; CSS parity and application authentication are excluded.
import { build } from "esbuild";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const scratch = "D:/iBuild/Shabab-360-c0-20260911/c1-browser";
const source = "D:/iBuild/Shabab-360-c0-20260911/restore-candidate/src";
await mkdir(scratch); // Refuse to overwrite any existing scratch/baseline.
const session = resolve(scratch, "session.mjs");
await writeFile(session, 'export const useSession = () => ({ data: { user: { id: "synthetic", role: "city_head", assignedCityId: "city-a" } }, status: "authenticated" });');
await build({
  stdin: { contents: `import React from 'react'; import { createRoot } from 'react-dom/client'; import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; import { MobileEventsPage } from '${source}/components/modules/admin/mobile-events-page.tsx'; createRoot(document.getElementById('root')).render(<QueryClientProvider client={new QueryClient()}><MobileEventsPage /></QueryClientProvider>);`, loader: "tsx", resolveDir: root },
  outfile: resolve(scratch, "preview.js"), bundle: true, platform: "browser", jsx: "automatic",
  nodePaths: [resolve(root, "node_modules")], alias: { "@": source, "next-auth/react": session },
  define: { "process.env.NODE_ENV": '"production"' },
});
const requests = [];
const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://127.0.0.1:4319");
  res.setHeader("Cache-Control", "no-store");
  if (url.pathname === "/api/admin/events") {
    const scenario = new URL(req.headers.referer || "http://localhost").searchParams.get("scenario") || "array";
    const status = scenario === "denied" ? 403 : 200;
    const body = scenario === "denied" ? { error: "Synthetic denial" } : scenario === "empty" ? [] : [{ id: "synthetic-event", title: "C1 SYNTHETIC API EVENT", startDate: "2026-09-12T12:00:00Z", location: "Synthetic park" }];
    requests.push({ path: url.pathname, scenario, status, body });
    res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(body)); return;
  }
  if (url.pathname === "/evidence") { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(requests)); return; }
  if (url.pathname === "/preview.js") { res.setHeader("Content-Type", "text/javascript"); res.end(await readFile(resolve(scratch, "preview.js"))); return; }
  if (url.pathname !== "/") { res.writeHead(404); res.end(); return; }
  res.setHeader("Content-Type", "text/html");
  res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>C1 functional comparison</title><style>svg{width:18px;height:18px}body{font:14px sans-serif;max-width:460px;margin:auto}</style></head><body><div id="root"></div><script src="/preview.js"></script></body></html>');
});
server.listen(4319, "127.0.0.1", () => console.log("C1 synthetic functional preview http://127.0.0.1:4319"));
