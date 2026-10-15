// Main-menu extras: favorites, surprise me, theme switch, install, offline badge, update toast,
// QR code, what's new, daily mix, the focus pet walking around, seasonal effects.
const VERSION=TB_VERSION;
const NEWS=TB_NEWS;
const KEYWORDS={lofi:'music beat drums song',rhythm:'music song beat',moodmusic:'music song feelings',soundboard:'sound music noise',
 pixel:'draw art paint sprite',genart:'art draw pattern',comic:'draw art story',draw:'paint art multiplayer friends',
 parkour:'jump platformer run',reverse:'platformer traps',desklevel:'photo camera platformer',snake:'arcade',wordle:'words puzzle',
 typerain:'typing keyboard words',maze:'puzzle labyrinth',escape:'puzzle mystery',rogue:'dungeon rpg',idle:'clicker cookie',
 duel:'two player sumo fight',physics:'balls rope simulation',voxel:'minecraft 3d blocks build',chat:'message friends multiplayer',
 buddy:'ai claude study quiz',journal:'diary write',sticky:'notes',petfocus:'timer pomodoro study',countdown:'timer event',
 eat:'food dinner wheel random',capsule:'letter future secret',museum:'art gallery paintings',website:'html homepage',
 discord:'bot code',story:'adventure choose read',poem:'poetry words',starfield:'space stars relax',decay:'todo tasks'};
const menuLS={get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch{return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}};
const toolbar=document.createElement('div');toolbar.className='row';toolbar.id='menuBar';
toolbar.innerHTML=`<button class="g" id="surprise" title="Open a random app">🎲 Surprise me</button><button class="g" id="themeBtn" title="Light / dark"></button>
 <button class="g" id="qrBtn" title="Open on a phone">📱 QR code</button><button class="b" id="installBtn" hidden>⬇ Install app</button>
 <span class="chip" id="offline" title="Offline status">⚪ Checking offline…</span>`;
document.querySelector('header.hero').after(toolbar);

// favorites: a ☆ on every app card, pinned row on the home screen
const favs=()=>menuLS.get('menu_favs',[]);
function decorate(root){root.querySelectorAll('.app[data-id]').forEach(a=>{if(a.querySelector('.fav'))return;const b=document.createElement('button');b.className='fav';b.type='button';
  const on=favs().includes(a.dataset.id);b.textContent=on?'★':'☆';b.title=on?'Remove from favorites':'Add to favorites';b.setAttribute('aria-label',b.title+': '+a.querySelector('b').textContent);
  b.onclick=e=>{e.preventDefault();e.stopPropagation();const f=favs(),i=f.indexOf(a.dataset.id);i<0?f.push(a.dataset.id):f.splice(i,1);menuLS.set('menu_favs',f);
    document.querySelectorAll(`.app[data-id="${a.dataset.id}"] .fav`).forEach(x=>{x.remove()});decorate(document);drawFavs()};a.append(b)})}
function drawFavs(){let box=$('favs');if(!box){box=document.createElement('div');box.id='favs';$('recent').before(box)}
  const list=favs().map(id=>ALL_APPS.find(a=>a.id===id)).filter(Boolean);
  box.innerHTML=list.length&&!location.hash&&!$('q').value?`<div class="muted" style="font-size:13px">★ Favorites</div><div class="apps" style="margin-bottom:16px">${list.map(card).join('')}</div>`:'';decorate(box)}
new MutationObserver(()=>decorate(document)).observe(document.querySelector('main'),{childList:true,subtree:true});

// search also matches category names and extra keywords
$('q').oninput=()=>{const q=$('q').value.trim().toLowerCase();if(!q){route();drawFavs();return}
  const words=q.split(/\s+/),cat=id=>CATEGORIES.find(c=>c.id===id)?.name||'';
  const hits=ALL_APPS.filter(a=>{const hay=(a.name+' '+a.desc+' '+cat(a.cat)+' '+(KEYWORDS[a.id]||'')).toLowerCase();return words.every(w=>hay.includes(w))});
  $('home').hidden=$('catView').hidden=true;$('searchView').hidden=false;$('recent').innerHTML='';drawFavs();
  $('searchApps').innerHTML=hits.map(card).join('')||'<p class="muted">Nothing matches.</p>'};

