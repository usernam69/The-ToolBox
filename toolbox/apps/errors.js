// The version number (the release script updates it) and the error catcher.
var TB_VERSION='1.4.0';
// release date and the apps changed in this release (both written by the release script)
var TB_DATE='2026-10-16';var TB_CHANGED=['battleship','bisect','blocks','breakout','bugdefense','cardbattle','checkers','chess','codegarden','connect4','dicepoker','emojiguess','escapeci','farm','fifteen','flappy','ghostkart','hangman','higherlower','leveljam','lightsout','memory','mergeconflict','minesweeper','minigolf','pinball','pong','reaction','releaserush','rhythmtype','simon','snakeroyale','spaceshooter','sudoku','taptempo','tictactoe','typeracer','v2048','wallwars','whackbug'];
// every version gets a fun codename, worked out from its number
function TB_CODENAME(v){let h=0;for(const c of v)h=h*31+c.charCodeAt(0)>>>0;const A=['Sneaky','Bouncy','Cosmic','Fuzzy','Turbo','Sleepy','Shiny','Brave','Wobbly','Zippy','Quiet','Mighty'],B=['Sam','Otter','Comet','Pickle','Badger','Noodle','Falcon','Muffin','Gecko','Pixel','Walrus','Taco'];return A[h%A.length]+' '+B[(h>>4)%B.length]};

// What changed in each version: the menu shows the newest once, the Changelog app shows them all.
var TB_NEWS=[
 ['1.4.0','A new Arcade with 40 games: Bug defense, Release rush, Merge conflict, Code golf garden, Commit detective, Escape the CI, chess, checkers, battleship, Connect Four and tic-tac-toe (online too), Snake battle royale, Pixel wall wars, Level jam, Ghost kart, falling blocks, pinball, mini golf with a hole maker, space shooter, Pocket farm, App card battle, rhythm typing, daily sudoku, Bug sweeper, 2048, Whack-a-bug, reaction duel, memory, Simon, hangman, typing racer, Flappy pixel, breakout, Pong, tap tempo, higher or lower, emoji guess, lights out, the 15 puzzle and dice poker.'],
 ['1.3.0','Two new apps: Bug hunt and the Bug graveyard, a Bug hunter quest, update confetti with a codename and an update streak, “updated” tags on changed apps, changelog search with comic and haiku views, an RSS feed and a vote on what comes next, a live tournament bracket with undo, a second-chance bracket, tap races and app or bug showdowns, pixel wall replay, guide pictures and a snapshot per version, a commit melody and an hourly radio host in Lo-fi, bug reports that include your last steps, a web zip for USB sticks and checksums with every download. Fixes: pixel wall taps near the edge could land on the next pixel.'],
 ['1.2.1','Tournament bracket: players with the same name are now numbered so the right one moves up.'],
 ['1.2.0','Snooze and mark-paid buttons on reminders, quiet hours, smart habit reminders, flashcard, water and budget reminders, games pause when you switch windows, a ? sheet on the menu, theme previews, bug reports from Help.'],
 ['1.1.2','Fixes: paid bills no longer remind you, and games stop moving when you switch windows.'],
 ['1.1.1','Fixes: Share to The ToolBox opens the right page, and the Arcade tour quest says what counts.'],
 ['1.1.0','Online multiplayer with room codes (no PC needed), world high scores, Parkour level editor, family settings (profiles, screen time, school and kiosk mode), quests, ToolBox OS, AI app maker, voice commands, party quiz, ToolBox radio, Remix any app, Wrapped, community apps, Spanish/French/Hebrew, reminders, open-with and share-to.'],
 ['1.0.1','Favorites, Surprise me, daily mix, QR code to the site, installable on Chromebooks, works fully offline, gamepad support, shortcut sheet (press ?), seasonal effects.'],
 ['1.0.0','A main menu with 6 categories and 43 new apps and games.']];
