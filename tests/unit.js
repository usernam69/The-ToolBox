// Unit tests that need no browser and no packages: reminders, the share target in sw.js,
// quest steps, and online rooms when one relay is down. Run: node tests/unit.js
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const ROOT = process.env.TOOLBOX_DIR || path.join(__dirname, '..', 'toolbox');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let failed = 0; const tests = [];
const test = (name, fn) => tests.push([name, fn]);

// a tiny localStorage
const store = () => { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), clear: () => m.clear() }; };
// load remind.js with a fixed clock
function reminders(now, data = {}) {
  const ls = store(); for (const [k, v] of Object.entries(data)) ls.setItem('tb_' + k, JSON.stringify(v));
  const shown = [], RealDate = Date;
  class FakeDate extends RealDate { constructor(...a) { super(...(a.length ? a : [now])); } static now() { return +now; } }
  const ctx = { localStorage: ls, Date: FakeDate, Notification: { permission: 'granted' }, navigator: {}, document: { currentScript: { src: 'http://x/apps/remind.js' }, hidden: false },
    URL, URLSearchParams, location: { search: '' }, setInterval: () => 0, Promise, JSON, Math, String, Object, console };
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(read('apps/remind.js'), ctx);
  ctx.REMIND.show = async (title, body, tag) => { shown.push({ title, body, tag }); return true; };
  return { R: ctx.REMIND, shown, ls, flush: () => new Promise(r => setImmediate(r)) };
}
const at = (y, m, d, h = 12, min = 0) => new Date(y, m - 1, d, h, min);

test('bills: due today reminds, paid this month does not', async () => {
  const { R, shown, flush } = reminders(at(2026, 10, 13, 10), { reminders: { on: true, bills: true }, bills: [{ id: 'a', name: 'Phone', day: 13, amt: 25 }, { id: 'b', name: 'Gym', day: 13, paid: '2026-10' }] });
  R.check(); await flush();
  assert.deepStrictEqual(shown.map(s => s.body), ['Phone (25)']);
});
test('bills: day 31 is due on the last day of a short month', async () => {
  const { R, shown, flush } = reminders(at(2026, 2, 28, 10), { reminders: { on: true, bills: true }, bills: [{ id: 'a', name: 'Rent', day: 31 }] });
  R.check(); await flush();
  assert.strictEqual(shown.length, 1);
});
test('bills: "Mark paid" from the notification marks this month', () => {
  const { R, ls } = reminders(at(2026, 10, 13, 10), { bills: [{ id: 'a', name: 'Phone', day: 13 }, { id: 'c', name: 'Other', day: 2 }] });
  R.act('paid', {});
  const b = JSON.parse(ls.getItem('tb_bills'));
  assert.strictEqual(b[0].paid, '2026-10'); assert.strictEqual(b[1].paid, undefined);
});
test('reminders fire once a day', async () => {
  const { R, shown, flush } = reminders(at(2026, 10, 13, 10), { reminders: { on: true, birthdays: true }, birthdays: [{ name: 'Sam', m: 10, d: 13, y: 2016 }] });
  R.check(); await flush(); R.check(); await flush();
  assert.deepStrictEqual(shown.map(s => s.body), ['Sam turns 10']);
});
test('quiet hours across midnight hold reminders back', async () => {
  const { R, shown, flush } = reminders(at(2026, 10, 13, 23, 30), { reminders: { on: true, quietFrom: '22:00', quietTo: '07:00', birthdays: true }, birthdays: [{ name: 'Sam', m: 10, d: 13 }] });
  R.check(); await flush();
  assert.strictEqual(shown.length, 0);
});
test('snooze brings a reminder back after an hour', async () => {
  const t = at(2026, 10, 13, 10), { R, ls } = reminders(t, { reminders: { on: true } });
  R.act('snooze', { title: 'T', body: 'B', tag: 'x' });
  const s = JSON.parse(ls.getItem('tb_snoozed'));
  assert.strictEqual(s.length, 1); assert.strictEqual(s[0].at, +t + 36e5);
});
test('smart habit time is 30 minutes before the usual time', () => {
  const { R } = reminders(at(2026, 10, 13), { reminders: { smart: true, habitTime: '20:00' }, habitHours: [600, 610, 620, 630, 640] });
  assert.strictEqual(R.habitTime(), '09:50');
});
test('budget: over the limit reminds', async () => {
  const { R, shown, flush } = reminders(at(2026, 10, 13, 10), { reminders: { on: true, budget: true }, budgetLimits: { Food: 50 }, expenses: [{ d: '2026-10-02', cat: 'Food', amt: 40 }, { d: '2026-10-05', cat: 'Food', amt: 20 }, { d: '2026-09-05', cat: 'Food', amt: 99 }] });
  R.check(); await flush();
  assert.match(shown[0].title, /Over budget: Food/);
});