$('surprise').onclick=()=>{const a=ALL_APPS[Math.floor(Math.random()*ALL_APPS.length)];menuLS.set('menu_recent',[a.id,...menuLS.get('menu_recent',[]).filter(x=>x!==a.id)].slice(0,8));location.href=a.href};

// theme: auto → light → dark, shared with every app through tb_theme
const THEMES={auto:'🌗 Auto',light:'☀️ Light',dark:'🌙 Dark',custom:'🎨 Mine'};
function drawTheme(){const t=menuLS.get('tb_theme','auto');$('themeBtn').textContent=THEMES[t]||THEMES.auto;if(t==='auto')delete document.documentElement.dataset.theme;else document.documentElement.dataset.theme=t;TB_THEME.apply(t==='custom'?TB_THEME.get():null)}
// the theme button opens a preview of each look side by side (the previews carry their own colours, the page's stay put)
const PREVIEW={light:'--pbg:#f6f5f2;--pink:#1d1d1f;--pline:#e2e0da;--pacc:#2f6fde;--pmut:#6b6b70',dark:'--pbg:#141416;--pink:#ececef;--pline:#33333a;--pacc:#6b9bff;--pmut:#9a9aa2'};
$('themeBtn').onclick=()=>{const d=document.createElement('dialog');d.className='qrd';d.style.maxWidth='min(480px,calc(100vw - 32px))';const t=menuLS.get('tb_theme','auto');
  const mini=k=>`<button class="g" data-t="${k}" style="padding:6px;${t===k?'outline:2px solid var(--accent)':''}"><div style="${PREVIEW[k==='auto'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):k]};width:110px;border-radius:10px;padding:8px;background:var(--pbg);color:var(--pink);border:1px solid var(--pline);text-align:left"><div style="font-weight:700">Aa 🧰</div><div style="height:8px;border-radius:4px;background:var(--pacc);margin:6px 0"></div><div style="font-size:11px;color:var(--pmut)">Card text</div></div><div style="margin-top:4px">${THEMES[k]}</div></button>`;
  const cur=TB_THEME.get()||{bg:'#fdf6e3',card:'#ffffff',ink:'#2b2b2b',accent:'#d33682'};
  d.innerHTML=`<h3 style="margin-top:0">Light or dark?</h3><div class="row" style="justify-content:center">${['auto','light','dark'].map(mini).join('')}</div>
   <details style="text-align:left;margin:8px 0" ${t==='custom'?'open':''}><summary><b>🎨 Make your own</b></summary><div class="row" style="margin-top:6px">
   ${[['bg','Background'],['card','Cards'],['ink','Text'],['accent','Buttons']].map(([k,l])=>`<label style="font-size:13px">${l}<br><input type="color" data-c="${k}" value="${cur[k]}"></label>`).join('')}</div>
   <div class="row"><button class="b" id="thUse">Use my colours</button><button class="g" id="thShare">🔗 Share them</button></div></details><button class="g" id="thClose">Close</button>`;
  const mine=()=>Object.fromEntries([...d.querySelectorAll('[data-c]')].map(i=>[i.dataset.c,i.value]));
  d.querySelectorAll('[data-c]').forEach(i=>i.oninput=()=>TB_THEME.apply(mine()));
  d.querySelector('#thUse').onclick=()=>{menuLS.set('tb_customTheme',mine());menuLS.set('tb_theme','custom');drawTheme();d.close()};
  d.querySelector('#thShare').onclick=()=>{const u=location.href.split(/[?#]/)[0]+'?theme='+TB_THEME.KEYS.map(k=>mine()[k].slice(1)).join('-');navigator.clipboard.writeText(u).then(()=>alert('Link copied. Whoever opens it can use your colours.'),()=>prompt('Copy this link:',u))};
  d.addEventListener('close',drawTheme);
  d.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{menuLS.set('tb_theme',b.dataset.t);drawTheme();d.close()});d.querySelector('#thClose').onclick=()=>d.close();d.addEventListener('close',()=>d.remove());document.body.append(d);d.showModal()};drawTheme();
// someone shared their colours: ?theme=bg-card-ink-accent
{const p=new URLSearchParams(location.search).get('theme');if(p&&/^([0-9a-f]{6}-){3}[0-9a-f]{6}$/i.test(p)){const c=p.split('-'),t=Object.fromEntries(TB_THEME.KEYS.map((k,i)=>[k,'#'+c[i]]));
  history.replaceState(null,'',location.pathname+location.hash);TB_THEME.apply(t);setTimeout(()=>{if(confirm('Use these shared colours for The ToolBox?')){menuLS.set('tb_customTheme',t);menuLS.set('tb_theme','custom')}drawTheme()},300)}}

// install (Chrome / ChromeOS / Edge / Android)
let installEvt=null;addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvt=e;$('installBtn').hidden=false});
$('installBtn').onclick=async()=>{if(!installEvt)return;installEvt.prompt();await installEvt.userChoice;installEvt=null;$('installBtn').hidden=true};
addEventListener('appinstalled',()=>{$('installBtn').hidden=true});