// Your own colours (made with 🎨 in the menu's theme picker), applied on every page when that theme is picked.
var TB_THEME={KEYS:['bg','card','ink','accent'],
  get(){try{return JSON.parse(localStorage.getItem('tb_customTheme')||'null')}catch{return null}},
  apply(t){const r=document.documentElement.style;if(!t){['bg','card','ink','muted','line','accent','accent-ink'].forEach(k=>r.removeProperty('--'+k));return}
    const hex=v=>/^#[0-9a-f]{6}$/i.test(v)?v:null,lum=h=>{const n=parseInt(h.slice(1),16);return(.299*(n>>16)+.587*(n>>8&255)+.114*(n&255))/255},mix=(a,b,p)=>'#'+[0,2,4].map(i=>Math.round(parseInt(a.slice(1+i,3+i),16)*(1-p)+parseInt(b.slice(1+i,3+i),16)*p).toString(16).padStart(2,'0')).join('');
    if(!TB_THEME.KEYS.every(k=>hex(t[k])))return;TB_THEME.KEYS.forEach(k=>r.setProperty('--'+k,t[k]));
    r.setProperty('--muted',mix(t.ink,t.bg,.4));r.setProperty('--line',mix(t.ink,t.bg,.82));r.setProperty('--accent-ink',lum(t.accent)>.6?'#111111':'#ffffff')}};
try{if(JSON.parse(localStorage.getItem('tb_theme')||'"auto"')==='custom')TB_THEME.apply(TB_THEME.get())}catch{}
// Big text and left-handed game buttons (switched in any app's ? sheet or the menu's ? sheet)
var TB_PREFS={get:k=>{try{return JSON.parse(localStorage.getItem('tb_'+k)||'false')}catch{return false}},
  apply(){const c=document.documentElement.classList;c.toggle('tb-big',!!TB_PREFS.get('bigText'));c.toggle('tb-lefty',!!TB_PREFS.get('lefty'))},
  set(k,v){try{localStorage.setItem('tb_'+k,JSON.stringify(v))}catch{}TB_PREFS.apply()},
  // the checkboxes, shared by both sheets
  html(){return`<p style="margin:6px 0"><label><input type="checkbox" data-pref="bigText" ${TB_PREFS.get('bigText')?'checked':''}> Big text</label> · <label><input type="checkbox" data-pref="lefty" ${TB_PREFS.get('lefty')?'checked':''}> Left-handed game buttons</label></p>`},
  wire(el){el.querySelectorAll('[data-pref]').forEach(i=>i.onchange=()=>TB_PREFS.set(i.dataset.pref,i.checked))}};
