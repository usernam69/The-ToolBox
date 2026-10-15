const { test, expect } = require('@playwright/test');
test('bracket: second chance, undo, tap race', async ({ page }) => {
  const errs=[];page.on('pageerror',e=>errs.push(e.message));page.on('dialog',d=>d.accept());
  await page.goto('/apps/bracket.html');
  await page.fill('#names','A\nB\nC\nD'); await page.uncheck('#shuffle'); await page.check('#second'); await page.click('#make');
  await page.click('#br [data-w=main][data-r="0"][data-i="0"][data-k="0"]'); // A beats D
  await page.click('#br [data-w=main][data-r="0"][data-i="1"][data-k="0"]'); // B beats C
  expect(await page.locator('#br2 button[data-k]').allTextContents()).toEqual(['D','C']);
  await page.click('#undo'); expect(await page.locator('#br2 button[data-k]').count()).toBe(0);
  await page.click('#br [data-w=main][data-r="0"][data-i="1"][data-k="1"]'); // C beats B
  await page.click('#br [data-duel^="main,1"]'); for (let i=0;i<15;i++) await page.click('#duel [data-p="0"]');
  await page.waitForTimeout(900);
  await page.click('#br2 [data-k="0"]'); // second chance final: D vs B
  await page.click('#gf [data-k="0"]');
  await expect(page.locator('#champ')).toContainText('wins');
  expect(errs).toEqual([]);
});
test('changelog views and bug hunt', async ({ page }) => {
  const errs=[];page.on('pageerror',e=>errs.push(e.message));
  await page.goto('/apps/changelog.html'); await page.waitForTimeout(500);
  await page.selectOption('#view','haiku'); await expect(page.locator('.haiku').first()).toBeVisible();
  await page.selectOption('#view','comic'); await expect(page.locator('.panel').first()).toBeVisible();
  await page.fill('#q','zzzzqq'); await expect(page.locator('#list')).toContainText('Nothing matches');
  await page.goto('/apps/bughunt.html'); await page.click('#go');
  for (let l=0;l<3;l++){ await page.waitForTimeout(700); const n=await page.locator('#app [data-bug]').count(); for(let i=0;i<n;i++) await page.locator('#app [data-bug]').nth(i).click({force:true}); }
  await expect(page.locator('#hud')).toContainText('All bugs squashed');
  await page.goto('/apps/graveyard.html'); await page.waitForTimeout(400); await expect(page.locator('.stone').first()).toBeVisible();
  expect(errs).toEqual([]);
});
