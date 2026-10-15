// Opens every page in a real browser and fails on JavaScript errors; also checks game controllers,
// odd things handed to "Open with", and takes phone-size screenshots to compare between versions.
// Run: npx playwright test   (first: npm i -D @playwright/test && npx playwright install chromium)
const { test, expect } = require('@playwright/test');
const fs = require('fs'), path = require('path');
const ROOT = process.env.TOOLBOX_DIR || path.join(__dirname, '..', 'toolbox');
const pages = ['index.html', 'tools.html', ...fs.readdirSync(path.join(ROOT, 'apps')).filter(f => f.endsWith('.html')).map(f => 'apps/' + f)];
// errors from the public relays or the weather service when offline are not our bugs
const IGNORE = /ERR_|net::|WebSocket|mqtt|Failed to load resource|open-meteo|api\.github|anthropic/i;

function watch(page) {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errors.push(m.text()); });
  return errors;
}

for (const p of pages) {
  test(`opens without errors: ${p}`, async ({ page }) => {
    const errors = watch(page);
    await page.goto(new URL(p, (process.env.BASE_URL || 'http://localhost:5199').replace(/\/?$/, '/')).href);
    await page.waitForTimeout(1200);
    expect(errors, errors.join('\n')).toEqual([]);
  });
}

test.describe('phone screenshots', () => {
  test.use({ viewport: { width: 375, height: 812 } });
  for (const p of ['index.html', 'tools.html', 'apps/quests.html', 'apps/snake.html', 'apps/parkour.html', 'apps/wrapped.html']) {
    test(`looks the same: ${p}`, async ({ page }) => {
      await page.addInitScript(() => { localStorage.setItem('menu_season', 'false'); localStorage.setItem('menu_seen', '"x"'); Math.random = () => 0.5; });
      await page.goto('/' + p); await page.waitForTimeout(800);
      const width = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(width, 'page scrolls sideways at phone width').toBeLessThanOrEqual(376);
      // the first run on a machine saves the picture; later runs compare against it
      const name = p.replace(/\W/g, '-') + '.png', file = path.join(__dirname, 'snapshots', name);
      if (!fs.existsSync(file)) { await page.screenshot({ path: file, animations: 'disabled' }); return; }
      await expect(page).toHaveScreenshot(name, { maxDiffPixelRatio: 0.03, animations: 'disabled' });
    });
  }
});

test('a game controller moves the Parkour player', async ({ page }) => {
  await page.addInitScript(() => {
    let right = false; window.__pad = v => right = v;
    const pad = () => ({ buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: i === 15 && right })), axes: [0, 0] });
    navigator.getGamepads = () => [pad()];
  });
  await page.goto('/apps/parkour.html');
  await page.evaluate(() => dispatchEvent(new Event('gamepadconnected')));
  await page.evaluate(() => window.__pad(true));
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => keys.has('arrowright'))).toBe(true);
  await page.evaluate(() => window.__pad(false));
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => keys.has('arrowright'))).toBe(false);
});

// strange text and file names handed to "Open with" / "Share to" must not break anything
const ODD = ['', ' ', '<img src=x onerror=alert(1)>', '"><script>alert(1)</script>', 'a'.repeat(5000), '😀'.repeat(300), '‮\u0000﻿', '%E0%A4%A', 'javascript:alert(1)'];
for (const s of ODD) {
  test(`open.html handles odd shared text: ${JSON.stringify(s.slice(0, 20))}`, async ({ page }) => {
    const errors = watch(page); let dialogs = 0; page.on('dialog', d => { dialogs++; d.dismiss(); });
    await page.goto('/apps/open.html?text=' + encodeURIComponent(s) + '&title=' + encodeURIComponent(s) + '&url=' + encodeURIComponent(s));
    await page.waitForTimeout(600);
    expect(errors, errors.join('\n')).toEqual([]); expect(dialogs, 'a script in shared text ran').toBe(0);
  });
}
test('open.html handles odd file names', async ({ page }) => {
  const errors = watch(page); let dialogs = 0; page.on('dialog', d => { dialogs++; d.dismiss(); });
  await page.goto('/apps/open.html');
  const input = page.locator('input[type=file]').first();
  await input.setInputFiles([{ name: '<b>x</b>"\'.png', mimeType: 'image/png', buffer: Buffer.from([137, 80, 78, 71]) },
    { name: 'no-extension', mimeType: '', buffer: Buffer.from('hi') }, { name: 'a'.repeat(250) + '.txt', mimeType: 'text/plain', buffer: Buffer.alloc(0) }]);
  await page.waitForTimeout(600);
  expect(errors, errors.join('\n')).toEqual([]); expect(dialogs).toBe(0);
});
