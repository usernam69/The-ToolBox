// Settings (accent, compact, theme from photo, screensaver, PIN lock), kid mode, screensaver, voice, favorites & friends.

// ---------- appearance ----------
function applyLook(){const a=load('accent',''),root=document.documentElement.style;
  if(a){const c=parseColor(a);root.setProperty('--accent',a);root.setProperty('--accent-ink',c&&lum(c)>.45?'#0b1020':'#ffffff')}else{root.removeProperty('--accent');root.removeProperty('--accent-ink')}
  document.body.classList.toggle('compact',!!load('compact',false))}

// ---------- PIN lock (keeps people glancing at your screen out; the data itself is not encrypted) ----------
let unlocked=false;
async function hashPin(pin){const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('toolbox:'+pin));return[...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,'0')).join('')}
const lockOn=()=>!!load('pinHash','');
const lockedTool=t=>lockOn()&&!unlocked&&(load('lockGroups',['Money']).includes(t.group)||load('lockTools',['notes']).includes(t.id));
function showLock(t,then){const s=$('lockScreen');s.classList.add('on');
  s.innerHTML=`<div class="panel" style="text-align:center;max-width:320px"><div style="font-size:40px">🔒</div><b>${esc(t.name)} is locked</b><div class="row" style="justify-content:center"><input id="lkPin" type="password" inputmode="numeric" placeholder="PIN" style="width:140px;text-align:center;font-size:20px" autocomplete="off"></div><div id="lkErr" style="color:var(--bad);min-height:1.5em"></div><button class="b" id="lkGo">Unlock</button> <button class="g" id="lkCancel">Cancel</button></div>`;
  const go=async()=>{if(await hashPin($('lkPin').value)===load('pinHash','')){unlocked=true;s.classList.remove('on');then()}else{$('lkErr').textContent='Wrong PIN';$('lkPin').value=''}};
  $('lkGo').onclick=go;$('lkPin').onkeydown=e=>e.key==='Enter'&&go();$('lkCancel').onclick=()=>s.classList.remove('on');$('lkPin').focus()}
function lockNow(){unlocked=false;const t=TOOLS.find(t=>t.sec.classList.contains('on'));if(t&&lockedTool(t))showTool('dash');toast('🔒 Locked')}

// ---------- screensaver ----------
let idleTimer=null;
function resetIdle(){clearTimeout(idleTimer);const m=+load('saverMin',0);if(m>0)idleTimer=setTimeout(startSaver,m*60e3)}
function startSaver(){if($('kid').classList.contains('on'))return;const s=$('saver');s.classList.add('on');
  const q=QUOTES[Math.floor(Math.random()*QUOTES.length)],next=todos.filter(t=>!t.d).sort((a,b)=>a.p-b.p||((a.due||'9')>(b.due||'9')?1:-1))[0];
  const draw=()=>{const n=new Date();s.innerHTML=`<div style="text-align:center;transform:translate(${Math.sin(n/9e4)*40}px,${Math.cos(n/7e4)*30}px)"><div style="font-size:min(22vw,140px);font-weight:200;font-variant-numeric:tabular-nums">${n.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'})}</div>
    <div style="font-size:20px;opacity:.7">${n.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'})}${lastWeather?` · ${temp(lastWeather.t)}`:''}</div>
    <p style="max-width:560px;margin:28px auto;font-style:italic;opacity:.8">${esc(q)}</p>${next?`<div style="opacity:.8">Next up: <b>${esc(next.t)}</b></div>`:''}</div>`};
  draw();const iv=setInterval(draw,1000);
  const stop=()=>{clearInterval(iv);s.classList.remove('on');['mousemove','keydown','touchstart','mousedown'].forEach(e=>removeEventListener(e,stop,true));if(load('pinLockOnSaver',false))unlocked=false;resetIdle()};
  setTimeout(()=>['mousemove','keydown','touchstart','mousedown'].forEach(e=>addEventListener(e,stop,true)),400)}
['mousemove','keydown','touchstart','scroll'].forEach(e=>addEventListener(e,()=>{if(!$('saver').classList.contains('on'))resetIdle()},{passive:true}));

