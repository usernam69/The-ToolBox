// Shared helpers for app pages. Each page sets <body data-title="…" data-app="id"> before loading this.
// error catcher + version (errors.js), loaded first so it sees problems in the page's own script
if(!window.TB_VERSION){const s=document.createElement('script');s.src=new URL('errors.js',document.currentScript.src).href;s.async=false;document.head.append(s)}
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
const keys=new Set();addEventListener('keydown',e=>{if(!/INPUT|TEXTAREA/.test(document.activeElement.tagName)){keys.add(e.key.toLowerCase());if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(e.key.toLowerCase()))e.preventDefault()}});addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));addEventListener('blur',()=>keys.clear());
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
  d.innerHTML=`<b>Shortcuts</b><p>${esc(SHORTCUTS[APP]||'This app is mouse and touch only.')}</p><p class="muted">Everywhere: ? this sheet · Esc close · a game controller works in games (stick/D-pad move, ${['A','B','X','Y'][loadTb('padJump',0)]||'A'} jump).</p>${window.TB_PREFS?TB_PREFS.html():''}
   <p style="margin:6px 0">Controller jump button: <select id="padJump" aria-label="Controller jump button">${['A','B','X','Y'].map((n,i)=>`<option value="${i}" ${loadTb('padJump',0)===i?'selected':''}>${n}</option>`).join('')}</select></p><button class="g">Close</button>`;
  if(window.TB_PREFS)TB_PREFS.wire(d);d.querySelector('#padJump').onchange=e=>saveTb('padJump',+e.target.value);
  d.querySelector('button').onclick=()=>d.remove();const send=document.createElement('button');send.className='g';send.textContent='📱 Continue on another device';send.onclick=()=>{d.remove();handOff()};d.append(' ',send);document.body.append(d)}
// Continue on another device: a QR code with this app's address and (if it fits) its saved data, packed into the #hash.
// The hash never reaches a server; the other device asks before replacing anything.
const tbPack=async s=>{const b=await new Response(new Blob([s]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer();return btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')};
const tbUnpack=async s=>{const u=Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));return new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text()};
async function handOff(){const data={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k.startsWith('app_'+APP+'_'))data[k]=localStorage.getItem(k)}
  const base=location.href.split('#')[0],packed=Object.keys(data).length&&window.CompressionStream?await tbPack(JSON.stringify(data)):'',url=packed&&packed.length<1800?base+'#tbdata='+packed:base;
  const s=document.createElement('script');s.src=new URL('vendor/qrcode.min.js',document.querySelector('script[src$="common.js"]').src).href;s.onload=()=>{const q=qrcode(0,'L');q.addData(url);q.make();
    const d=document.createElement('dialog');d.className='qrd';d.style.cssText='border:1px solid var(--line);border-radius:16px;background:var(--card);color:var(--ink);text-align:center;max-width:min(380px,calc(100vw - 32px))';
    d.innerHTML=`<h3 style="margin-top:0">Continue on another device</h3>${q.createSvgTag({cellSize:4,margin:3,scalable:true}).replace('<svg','<svg style="width:260px;height:260px;background:#fff;border-radius:8px"')}
     <p class="muted" style="font-size:13px">${url!==base?'Scan with the phone camera. It opens this app with what you have saved here.':Object.keys(data).length?'Your saved data is too big for a QR code, so this opens the app empty. Use Backup &amp; sync to move everything.':'Scan with the phone camera to open this app there.'}</p>
     ${/localhost|127\.0\.0\.1|^file/.test(base)?'<p class="muted" style="font-size:13px">This address only works on this computer. Use the online version to continue on a phone.</p>':''}<button class="g">Close</button>`;
    document.body.append(d);d.querySelector('button').onclick=()=>d.close();d.addEventListener('close',()=>d.remove());d.showModal()};document.head.append(s)}
if(location.hash.startsWith('#tbdata=')&&window.DecompressionStream)tbUnpack(location.hash.slice(8)).then(t=>{const o=JSON.parse(t);history.replaceState(null,'',location.href.split('#')[0]);
  const keys=Object.keys(o).filter(k=>k.startsWith('app_'+APP+'_')&&typeof o[k]==='string');if(!keys.length)return;
  if(confirm(`Load what you saved in ${document.body.dataset.title||'this app'} on your other device? It replaces what's saved here.`)){keys.forEach(k=>{try{localStorage.setItem(k,o[k])}catch{}});location.reload()}}).catch(()=>toast('That link’s data could not be read.'));
