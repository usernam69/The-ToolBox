// One command for a release:
//   node scripts/release.js 1.2.0 [--from <folder>] [--push] [--dry] [--full]
//   node scripts/release.js --bump-only        (just bump the offline cache after changing files)
// It copies toolbox/, toolbox-desktop/ and toolbox-extension/ from --from (your working folder) into this repo,
// sets the version everywhere, refreshes the offline file list and bumps the cache, runs every check,
// then commits and tags v<version>. With --push it also pushes, which starts the release build on GitHub.
//   --dry   show what would change, then put everything back (nothing is committed)
//   --full  also run the browser tests (needs Playwright; PW_CHANNEL=msedge on Windows)
//   auto    instead of a number: a new app (new page in toolbox/apps) makes it 1.x+1.0, anything else 1.x.y+1
//   --rollback  release the previous version's files again under the new number (nothing is deleted or rewritten)
// No "What's new" entry for the version? One is written from the names of the apps that changed.
// Nothing people download changed (only scripts/tests/docs)? It commits without a tag, so no downloads are rebuilt.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const REPO = path.join(__dirname, '..'), args = process.argv.slice(2);
const opt = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
let version = args.find(a => /^\d+\.\d+\.\d+$/.test(a)); const from = opt('--from'), bumpOnly = args.includes('--bump-only'), dry = args.includes('--dry');
const run = (cmd, a, o = {}) => execFileSync(cmd, a, { cwd: REPO, stdio: 'inherit', ...o });
const out = (cmd, a) => execFileSync(cmd, a, { cwd: REPO, encoding: 'utf8' }).trim();
const edit = (f, re, to) => { const p = path.join(REPO, f), s = fs.readFileSync(p, 'utf8'); if (!re.test(s)) throw new Error(`${f}: pattern not found`); fs.writeFileSync(p, s.replace(re, to)); };
const rollback = args.includes('--rollback'), auto = args.includes('auto');
if (!version && !bumpOnly && !auto) { console.error('Usage: node scripts/release.js <x.y.z> [--from <folder>] [--push] [--dry] [--full]   or   --bump-only'); process.exit(1); }

// 0. the new version must be higher than the last tag
const num = v => v.replace(/^v/, '').split('.').map(Number), newer = (a, b) => { for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i]; return false; };
let last = null; try { last = out('git', ['describe', '--tags', '--abbrev=0']); } catch {}
if (auto && !version) {
  if (!last) { console.error('✗ No earlier release to count up from; give a version number.'); process.exit(1); }
  const [a, b, c] = num(last);
  const added = from && fs.readdirSync(path.resolve(from, 'toolbox/apps')).some(f => f.endsWith('.html') && !fs.existsSync(path.join(REPO, 'toolbox/apps', f)));
  version = added ? `${a}.${b + 1}.0` : `${a}.${b}.${c + 1}`;
  console.log(`→ Version ${version} (${added ? 'a new app was added' : 'fixes and changes'})`);
}
if (version && last && !newer(num(version), num(last))) { console.error(`✗ ${version} is not higher than the last release ${last}.`); process.exit(1); }