// ---------- settings ----------
tool({id:'settings',name:'Settings',group:'System',html:`
<h2>Settings</h2>
<div class="grid2"><div class="box"><b>Look</b>
 <div class="row">Accent color <input type="color" id="stAccent"><button class="g" id="stAccentReset">Default</button></div>
 <div class="row"><label><input type="checkbox" id="stCompact"> Compact mode (tighter spacing)</label></div>
 <div class="row">Theme from a photo <input type="file" id="stPhoto" accept="image/*"></div><div id="stPhotoPal" style="display:flex;gap:6px;flex-wrap:wrap"></div></div>
<div class="box"><b>Screensaver</b><div class="row">Show a clock after <input id="stSaver" type="number" min="0" style="width:70px"> minutes idle (0 = off)</div><button class="g" id="stSaverTry">Try it now</button></div>
<div class="box"><b>PIN lock</b><p class="muted" style="font-size:13px">Hides chosen tabs behind a PIN, so someone looking at your screen can't open them. Your data isn't encrypted on disk. For that, use an encrypted backup.</p>
 <div class="row"><input id="stPin" type="password" inputmode="numeric" placeholder="New PIN (4+ digits)" style="width:170px" autocomplete="new-password"><button class="b" id="stPinSet">Set PIN</button><button class="g" id="stPinOff">Turn off</button><button class="g" id="stLockNow">Lock now</button></div>
 <div id="stPinState" class="muted" style="font-size:13px"></div><div style="font-size:13px">Lock these groups:</div><div id="stLockGroups"></div><div style="font-size:13px;margin-top:6px">…and these tools:</div><div id="stLockTools" style="max-height:120px;overflow:auto"></div>
 <label style="font-size:13px"><input type="checkbox" id="stLockSaver"> Lock again when the screensaver starts</label></div></div>`,
init(){$('stAccent').value=load('accent','')||'#2f6fde';$('stAccent').oninput=()=>{save('accent',$('stAccent').value);applyLook()};
  $('stAccentReset').onclick=()=>{save('accent','');applyLook();$('stAccent').value='#2f6fde'};
  $('stCompact').checked=load('compact',false);$('stCompact').onchange=()=>{save('compact',$('stCompact').checked);applyLook()};
  $('stPhoto').onchange=async()=>{const f=$('stPhoto').files[0];if(!f)return;const{ctx,c}=await imageToCanvas(f),pal=paletteFromCanvas(ctx,c.width,c.height,6);
    $('stPhotoPal').innerHTML='<div class="muted" style="width:100%;font-size:13px">Pick a color for the accent:</div>'+pal.map(h=>`<button data-c="${h}" title="${h}" style="width:44px;height:44px;border-radius:10px;border:2px solid var(--line);background:${h};cursor:pointer"></button>`).join('');
    $('stPhotoPal').querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{save('accent',b.dataset.c);$('stAccent').value=b.dataset.c;applyLook();toast('Accent color set from your photo')});
    const best=pal.find(h=>{const[,s,l]=toHsl(parseColor(h));return s>35&&l>25&&l<70})||pal[0];if(best){save('accent',best);$('stAccent').value=best;applyLook()}};
  $('stSaver').value=load('saverMin',0);$('stSaver').onchange=()=>{save('saverMin',Math.max(0,+$('stSaver').value||0));resetIdle()};$('stSaverTry').onclick=startSaver;
  $('stPinSet').onclick=async()=>{const p=$('stPin').value;if(!/^\d{4,}$/.test(p))return toast('Use at least 4 digits.');save('pinHash',await hashPin(p));$('stPin').value='';unlocked=true;this.show();toast('PIN set')};
  $('stPinOff').onclick=async()=>{if(!lockOn())return;const p=prompt('Current PIN:');if(p===null)return;if(await hashPin(p)!==load('pinHash',''))return toast('Wrong PIN');save('pinHash','');this.show();toast('PIN lock is off')};
  $('stLockNow').onclick=()=>lockOn()?lockNow():toast('Set a PIN first.');
  $('stLockSaver').checked=load('pinLockOnSaver',false);$('stLockSaver').onchange=()=>save('pinLockOnSaver',$('stLockSaver').checked)},
show(){$('stPinState').textContent=lockOn()?(unlocked?'🔓 PIN is on (unlocked right now).':'🔒 PIN is on.'):'No PIN set.';
  const lg=load('lockGroups',['Money']),lt=load('lockTools',['notes']);
  $('stLockGroups').innerHTML=GROUPS.filter(g=>g!=='System'&&g!=='★').map(g=>`<label class="tag"><input type="checkbox" value="${esc(g)}" ${lg.includes(g)?'checked':''}> ${esc(g)}</label>`).join('');
  $('stLockTools').innerHTML=TOOLS.filter(t=>t.group!=='System'&&!lg.includes(t.group)).map(t=>`<label class="tag"><input type="checkbox" value="${t.id}" ${lt.includes(t.id)?'checked':''}> ${esc(t.name)}</label>`).join('');
  $('stLockGroups').querySelectorAll('input').forEach(c=>c.onchange=()=>{save('lockGroups',[...$('stLockGroups').querySelectorAll('input:checked')].map(x=>x.value));this.show()});
  $('stLockTools').querySelectorAll('input').forEach(c=>c.onchange=()=>save('lockTools',[...$('stLockTools').querySelectorAll('input:checked')].map(x=>x.value)))}});