// sw.js share target: a POST to apps/open.html must redirect to apps/open.html
function sw() {
  const handlers = {}, cachePuts = [];
  const ctx = { self: { addEventListener: (t, f) => handlers[t] = f, location: { origin: 'https://x.io' } }, caches: { open: async () => ({ put: async (r) => cachePuts.push(r), addAll: async () => {} }), match: async () => null, keys: async () => [] },
    Response: class { constructor(b, o) { this.b = b; this.o = o; } static redirect(u, s) { return { redirect: u, status: s }; } }, Request: class { constructor(u) { this.url = u; } },
    URL, URLSearchParams, Promise, Date, fetch: async () => ({ ok: true }), String, JSON, encodeURIComponent };
  ctx.location = ctx.self.location; vm.createContext(ctx); vm.runInContext(read('sw.js'), ctx);
  const post = async (form) => { let res; handlers.fetch({ request: { url: 'https://x.io/The-ToolBox/apps/open.html', method: 'POST', formData: async () => ({ getAll: k => form[k] || [], get: k => form[k] ?? null }) }, respondWith: p => res = p });
    return await res; };
  return { post, cachePuts };
}
test('share target: text is passed to apps/open.html', async () => {
  const r = await sw().post({ title: 'Hi', text: 'hello there' });
  assert.match(r.redirect, /^\.\/apps\/open\.html\?/); assert.match(r.redirect, /text=hello\+there/); assert.strictEqual(r.status, 303);
});
test('share target: files are parked and opened in apps/open.html', async () => {
  const s = sw(), r = await s.post({ files: [{ name: 'a.png', type: 'image/png' }] });
  assert.strictEqual(r.redirect, './apps/open.html?shared=files'); assert.strictEqual(s.cachePuts.length, 1);
});
test('sw.js: every offline file is a plain path', () => {
  const list = JSON.parse(read('sw.js').match(/const FILES=(\[[\s\S]*?\]);/)[1]);
  for (const f of list) assert.match(f, /^(\.\/|[\w./-]+)$/, 'odd file name in the offline list: ' + JSON.stringify(f));
});

// every quest step points at a key its app really saves
test('quests: each step watches a key the app saves', () => {
  const q = read('apps/quests.html'), steps = [...q.matchAll(/\['[^']*(?:’[^']*)*','([a-z]+)','([\w|]+)','([\w-]+\.html)'\]/g)];
  assert.ok(steps.length > 20, 'found only ' + steps.length + ' steps');
  for (const [, , keys, file] of steps) {
    const src = read('apps/' + file);
    for (const k of keys.split('|')) {
      // keys built in code, like 'best'+level or 'best_'+mode, count by their fixed start
      const pre = k.replace(/(\d+|_[a-z]+)$/, ''), ok = src.includes(`save('${k}'`) || src.includes(`'${pre}'+`) || src.includes(`'${pre}_'+`);
      assert.ok(ok, `${file} never saves '${k}'`);
    }
  }
});

// online rooms: players still meet when the first relay is down
test('online: one relay down, the other still connects and delivers', async () => {
  const { webcrypto } = require('crypto'), EventEmitter = require('events');
  // a fake pair of relays: the hivemq one never comes up, the emqx one passes messages to everyone on it
  const clients = [];
  const mqtt = { connect(url) { const c = new EventEmitter(); c.url = url; c.subscribe = () => {}; c.end = () => {};
    c.publish = (t, buf) => clients.filter(x => x.up && x.url === url).forEach(x => x.emit('message', t, buf));
    clients.push(c); setImmediate(() => { if (url.includes('hivemq')) c.emit('close'); else { c.up = c.connected = true; c.emit('connect'); } }); return c; } };
  const player = async name => {
    const states = [], got = [];
    const ctx = { mqtt, crypto: webcrypto, TextEncoder, TextDecoder, Uint8Array, Uint32Array, Map, Set, Promise, JSON, Math, setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => {}, console, Date,
      location: { pathname: '/apps/chat.html', protocol: 'https:' }, toast: () => {}, document: { querySelector: () => null }, addEventListener: () => {}, fetch: async () => { throw 0; } };
    ctx.window = ctx; vm.createContext(ctx); vm.runInContext(read('apps/lan.js') + ';this.ONLINE=ONLINE', ctx);
    await ctx.ONLINE.join('apple-bear-123', name, m => got.push(m), s => states.push(s));
    return { O: ctx.ONLINE, states, got };
  };
  const ann = await player('Ann'), bob = await player('Bob');
  await new Promise(r => setTimeout(r, 100));
  assert.ok(ann.states.includes('connected') && bob.states.includes('connected'), 'never connected: ' + ann.states);
  await ann.O.send({ type: 'chat', text: 'hi from ann' }); await new Promise(r => setTimeout(r, 100));
  assert.ok(JSON.stringify(bob.got).includes('hi from ann'), 'message not delivered: ' + JSON.stringify(bob.got));
});

(async () => {
  for (const [name, fn] of tests) {
    try { await fn(); console.log('✓ ' + name); } catch (e) { failed++; console.error('✗ ' + name + '\n  ' + (e && e.message)); }
  }
  console.log(`${tests.length - failed}/${tests.length} passed`); process.exit(failed ? 1 : 0);
})();
