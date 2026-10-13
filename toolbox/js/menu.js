// Main-menu extras: favorites, surprise me, theme switch, install, offline badge, update toast,
// QR code, what's new, daily mix, the focus pet walking around, seasonal effects.
const VERSION='2026.10.3';
const NEWS=[
 ['2026.10.3','Online multiplayer with room codes (no PC needed), world high scores, Parkour level editor, family settings (profiles, screen time, school and kiosk mode), quests, ToolBox OS, AI app maker, voice commands, party quiz, ToolBox radio, Remix any app, Wrapped, community apps, Spanish/French/Hebrew, reminders, open-with and share-to.'],
 ['2026.10.2','Favorites, Surprise me, daily mix, QR code to the site, installable on Chromebooks, works fully offline, gamepad support, shortcut sheet (press ?), seasonal effects.'],
 ['2026.10.1','A main menu with 6 categories and 43 new apps and games.']];
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
const THEMES={auto:'🌗 Auto',light:'☀️ Light',dark:'🌙 Dark'};
function drawTheme(){const t=menuLS.get('tb_theme','auto');$('themeBtn').textContent=THEMES[t]||THEMES.auto;if(t==='auto')delete document.documentElement.dataset.theme;else document.documentElement.dataset.theme=t}
$('themeBtn').onclick=()=>{const order=['auto','light','dark'],t=menuLS.get('tb_theme','auto');menuLS.set('tb_theme',order[(order.indexOf(t)+1)%3]);drawTheme()};drawTheme();

// install (Chrome / ChromeOS / Edge / Android)
let installEvt=null;addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvt=e;$('installBtn').hidden=false});
$('installBtn').onclick=async()=>{if(!installEvt)return;installEvt.prompt();await installEvt.userChoice;installEvt=null;$('installBtn').hidden=true};
addEventListener('appinstalled',()=>{$('installBtn').hidden=true});

// offline badge + "new version" banner
function banner(html){let b=$('banner');if(!b){b=document.createElement('div');b.id='banner';document.body.append(b)}b.innerHTML=html;return b}
async function offlineState(){const o=$('offline');if(window.toolboxDesktop){o.textContent='🟢 Works offline';o.title='The desktop app keeps everything on this computer';return}if(!('serviceWorker' in navigator)||!location.protocol.startsWith('http')){o.textContent='⚪ Offline needs the installed or online version';return}
  try{const names=await caches.keys(),c=names.find(n=>n.startsWith('toolbox-'));const n=c?(await (await caches.open(c)).keys()).length:0;
    o.textContent=navigator.serviceWorker.controller&&n>50?'🟢 Works offline':'🟡 Saving for offline…';o.title=n+' files saved on this device'}catch{o.textContent='⚪ Offline unavailable'}}
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
  let x=40,dir=1,said=0;const say=t=>{el.querySelector('.say').textContent=t;said=Date.now()};
  const LINES={games:'Ooh, games!',tools:'Good idea, let’s get things done.',creative:'Make something pretty!',quick:'Quick one?',bigger:'Big project time!',wild:'Weird… I like it.'};
  document.addEventListener('pointerover',e=>{const a=e.target.closest('.app,.cat');if(!a||Date.now()-said<2500)return;const c=a.dataset.cat||ALL_APPS.find(x=>x.id===a.dataset.id)?.cat;if(LINES[c])say(LINES[c])});
  setInterval(()=>{x+=dir*1.2;if(x>innerWidth-60||x<10)dir*=-1;if(Math.random()<.004)dir*=-1;el.style.transform=`translateX(${x}px)`;el.querySelector('.body').style.transform=`scaleX(${-dir})`;if(Date.now()-said>3000)el.querySelector('.say').textContent=''},30)})();

