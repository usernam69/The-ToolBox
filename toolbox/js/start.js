// Builds the page from the registered tools, then wires search, commands, keys, theme and focus mode.
pluginTools().forEach(tool);
if(TOOLS.some(t=>t.group==='Plugins'))GROUPS.push('Plugins');

TOOLS.forEach(t=>{const s=document.createElement('section');s.id=t.id;s.innerHTML=t.html;$('main').append(s);t.sec=s;
  // ☆ favorite toggle in every tab's corner
  const f=document.createElement('button');f.className='favBtn';f.title='Add to ★ Favorites';f.onclick=()=>toggleFav(t.id);s.append(f)});
const favs=()=>load('favorites',[]).filter(id=>toolById(id));
function toggleFav(id){const f=favs(),on=f.includes(id);save('favorites',on?f.filter(x=>x!==id):[...f,id]);toast(on?'Removed from ★ Favorites':'Added to ★ Favorites');syncFavGroup();drawNav(curGroup==='★'&&!favs().length?toolById(id).group:curGroup);markNav()}
function syncFavGroup(){const has=GROUPS[0]==='★';if(favs().length&&!has)GROUPS.unshift('★');if(!favs().length&&has)GROUPS.shift();
  TOOLS.forEach(t=>{const b=t.sec.querySelector('.favBtn');const on=favs().includes(t.id);b.textContent=on?'★':'☆';b.classList.toggle('on',on)})}
syncFavGroup();
TOOLS.forEach(t=>{try{t.init?.call(t,t.sec)}catch(e){console.error(t.id,e);t.sec.insertAdjacentHTML('afterbegin',`<p style="color:var(--bad)">This tool failed to start: ${esc(e.message)}</p>`)}});

let curGroup=null,navQuery='';
const toolsIn=g=>g==='★'?favs().map(toolById):TOOLS.filter(t=>t.group===g);
function drawNav(group){curGroup=group;
  $('groups').innerHTML=GROUPS.map(g=>`<button class="${g===group&&!navQuery?'on':''}">${g}</button>`).join('')+'<input id="navFilter" placeholder="Filter tools…" autocomplete="off">';
  [...$('groups').querySelectorAll('button')].forEach((b,i)=>b.onclick=()=>{navQuery='';const g=GROUPS[i];const first=toolsIn(g).find(t=>t.id===load('lastIn_'+g,''))||toolsIn(g)[0];curGroup=null;showTool(first.id,g)});
  const nf=$('navFilter');nf.value=navQuery;nf.oninput=()=>{navQuery=nf.value.trim().toLowerCase();const pos=nf.selectionStart;drawNav(curGroup);$('navFilter').focus();$('navFilter').setSelectionRange(pos,pos)};
  nf.onkeydown=e=>{if(e.key==='Enter'){const b=$('nav').querySelector('button');if(b)b.click()}if(e.key==='Escape'){navQuery='';drawNav(curGroup);nf.blur()}};
  const list=navQuery?TOOLS.filter(t=>(t.name+' '+t.group).toLowerCase().includes(navQuery)):toolsIn(group);
  $('nav').innerHTML=navQuery&&!list.length?'<span class="muted">No tools match.</span>':'';
  list.forEach((t,i)=>{const b=document.createElement('button');b.innerHTML=(i<9&&!navQuery?`<kbd>${i+1}</kbd>`:'')+(lockedTool(t)?'🔒 ':'')+esc(t.name)+(navQuery?` <span class="muted" style="font-size:11px">${esc(t.group)}</span>`:'');
    b.dataset.id=t.id;b.onclick=()=>{if(navQuery){navQuery='';curGroup=null}showTool(t.id)};$('nav').append(b)});markNav()}
function markNav(){const cur=TOOLS.find(x=>x.sec.classList.contains('on'));[...$('nav').querySelectorAll('button')].forEach(b=>b.classList.toggle('on',b.dataset.id===cur?.id))}
function showTool(id,viaGroup){const t=toolById(id)||TOOLS[0];
  if(lockedTool(t))return showLock(t,()=>{drawNav(curGroup);showTool(t.id,viaGroup)});
  const g=viaGroup||(curGroup==='★'&&favs().includes(t.id)?'★':t.group);if(g!==curGroup||navQuery)drawNav(g);
  TOOLS.forEach(x=>x.sec.classList.toggle('on',x===t));markNav();
  save('tab',t.id);save('lastIn_'+g,t.id);
  const used=load('lastUsed',{});used[t.id]=Date.now();save('lastUsed',used);save('recent',[t.id,...load('recent',[]).filter(x=>x!==t.id)].slice(0,12));
  try{t.show?.call(t,t.sec)}catch(e){console.error(t.id,e)}
  try{checkBadges()}catch{}}
applyLook();resetIdle();takeSnapshot();setInterval(takeSnapshot,30*6e4);
// tools.html#id opens that tool (links from the main menu)
const fromHash=()=>{const id=decodeURIComponent(location.hash.slice(1));return toolById(id)?id:null};
showTool(fromHash()||(lockedTool(toolById(load('tab','dash'))||TOOLS[0])?'dash':load('tab','dash')));
addEventListener('hashchange',()=>{const id=fromHash();if(id)showTool(id)});
$('surpriseBtn').onclick=surprise;$('printBtn').onclick=()=>window.print();$('cmdMic').onclick=startVoice;

