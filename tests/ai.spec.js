// The AI features work with keys from different services. The services are faked here, so no real key or money is used.
const { test, expect } = require('@playwright/test');
const reply = content => ({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ choices: [{ message: { content }, finish_reason: 'stop' }] }) });
const quiz = JSON.stringify({ questions: [{ type: 'mc', question: 'What colour is the sky?', options: ['Blue', 'Green', 'Red', 'Pink'], answer: 'Blue', explanation: 'It says so.' }] });
const notes = 'The sky is blue because air scatters blue light more than red light. This is called Rayleigh scattering and it happens all day.';
async function withKey(page, key, extra = {}) { await page.addInitScript(([k, x]) => { localStorage.setItem('tb_claudeKey', JSON.stringify(k)); for (const [a, b] of Object.entries(x)) localStorage.setItem('tb_' + a, JSON.stringify(b)); }, [key, extra]); }
test('an OpenAI key writes a quiz in the study buddy', async ({ page }) => {
  let sent = null; await withKey(page, 'sk-test-openai-123');
  await page.route('https://api.openai.com/v1/chat/completions', r => { sent = { auth: r.request().headers().authorization, body: r.request().postDataJSON() }; r.fulfill(reply('```json\n' + quiz + '\n```')); });
  await page.goto('/apps/buddy.html'); await expect(page.locator('#keyBox')).toContainText('OpenAI');
  await page.fill('#notes', notes); await page.click('#start');
  await expect(page.locator('.q')).toHaveText('What colour is the sky?');
  expect(sent.auth).toBe('Bearer sk-test-openai-123'); expect(sent.body.model).toBeTruthy(); expect(sent.body.messages[0].role).toBe('system');
});
test('a Gemini key builds an app in the app maker', async ({ page }) => {
  await withKey(page, 'AIzaTestGeminiKey123');
  await page.route('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', r => r.fulfill(reply(JSON.stringify({ name: 'Tapper', emoji: '👆', description: 'Tap it', html: '<!doctype html><button>Tap</button>' }))));
  await page.goto('/apps/appmaker.html'); await expect(page.locator('#keyBox')).toContainText('Gemini');
  await page.fill('#ask', 'A button I can tap many times'); await page.click('#go');
  await expect(page.locator('#title')).toContainText('Tapper');
});
test('another service with an old model name picks a working model and tells the story', async ({ page }) => {
  await withKey(page, 'my-local-key', { aiProvider: 'custom', aiBase: 'http://ai.test/v1', aiModel: 'gone-model' });
  const models = [];
  await page.route('http://ai.test/v1/**', r => { const u = r.request().url();
    if (u.endsWith('/models')) return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ data: [{ id: 'text-embed' }, { id: 'tiny-chat' }] }) });
    const m = r.request().postDataJSON().model; models.push(m);
    if (m === 'gone-model') return r.fulfill({ status: 404, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ error: { message: 'model not found' } }) });
    r.fulfill(reply('You find a glowing door. Open it, knock, or walk away?')); });
  await page.goto('/apps/aidungeon.html');
  await expect(page.locator('#story')).toContainText('glowing door');
  expect(models).toEqual(['gone-model', 'tiny-chat']);
});
test('a rejected key gives a clear message', async ({ page }) => {
  await withKey(page, 'gsk_badkey');
  await page.route('https://api.groq.com/openai/v1/chat/completions', r => r.fulfill({ status: 401, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"error":{"message":"Invalid API Key"}}' }));
  await page.goto('/apps/appmaker.html'); await page.click('summary:has-text("Explain an error")'); await page.fill('#errIn', 'TypeError: x is undefined'); await page.click('#errGo');
  await expect(page.locator('body')).toContainText('rejected by Groq');
});
