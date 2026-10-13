// Address-bar shortcut: type "tb", a space, then an app name (e.g. "tb snake") and press Enter.
importScripts('registry.js');
const SITE = 'https://usernam69.github.io/The-ToolBox/';
const xml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
const find = q => { q = q.trim().toLowerCase(); return q ? ALL_APPS.filter(a => (a.name + ' ' + a.desc + ' ' + a.id).toLowerCase().includes(q)) : []; };
chrome.omnibox.setDefaultSuggestion({ description: 'Open a ToolBox app (type its name)' });
chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  suggest(find(text).slice(0, 6).map(a => ({ content: a.id, description: `${xml(a.emoji)} <match>${xml(a.name)}</match> <dim>${xml(a.desc)}</dim>` })));
});
chrome.omnibox.onInputEntered.addListener((text, disposition) => {
  const a = ALL_APPS.find(x => x.id === text) || find(text)[0];
  const url = new URL(a ? a.href : 'index.html', SITE).href;
  if (disposition === 'currentTab') chrome.tabs.update({ url }); else chrome.tabs.create({ url, active: disposition === 'newForegroundTab' });
});