addEventListener('keydown',e=>{if(/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)||document.activeElement.isContentEditable)return;if(e.key==='?')sheet();if(e.key==='Escape'&&$('kbSheet'))$('kbSheet').remove()});
// Gamepad → the same keys set the keyboard uses, plus real key events for apps that listen for keydown
(()=>{let prev={};const MAP=[[b=>b[14]||b.ax0<-.5,'arrowleft','ArrowLeft'],[b=>b[15]||b.ax0>.5,'arrowright','ArrowRight'],[b=>b[12]||b.ax1<-.5,'arrowup','ArrowUp'],[b=>b[13]||b.ax1>.5,'arrowdown','ArrowDown'],[b=>b[loadTb('padJump',0)],' ',' '],[b=>b[loadTb('padJump',0)===1?0:1],'enter','Enter'],[b=>b[9],'escape','Escape'],[b=>b[3],'r','r']];
  function poll(){const pads=navigator.getGamepads?[...navigator.getGamepads()].filter(Boolean):[];if(pads.length){const p=pads[0],b=p.buttons.map(x=>x.pressed);b.ax0=p.axes[0]||0;b.ax1=p.axes[1]||0;
    for(const[test,k,key]of MAP){const on=!!test(b);if(on!==!!prev[k]){on?keys.add(k):keys.delete(k);document.dispatchEvent(new KeyboardEvent(on?'keydown':'keyup',{key,bubbles:true}));prev[k]=on}}}requestAnimationFrame(poll)}
  addEventListener('gamepadconnected',()=>{toast('🎮 Controller connected');poll()},{once:true})})();
// games pause when the window loses focus: animation frames are held and the game clock stops until you click
if(document.body.dataset.cat==='games'&&APP!=='rhythm'){let held=[],pausedAt=0,lost=0,ov=null;const raf=requestAnimationFrame.bind(window),now=performance.now.bind(performance);
  performance.now=()=>now()-lost-(pausedAt?now()-pausedAt:0);window.requestAnimationFrame=cb=>{if(pausedAt){held.push(cb);return 0}return raf(()=>cb(performance.now()))};window.GAME_PAUSED=()=>!!pausedAt;
  const resume=()=>{if(!pausedAt)return;lost+=now()-pausedAt;pausedAt=0;if(ov)ov.remove();const h=held;held=[];h.forEach(cb=>raf(()=>cb(performance.now())))};
  addEventListener('blur',()=>{if(pausedAt||(window.NET&&NET.on)||document.activeElement&&document.activeElement.tagName==='IFRAME')return;pausedAt=now();
    ov=document.createElement('button');ov.id='pauseOv';ov.textContent='⏸ Paused. Click or press a key to continue';ov.onclick=resume;document.body.append(ov)});
  addEventListener('keydown',e=>{if(pausedAt&&e.key!=='Tab'){e.stopImmediatePropagation();resume()}},true)}
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
// ToolBox speedrun (speedrun.html): every new app opened during a run counts; the 10th stops the clock
(()=>{let r;try{r=JSON.parse(localStorage.getItem('app_speedrun_run'))}catch{}if(!r||r.end||APP==='speedrun')return;
  if(!r.seen.includes(APP)){r.seen.push(APP);if(r.seen.length>=10){r.end=Date.now();const t=r.end-r.start,best=+localStorage.getItem('app_speedrun_best')||0;
      if(!best||t<best)localStorage.setItem('app_speedrun_best',String(t));setTimeout(()=>toast(`⏱️ Speedrun done in ${(t/1000).toFixed(1)}s!${!best||t<best?' New best!':''}`),400);[523,659,784,1047].forEach((f,i)=>tone(f,.15,'square',.08,i*.1))}
    localStorage.setItem('app_speedrun_run',JSON.stringify(r))}
  if(r.end)return;const c=document.createElement('a');c.href='speedrun.html';c.className='tb-share';c.style.cssText='font-variant-numeric:tabular-nums;text-decoration:none';c.title='Speedrun in progress';
  const tick=()=>{c.textContent=`⏱️ ${r.seen.length}/10 · ${((Date.now()-r.start)/1000).toFixed(0)}s`};tick();setInterval(tick,1000);const bar=document.querySelector('.topbar');if(bar)bar.append(c)})();