// ---------- theme ----------
const THEMES=['auto','light','dark'],THEME_LABEL={auto:'◐ Auto',light:'☀ Light',dark:'☾ Dark'};
function applyTheme(){const t=load('theme','auto');if(t==='auto')document.documentElement.removeAttribute('data-theme');else document.documentElement.dataset.theme=t;$('themeBtn').textContent=THEME_LABEL[t]}
$('themeBtn').onclick=()=>{save('theme',THEMES[(THEMES.indexOf(load('theme','auto'))+1)%3]);applyTheme()};applyTheme();

// ---------- global search ----------
function runSearch(){const q=$('gsearch').value.trim().toLowerCase(),box=$('gresults');if(!q){box.style.display='none';return}
  const res=[...TOOLS.filter(t=>t.name.toLowerCase().includes(q)).map(t=>({text:'Tool: '+t.name,go:()=>showTool(t.id)})),
    ...TOOLS.filter(t=>!lockedTool(t)).flatMap(t=>{try{return t.search?t.search(q):[]}catch{return[]}})].slice(0,40);
  box.innerHTML=res.length?'':'<div class="muted">No matches.</div>';
  res.forEach(r=>{const d=document.createElement('div');d.textContent=r.text;d.onmousedown=e=>{e.preventDefault();r.go();$('gsearch').value='';box.style.display='none';$('gsearch').blur()};box.append(d)});
  box.style.display='block'}
$('gsearch').oninput=runSearch;$('gsearch').onblur=()=>setTimeout(()=>$('gresults').style.display='none',150);
$('gsearch').onkeydown=e=>{if(e.key==='Enter'){const f=$('gresults').querySelector('div:not(.muted)');if(f)f.dispatchEvent(new MouseEvent('mousedown'))}if(e.key==='Escape'){$('gsearch').value='';$('gsearch').blur()}};

// ---------- command bar ----------
command({word:'go',help:'go flashcards  (open any tool)',run(r){const q=r.trim().toLowerCase();const t=TOOLS.find(t=>t.name.toLowerCase()===q)||TOOLS.find(t=>t.name.toLowerCase().startsWith(q))||TOOLS.find(t=>t.name.toLowerCase().includes(q));
  if(!t)return`No tool called "${r}".`;showTool(t.id);return''}});
command({word:'help',help:'help  (list all commands)',run(){return COMMANDS.map(c=>c.help).join('\n')}});
function openCmd(){$('cmdModal').classList.add('on');$('cmdIn').value='';$('cmdOut').textContent='Type a command, or a tool name to open it. "help" lists everything.';$('cmdIn').focus()}
function closeCmd(){$('cmdModal').classList.remove('on')}
function runCommand(text){const t=text.trim();if(!t)return'';const[word,...rest]=t.split(/\s+/),c=COMMANDS.find(c=>c.word===word.toLowerCase());bump('commands');
  if(c)return c.run(t.slice(word.length).trim());return COMMANDS.find(c=>c.word==='go').run(t)}
$('cmdBtn').onclick=openCmd;$('cmdModal').onclick=e=>{if(e.target===$('cmdModal'))closeCmd()};
$('cmdIn').onkeydown=e=>{if(e.key==='Escape')closeCmd();if(e.key==='Enter'){const msg=runCommand($('cmdIn').value);
  if(!msg){closeCmd();return}$('cmdOut').style.whiteSpace='pre-wrap';$('cmdOut').textContent=msg;$('cmdIn').value='';
  const t=TOOLS.find(t=>t.sec.classList.contains('on'));try{t.show?.call(t,t.sec)}catch{}}};
$('cmdIn').oninput=()=>{const w=$('cmdIn').value.trim().split(/\s+/)[0].toLowerCase();const hits=COMMANDS.filter(c=>w&&c.word.startsWith(w));$('cmdOut').textContent=hits.length?hits.map(c=>c.help).join('\n'):'Enter opens the matching tool.'};

// ---------- focus mode ----------
$('focusBtn').onclick=enterFocus;

// ---------- keyboard ----------
document.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openCmd();return}
  if(e.key==='Escape'){if($('focus').classList.contains('on'))exitFocus();if($('cmdModal').classList.contains('on'))closeCmd();return}
  if(isTyping()||e.ctrlKey||e.metaKey||e.altKey||$('cmdModal').classList.contains('on')||$('focus').classList.contains('on'))return;
  if(e.key==='/'){e.preventDefault();$('gsearch').focus();return}
  if(/^[1-9]$/.test(e.key)){const t=toolsIn(curGroup)[+e.key-1];if(t)showTool(t.id,curGroup);return}
  if(e.key==='['||e.key===']'){const g=GROUPS[(GROUPS.indexOf(curGroup)+(e.key===']'?1:GROUPS.length-1))%GROUPS.length];$('groups').querySelectorAll('button')[GROUPS.indexOf(g)].click();return}
  if(e.key==='s'||e.key==='S'){if(!toolById('typing').sec.classList.contains('on'))startSaver();return}
  if((e.key==='f'||e.key==='F')&&!toolById('cards').sec.classList.contains('on'))enterFocus()});

// ---------- offline / install (only works when served over http/https) ----------
if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js').catch(()=>{});
// tools.html?cmd=… runs a command-bar command (used by the voice launcher on the main menu)
{const c=new URLSearchParams(location.search).get('cmd');if(c){history.replaceState(null,'',location.pathname+location.hash);setTimeout(()=>{const r=runCommand(c.slice(0,300));if(r)toast(String(r).split('\n')[0].slice(0,140))},300)}}