// offline badge + "new version" banner
function banner(html){let b=$('banner');if(!b){b=document.createElement('div');b.id='banner';document.body.append(b)}b.innerHTML=html;return b}
async function offlineState(){const o=$('offline');if(window.toolboxDesktop){o.textContent='🟢 Works offline · v'+VERSION;o.title='The desktop app keeps everything on this computer';return}if(!('serviceWorker' in navigator)||!location.protocol.startsWith('http')){o.textContent='⚪ Offline needs the installed or online version';return}
  try{const names=await caches.keys(),c=names.find(n=>n.startsWith('toolbox-'));const n=c?(await (await caches.open(c)).keys()).length:0;
    o.textContent=navigator.serviceWorker.controller&&n>50?'🟢 Works offline · v'+VERSION:'🟡 Saving for offline…';o.title=n+' files saved on this device ('+c+')'}catch{o.textContent='⚪ Offline unavailable'}}
if('serviceWorker' in navigator&&location.protocol.startsWith('http')){
  navigator.serviceWorker.getRegistration().then(reg=>{if(!reg)return;
    const watch=w=>w&&w.addEventListener('statechange',()=>{if(w.state==='installed'&&navigator.serviceWorker.controller)
      banner('✨ A new version of The ToolBox is ready. <button class="b" id="reloadNow">Reload</button> <button class="x" id="later">✕</button>').querySelector('#reloadNow').onclick=()=>location.reload();
      if(w.state==='activated')offlineState();const l=$('later');if(l)l.onclick=()=>$('banner').remove()});
    watch(reg.installing);reg.addEventListener('updatefound',()=>watch(reg.installing));reg.update().catch(()=>{})});
  navigator.serviceWorker.addEventListener('controllerchange',offlineState)}
setTimeout(offlineState,600);addEventListener('online',offlineState);addEventListener('offline',offlineState);

// QR code to open this page on a phone (the library is stored with the app, so it works offline)
$('qrBtn').onclick=()=>{const s=document.createElement('script');s.src='apps/vendor/qrcode.min.js';s.onload=()=>{
  const url=location.href.split('#')[0].replace(/index\.html$/,''),q=qrcode(0,'M');q.addData(url);q.make();
  const d=document.createElement('dialog');d.className='qrd';d.innerHTML=`<h3 style="margin-top:0">Open The ToolBox on another device</h3>${q.createSvgTag({cellSize:6,margin:3,scalable:true})}<p class="muted" style="word-break:break-all">${esc(url)}</p>
   ${/localhost|127\.0\.0\.1|^file/.test(url)?'<p class="muted">This address only works on this computer. Use the online version or the Host button for other devices.</p>':''}<button class="b">Close</button>`;
  document.body.append(d);d.querySelector('button').onclick=()=>d.remove();d.addEventListener('close',()=>d.remove());d.showModal()};document.head.append(s)};

