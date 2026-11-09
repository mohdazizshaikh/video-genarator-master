/** Static route/build consistency, plus parser regression fixtures.
 * This does not replace actual request or browser acceptance tests. */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import ts from "typescript";

const methods = new Set(["get", "post", "put", "patch", "delete", "head", "options", "all"]);
function parse(text: string) { return ts.createSourceFile("inventory.ts", text, ts.ScriptTarget.Latest, true); }
function visit(node: ts.Node, action: (node: ts.Node) => void) { action(node); ts.forEachChild(node, (child) => visit(child, action)); }
function identifiers(node: ts.Node): string[] { const names: string[] = []; visit(node, (child) => { if (ts.isIdentifier(child)) names.push(child.text); }); return names; }
function literalPaths(node: ts.Node | undefined): string[] {
  if (!node) return [];
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return [node.text];
  if (ts.isArrayLiteralExpression(node)) {
    const paths = node.elements.map((entry) => literalPaths(entry));
    return paths.every((entry) => entry.length > 0) ? paths.flat() : [];
  }
  return [];
}
function routes(text: string, className?: string): string[] {
  const result: string[] = [];
  visit(parse(text), (node) => {
    if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) return;
    let owner: ts.Node | undefined = node.parent;
    while (owner && !ts.isClassDeclaration(owner)) owner = owner.parent;
    if (className && (!owner || !ts.isClassDeclaration(owner) || owner.name?.text !== className)) return;
    const receiver = node.expression.expression;
    if (!ts.isPropertyAccessExpression(receiver) || receiver.expression.kind !== ts.SyntaxKind.ThisKeyword || receiver.name.text !== "router" || !methods.has(node.expression.name.text)) return;
    const paths = literalPaths(node.arguments[0]);
    if (!paths.length) throw new Error(`Unresolved route registration: ${node.getText()}`);
    const method = node.expression.name.text.toUpperCase();
    result.push(...paths.map((route) => `${method} ${route}`));
  });
  return result.sort();
}
function mounts(text: string, defaultImports = new Map<string, string>()): Map<string, Set<string>> {
  const moduleDefaults = new Map<string, string>();
  visit(parse(text), (node) => {
    if (!ts.isVariableDeclaration(node) || !ts.isIdentifier(node.name) || !node.initializer) return;
    const variable = node.name.text;
    visit(node.initializer, (child) => {
      if (ts.isCallExpression(child) && ts.isIdentifier(child.expression) && child.expression.text === "require") {
        const imported = literalPaths(child.arguments[0])[0];
        if (imported && defaultImports.has(imported)) moduleDefaults.set(variable, defaultImports.get(imported)!);
      }
    });
  });
  const graph = new Map<string, Set<string>>();
  const constructors = new Map<string, string>();
  const mounted: { prefix: string; references: string[] }[] = [];
  const edge = (name: string, value: ts.Node) => {
    const refs = graph.get(name) || new Set<string>(); identifiers(value).forEach((ref) => { if (ref !== name) refs.add(ref); }); graph.set(name, refs);
    if (ts.isNewExpression(value)) {
      const expression = value.expression;
      const constructor = ts.isIdentifier(expression) ? expression.text : ts.isPropertyAccessExpression(expression) ? (expression.name.text === "default" && ts.isIdentifier(expression.expression) ? moduleDefaults.get(expression.expression.text) || "" : expression.name.text) : "";
      if (constructor.endsWith("Router")) constructors.set(name, constructor);
    }
  };
  visit(parse(text), (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) edge(node.name.text, node.initializer);
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isIdentifier(node.left)) edge(node.left.text, node.right);
    if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression) || node.expression.name.text !== "use") return;
    const receiver = node.expression.expression;
    if (ts.isIdentifier(receiver)) node.arguments.forEach((arg) => edge(receiver.text, arg));
    if (ts.isPropertyAccessExpression(receiver) && receiver.expression.kind === ts.SyntaxKind.ThisKeyword && receiver.name.text === "app") {
      literalPaths(node.arguments[0]).forEach((prefix) => mounted.push({ prefix, references: node.arguments.slice(1).flatMap(identifiers) }));
    }
  });
  const result = new Map<string, Set<string>>();
  const resolve = (name: string, seen: Set<string>): Set<string> => {
    if (seen.has(name)) return new Set(); seen.add(name);
    const found = new Set<string>(); const constructor = constructors.get(name); if (constructor) found.add(constructor);
    graph.get(name)?.forEach((ref) => resolve(ref, seen).forEach((value) => found.add(value)));
    return found;
  };
  mounted.forEach(({ prefix, references }) => references.forEach((ref) => resolve(ref, new Set()).forEach((constructor) => {
    const prefixes = result.get(constructor) || new Set<string>(); prefixes.add(prefix); result.set(constructor, prefixes);
  })));
  return result;
}