// ---------- kid mode ----------
const kidData=()=>load('kid',{name:'',stars:0,chores:[{id:'c1',name:'Make my bed',emoji:'🛏️',stars:1},{id:'c2',name:'Brush teeth',emoji:'🪥',stars:1},{id:'c3',name:'Tidy toys',emoji:'🧸',stars:2},{id:'c4',name:'Read a book',emoji:'📖',stars:2}],rewards:[{id:'r1',name:'Extra story',emoji:'📚',cost:5},{id:'r2',name:'Ice cream',emoji:'🍦',cost:10},{id:'r3',name:'Movie night',emoji:'🎬',cost:20}],done:{},log:[]});
const saveKid=k=>save('kid',k);
function enterKid(){const k=$('kid');k.classList.add('on');drawKid();if(document.documentElement.requestFullscreen)document.documentElement.requestFullscreen().catch(()=>{})}
function drawKid(){const d=kidData(),today=isoDay(),doneToday=d.done[today]||[];
  $('kid').innerHTML=`<div style="max-width:760px;width:100%;margin:auto">
   <div class="row"><h1 style="font-size:28px;margin:0;flex:1">${d.name?esc(d.name)+"'s":'My'} chores</h1><div style="font-size:30px;font-weight:700">⭐ ${d.stars}</div></div>
   <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:14px 0">${d.chores.map(c=>{const ok=doneToday.includes(c.id);
     return`<button data-c="${c.id}" ${ok?'disabled':''} style="font:inherit;border:3px solid ${ok?'var(--good)':'var(--line)'};background:var(--card);color:var(--ink);border-radius:18px;padding:18px 8px;cursor:pointer;font-size:18px;opacity:${ok?.6:1}"><div style="font-size:48px">${ok?'✅':esc(c.emoji||'⭐')}</div>${esc(c.name)}<div style="font-size:15px">+${c.stars} ⭐</div></button>`}).join('')}</div>
   <h2>Rewards</h2><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px">${d.rewards.map(r=>`<button data-r="${r.id}" style="font:inherit;border:3px solid var(--line);background:var(--card);color:var(--ink);border-radius:18px;padding:14px 8px;cursor:pointer;font-size:17px;opacity:${d.stars>=r.cost?1:.45}"><div style="font-size:40px">${esc(r.emoji||'🎁')}</div>${esc(r.name)}<div>${r.cost} ⭐</div></button>`).join('')}</div>
   <div style="text-align:center;margin-top:28px"><button id="kidExit" class="g" style="user-select:none">Hold to exit (parents)</button><div id="kidMsg" class="muted"></div></div></div>`;
  $('kid').querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{const d=kidData(),c=d.chores.find(x=>x.id===b.dataset.c);d.done[today]=[...(d.done[today]||[]),c.id];d.stars+=c.stars;d.log.push({t:Date.now(),what:'✅ '+c.name,stars:c.stars});saveKid(d);beep(1);drawKid();celebrate()});
  $('kid').querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>{const d=kidData(),r=d.rewards.find(x=>x.id===b.dataset.r);
    if(d.stars<r.cost){$('kidMsg').textContent=`You need ${r.cost-d.stars} more ⭐ for ${r.name}!`;return}
    if(!confirm(`Spend ${r.cost} stars on ${r.name}? (Ask a grown-up!)`))return;d.stars-=r.cost;d.log.push({t:Date.now(),what:'🎁 '+r.name,stars:-r.cost});saveKid(d);drawKid();celebrate()});
  // exit: hold 2 seconds, then PIN if one is set
  let hold;const ex=$('kidExit'),start=()=>{ex.textContent='Keep holding…';hold=setTimeout(async()=>{if(lockOn()){const p=prompt('Parent PIN:');if(p===null||await hashPin(p)!==load('pinHash',''))return drawKid()}
    $('kid').classList.remove('on');$('kid').innerHTML='';if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});showTool('kidmode')},2000)},stop=()=>{clearTimeout(hold);if(ex.isConnected)ex.textContent='Hold to exit (parents)'};
  ex.onmousedown=ex.ontouchstart=start;ex.onmouseup=ex.onmouseleave=ex.ontouchend=stop}