// what's new: shows once per version
if(menuLS.get('menu_seen','')!==VERSION){const box=document.createElement('div');box.className='box news';
  box.innerHTML=`<b>✨ What’s new</b> <button class="x" title="Dismiss">✕</button>${NEWS.slice(0,menuLS.get('menu_seen','')?1:2).map(([v,t])=>`<p style="margin:6px 0 0"><span class="muted">${v}</span> · ${esc(t)}</p>`).join('')}`;
  box.querySelector('.x').onclick=()=>{menuLS.set('menu_seen',VERSION);box.remove()};$('home').prepend(box)}

// daily mix: the same three picks all day, new ones tomorrow
(()=>{const d=new Date(),seed=d.getFullYear()*1000+d.getMonth()*40+d.getDate();let s=seed;const r=()=>(s=(s*16807)%2147483647)/2147483647;
  const from=id=>{const a=CATEGORIES.find(c=>c.id===id).apps;return a[Math.floor(r()*a.length)]};
  const picks=[['🎮 Play',from('games')],['🛠️ Get something done',from(r()<.5?'tools':'quick')],['🎨 Make',from(r()<.5?'creative':'wild')]];
  const box=document.createElement('div');box.id='mix';box.innerHTML=`<div class="muted" style="font-size:13px">Today’s mix</div><div class="apps" style="margin-bottom:16px">${picks.map(([k,[id,name,emoji,desc,href]])=>card({id,name,emoji,desc:k,href})).join('')}</div>`;
  $('home').prepend(box)})();

// the focus pet wanders along the bottom of the menu and reacts to what you point at
(()=>{let pet;try{pet=JSON.parse(localStorage.getItem('app_petfocus_pet'))}catch{}if(!pet)return;
  const ST=[[0,'🥚'],[25,'🐣'],[75,'🐥'],[150,'🐤'],[300,'🐔'],[600,'🦢'],[1000,'🦚'],[2000,'🐉']],em=ST.filter(s=>pet.xp>=s[0]).pop()[1];
  const el=document.createElement('a');el.id='menuPet';el.href='apps/petfocus.html';el.title=`${pet.name} (${pet.xp} xp). Click to focus together.`;el.innerHTML=`<span class="body">${em}</span><span class="say"></span>`;document.body.append(el);
  let x=40,dir=1,said=0;const say=t=>{el.querySelector('.say').textContent=t;said=Date.now()};window.petSay=say;
  const LINES={games:'Ooh, games!',tools:'Good idea, let’s get things done.',creative:'Make something pretty!',quick:'Quick one?',bigger:'Big project time!',wild:'Weird… I like it.'};
  document.addEventListener('pointerover',e=>{const a=e.target.closest('.app,.cat');if(!a||Date.now()-said<2500)return;const c=a.dataset.cat||ALL_APPS.find(x=>x.id===a.dataset.id)?.cat;if(LINES[c])say(LINES[c])});
  setInterval(()=>{x+=dir*1.2;if(x>innerWidth-60||x<10)dir*=-1;if(Math.random()<.004)dir*=-1;el.style.transform=`translateX(${x}px)`;el.querySelector('.body').style.transform=`scaleX(${-dir})`;if(Date.now()-said>3000)el.querySelector('.say').textContent=''},30)})();

