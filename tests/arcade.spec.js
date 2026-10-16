// Plays a few moves in the Arcade games to check they actually work, not just open.
const { test, expect } = require('@playwright/test');
const errs = page => { const e = []; page.on('pageerror', x => e.push(x.message)); return e; };
test('board games make moves and the computer answers', async ({ page }) => {
  const e = errs(page);
  await page.goto('/apps/tictactoe.html'); await page.click('#t [data-i="4"]'); await page.waitForTimeout(500);
  expect((await page.locator('#t button').allTextContents()).filter(Boolean).length).toBe(2);
  await page.goto('/apps/connect4.html'); await page.click('#c4 [data-c="3"]'); await page.waitForTimeout(600);
  expect(await page.locator('#c4 div[style*="background"]').count()).toBe(2);
  await page.goto('/apps/chess.html'); await page.click('#cb [data-i="52"]'); await page.click('#cb [data-i="36"]'); await page.waitForTimeout(3000);
  await expect(page.locator('#hud')).toContainText('White to move');
  await page.goto('/apps/checkers.html'); await page.click('#ck [data-i="40"]'); await page.click('#ck [data-i="33"]'); await page.waitForTimeout(700);
  await expect(page.locator('#hud')).toContainText('Red');
  await page.goto('/apps/battleship.html'); await page.click('#en [data-i="0"]'); await page.waitForTimeout(800);
  expect(await page.locator('#me .h, #me .m').count()).toBe(1);
  expect(e).toEqual([]);
});
test('puzzles: 2048, sudoku, sweeper, merge conflict, escape the CI, bisect', async ({ page }) => {
  const e = errs(page);
  await page.goto('/apps/v2048.html'); for (const k of ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown']) await page.keyboard.press(k);
  expect(await page.locator('#b div:not(:empty)').count()).toBeGreaterThan(1);
  await page.goto('/apps/sudoku.html'); const free = page.locator('#sd button:not(.giv)').first(); await free.click(); await page.keyboard.press('5');
  await expect(page.locator('#sd button:not(.giv)').first()).toHaveText('5');
  await page.goto('/apps/minesweeper.html'); await page.locator('#ms [data-i="44"]').dispatchEvent('pointerdown', { button: 0 }); await page.locator('#ms [data-i="44"]').dispatchEvent('pointerup', { button: 0 });
  expect(await page.locator('#ms button.o').count()).toBeGreaterThan(0);
  await page.goto('/apps/mergeconflict.html'); await page.click('[data-i="1"][data-k="0"]'); await page.click('[data-i="2"][data-k="1"]'); await page.click('[data-i="3"][data-k="1"]'); await page.click('#run');
  await expect(page.locator('#tests')).toContainText('✓ add(2,3)');
  await page.goto('/apps/escapeci.html'); await page.click('#fixes [data-f="0"]'); await expect(page.locator('#door')).toHaveText('🔓');
  await page.goto('/apps/bisect.html'); await page.click('#cm [data-i="5"]'); await page.click('#test'); await expect(page.locator('#hud')).toContainText('test runs 1');
  expect(e).toEqual([]);
});