function celebrate(){const c=document.createElement('div');c.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:70;overflow:hidden';
  c.innerHTML=[...Array(40)].map(()=>`<span style="position:absolute;left:${Math.random()*100}%;top:-40px;font-size:${20+Math.random()*20}px;animation:fall ${1.2+Math.random()}s linear forwards">${['⭐','🎉','✨','🌟'][rnd(4)]}</span>`).join('');document.body.append(c);setTimeout(()=>c.remove(),2500)}
tool({id:'kidmode',name:'Kid mode',group:'Life',html:`
<h2>Kid mode</h2><p class="sub">A simple big-button screen for children: tap a chore to earn stars, then spend stars on rewards. Leaving it takes a 2-second hold, plus your PIN if one is set in Settings.</p>
<div class="row"><input id="kdName" placeholder="Child's name"><button class="b" id="kdStart" style="font-size:17px">▶ Start kid mode</button><b id="kdStars"></b></div>
<div class="grid2"><div class="box"><b>Chores</b><ul class="clean" id="kdChores"></ul><div class="row"><input id="kdCE" style="width:52px" placeholder="🧹"><input id="kdCN" class="grow" placeholder="Chore"><input id="kdCS" type="number" value="1" min="1" style="width:60px" title="Stars"><button class="g" id="kdCAdd">Add</button></div></div>
<div class="box"><b>Rewards</b><ul class="clean" id="kdRewards"></ul><div class="row"><input id="kdRE" style="width:52px" placeholder="🎁"><input id="kdRN" class="grow" placeholder="Reward"><input id="kdRC" type="number" value="5" min="1" style="width:60px" title="Cost in stars"><button class="g" id="kdRAdd">Add</button></div></div></div>
<h3>History</h3><ul class="clean" id="kdLog" style="max-height:200px;overflow:auto"></ul>`,
init(){$('kdStart').onclick=enterKid;$('kdName').oninput=()=>{const d=kidData();d.name=$('kdName').value;saveKid(d)};
  $('kdCAdd').onclick=()=>{const n=$('kdCN').value.trim();if(!n)return;const d=kidData();d.chores.push({id:uid(),name:n,emoji:$('kdCE').value.trim()||'⭐',stars:Math.max(1,+$('kdCS').value||1)});saveKid(d);$('kdCN').value=$('kdCE').value='';this.show()};
  $('kdRAdd').onclick=()=>{const n=$('kdRN').value.trim();if(!n)return;const d=kidData();d.rewards.push({id:uid(),name:n,emoji:$('kdRE').value.trim()||'🎁',cost:Math.max(1,+$('kdRC').value||1)});saveKid(d);$('kdRN').value=$('kdRE').value='';this.show()}},
show(){const d=kidData();$('kdName').value=d.name;$('kdStars').textContent=`⭐ ${d.stars} stars saved`;
  const list=(el,arr,key,fmt)=>{el.innerHTML='';arr.forEach((x,i)=>{const li=document.createElement('li');li.innerHTML=fmt(x)+'<button class="x">✕</button>';li.querySelector('.x').onclick=()=>{const k=kidData();k[key].splice(i,1);saveKid(k);this.show()};el.append(li)})};
  list($('kdChores'),d.chores,'chores',c=>`<span class="grow">${esc(c.emoji)} ${esc(c.name)}</span><span class="muted">+${c.stars}⭐</span>`);
  list($('kdRewards'),d.rewards,'rewards',r=>`<span class="grow">${esc(r.emoji)} ${esc(r.name)}</span><span class="muted">${r.cost}⭐</span>`);
  $('kdLog').innerHTML=d.log.slice(-50).reverse().map(l=>`<li><span class="grow">${esc(l.what)}</span><span class="muted">${l.stars>0?'+':''}${l.stars}⭐ · ${new Date(l.t).toLocaleDateString()}</span></li>`).join('')||'<li class="muted">Nothing yet.</li>'}});