// the pet eats the bugs fixed in each update: a few XP per fix, once per version
(()=>{let pet;try{pet=JSON.parse(localStorage.getItem('app_petfocus_pet'))}catch{}const fed=menuLS.get('menu_petFed','');if(!pet||fed===VERSION)return;menuLS.set('menu_petFed',VERSION);if(!fed)return;
  const newer=TB_NEWS.slice(0,Math.max(1,TB_NEWS.findIndex(n=>n[0]===fed))),bugs=newer.reduce((n,[,t])=>{const m=t.match(/Fix(?:es|ed)?:([^.]*)/i);return n+(m?m[1].split(/,| and /).length:0)},0);if(!bugs)return;
  pet.xp+=bugs*5;localStorage.setItem('app_petfocus_pet',JSON.stringify(pet));
  setTimeout(()=>window.petSay&&petSay(`🐞 Yum! ${bugs} bug${bugs>1?'s':''} from the update. +${bugs*5} XP`),1500)})();
// seasonal effects: snow in December–January, leaves in autumn, bats around Halloween, hearts in mid-February
(()=>{if(matchMedia('(prefers-reduced-motion: reduce)').matches||menuLS.get('menu_season',true)===false)return;const d=new Date(),m=d.getMonth(),day=d.getDate();
  const kind=m===11||m===0?'❄️':m===9&&day>=20?'🦇':m===8||m===9||m===10?'🍂':m===1&&day<=15?'💗':m===2&&day>=15||m===3?'🌸':null;if(!kind)return;
  const c=document.createElement('div');c.id='season';c.setAttribute('aria-hidden','true');document.body.append(c);
  for(let i=0;i<14;i++){const s=document.createElement('span');s.textContent=kind;s.style.left=Math.random()*100+'vw';s.style.animationDuration=8+Math.random()*10+'s';s.style.animationDelay=-Math.random()*18+'s';s.style.fontSize=12+Math.random()*14+'px';c.append(s)}
  const off=document.createElement('button');off.className='g';off.textContent=kind+' Off';off.title='Turn off seasonal effects';off.onclick=()=>{menuLS.set('menu_season',false);c.remove();off.remove()};$('menuBar').append(off)})();

// community apps added with "☆ Add to menu" join the Community category
(()=>{let p=[];try{p=JSON.parse(localStorage.getItem('app_community_pinned')||'[]')}catch{}const c=CATEGORIES.find(c=>c.id==='community');if(!c||!p.length)return;
  p.forEach(a=>{const href='apps/community.html#open='+a.id;c.apps.push(['c-'+a.id,a.name,a.emoji,a.desc||'Community app',href]);ALL_APPS.push({id:'c-'+a.id,name:a.name,emoji:a.emoji,desc:a.desc||'Community app',href,cat:'community'})});
  $('cats').querySelectorAll('.cat[data-cat="community"] .n').forEach(n=>n.textContent=c.apps.length+' apps');route()})();
addEventListener('hashchange',drawFavs);drawFavs();

// family rules on the menu: hide what kiosk / school mode blocks, show the current profile
(()=>{const r=FAM.rules(),list=FAM.list();
  const prof=document.createElement('a');prof.className='chip';prof.href='apps/family.html';prof.title='Profiles and family settings';prof.textContent='👤 '+FAM.current();$('menuBar').append(prof);
  const blocked=a=>!!FAM.why(a.id,a.cat)&&FAM.why(a.id,a.cat)!=='limit';
  function apply(){if(FAM.unlocked())return;document.querySelectorAll('.app[data-id],.chip[data-id]').forEach(el=>{const a=ALL_APPS.find(x=>x.id===el.dataset.id);if(a&&a.id!=='family'&&blocked(a))el.style.display='none'});
    document.querySelectorAll('.cat[data-cat]').forEach(el=>{const c=CATEGORIES.find(c=>c.id===el.dataset.cat);if(c&&c.apps.every(([id])=>id!=='family'&&blocked({id,cat:c.id})))el.style.display='none'});
    if(r.limit>0&&FAM.usedToday()>=(r.limit+FAM.bonus())*60&&!$('famNote')){const n=document.createElement('div');n.id='famNote';n.className='box';n.innerHTML='⏰ <b>That’s all the ToolBox time for today.</b> See you tomorrow!';$('home').prepend(n)}
    if(FAM.schoolNow(r)&&!$('famSchool')){const n=document.createElement('p');n.id='famSchool';n.className='muted';n.textContent='🏫 School mode is on until '+r.school.to+'.';$('home').prepend(n)}}
  new MutationObserver(apply).observe(document.querySelector('main'),{childList:true,subtree:true});apply()})();

