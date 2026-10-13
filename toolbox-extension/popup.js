// Lists every ToolBox app (from registry.js, copied from the web app) and opens the one you pick in a tab.
const SITE = 'https://usernam69.github.io/The-ToolBox/';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const go = href => { chrome.tabs.create({ url: new URL(href, SITE).href }); window.close(); };
function draw() {
  const q = document.getElementById('q').value.trim().toLowerCase();
  const html = CATEGORIES.map(c => {
    const apps = c.apps.filter(([id, name, , desc]) => !q || (name + ' ' + desc + ' ' + c.name).toLowerCase().includes(q));
    return apps.length ? `<div class="cat">${c.emoji} ${esc(c.name)}</div>` + apps.map(([id, name, emoji, desc, href]) =>
      `<button class="app" data-href="${esc(href)}" title="${esc(desc)}"><span class="e">${emoji}</span>${esc(name)}</button>`).join('') : '';
  }).join('');
  document.getElementById('list').innerHTML = html || '<p style="padding:8px;color:var(--muted)">Nothing matches.</p>';
  document.querySelectorAll('button.app').forEach(b => b.onclick = () => go(b.dataset.href));
}
document.getElementById('q').oninput = draw;
document.getElementById('q').onkeydown = e => { if (e.key === 'Enter') { const b = document.querySelector('button.app'); if (b) b.click(); } };
document.getElementById('menu').onclick = e => { e.preventDefault(); go('index.html'); };
draw();
