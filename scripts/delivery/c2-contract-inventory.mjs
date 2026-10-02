// Read-only TypeScript syntax inventory. Findings/contracts require human review.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import ts from "typescript";

const root = process.cwd(), out = path.join(root, "docs/delivery/consolidation");
const roots = { main: "D:/iBuild/Shabab-360-c0-20260911/integration", v2: "D:/iBuild/Shabab-360-c0-20260911/c2-foundation-20260912" };
const hash = data => createHash("sha256").update(data).digest("hex");
const coverage = JSON.parse(fs.readFileSync(path.join(out, "C1_COVERAGE.json")));
const patch = JSON.parse(fs.readFileSync(path.join(out, "C2_01_PATCH.json")));
for (const [name, entry] of Object.entries(patch.files)) {
  if (hash(fs.readFileSync(path.join(roots.v2, name))) !== entry.afterSha256) throw Error(`C2 candidate changed: ${name}`);
}
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
}
const http = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);
const relative = (base, file) => path.relative(base, file).replaceAll("\\", "/");
function syntax(base, file) {
  const data = fs.readFileSync(file), source = ts.createSourceFile(file, data.toString(), ts.ScriptTarget.Latest, true);
  return { source, sha256: hash(data), path: relative(base, file), line: node => source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1 };
}
function calls(ast, node) {
  const values = [];
  function visit(n) {
    if (ts.isCallExpression(n)) {
      const name = n.expression.getText(ast.source);
      if (/require|resolve|Capability|Scope|\.safeParse$|\.parse$|\.json$|^db\.|^tx\./.test(name))
        values.push({ line: ast.line(n), call: name, expression: n.getText(ast.source).replace(/\s+/g, " ").slice(0, 260) });
    }
    ts.forEachChild(n, visit);
  }
  visit(node); return values;
}
const result = { date: "2026-09-12", identities: coverage.identity, c2PatchSha256: patch.patchSha256, meaning: "Syntax/identity index, not behavioral or authorization verification", catalogues: {}, routes: {}, consumers: [] };
for (const [variant, base] of Object.entries(roots)) {
  const capFile = path.join(base, "src/lib/auth/capabilities.ts"), cap = syntax(base, capFile), variables = new Map();
  for (const stmt of cap.source.statements) if (ts.isVariableStatement(stmt))
    for (const decl of stmt.declarationList.declarations) variables.set(decl.name.getText(cap.source), decl.initializer);
  function value(node) {
    if (ts.isAsExpression(node) || ts.isParenthesizedExpression(node)) return value(node.expression);
    if (ts.isArrayLiteralExpression(node)) return node.elements.map(value);
    if (ts.isStringLiteral(node)) return node.text;
    if (ts.isIdentifier(node)) return value(variables.get(node.text));
    if (ts.isObjectLiteralExpression(node)) return Object.fromEntries(node.properties.map(p => [p.name.getText(cap.source), value(p.initializer)]));
    throw Error("Unexpected capability declaration");
  }
  result.catalogues[variant] = { path: cap.path, sha256: cap.sha256,
    capabilities: value(variables.get("ACCESS_CAPABILITIES")), userOverrides: value(variables.get("USER_OVERRIDE_CAPABILITIES")), defaults: value(variables.get("ROLE_DEFAULT_CAPABILITIES")),
    lines: Object.fromEntries([...variables].filter(([name]) => /CAPABILITIES$/.test(name)).map(([name, n]) => [name, cap.line(n)])) };
  for (const file of walk(path.join(base, "src/app/api")).filter(p => /[\\/]route\.ts$/.test(p))) {
    const ast = syntax(base, file), methods = [];
    for (const node of ast.source.statements) {
      if (ts.isFunctionDeclaration(node) && node.name && http.has(node.name.text) && node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword))
        methods.push({ method: node.name.text, line: ast.line(node), calls: calls(ast, node) });
    }
    const url = "/api/" + ast.path.slice("src/app/api/".length, -"/route.ts".length);
    result.routes[ast.path] ??= {};
    result.routes[ast.path][variant] = { url, sha256: ast.sha256, methods, calls: calls(ast, ast.source) };
  }
  for (const file of walk(path.join(base, "src")).filter(p => /\.tsx?$/.test(p) && !/\.test\./.test(p) && !/[\\/]api[\\/].*[\\/]route\.ts$/.test(p))) {
    const ast = syntax(base, file);
    function visit(node) {
      if (ts.isCallExpression(node) && node.arguments[0] && (ts.isStringLiteralLike(node.arguments[0]) || ts.isTemplateExpression(node.arguments[0]))) {
        const first = node.arguments[0].getText(ast.source);
        if (first?.includes("/api/")) result.consumers.push({ variant, path: ast.path, sha256: ast.sha256, line: ast.line(node), call: node.expression.getText(ast.source), request: first,
          options: node.arguments[1]?.getText(ast.source).replace(/\s+/g, " ").slice(0, 180) ?? "GET default" });
      }
      ts.forEachChild(node, visit);
    }
    visit(ast.source);
  }
}
result.conflicts = [...coverage.mainOnlyPaths, ...coverage.changedSharedPaths].filter(r => r.path.startsWith("src/app/api/") && r.path.endsWith("/route.ts")).map(r => ({ path: r.path, register: r.register }));
result.counts = { mainCapabilities: result.catalogues.main.capabilities.length, v2Capabilities: result.catalogues.v2.capabilities.length,
  unionCapabilities: new Set(Object.values(result.catalogues).flatMap(c => c.capabilities)).size, conflictPaths: result.conflicts.length,
  routes: Object.keys(result.routes).length, literalApiConsumerCalls: result.consumers.length };
fs.writeFileSync(path.join(out, "C2_02_INVENTORY.json"), JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result.counts));
