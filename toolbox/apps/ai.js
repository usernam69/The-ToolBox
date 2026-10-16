// One way for ToolBox apps to talk to an AI model, with whatever API key you have.
// The service is worked out from the key: Claude (sk-ant-), OpenRouter (sk-or-), Groq (gsk_), xAI (xai-), Google Gemini (AIza…),
// OpenAI (sk-…); anything else (Mistral, DeepSeek, a local Ollama or LM Studio…) works as "Other" with its OpenAI-compatible address.
// Claude goes through the official Anthropic SDK; every other service through the OpenAI-style /chat/completions API.
// Usage (in a module script, after common.js):  import {AI} from './ai.js';
//   AI.panel($('keyBox'))                         the 🔑 settings
//   await AI.ask({system, user, schema, effort, maxTokens, onProgress})  → text, or an object when a JSON schema is given
// The key stays in this browser (tb_claudeKey, never backed up or synced) and is sent only to the service it belongs to.
const SDK = 'https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.128.0/+esm';
export const PROVIDERS = {
  anthropic: { name: 'Claude (Anthropic)', model: 'claude-opus-5-5', site: 'https://console.anthropic.com/' },
  openai: { name: 'OpenAI', base: 'https://api.openai.com/v1', model: 'gpt-4o-mini', site: 'https://platform.openai.com/api-keys' },
  gemini: { name: 'Google Gemini', base: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-2.5-flash', site: 'https://aistudio.google.com/apikey' },
  openrouter: { name: 'OpenRouter (hundreds of models)', base: 'https://openrouter.ai/api/v1', model: 'openrouter/auto', site: 'https://openrouter.ai/keys' },
  groq: { name: 'Groq', base: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile', site: 'https://console.groq.com/keys' },
  xai: { name: 'xAI (Grok)', base: 'https://api.x.ai/v1', model: 'grok-3-mini', site: 'https://console.x.ai/' },
  mistral: { name: 'Mistral', base: 'https://api.mistral.ai/v1', model: 'mistral-small-latest', site: 'https://console.mistral.ai/' },
  deepseek: { name: 'DeepSeek', base: 'https://api.deepseek.com/v1', model: 'deepseek-chat', site: 'https://platform.deepseek.com/' },
  custom: { name: 'Other (OpenAI-compatible address)', base: '', model: '' },
};
const get = (k, d) => loadTb(k, d), set = (k, v) => saveTb(k, v);
export function detect(key) {
  if (/^sk-ant-/.test(key)) return 'anthropic'; if (/^sk-or-/.test(key)) return 'openrouter'; if (/^gsk_/.test(key)) return 'groq';
  if (/^xai-/.test(key)) return 'xai'; if (/^AIza/.test(key)) return 'gemini'; if (/^sk-/.test(key)) return 'openai'; return 'custom';
}
export const AI = {
  key: () => get('claudeKey', ''),
  provider() { const p = get('aiProvider', 'auto'); return p !== 'auto' && PROVIDERS[p] ? p : detect(AI.key()); },
  info() { const id = AI.provider(), p = PROVIDERS[id]; return { id, ...p, model: get('aiModel', '') || p.model, base: (id === 'custom' ? get('aiBase', '') : p.base || '').replace(/\/+$/, '') }; },
  ready: () => !!AI.key() && (AI.provider() !== 'custom' || !!get('aiBase', '')),
  name: () => AI.key() ? PROVIDERS[AI.provider()].name : 'AI',

  async ask({ system = '', user, messages, schema = null, effort = 'medium', maxTokens = 16000, onProgress } = {}) {
    if (!AI.key()) throw new Error('Add an API key first (🔑).');
    const msgs = messages || [{ role: 'user', content: user }], p = AI.info();
    return p.id === 'anthropic' ? claude(p, system, msgs, schema, effort, maxTokens, onProgress) : openaiStyle(p, system, msgs, schema, maxTokens);
  },

  // the 🔑 box: key, the service it was recognised as, and (under "More") the service, model and address
  panel(el, onChange) {
    const draw = () => {
      const i = AI.info(), k = AI.key();
      el.innerHTML = `<details class="box"><summary><b>🔑 AI key</b> <span class="muted">${k ? '· ' + esc(i.name) + ' ✓' : '· not set'}</span></summary>
        <p class="sub" style="margin-top:8px">Paste a key from any AI service: Claude, OpenAI, Google Gemini, OpenRouter, Groq, xAI, Mistral, DeepSeek, or another service that works like OpenAI (including a model on your own computer through Ollama or LM Studio). The service is recognised from the key. It’s kept only on this device and sent only to that service. Calls cost a little on your account with them.</p>
        <div class="row"><input data-a="key" type="password" class="grow" placeholder="Paste your API key" autocomplete="off"><button class="g" data-a="save">Save</button><button class="g" data-a="forget">Forget key</button></div>
        <details style="margin-top:6px"><summary class="muted">More: service, model and address</summary>
          <div class="row"><select data-a="prov"><option value="auto">Recognise from the key</option>${Object.entries(PROVIDERS).map(([id, v]) => `<option value="${id}">${esc(v.name)}</option>`).join('')}</select>
          <input data-a="model" placeholder="Model (blank = ${esc(i.model || 'the service’s default')})" value="${esc(get('aiModel', ''))}"></div>
          <div class="row"><input data-a="base" class="grow" placeholder="Address for “Other”, e.g. http://localhost:11434/v1" value="${esc(get('aiBase', ''))}"></div>
          <p class="muted" style="font-size:13px;margin:4px 0">Get a key: ${Object.values(PROVIDERS).filter(v => v.site).map(v => `<a href="${v.site}" target="_blank" rel="noopener">${esc(v.name.split(' (')[0])}</a>`).join(' · ')}</p></details></details>`;
      const $a = a => el.querySelector(`[data-a="${a}"]`);
      $a('prov').value = get('aiProvider', 'auto');
      $a('save').onclick = () => { const v = $a('key').value.trim(); if (v.length < 8) return toast('Paste the whole key.'); set('claudeKey', v); toast(`Key saved: ${PROVIDERS[AI.provider()].name}`); draw(); el.querySelector('details').open = true; onChange && onChange() };
      $a('forget').onclick = () => { set('claudeKey', ''); toast('Key forgotten'); draw(); onChange && onChange() };
      $a('prov').onchange = () => { set('aiProvider', $a('prov').value); set('aiModel', ''); draw(); el.querySelector('details').open = true; el.querySelectorAll('details')[1].open = true; onChange && onChange() };
      $a('model').onchange = () => set('aiModel', $a('model').value.trim());
      $a('base').onchange = () => set('aiBase', $a('base').value.trim());
    };
    draw();
  },
};

async function claude(p, system, messages, schema, effort, maxTokens, onProgress) {
  const { default: Anthropic } = await import(SDK).catch(() => { throw new Error('Couldn’t load the Claude library. Are you online?') });
  const client = new Anthropic({ apiKey: AI.key(), dangerouslyAllowBrowser: true });
  const req = { model: p.model, max_tokens: maxTokens, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default', system, messages,
    output_config: schema ? { effort, format: { type: 'json_schema', schema } } : { effort } };
  try {
    let res;
    if (onProgress) { const s = client.beta.messages.stream(req); let n = 0; s.on('text', t => onProgress(n += t.length)); res = await s.finalMessage(); }
    else res = await client.beta.messages.create(req);
    if (res.stop_reason === 'refusal') throw new Error('Claude declined this one' + (res.stop_details?.explanation ? `: ${res.stop_details.explanation}` : '. Try asking differently.'));
    if (res.stop_reason === 'max_tokens') throw new Error('The answer came out too long and was cut off. Try asking for something smaller.');
    const text = res.content.filter(b => b.type === 'text').map(b => b.text).join('').trim();
    return schema ? JSON.parse(text) : text;
  } catch (e) {
    throw new Error(e instanceof Anthropic.AuthenticationError ? 'That API key was rejected. Check it in the 🔑 section.' : e instanceof Anthropic.RateLimitError ? 'Too many requests right now. Wait a moment and try again.'
      : e instanceof Anthropic.APIConnectionError ? 'Could not reach Claude. Are you online?' : e instanceof Anthropic.APIError ? `Claude error ${e.status}: ${e.message}` : e.message);
  }
}

// pull a JSON object out of a reply, even if it came wrapped in ``` fences or with a sentence around it
function jsonFrom(text) {
  const t = text.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
  try { return JSON.parse(t) } catch {}
  const a = t.indexOf('{'), b = t.lastIndexOf('}'); if (a >= 0 && b > a) try { return JSON.parse(t.slice(a, b + 1)) } catch {}
  throw new Error('The AI’s answer wasn’t in the expected format. Try again, or pick a stronger model under 🔑 → More.');
}

async function openaiStyle(p, system, messages, schema, maxTokens, retried) {
  if (!p.base) throw new Error('Add the service’s address under 🔑 → More (for example http://localhost:11434/v1 for Ollama).');
  if (!p.model) throw new Error('Type a model name under 🔑 → More.');
  const sys = schema ? `${system}\n\nReply with only one JSON object (no other text) that matches this JSON schema:\n${JSON.stringify(schema)}` : system;
  const body = { model: p.model, messages: [...(sys ? [{ role: 'system', content: sys }] : []), ...messages.map(m => ({ role: m.role, content: typeof m.content === 'string' ? m.content : (m.content || []).filter(b => b.type === 'text').map(b => b.text).join('') }))] };
  if (schema && !retried?.noFormat) body.response_format = { type: 'json_object' };
  let r;
  try { r = await fetch(p.base + '/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + AI.key(), ...(p.id === 'openrouter' ? { 'X-Title': 'The ToolBox' } : {}) }, body: JSON.stringify(body) }); }
  catch { throw new Error(`Could not reach ${p.name}. Are you online? (Some services block calls from web pages: OpenRouter works with almost any model.)`) }
  const j = await r.json().catch(() => ({})), msg = String(j.error?.message || j.message || j[0]?.error?.message || '');
  if (!r.ok) {
    if (r.status === 401 || r.status === 403) throw new Error(`That API key was rejected by ${p.name}. Check it in the 🔑 section.`);
    if (r.status === 429) throw new Error(`${p.name} says there are too many requests, or the account is out of credit. Wait a moment, or check your account.`);
    // some services don't support the JSON switch: ask again without it
    if (schema && !retried?.noFormat && /response_format|json/i.test(msg)) return openaiStyle(p, system, messages, schema, maxTokens, { ...retried, noFormat: true });
    // the model name is out of date: ask the service which models it has, pick one and try once more
    if (!retried?.model && (r.status === 404 || /model/i.test(msg))) { const m = await pickModel(p); if (m && m !== p.model) { set('aiModel', m); toast(`Using the model ${m}`); return openaiStyle({ ...p, model: m }, system, messages, schema, maxTokens, { ...retried, model: true }); } }
    throw new Error(`${p.name} error ${r.status}: ${msg || r.statusText}`);
  }
  const c = j.choices?.[0], text = String(c?.message?.content ?? '').trim();
  if (c?.finish_reason === 'content_filter') throw new Error(`${p.name} declined this one. Try asking differently.`);
  if (c?.finish_reason === 'length' && schema) throw new Error('The answer came out too long and was cut off. Try asking for something smaller.');
  if (!text) throw new Error(`${p.name} sent back an empty answer. Try again, or pick another model under 🔑 → More.`);
  return schema ? jsonFrom(text) : text;
}
async function pickModel(p) {
  try {
    const r = await fetch(p.base + '/models', { headers: { Authorization: 'Bearer ' + AI.key() } }); if (!r.ok) return null;
    const ids = ((await r.json()).data || []).map(m => String(m.id).replace(/^models\//, '')).filter(id => !/embed|whisper|tts|audio|image|vision-only|moderation|guard|dall|realtime|transcribe/i.test(id));
    const like = ['flash', 'mini', 'small', 'chat', 'instruct', 'turbo', 'latest'];
    return ids.find(id => like.some(w => id.includes(w))) || ids[0] || null;
  } catch { return null }
}
