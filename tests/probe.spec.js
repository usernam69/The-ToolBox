// Ideas from The Probe: visit streak on the menu, Ask the ToolBox, Challenge a friend in the arcade, and the Draw & guess replay.
const { test, expect } = require('@playwright/test');
const day = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.toLocaleDateString('sv'); };

test('the menu counts days in a row', async ({ page }) => {
  await page.addInitScript(d => { if (!localStorage.getItem('tb_visitDays')) localStorage.setItem('tb_visitDays', JSON.stringify(d)); }, [day(2), day(1)]);
  await page.goto('/index.html');
  await expect(page.locator('#visitStreak')).toHaveText('🔥 3-day streak');
});

test('Ask the ToolBox finds apps with no AI key, and its links open', async ({ page }) => {
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('/apps/ask.html');
  await page.fill('#q', 'split a bill'); await page.click('#go');
  const first = page.locator('#res a.app').first();
  await expect(first).toContainText('Budget splitter');
  await first.click(); await expect(page).toHaveURL(/tools\.html/);
  expect(errs).toEqual([]);
});

test('Challenge a friend: banner, beat-it message and a copyable link', async ({ page }) => {
  await page.goto('/apps/emojiguess.html?challenge=3');
  await expect(page.locator('main .box').first()).toContainText('Score to beat: 3');
  await page.evaluate(() => { window.__copied = null; navigator.clipboard.writeText = u => { window.__copied = u; return Promise.resolve(); }; ARC.best(7); ARC.over('done', () => {}); });
  await expect(page.locator('body')).toContainText("You beat your friend's 3");
  await page.click('#arcChal');
  expect(await page.evaluate(() => window.__copied)).toMatch(/emojiguess\.html\?challenge=7$/);
});

test('Draw & guess can replay a drawing and puts the picture back', async ({ page }) => {
  await page.goto('/apps/draw.html');
  const same = await page.evaluate(async () => {
    document.getElementById('game').hidden = false;
    strokes = [{ c: '#e53935', w: 8, p: [[100, 100], [300, 200], [500, 100]], id: 'a' }, { c: '#1e88e5', w: 10, p: [[200, 400]], id: 'b' }];
    const px = () => { const d = x.getImageData(0, 0, 800, 600).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] !== 255 || d[i + 1] !== 255 || d[i + 2] !== 255) n++; return n; };
    redraw(); const before = px();
    document.getElementById('replay').click(); await new Promise(r => setTimeout(r, 1500));
    return { before, after: px() };
  });
  expect(same.before).toBeGreaterThan(0); expect(same.after).toBe(same.before);
});