// who's using it? once per visit, when there are several profiles and the family settings ask for it
(()=>{const names=FAM.list();if(!FAM.get('prof__ask',false)||names.length<2)return;try{if(sessionStorage.getItem('tb_asked'))return;sessionStorage.setItem('tb_asked','1')}catch{return}
  const d=document.createElement('dialog');d.className='qrd';d.innerHTML=`<h3 style="margin-top:0">Who’s using The ToolBox?</h3><div class="row" style="justify-content:center">${names.map(n=>`<button class="${n===FAM.current()?'b':'g'}" data-p="${esc(n)}" style="font-size:18px;padding:12px 18px">👤 ${esc(n)}</button>`).join('')}</div>`;
  d.querySelectorAll('[data-p]').forEach(b=>b.onclick=async()=>{const n=b.dataset.p;if(n===FAM.current())return d.close();const r=FAM.rules();
    // a profile with limits needs the grown-up PIN to switch away from
    if(r.pin&&(r.limit>0||r.kiosk&&r.kiosk.on||r.school&&r.school.on)&&!(await FAM.check(prompt('Grown-up PIN to switch profiles')||'')))return alert('Wrong PIN');
    if(FAM.switchTo(n))location.reload()});document.body.append(d);d.addEventListener('close',()=>d.remove());d.showModal()})();
// active quest: a chip on the menu that leads back to it
(()=>{let st;try{st=JSON.parse(localStorage.getItem('app_quests_state'))}catch{}const ids=st&&st.active?Object.keys(st.active):[];if(!ids.length)return;
  const q=st.active[ids[0]],done=(q.got||[]).filter(Boolean).length,total=q.total||3;
  const a=document.createElement('a');a.className='chip';a.href='apps/quests.html';a.title=ids.length+' quest'+(ids.length>1?'s':'')+' in progress';
  a.innerHTML=`${q.emoji||'🗺️'} ${esc(q.name||'Quest')} <span style="display:inline-block;width:50px;height:6px;border-radius:3px;background:var(--line);overflow:hidden"><span style="display:block;height:100%;width:${done/total*100}%;background:var(--accent)"></span></span> ${done}/${total}${ids.length>1?' +'+(ids.length-1):''}`;$('menuBar').append(a)})();