TB_PREFS.apply();
// Self-healing storage: about once a day a copy of everything saved goes into IndexedDB. If a saved value is ever
// unreadable (a crash in the middle of saving, a bad manual edit), the last good copy of just that value is put back.
(()=>{if(!window.indexedDB)return;const P=/^(tb_|app_|menu_|prof_)/,good=v=>{try{JSON.parse(v);return true}catch{return false}};
  const open=()=>new Promise((ok,no)=>{const r=indexedDB.open('toolbox-heal',1);r.onupgradeneeded=()=>r.result.createObjectStore('s');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
  setTimeout(async()=>{try{const db=await open(),snap=await new Promise(r=>{const q=db.transaction('s').objectStore('s').get('snap');q.onsuccess=()=>r(q.result);q.onerror=()=>r(null)});
    const keys=[];for(let i=0;i<localStorage.length;i++)if(P.test(localStorage.key(i)))keys.push(localStorage.key(i));
    const bad=keys.filter(k=>!good(localStorage.getItem(k)));let fixed=0;
    bad.forEach(k=>{const v=snap&&snap.data[k];if(v&&good(v))try{localStorage.setItem(k,v);fixed++}catch{}});
    if(fixed){const n=document.createElement('div');n.style.cssText='position:fixed;left:50%;bottom:16px;transform:translateX(-50%);background:#1f8a4c;color:#fff;padding:8px 14px;border-radius:10px;z-index:9999;font:14px system-ui';
      n.textContent=`🩹 Repaired ${fixed} damaged saved item${fixed>1?'s':''} from yesterday’s copy.`;document.body.append(n);setTimeout(()=>n.remove(),6000)}
    if(!bad.length&&(!snap||Date.now()-snap.t>20*36e5)){const data={};keys.forEach(k=>data[k]=localStorage.getItem(k));db.transaction('s','readwrite').objectStore('s').put({t:Date.now(),data},'snap')}}catch{}},3000)})();
// Keeps the last 20 JavaScript errors on this device (never sent anywhere) so a bug report can include them.
(()=>{const add=(msg,where)=>{try{const l=JSON.parse(localStorage.getItem('tb_errors')||'[]');l.unshift({t:Date.now(),page:location.pathname.split('/').pop()||'index.html',msg:String(msg).slice(0,300)+(where?' @'+where:'')});localStorage.setItem('tb_errors',JSON.stringify(l.slice(0,20)))}catch{}};
  addEventListener('error',e=>add(e.message||'error',e.filename?e.filename.split('/').pop()+':'+e.lineno:''));addEventListener('unhandledrejection',e=>add('Promise: '+(e.reason&&e.reason.message||e.reason)))})();
// The last 20 things you tapped or pressed (in this tab only, never sent anywhere) so a bug report shows how you got there.
// Typed text is never kept: only button names and special keys like Enter or Escape.
(()=>{const add=a=>{try{const l=JSON.parse(sessionStorage.getItem('tb_actions')||'[]');l.push((location.pathname.split('/').pop()||'index.html')+': '+a);sessionStorage.setItem('tb_actions',JSON.stringify(l.slice(-20)))}catch{}};
  addEventListener('click',e=>{const el=e.target.closest&&e.target.closest('button,a,[role=button],summary,label,select,canvas');if(!el)return;if(el.closest('input[type=password]'))return;
    const name=(el.getAttribute('aria-label')||el.title||el.textContent||el.tagName).trim().replace(/\s+/g,' ').slice(0,40);add('tap '+el.tagName.toLowerCase()+' “'+name+'”')},true);
  addEventListener('keydown',e=>{if(e.key.length>1&&!/^(Shift|Control|Alt|Meta|CapsLock|Tab)$/.test(e.key))add('key '+e.key)},true);
  addEventListener('pageshow',()=>add('opened'))})();
async function copyBugReport(version){try{const s=JSON.parse(localStorage.getItem('tb_stats')||'{}');s.bugReports=(s.bugReports||0)+1;localStorage.setItem('tb_stats',JSON.stringify(s))}catch{}let errs=[];try{errs=JSON.parse(localStorage.getItem('tb_errors')||'[]')}catch{}
  const cache='caches' in window?(await caches.keys().catch(()=>[])).filter(k=>k.startsWith('toolbox-')).join(','):'';
  const txt=['The ToolBox bug report','Version: '+(version||'?')+(cache?' ('+cache+')':''),'Where: '+(window.toolboxDesktop?'desktop app':location.origin+location.pathname),'Browser: '+navigator.userAgent,'Screen: '+innerWidth+'x'+innerHeight,'','What happened:','','Recent errors:',...(errs.length?errs.slice(0,10).map(e=>new Date(e.t).toISOString()+' '+e.page+': '+e.msg):['none']),'','Last steps (oldest first):',...(()=>{try{const a=JSON.parse(sessionStorage.getItem('tb_actions')||'[]');return a.length?a:['none']}catch{return['none']}})()].join('\n');
  try{await navigator.clipboard.writeText(txt);alert('Bug report copied. Paste it into a new issue at github.com/usernam69/The-ToolBox/issues')}catch{prompt('Copy this bug report:',txt)}}