// Fixtures guard against the original string-search gate's false positives.
assert.deepEqual(routes(`this.router.post(
 "/targets", handler); // this.router.get("/fake", noop)
const x = "this.router.get('/fake2', noop)";`), ["POST /targets"]);
assert.throws(() => routes('this.router.get(dynamicPath, handler)'), /Unresolved/);
assert.throws(() => routes('this.router.get(["/static", dynamicPath], handler)'), /Unresolved/);
assert.deepEqual(routes('this.router.get(["/a", "/b"], handler)'), ["GET /a", "GET /b"]);
const fixture = mounts('const r = new ReleasesRouter(); let handler = noop; const deferred = Router(); deferred.use(auth, (req,res,next) => handler(req,res,next)); this.app.use("/api/releases", deferred); handler = r.router; const unused = "/wrong";');
assert.deepEqual([...fixture.get("ReleasesRouter") || []], ["/api/releases"]);
assert.equal(mounts('const r = new ReleasesRouter(); const text = "/api/releases"; this.app.use("/api/releases", otherRouter);').has("ReleasesRouter"), false);

assert.deepEqual(routes('class One { run() { this.router.get("/one", fn); } } class Two { run() { this.router.post("/two", fn); } }', "Two"), ["POST /two"]);
assert.deepEqual([...mounts('const moduleAlias = require("./router"); const router = new moduleAlias.default(); this.app.use("/default", router.router);', new Map([["./router", "DefaultRouter"]])).get("DefaultRouter") || []], ["/default"]);

const root = path.resolve(__dirname, "../..");
const sourceServer = fs.readFileSync(path.join(root, "src/server/server.ts"), "utf8");
const compiledServer = fs.readFileSync(path.join(root, "dist/server/server.js"), "utf8");
const defaultImports = new Map<string, string>();
visit(parse(sourceServer), (node) => { if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier) && node.importClause?.name) defaultImports.set(node.moduleSpecifier.text, node.importClause.name.text); });
const sourceMounts = mounts(sourceServer), compiledMounts = mounts(compiledServer, defaultImports);
let total = 0, files = 0;
for (const file of fs.readdirSync(path.join(root, "src/server/routers")).filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))) {
  const source = fs.readFileSync(path.join(root, "src/server/routers", file), "utf8");
  const registered = routes(source);
  if (!registered.length) continue;
  const classes: string[] = [];
  visit(parse(source), (node) => { if (ts.isClassDeclaration(node) && node.name) classes.push(node.name.text); });
  const compiled = fs.readFileSync(path.join(root, "dist/server/routers", file.replace(/\.ts$/, ".js")), "utf8");
  let ownedRoutes = 0;
  for (const constructor of classes.filter((name) => routes(source, name).length > 0)) {
    assert.ok(sourceMounts.has(constructor), `Unresolved/unmounted router class ${constructor} in ${file}`);
    const classRoutes = routes(source, constructor); ownedRoutes += classRoutes.length;
    assert.deepEqual([...compiledMounts.get(constructor) || []].sort(), [...sourceMounts.get(constructor)!].sort(), `Compiled mounts differ for ${constructor}`);
    assert.deepEqual(routes(compiled, constructor), classRoutes, `Compiled route registrations differ in ${file}:${constructor}`);
    total += classRoutes.length;
    console.log(`${file}:${constructor}: ${classRoutes.length} registrations at ${[...sourceMounts.get(constructor)!].join(", ")}`);
  }
  assert.equal(ownedRoutes, registered.length, `Some routes have unresolved class ownership in ${file}`);
  files++;
}
assert.ok(total > 0 && files > 0, "Route discovery must not pass an empty scan");
console.log(`Route AST/build consistency passed: ${total} registrations in ${files} routers; parser fixtures passed. Request/browser acceptance remains separate.`);
