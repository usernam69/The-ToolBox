// Checks the web app without a browser: every page's scripts parse, every local file a page,
// the menu or the offline list points to exists, and every app id is unique. Run: node tests/check.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = process.env.TOOLBOX_DIR || path.join(__dirname, '..', 'toolbox');
const problems = [];
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const files = walk(ROOT), rel = f => path.relative(ROOT, f).split(path.sep).join('/');
const exists = (from, ref) => {
  const clean = ref.split(/[?#]/)[0]; if (!clean) return true;
  return fs.existsSync(path.join(path.dirname(from), decodeURIComponent(clean)));
};
const parse = (code, where) => { try { new vm.Script(code, { filename: where }); } catch (e) { problems.push(`${where}: ${e.message}`); } };

let pages = 0;
for (const f of files) {
  if (f.endsWith('.js') && !f.includes(path.sep + 'vendor' + path.sep)) parse(fs.readFileSync(f, 'utf8'), rel(f));
  if (!f.endsWith('.html')) continue;
  pages++;
  const html = fs.readFileSync(f, 'utf8');
  // classic inline scripts must parse (module scripts can't be checked this way)
  [...html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)].forEach((m, i) => { if (!/type="module"/.test(m[1])) parse(m[2], `${rel(f)} inline script ${i + 1}`); });
  // links in the markup only, not inside scripts
  const markup = html.replace(/(<script\b[^>]*>)[\s\S]*?<\/script>/g, '$1');
  for (const m of markup.matchAll(/\b(?:src|href)="([^"]+)"/g)) {
    const ref = m[1];
    if (/^(https?:|data:|mailto:|#|javascript:)/.test(ref) || ref.includes('${')) continue;
    if (!exists(f, ref)) problems.push(`${rel(f)}: missing ${ref}`);
  }
}
// the menu's apps
const reg = fs.readFileSync(path.join(ROOT, 'apps', 'registry.js'), 'utf8');
const sandbox = {}; vm.runInNewContext(reg + ';this.C=CATEGORIES;this.A=ALL_APPS', sandbox);
const ids = new Set();
for (const a of sandbox.A) {
  if (ids.has(a.id)) problems.push(`registry: duplicate id ${a.id}`); ids.add(a.id);
  if (!exists(path.join(ROOT, 'index.html'), a.href)) problems.push(`registry: ${a.id} points to missing ${a.href}`);
}
// the offline list
const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8'), list = JSON.parse(sw.match(/const FILES=(\[[\s\S]*?\]);/)[1]);
for (const f of list) if (f !== './' && !fs.existsSync(path.join(ROOT, f))) problems.push(`sw.js: lists missing ${f}`);
for (const f of files.map(rel)) if (f !== 'sw.js' && !list.includes(f)) problems.push(`sw.js: ${f} is not saved for offline use`);
// the manifest
const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
for (const i of man.icons) if (!fs.existsSync(path.join(ROOT, i.src))) problems.push(`manifest: missing icon ${i.src}`);

console.log(`${pages} pages, ${sandbox.A.length} menu entries, ${list.length} offline files checked.`);
if (problems.length) { console.error(problems.map(p => '✗ ' + p).join('\n')); process.exit(1); }
console.log('✓ All good');
