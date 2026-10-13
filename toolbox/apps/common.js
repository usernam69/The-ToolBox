// Shared helpers for app pages. Each page sets <body data-title="…" data-app="id"> before loading this.
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const APP=document.body.dataset.app||'app';
// Each app keeps its data under its own prefix; shared toolbox data uses 'tb_'.
function load(k,d){try{const v=localStorage.getItem('app_'+APP+'_'+k);return v?JSON.parse(v):d}catch{return d}}
function save(k,v){try{localStorage.setItem('app_'+APP+'_'+k,JSON.stringify(v))}catch{}}
function loadTb(k,d){try{const v=localStorage.getItem('tb_'+k);return v?JSON.parse(v):d}catch{return d}}
function saveTb(k,v){try{localStorage.setItem('tb_'+k,JSON.stringify(v))}catch{}}
const rnd=n=>Math.floor(Math.random()*n),pick=a=>a[rnd(a.length)];
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const pad2=n=>String(n).padStart(2,'0');
const isoDay=(d=new Date())=>d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());
const DAY=864e5;
let toastT;function toast(m){let t=$('toast');if(!t){t=document.createElement('div');t.id='toast';document.body.append(t)}t.textContent=m;t.style.display='block';clearTimeout(toastT);toastT=setTimeout(()=>t.style.display='none',3000)}
function download(name,data,type='text/plain'){const a=document.createElement('a');a.href=typeof data==='string'&&data.startsWith('data:')?data:URL.createObjectURL(data instanceof Blob?data:new Blob([data],{type}));a.download=name;a.click()}
async function copy(t){try{await navigator.clipboard.writeText(t);toast('Copied!')}catch{toast('Could not copy')}}
const cssVar=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
// keep the toolbox's theme & accent choices
(()=>{const t=loadTb('theme','auto');if(t!=='auto')document.documentElement.dataset.theme=t;const a=loadTb('accent','');if(a)document.documentElement.style.setProperty('--accent',a)})();
// top bar with a way back to the menu
(()=>{const bar=document.createElement('div');bar.className='topbar';
  bar.innerHTML=`<a href="../index.html#${esc(document.body.dataset.cat||'')}" title="Back to the main menu">← Menu</a><h1>${esc(document.body.dataset.title||document.title)}</h1>`;
  document.body.prepend(bar);document.title=(document.body.dataset.title||document.title)+' · The ToolBox';
  try{const r=JSON.parse(localStorage.getItem('menu_recent')||'[]');localStorage.setItem('menu_recent',JSON.stringify([APP,...r.filter(x=>x!==APP)].slice(0,8)));const v=JSON.parse(localStorage.getItem('menu_visited')||'[]');if(!v.includes(APP))localStorage.setItem('menu_visited',JSON.stringify([...v,APP]))}catch{}})();
let audioCtx;const AC=()=>audioCtx||(audioCtx=new (window.AudioContext||window.webkitAudioContext)());
function tone(freq,dur=.15,type='sine',vol=.15,when=0){try{const a=AC(),o=a.createOscillator(),g=a.createGain(),t=a.currentTime+when;o.type=type;o.frequency.value=freq;
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(a.destination);o.start(t);o.stop(t+dur+.02)}catch{}}
// Hold-to-move keys helper for games
const keys=new Set();addEventListener('keydown',e=>{if(!/INPUT|TEXTAREA/.test(document.activeElement.tagName)){keys.add(e.key.toLowerCase());if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(e.key.toLowerCase()))e.preventDefault()}});addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
function bindTouch(el){el.querySelectorAll('[data-key]').forEach(b=>{const k=b.dataset.key;
  b.addEventListener('pointerdown',e=>{e.preventDefault();keys.add(k)});['pointerup','pointerleave','pointercancel'].forEach(ev=>b.addEventListener(ev,()=>keys.delete(k)))})}