// story mode (optional): categories unlock one by one as you try apps, with a little tale along the way
(()=>{const on=menuLS.get('menu_story',false),btn=document.createElement('button');btn.className='g';btn.textContent=on?'📖 Story mode: on':'📖 Story mode';btn.title='Unlock the categories one by one';
  btn.onclick=()=>{menuLS.set('menu_story',!on);location.reload()};$('menuBar').append(btn);if(!on)return;
  const CH=[['quick','Chapter 1: The Workshop','You find a dusty toolbox in the attic. Inside, small gadgets hum to life. Try 3 of them.'],
   ['games','Chapter 2: The Arcade','A hidden door opens to a room full of blinking machines. Play 3 games to power up the next door.'],
   ['creative','Chapter 3: The Studio','Paint, music and stories spill out of the walls. Make something in 3 studio apps.'],
   ['tools','Chapter 4: The Library','Shelves of clever tools stretch up into the dark. Open the Toolbox and look around.'],
   ['bigger','Chapter 5: The Workshop of Giants','Huge machines wait: worlds, websites and robots. Try 2 of them.'],
   ['wild','Chapter 6: The Strange Room','Nothing here makes sense, and that’s the point. Try 2 wild ideas.'],
   ['community','Epilogue: The Town Square','You built your own toolbox. Now see what others have made.']];
  const NEED={quick:3,games:3,creative:3,tools:1,bigger:2,wild:2};
  let visited=[];try{visited=JSON.parse(localStorage.getItem('menu_visited')||'[]')}catch{}
  const used=c=>CATEGORIES.find(x=>x.id===c).apps.filter(([id])=>visited.includes(id)||(c==='tools'&&visited.includes('tools'))).length;
  let open=1;for(let i=0;i<CH.length-1;i++){if(used(CH[i][0])>=(NEED[CH[i][0]]||1))open=i+2;else break}
  const cur=CH[Math.min(open,CH.length)-1],need=NEED[cur[0]]||0,done=Math.min(need,used(cur[0]));
  const box=document.createElement('div');box.className='box';box.style.marginBottom='16px';
  box.innerHTML=open>=CH.length?`<b>📖 The end… or the beginning?</b><p style="margin:4px 0 0">Every room is open. The ToolBox is yours.</p>`+
   // each update adds a chapter: the toolbox grows new gadgets overnight
   `<p style="margin:8px 0 0"><b>📜 Chapter ${esc(TB_NEWS[0][0])}: Overnight</b><br>You wake to a soft clicking from the toolbox. New gadgets have appeared: ${esc(TB_NEWS[0][1].split(/,\s+|\.\s+/).slice(0,3).join(', ').toLowerCase())}… <a href="apps/changelog.html">read the whole chapter</a>.</p>`:`<b>📖 ${esc(cur[1])}</b><p style="margin:4px 0">${esc(cur[2])}</p>${need?`<div class="muted" style="font-size:13px">${done} of ${need} done</div>`:''}`;
  $('home').prepend(box);
  const lock=()=>document.querySelectorAll('.cat[data-cat]').forEach(el=>{const i=CH.findIndex(c=>c[0]===el.dataset.cat);if(i>=open&&!el.dataset.locked){el.dataset.locked=1;el.disabled=true;el.style.opacity=.45;el.style.cursor='not-allowed';el.querySelector('h2').textContent='🔒 '+el.querySelector('h2').textContent;el.title='Finish the chapter before to unlock this'}});
  lock();new MutationObserver(lock).observe($('cats'),{childList:true})})();

// ↑↑↓↓←→←→BA opens the secret app
{const K=['arrowup','arrowup','arrowdown','arrowdown','arrowleft','arrowright','arrowleft','arrowright','b','a'];let at=0;
  addEventListener('keydown',e=>{const k=e.key.toLowerCase();at=k===K[at]?at+1:k===K[0]?1:0;if(at===K.length){at=0;location.href='apps/secret.html'}})}
// 🪟 mini window: a timer and today's habits that float above other windows (Document Picture-in-Picture), or a small pop-up
{const b=document.createElement('button');b.className='g';b.textContent='🪟';b.title='Mini window: timer and habits, always on top';b.setAttribute('aria-label','Mini window');
  b.onclick=async()=>{if(window.documentPictureInPicture){try{const w=await documentPictureInPicture.requestWindow({width:300,height:420});
      w.document.body.style.margin='0';const f=w.document.createElement('iframe');f.src='apps/mini.html';f.title='Mini ToolBox';f.style.cssText='border:0;width:100vw;height:100vh';w.document.body.append(f);return}catch{}}
    if(!window.open('apps/mini.html','tbmini','popup,width=300,height=440'))location.href='apps/mini.html'};$('menuBar').append(b)}
// ? on the menu: keyboard shortcuts, the version, and a bug report to copy
function menuSheet(){if($('kbSheet'))return $('kbSheet').remove();const d=document.createElement('div');d.id='kbSheet';d.setAttribute('role','dialog');
  d.innerHTML=`<b>Menu shortcuts</b><p>/ search · Enter open the first result · Esc clear the search · ? this sheet</p><p class="muted">In every app: ? its own shortcuts · 🔗 share · 🛠️ remix. Version ${VERSION}.</p>${TB_PREFS.html()}<div class="row"><button class="g" id="bugCopy">🐞 Copy a bug report</button><button class="g" id="kbClose">Close</button></div>`;
  d.querySelector('#kbClose').onclick=()=>d.remove();d.querySelector('#bugCopy').onclick=()=>copyBugReport(VERSION);TB_PREFS.wire(d);document.body.append(d)}
