// Background music: the 🎵 button is on every kind of page, music starts after the first tap, can be turned off, and stays quiet in music apps.
const { test, expect } = require('@playwright/test');
const ctxState = page => page.evaluate(() => { const b = document.getElementById('tbMusic'); return { button: b && b.textContent }; });
test('music starts on the first tap, and the off switch is remembered', async ({ page }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(() => { const AC = window.AudioContext; window.__notes = 0; const o = AC.prototype.createOscillator; AC.prototype.createOscillator = function () { window.__notes++; return o.call(this); }; });
  for (const p of ['/index.html', '/tools.html', '/apps/snake.html', '/apps/pixel.html']) { await page.goto(p); await expect(page.locator('#tbMusic')).toBeVisible(); }
  await page.goto('/apps/snake.html'); await page.mouse.click(5, 5); await page.waitForTimeout(800);
  expect(await page.evaluate(() => window.__notes)).toBeGreaterThan(0);
  await page.click('#tbMusic'); await page.uncheck('#tbMusicPanel [data-m=on]');
  expect((await ctxState(page)).button).toBe('🔇');
  await page.goto('/apps/maze.html'); await page.mouse.click(5, 5); await page.waitForTimeout(600);
  expect(await page.evaluate(() => window.__notes)).toBe(0); expect((await ctxState(page)).button).toBe('🔇');
  expect(errs).toEqual([]);
});
test('music apps stay quiet', async ({ page }) => {
  await page.goto('/apps/lofi.html'); await expect(page.locator('#tbMusic')).toHaveText('🔇');
});