// share button, ? shortcut sheet, gamepad support
const SHORTCUTS={parkour:'←/→ or A/D move · Space/W/↑ jump · R restart',snake:'Arrow keys or WASD steer · Space start',typerain:'Just type the falling words',
 rogue:'Arrow keys or WASD move (bump a monster to fight) · . wait a turn',rhythm:'D F J K hit the four lanes',duel:'Player 1: WASD + Shift dash · Player 2: arrows + Enter dash · Space start',
 maze:'Arrow keys or WASD walk',voxel:'WASD move · mouse look · click break · right-click place · Space jump · Shift down · F fly · 1–9 pick a block',
 desklevel:'←/→ or A/D move · Space jump · R restart',museum:'←/→ or A/D walk · hold Shift to hurry',palette:'Space new palette',
 makemachine:'Space pull the lever',pixel:'B brush · E eraser · F fill · I eyedropper · Ctrl+Z undo',wordle:'Type letters · Enter guess · Backspace delete',lofi:'Space play/stop'};
(()=>{const bar=document.querySelector('.topbar');if(!bar)return;
  const sh=document.createElement('button');sh.className='tb-share';sh.textContent='🔗';sh.title='Share: copy a link to this app';sh.setAttribute('aria-label','Share');
  sh.onclick=async()=>{const url=location.href.split('#')[0];if(navigator.share&&matchMedia('(pointer:coarse)').matches){try{await navigator.share({title:document.title,url});return}catch{}}copy(url)};bar.append(sh);
  const help=document.createElement('button');help.className='tb-share';help.textContent='?';help.title='Keyboard shortcuts (?)';help.setAttribute('aria-label','Keyboard shortcuts');help.onclick=()=>sheet();bar.append(help);if(!['remix','os','community','family','open'].includes(APP)&&/^[\w-]+\.html$/.test(location.pathname.split('/').pop())){const rx=document.createElement('a');rx.className='tb-share tb-remix';rx.textContent='🛠️';rx.title='Remix: see and change this app’s code';rx.setAttribute('aria-label','Remix this app');rx.href='remix.html?app='+location.pathname.split('/').pop();bar.append(rx)}})();
function sheet(){if($('kbSheet'))return $('kbSheet').remove();const d=document.createElement('div');d.id='kbSheet';d.setAttribute('role','dialog');
  d.innerHTML=`<b>Shortcuts</b><p>${esc(SHORTCUTS[APP]||'This app is mouse and touch only.')}</p><p class="muted">Everywhere: ? this sheet · Esc close · a game controller works in games (stick/D-pad move, A jump).</p><button class="g">Close</button>`;
  d.querySelector('button').onclick=()=>d.remove();document.body.append(d)}
addEventListener('keydown',e=>{if(/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)||document.activeElement.isContentEditable)return;if(e.key==='?')sheet();if(e.key==='Escape'&&$('kbSheet'))$('kbSheet').remove()});
// Gamepad → the same keys set the keyboard uses, plus real key events for apps that listen for keydown
(()=>{let prev={};const MAP=[[b=>b[14]||b.ax0<-.5,'arrowleft','ArrowLeft'],[b=>b[15]||b.ax0>.5,'arrowright','ArrowRight'],[b=>b[12]||b.ax1<-.5,'arrowup','ArrowUp'],[b=>b[13]||b.ax1>.5,'arrowdown','ArrowDown'],[b=>b[0],' ',' '],[b=>b[1],'enter','Enter'],[b=>b[9],'escape','Escape'],[b=>b[3],'r','r']];
  function poll(){const pads=navigator.getGamepads?[...navigator.getGamepads()].filter(Boolean):[];if(pads.length){const p=pads[0],b=p.buttons.map(x=>x.pressed);b.ax0=p.axes[0]||0;b.ax1=p.axes[1]||0;
    for(const[test,k,key]of MAP){const on=!!test(b);if(on!==!!prev[k]){on?keys.add(k):keys.delete(k);document.dispatchEvent(new KeyboardEvent(on?'keydown':'keyup',{key,bubbles:true}));prev[k]=on}}}requestAnimationFrame(poll)}
  addEventListener('gamepadconnected',()=>{toast('🎮 Controller connected');poll()},{once:true})})();