// ---------- voice commands ----------
const NUMWORDS={zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20,thirty:30,forty:40,fifty:50,sixty:60,half:.5};
function spokenToCommand(s){s=s.toLowerCase().replace(/[.,!?]$/,'').replace(/\b(twenty|thirty|forty|fifty)[ -](one|two|three|four|five|six|seven|eight|nine)\b/g,(m,a,b)=>NUMWORDS[a]+NUMWORDS[b])
  .replace(/\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty)\b/g,m=>NUMWORDS[m])
  .replace(/^(set an? |start an? |add an? |add )/,'');
  s=s.replace(/^timer (?:for )?(\d+(?:\.\d+)?) ?(minutes?|mins?|seconds?|secs?|hours?)\b/,(m,n,u)=>`timer ${n}${u[0]==='m'?'m':u[0]==='s'?'s':'h'}`)
   .replace(/^(\d+(?:\.\d+)?) ?(minutes?|mins?|seconds?|hours?) timer(?: for)?/,(m,n,u)=>`timer ${n}${u[0]==='m'?'m':u[0]==='s'?'s':'h'}`)
   .replace(/^(?:to-?do|task|remind me to) /,'todo ').replace(/^(?:i spent|spent) \$?(\d+(?:\.\d+)?)(?: dollars?)?(?: on)? /,'spent $1 ').replace(/^(?:add )?(.+?) to (?:the )?shopping list$/,'buy $1').replace(/^(?:open|show|go to) /,'go ');
  return s}
function startVoice(){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return toast('This browser has no speech recognition. Try Chrome or Edge.');
  const r=new SR();r.lang=navigator.language||'en-US';r.interimResults=true;$('cmdMic').textContent='🔴';$('cmdOut').textContent='Listening… try "timer ten minutes tea" or "add milk to shopping list"';
  r.onresult=e=>{const t=[...e.results].map(x=>x[0].transcript).join('');$('cmdIn').value=e.results[e.results.length-1].isFinal?spokenToCommand(t):t;
    if(e.results[e.results.length-1].isFinal)$('cmdIn').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter'}))};
  r.onerror=e=>{$('cmdOut').textContent=e.error==='not-allowed'?'Microphone access was blocked.':'Did not catch that: '+e.error};r.onend=()=>$('cmdMic').textContent='🎤';r.start()}

// ---------- surprise me: a tool you haven't opened in a while ----------
function surprise(){const used=load('lastUsed',{}),cur=TOOLS.find(t=>t.sec.classList.contains('on')),pool=TOOLS.filter(t=>t!==cur&&!t.id.startsWith('plugin_')).sort((a,b)=>(used[a.id]||0)-(used[b.id]||0)).slice(0,6);
  const t=pool[rnd(pool.length)];showTool(t.id);toast(used[t.id]?`🎲 ${t.name}: last opened ${Math.round((Date.now()-used[t.id])/DAY)} days ago`:`🎲 ${t.name}: you've never opened this one!`)}