addEventListener('keydown',e=>{if(e.key==='?'&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){e.preventDefault();menuSheet()}if(e.key==='Escape'&&$('kbSheet'))$('kbSheet').remove()});
{const b=document.createElement('button');b.className='g';b.textContent='?';b.title='Shortcuts, version and bug reports (?)';b.setAttribute('aria-label','Help');b.onclick=menuSheet;$('menuBar').append(b)}

// after an update: a codename toast, a short chime, confetti once, the pet announces it, an update streak,
// and "updated" tags on the apps that changed in this version (TB_CHANGED, written by the release script)
const codename=TB_CODENAME;
(()=>{const prev=menuLS.get('menu_lastVer','');menuLS.set('menu_lastVer',VERSION);
  if(window.TB_CHANGED&&TB_CHANGED.length){const s=document.createElement('style');s.textContent=TB_CHANGED.map(id=>`.app[data-id="${CSS.escape(id)}"]`).join(',')+`{position:relative}`+TB_CHANGED.map(id=>`.app[data-id="${CSS.escape(id)}"]::after`).join(',')+`{content:'updated';position:absolute;top:4px;right:6px;font-size:10px;background:var(--accent);color:var(--accent-ink,#fff);border-radius:6px;padding:0 5px}`;document.head.append(s)}
  if(!prev||prev===VERSION)return;
  const seen=menuLS.get('menu_versSeen',[]);if(!seen.includes(VERSION))seen.push(VERSION);menuLS.set('menu_versSeen',seen);
  let streak=0;for(const [v] of TB_NEWS){if(seen.includes(v))streak++;else break}
  const tb=document.createElement('div');tb.setAttribute('role','status');tb.style.cssText='position:fixed;left:50%;bottom:20px;transform:translateX(-50%);background:var(--ink);color:var(--bg);padding:10px 16px;border-radius:12px;z-index:9999;max-width:90vw';setTimeout(()=>tb.remove(),5000);document.body.append(tb);
  tb.textContent=(`🎉 Updated to v${VERSION} “${codename(VERSION)}”${streak>1?` · 🔥 ${streak} updates in a row`:''}`);
  try{const a=new AudioContext();[523,784].forEach((f,i)=>{const o=a.createOscillator(),g=a.createGain();o.frequency.value=f;g.gain.setValueAtTime(.06,a.currentTime+i*.12);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+i*.12+.25);o.connect(g).connect(a.destination);o.start(a.currentTime+i*.12);o.stop(a.currentTime+i*.12+.3)})}catch{}
  setTimeout(()=>window.petSay&&petSay(`📦 New version! ${TB_NEWS[0][1].split(/[.,]/)[0]}`),4000);
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const c=document.createElement('canvas');c.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:9999';c.width=innerWidth;c.height=innerHeight;document.body.append(c);const x=c.getContext('2d');
  const bits=Array.from({length:120},()=>({x:Math.random()*c.width,y:-20-Math.random()*c.height/2,v:2+Math.random()*3,s:Math.random()*6,h:Math.random()*360}));let t=0;
  (function f(){x.clearRect(0,0,c.width,c.height);bits.forEach(b=>{b.y+=b.v;b.x+=Math.sin((t+b.s)/10);x.fillStyle=`hsl(${b.h},90%,60%)`;x.fillRect(b.x,b.y,6,9)});if(++t<220)requestAnimationFrame(f);else c.remove()})()})();
// build date next to the version
if(window.TB_DATE)setTimeout(()=>{const o=$('offline');if(o)o.title+=` · released ${TB_DATE}`},1500);