// family rules (time limits, school hours, kiosk mode) – see family-rules.js
(()=>{const s=document.createElement('script');s.src=new URL('family-rules.js',document.querySelector('script[src$="common.js"]').src).href;
  s.onload=()=>{const cat=document.body.dataset.cat||'',w=FAM.why(APP,cat),back='../index.html';if(w)FAM.block(w,back);FAM.track(APP,cat,back)};document.head.append(s)})();
// accessibility: give screen readers a name for icon-only buttons, unlabeled fields and game canvases
(()=>{const SYM={'◀':'Left','▶':'Right','▲':'Up','▼':'Down','⤒':'Jump','↶':'Undo','↷':'Redo','↵':'Send','⏎':'Enter','⌫':'Delete','✕':'Remove','×':'Close','+':'Add','＋':'Add','-':'Remove','－':'Remove','✓':'Done','‹':'Previous','›':'Next','♥':'Favorite','☆':'Favorite','★':'Favorite','?':'Help','🍪':'Click the cookie'};
  const human=s=>String(s||'').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/[-_]/g,' ').trim();
  function label(root){root.querySelectorAll('button:not([aria-label])').forEach(b=>{const t=b.textContent.trim();
      if(SYM[t])b.setAttribute('aria-label',b.title||SYM[t]);
      else if(!t){const bg=b.style.background||b.style.backgroundColor;b.setAttribute('aria-label',b.title||(b.dataset.c||bg?'Color '+(b.dataset.c||bg):b.classList.contains('cell')?'Step':human(b.id)||'Button'))}
      if(b.classList.contains('cell'))b.setAttribute('aria-pressed',b.classList.contains('on'))});
    root.querySelectorAll('input:not([type=hidden]):not([aria-label]),select:not([aria-label]),textarea:not([aria-label])').forEach(i=>{
      if(i.closest('label')||i.placeholder||i.title||(i.id&&document.querySelector(`label[for="${i.id}"]`)))return;
      const prev=i.previousSibling&&i.previousSibling.textContent&&i.previousSibling.textContent.trim();i.setAttribute('aria-label',prev||human(i.id)||i.type||'Field')});
    root.querySelectorAll('canvas:not([role])').forEach(c=>{c.setAttribute('role','img');c.setAttribute('aria-label',(document.body.dataset.title||'App')+' '+(c.id&&c.id!=='c'?human(c.id):'screen'))})}
  const run=()=>label(document);addEventListener('load',run);setTimeout(run,800);
  let t;new MutationObserver(()=>{clearTimeout(t);t=setTimeout(run,200)}).observe(document.body,{childList:true,subtree:true})})();
// translations of the top bar (see i18n.js)
(()=>{let l='auto';try{l=JSON.parse(localStorage.getItem('tb_lang')||'"auto"')}catch{}if(l==='en'||(l==='auto'&&/^en/.test(navigator.language||'en')))return;
  const s=document.createElement('script');s.src=new URL('i18n.js',document.querySelector('script[src$="common.js"]').src).href;
  s.onload=()=>{const L=I18N.lang(),n=I18N.apps[L]&&I18N.apps[L][APP];if(n){const h=document.querySelector('.topbar h1');if(h)h.textContent=n;document.title=n+' · The ToolBox'}I18N.watch()};document.head.append(s)})();
// files/text handed over from "Open with" / "Share to" (open.html)
if(/[?&]handoff=/.test(location.search)&&!/open\.html$/.test(location.pathname)){const s=document.createElement('script');s.src=new URL('handoff.js',document.querySelector('script[src$="common.js"]').src).href;document.head.append(s)}