// rollback: the files of the release before the last one, released again (a working copy is not synced)
if (rollback) {
  const tags = out('git', ['tag', '--sort=-v:refname']).split(/\r?\n/).filter(t => /^v\d+\.\d+\.\d+$/.test(t));
  if (tags.length < 2) { console.error('✗ No earlier release to roll back to.'); process.exit(1); }
  run('git', ['checkout', tags[1], '--', 'toolbox', 'toolbox-desktop', 'toolbox-extension']);
  console.log(`↩ Files from ${tags[1]} (rolling back ${tags[0]})`);
  var rollbackNews = `Undid version ${tags[0].slice(1)} because of a problem: this is ${tags[1].slice(1)} again.`;
}
// 1. sync the working copy (desktop build output and node_modules stay out)
if (from && !rollback) for (const dir of ['toolbox', 'toolbox-desktop', 'toolbox-extension']) {
  const src = path.resolve(from, dir), dst = path.join(REPO, dir);
  if (!fs.existsSync(src)) continue;
  fs.rmSync(dst, { recursive: true, force: true });
  fs.cpSync(src, dst, { recursive: true, filter: s => !/[\\/](node_modules|dist|app)([\\/]|$)/.test(path.relative(src, s) ? '/' + path.relative(src, s) : '') });
  console.log(`synced ${dir}`);
}
const changed = () => out('git', ['status', '--porcelain']).split('\n').filter(Boolean).map(l => l.slice(3).replace(/^"|"$/g, ''));
const shipped = changed().filter(f => /^toolbox(-desktop|-extension)?\//.test(f));

// 2. the version: app (errors.js), desktop app (package.json), extension (manifest.json)
let news = '';
if (version && shipped.length) {
  edit('toolbox/apps/errors.js', /var TB_VERSION='[^']*';/, `var TB_VERSION='${version}';`);
  edit('toolbox-desktop/package.json', /"version": "[^"]*"/, `"version": "${version}"`);
  if (fs.existsSync(path.join(REPO, 'toolbox-extension/manifest.json'))) edit('toolbox-extension/manifest.json', /"version": "[^"]*"/, `"version": "${version}"`);
  const errorsJs = fs.readFileSync(path.join(REPO, 'toolbox/apps/errors.js'), 'utf8'), own = errorsJs.match(new RegExp(`\\['${version.replace(/\./g, '\\.')}','([^']*)'\\]`));
  if (own) news = own[1];
  else {
    // write one from the titles of the pages that changed
    const titles = [...new Set(shipped.filter(f => f.endsWith('.html')).map(f => { try { return (fs.readFileSync(path.join(REPO, f), 'utf8').match(/<title>([^<]*)</) || [])[1]; } catch { return null; } }).filter(Boolean))];
    news = typeof rollbackNews === 'string' ? rollbackNews : titles.length ? `Fixes and improvements in ${titles.slice(0, 6).join(', ')}${titles.length > 6 ? ' and more' : ''}.` : 'Small fixes and improvements.';
    news = news.replace(/'/g, '’');
    for (const p of [path.join(REPO, 'toolbox/apps/errors.js'), from && !rollback && path.resolve(from, 'toolbox/apps/errors.js')].filter(p => p && fs.existsSync(p))) {
      const s = fs.readFileSync(p, 'utf8'); if (!s.includes(`['${version}',`)) fs.writeFileSync(p, s.replace(/var TB_NEWS=\[\n?/, m => `${m} ['${version}','${news}'],\n`));
    }
    console.log(`✎ Wrote a "What's new" entry: ${news}`);
  }
}

// 2b. release date, the apps that changed (they get an "updated" tag on the menu) and the RSS feed of versions
if (version && shipped.length) {
  const ids = [...new Set(shipped.map(f => (f.match(/^toolbox\/apps\/([\w-]+)\.html$/) || [])[1]).filter(Boolean))];
  if (/var TB_DATE=/.test(fs.readFileSync(path.join(REPO, 'toolbox/apps/errors.js'), 'utf8'))) edit('toolbox/apps/errors.js', /var TB_DATE='[^']*';var TB_CHANGED=\[[^\]]*\];/, `var TB_DATE='${new Date().toISOString().slice(0, 10)}';var TB_CHANGED=${JSON.stringify(ids).replace(/"/g, "'")};`);
  const x = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const all = [...fs.readFileSync(path.join(REPO, 'toolbox/apps/errors.js'), 'utf8').matchAll(/^ \['(\d+\.\d+\.\d+)','([^']*)'\]/gm)].slice(0, 20);
  fs.writeFileSync(path.join(REPO, 'toolbox/changelog.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>The ToolBox releases</title><link>https://usernam69.github.io/The-ToolBox/apps/changelog.html</link><description>What changed in each version of The ToolBox</description>\n` +
    all.map(([, v, t]) => `<item><title>The ToolBox ${v}</title><link>https://github.com/usernam69/The-ToolBox/releases/tag/v${v}</link><guid>v${v}</guid><description>${x(t)}</description></item>`).join('\n') + '\n</channel></rss>\n');
}

// 3. offline list + cache version
const root = path.join(REPO, 'toolbox'), walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.relative(root, path.join(d, e.name)).split(path.sep).join('/')]);
if (shipped.length || bumpOnly) {
  const files = ['./', ...walk(root).filter(f => f !== 'sw.js').sort()];
  let sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  sw = sw.replace(/const CACHE='toolbox-v(\d+)';/, (m, n) => `const CACHE='toolbox-v${+n + 1}';`).replace(/const FILES=\[.*?\];/s, 'const FILES=' + JSON.stringify(files) + ';');
  fs.writeFileSync(path.join(root, 'sw.js'), sw);
  console.log(`${files.length} offline files, cache ${sw.match(/toolbox-v\d+/)[0]}`);
}
if (bumpOnly) process.exit(0);

// 4. checks (the storage map is regenerated, not just checked)
run('node', ['tests/check.js']); run('node', ['tests/syntax.js']); run('node', ['tests/unit.js']); run('node', ['tests/keys.js']);
if (args.includes('--full')) run('npx', ['playwright', 'test', '--reporter=line'], { shell: true });

if (dry) {
  console.log('\nWould commit:\n  ' + changed().join('\n  '));
  run('git', ['checkout', '--', '.']); run('git', ['clean', '-fdq', '--', 'toolbox', 'toolbox-desktop', 'toolbox-extension']);
  console.log('✓ Dry run: nothing committed, repo put back.'); process.exit(0);
}

// 5. commit and tag (an annotated tag carries the "What's new" text)
run('git', ['add', '-A']);
const tagged = shipped.length > 0;
run('git', ['commit', '-m', `${tagged ? 'Release ' + version : 'Build scripts and tests'}${news ? '\n\n' + news : ''}

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`]);
if (tagged) run('git', ['tag', '-a', `v${version}`, '-m', `The ToolBox ${version}${news ? '\n\n' + news : ''}`]);
else console.log('ℹ Nothing people download changed, so no tag (no downloads rebuilt).');
if (args.includes('--push')) { run('git', ['push']); if (tagged) run('git', ['push', 'origin', `v${version}`]); console.log(tagged ? `✓ Pushed v${version}. GitHub is building the downloads.` : '✓ Pushed.'); }
else console.log(tagged ? `✓ Committed and tagged v${version}. Push with: git push && git push origin v${version}` : '✓ Committed. Push with: git push');
