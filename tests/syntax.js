// Catches obvious bugs before a release: every .js file and every inline <script> must parse,
// and no page may call a function name twice at the top level (two scripts on one page clashing, like `pick` once did).
// Run: node tests/syntax.js [folder]
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = process.argv[2] || process.env.TOOLBOX_DIR || path.join(__dirname, '..', 'toolbox');
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? (e.name === 'node_modules' ? [] : walk(path.join(d, e.name))) : [path.join(d, e.name)]);
let bad = 0;
// ES modules (import/export, like apps/ai.js) are checked by node itself in module mode
const isModule = code => /^\s*(import|export)\s/m.test(code);
const parse = (code, where) => { try { if (isModule(code)) require('child_process').execFileSync(process.execPath, ['--input-type=module', '--check', '-'], { input: code, stdio: ['pipe', 'ignore', 'pipe'] }); else new vm.Script(code, { filename: where }); } catch (e) { bad++; console.error(`✗ ${where}: ${String(e.stderr || e.message).split(/\r?\n/).find(l => /Error/.test(l)) || e.message}`); } };
const tops = code => [...code.matchAll(/^(?:function\s+([A-Za-z_$][\w$]*)|(?:const|let|class)\s+([A-Za-z_$][\w$]*))/gm)].map(m => m[1] || m[2]);
for (const f of walk(ROOT)) {
  const rel = path.relative(ROOT, f).split(path.sep).join('/');
  if (f.endsWith('.js')) parse(fs.readFileSync(f, 'utf8'), rel);
  if (!f.endsWith('.html')) continue;
  const html = fs.readFileSync(f, 'utf8'), seen = {};
  // the page's own scripts plus the shared files it loads
  const parts = [];
  for (const m of html.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/gi)) {
    const attrs = m[1] || '', src = (attrs.match(/src="([^"]+)"/) || [])[1];
    if (/type="(module|application\/(ld\+)?json|text\/(template|plain))"/.test(attrs)) continue;
    if (src) { const p = path.resolve(path.dirname(f), src); if (fs.existsSync(p)) parts.push([src, fs.readFileSync(p, 'utf8')]); continue; }
    parse(m[2], rel + ' (inline script)'); parts.push([rel, m[2]]);
  }
  for (const [where, code] of parts) for (const n of tops(code)) {
    if (seen[n] && seen[n] !== where) { bad++; console.error(`✗ ${rel}: "${n}" is defined in both ${seen[n]} and ${where}`); }
    seen[n] = seen[n] || where;
  }
}
if (bad) { console.error(`${bad} problem${bad > 1 ? 's' : ''}`); process.exit(1); }
console.log('✓ Every script parses and no names clash');
