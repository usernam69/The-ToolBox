// One command for a release:
//   node scripts/release.js 1.2.0 [--from <folder>] [--push]
//   node scripts/release.js --bump-only        (just bump the offline cache after changing files)
// It copies toolbox/, toolbox-desktop/ and toolbox-extension/ from --from (your working folder) into this repo,
// sets the version everywhere, refreshes the offline file list and bumps the cache, runs every check,
// then commits and tags v<version>. With --push it also pushes, which starts the release build on GitHub.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const REPO = path.join(__dirname, '..'), args = process.argv.slice(2);
const opt = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const version = args.find(a => /^\d+\.\d+\.\d+$/.test(a)), from = opt('--from'), bumpOnly = args.includes('--bump-only');
const run = (cmd, a, o = {}) => execFileSync(cmd, a, { cwd: REPO, stdio: 'inherit', ...o });
const edit = (f, re, to) => { const p = path.join(REPO, f), s = fs.readFileSync(p, 'utf8'); if (!re.test(s)) throw new Error(`${f}: pattern not found`); fs.writeFileSync(p, s.replace(re, to)); };
if (!version && !bumpOnly) { console.error('Usage: node scripts/release.js <x.y.z> [--from <folder>] [--push]   or   --bump-only'); process.exit(1); }

// 1. sync the working copy (desktop build output and node_modules stay out)
if (from) for (const dir of ['toolbox', 'toolbox-desktop', 'toolbox-extension']) {
  const src = path.resolve(from, dir), dst = path.join(REPO, dir);
  if (!fs.existsSync(src)) continue;
  fs.rmSync(dst, { recursive: true, force: true });
  fs.cpSync(src, dst, { recursive: true, filter: s => !/[\\/](node_modules|dist|app)([\\/]|$)/.test(path.relative(src, s) ? '/' + path.relative(src, s) : '') });
  console.log(`synced ${dir}`);
}

// 2. the version: app (errors.js), desktop app (package.json), extension (manifest.json)
if (version) {
  edit('toolbox/apps/errors.js', /var TB_VERSION='[^']*';/, `var TB_VERSION='${version}';`);
  edit('toolbox-desktop/package.json', /"version": "[^"]*"/, `"version": "${version}"`);
  if (fs.existsSync(path.join(REPO, 'toolbox-extension/manifest.json'))) edit('toolbox-extension/manifest.json', /"version": "[^"]*"/, `"version": "${version}"`);
  const news = fs.readFileSync(path.join(REPO, 'toolbox/apps/errors.js'), 'utf8');
  if (!news.includes(`['${version}',`)) console.warn(`⚠ No "What's new" entry for ${version} in toolbox/apps/errors.js (TB_NEWS). Add one so people see what changed.`);
}

// 3. offline list + cache version
const root = path.join(REPO, 'toolbox'), walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.relative(root, path.join(d, e.name)).split(path.sep).join('/')]);
const files = ['./', ...walk(root).filter(f => f !== 'sw.js').sort()];
let sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
sw = sw.replace(/const CACHE='toolbox-v(\d+)';/, (m, n) => `const CACHE='toolbox-v${+n + 1}';`).replace(/const FILES=\[.*?\];/s, 'const FILES=' + JSON.stringify(files) + ';');
fs.writeFileSync(path.join(root, 'sw.js'), sw);
console.log(`${files.length} offline files, cache ${sw.match(/toolbox-v\d+/)[0]}`);
if (bumpOnly) process.exit(0);

// 4. checks (the storage map is regenerated, not just checked)
run('node', ['tests/check.js']); run('node', ['tests/unit.js']); run('node', ['tests/keys.js']);

// 5. commit and tag
run('git', ['add', '-A']);
run('git', ['commit', '-m', `Release ${version}`]);
run('git', ['tag', `v${version}`]);
if (args.includes('--push')) { run('git', ['push']); run('git', ['push', 'origin', `v${version}`]); console.log(`✓ Pushed v${version}. GitHub is building the downloads.`); }
else console.log(`✓ Committed and tagged v${version}. Push with: git push && git push origin v${version}`);