// seasonal effects: snow in December–January, leaves in autumn, bats around Halloween, hearts in mid-February
(()=>{if(matchMedia('(prefers-reduced-motion: reduce)').matches||menuLS.get('menu_season',true)===false)return;const d=new Date(),m=d.getMonth(),day=d.getDate();
  const kind=m===11||m===0?'❄️':m===9&&day>=20?'🦇':m===8||m===9||m===10?'🍂':m===1&&day<=15?'💗':m===2&&day>=15||m===3?'🌸':null;if(!kind)return;
  const c=document.createElement('div');c.id='season';c.setAttribute('aria-hidden','true');document.body.append(c);
  for(let i=0;i<14;i++){const s=document.createElement('span');s.textContent=kind;s.style.left=Math.random()*100+'vw';s.style.animationDuration=8+Math.random()*10+'s';s.style.animationDelay=-Math.random()*18+'s';s.style.fontSize=12+Math.random()*14+'px';c.append(s)}
  const off=document.createElement('button');off.className='g';off.textContent=kind+' Off';off.title='Turn off seasonal effects';off.onclick=()=>{menuLS.set('menu_season',false);c.remove();off.remove()};$('menuBar').append(off)})();

addEventListener('hashchange',drawFavs);drawFavs();

// family rules on the menu: hide what kiosk / school mode blocks, show the current profile
(()=>{const r=FAM.rules(),list=FAM.list();
  const prof=document.createElement('a');prof.className='chip';prof.href='apps/family.html';prof.title='Profiles and family settings';prof.textContent='👤 '+FAM.current();$('menuBar').append(prof);
  const blocked=a=>!!FAM.why(a.id,a.cat)&&FAM.why(a.id,a.cat)!=='limit';
  function apply(){if(FAM.unlocked())return;document.querySelectorAll('.app[data-id],.chip[data-id]').forEach(el=>{const a=ALL_APPS.find(x=>x.id===el.dataset.id);if(a&&a.id!=='family'&&blocked(a))el.style.display='none'});
    document.querySelectorAll('.cat[data-cat]').forEach(el=>{const c=CATEGORIES.find(c=>c.id===el.dataset.cat);if(c&&c.apps.every(([id])=>id!=='family'&&blocked({id,cat:c.id})))el.style.display='none'});
    if(r.limit>0&&FAM.usedToday()>=r.limit*60&&!$('famNote')){const n=document.createElement('div');n.id='famNote';n.className='box';n.innerHTML='⏰ <b>That’s all the ToolBox time for today.</b> See you tomorrow!';$('home').prepend(n)}
    if(FAM.schoolNow(r)&&!$('famSchool')){const n=document.createElement('p');n.id='famSchool';n.className='muted';n.textContent='🏫 School mode is on until '+r.school.to+'.';$('home').prepend(n)}}
  new MutationObserver(apply).observe(document.querySelector('main'),{childList:true,subtree:true});apply()})();

// active quest: a chip on the menu that leads back to it
(()=>{let st;try{st=JSON.parse(localStorage.getItem('app_quests_state'))}catch{}const n=st&&st.active?Object.keys(st.active).length:0;if(!n)return;
  const a=document.createElement('a');a.className='chip';a.href='apps/quests.html';a.textContent='🗺️ '+n+' quest'+(n>1?'s':'')+' in progress';$('menuBar').append(a)})();
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
  box.innerHTML=open>=CH.length?`<b>📖 The end… or the beginning?</b><p style="margin:4px 0 0">Every room is open. The ToolBox is yours.</p>`:`<b>📖 ${esc(cur[1])}</b><p style="margin:4px 0">${esc(cur[2])}</p>${need?`<div class="muted" style="font-size:13px">${done} of ${need} done</div>`:''}`;
  $('home').prepend(box);
  const lock=()=>document.querySelectorAll('.cat[data-cat]').forEach(el=>{const i=CH.findIndex(c=>c[0]===el.dataset.cat);if(i>=open&&!el.dataset.locked){el.dataset.locked=1;el.disabled=true;el.style.opacity=.45;el.style.cursor='not-allowed';el.querySelector('h2').textContent='🔒 '+el.querySelector('h2').textContent;el.title='Finish the chapter before to unlock this'}});
  lock();new MutationObserver(lock).observe($('cats'),{childList:true})})();
