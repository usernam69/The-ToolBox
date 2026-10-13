// System: backup & sync, share with a friend, achievements, plugins, help.

// ---------- backup ----------
const PRIVATE_KEYS=['gistToken','claudeKey','ghToken'];// never leaves this browser
function allData(){const o={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k.startsWith(PREFIX)&&!PRIVATE_KEYS.includes(k.slice(PREFIX.length)))o[k.slice(PREFIX.length)]=JSON.parse(localStorage.getItem(k))}return o}
function restoreData(o,{keepPrivate=true}={}){if(!o||typeof o!=='object')throw new Error('Not a toolbox backup');
  const keep={};PRIVATE_KEYS.concat(keepPrivate?['gistId']:[]).forEach(k=>keep[k]=load(k,undefined));
  Object.keys(localStorage).filter(k=>k.startsWith(PREFIX)).forEach(k=>localStorage.removeItem(k));
  Object.entries(o).forEach(([k,v])=>save(k,v));Object.entries(keep).forEach(([k,v])=>v!==undefined&&save(k,v))}
// The 43 menu apps keep data under app_<id>_ and the menu under menu_; back those up too.
const EXTRA_PREFIXES=['app_','menu_'];
function extraData(){const o={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(EXTRA_PREFIXES.some(p=>k.startsWith(p)))o[k]=localStorage.getItem(k)}return o}
function restoreExtra(o){if(!o||typeof o!=='object')return;Object.keys(localStorage).filter(k=>EXTRA_PREFIXES.some(p=>k.startsWith(p))).forEach(k=>localStorage.removeItem(k));
  Object.entries(o).forEach(([k,v])=>{if(EXTRA_PREFIXES.some(p=>k.startsWith(p))&&typeof v==='string')try{localStorage.setItem(k,v)}catch{}})}
const backupText=()=>JSON.stringify({app:'useful-toolbox',version:3,saved:new Date().toISOString(),data:allData(),apps:extraData()},null,1);
// Auto-backup into a folder the user picks (on a Chromebook, pick Google Drive in the Files app and it syncs to the cloud).
const FOLDER={db:()=>new Promise((ok,no)=>{const r=indexedDB.open('toolbox-folder',1);r.onupgradeneeded=()=>r.result.createObjectStore('h');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)}),
  async get(){try{const d=await FOLDER.db();return await new Promise(ok=>{const q=d.transaction('h').objectStore('h').get('dir');q.onsuccess=()=>ok(q.result||null);q.onerror=()=>ok(null)})}catch{return null}},
  async set(h){const d=await FOLDER.db();await new Promise(ok=>{const t=d.transaction('h','readwrite');h?t.objectStore('h').put(h,'dir'):t.objectStore('h').delete('dir');t.oncomplete=ok})},
  async write(dir,ask){const opt={mode:'readwrite'};if(await dir.queryPermission(opt)!=='granted'&&(!ask||await dir.requestPermission(opt)!=='granted'))return false;
    const f=await dir.getFileHandle('toolbox-backup.json',{create:true}),w=await f.createWritable();await w.write(backupText());await w.close();save('folderBackup',Date.now());return true},
  async read(dir){const f=await dir.getFileHandle('toolbox-backup.json');return (await f.getFile()).text()}};
// once a day, quietly (only works while permission is still granted, e.g. in the installed app)
setTimeout(async()=>{if(!window.showDirectoryPicker||Date.now()-load('folderBackup',0)<20*36e5)return;const d=await FOLDER.get();if(d)try{await FOLDER.write(d,false)}catch{}},4000);
function parseBackup(t){const j=JSON.parse(t);if(j.app!=='useful-toolbox'||!j.data)throw new Error('That file is not a toolbox backup.');return j}
// AES-GCM with a key from PBKDF2 (250k rounds). The password is never stored.
async function pwKey(pw,salt){const base=await crypto.subtle.importKey('raw',new TextEncoder().encode(pw),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:250000,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])}
const b64=u=>btoa(String.fromCharCode(...u)),unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function encryptText(text,pw){const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
  const ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},await pwKey(pw,salt),new TextEncoder().encode(text)));
  let bin='';for(let i=0;i<ct.length;i+=32768)bin+=String.fromCharCode(...ct.subarray(i,i+32768));
  return JSON.stringify({app:'useful-toolbox',encrypted:true,salt:b64(salt),iv:b64(iv),data:btoa(bin)})}
async function decryptText(t,pw){const j=JSON.parse(t);try{return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(j.iv)},await pwKey(pw,unb64(j.salt)),unb64(j.data)))}catch{throw new Error('Wrong password (or the file is damaged).')}}
const isEncrypted=t=>{try{return JSON.parse(t).encrypted===true}catch{return false}};

async function gist(method,path,body){const tok=load('gistToken','');if(!tok)throw new Error('Add a GitHub token first.');
  const r=await fetch('https://api.github.com/gists'+path,{method,headers:{Authorization:'Bearer '+tok,Accept:'application/vnd.github+json'},body:body&&JSON.stringify(body)});
  if(!r.ok)throw new Error(`GitHub said ${r.status}${r.status===401?' (check the token)':r.status===404?' (gist not found)':''}`);return r.json()}
tool({id:'backup',name:'Backup & sync',group:'System',html:`
<h2>Backup &amp; sync</h2><p class="sub">Everything you keep here lives only in this browser, so clearing browsing data would wipe it. Back it up to a file, or sync it through a private GitHub Gist to use it on another device.</p>
<div class="grid2"><div class="box"><b>Backup file</b><p class="muted" style="font-size:13px" id="bkInfo"></p>
 <div class="row"><input id="bkPw" type="password" class="grow" placeholder="Password to encrypt (optional)" autocomplete="new-password"></div>
 <div class="row"><button class="b" id="bkExport">Download backup</button><label class="g" style="border:1px solid var(--line);padding:6px 11px;border-radius:8px;cursor:pointer">Restore from file<input type="file" id="bkImport" accept=".json" hidden></label></div>
 <p class="muted" style="font-size:13px">Restoring replaces everything here with the backup. Encrypted backups need the same password, and there's no way to recover a forgotten one.</p></div>
<div class="box"><b>Sync with GitHub Gist</b><p class="muted" style="font-size:13px">Create a token at github.com → Settings → Developer settings → Personal access tokens, with only the <b>gist</b> permission, and paste it here. It's kept only in this browser and is never included in backups.</p>
 <div class="row"><input id="gTok" type="password" class="grow" placeholder="GitHub token" autocomplete="off"></div>
 <div class="row"><input id="gId" class="grow" placeholder="Gist ID (filled in after first upload; paste it on your other device)"></div>
 <div class="row"><button class="b" id="gUp">Upload</button><button class="g" id="gDown">Download &amp; replace</button></div><div id="gMsg" class="muted"></div></div>
<div class="box"><b>Auto-backup to a folder</b><p class="muted" style="font-size:13px">Pick a folder and The ToolBox keeps <code>toolbox-backup.json</code> there up to date once a day. On a Chromebook, pick <b>Google Drive</b> in the Files app and your backup is in the cloud. On Windows, a Google Drive, OneDrive or Dropbox folder works the same way, so two devices can share one backup.</p>
 <div class="row"><button class="b" id="fdPick">Choose folder</button><button class="g" id="fdNow">Back up now</button><button class="g" id="fdLoad">Restore from folder</button><button class="x" id="fdOff" title="Stop">✕</button></div><div id="fdMsg" class="muted" style="font-size:13px"></div></div></div>`,
init(){const me=this;
  $('fdPick').onclick=async()=>{try{const d=await showDirectoryPicker({id:'toolbox-backup',mode:'readwrite'});await FOLDER.set(d);await FOLDER.write(d,true);bump('backups');toast('Saved to '+d.name)}catch(e){if(e.name!=='AbortError')toast(e.message)}me.fdInfo()};
  $('fdNow').onclick=async()=>{const d=await FOLDER.get();try{if(await FOLDER.write(d,true)){bump('backups');toast('Backed up ✓')}else toast('Permission was not given.')}catch(e){toast(e.message)}me.fdInfo()};
  $('fdLoad').onclick=async()=>{const d=await FOLDER.get();try{if(await d.requestPermission({mode:'read'})!=='granted')return;const j=parseBackup(await FOLDER.read(d));if(confirm(`Replace everything here with the folder backup from ${new Date(j.saved).toLocaleString()}?`)){restoreData(j.data);restoreExtra(j.apps);location.reload()}}catch(e){toast(e.name==='NotFoundError'?'No backup in that folder yet.':e.message)}};
  $('fdOff').onclick=async()=>{await FOLDER.set(null);me.fdInfo()};
  
  $('bkExport').onclick=async()=>{const pw=$('bkPw').value;download(`toolbox-backup-${isoDay()}${pw?'-locked':''}.json`,pw?await encryptText(backupText(),pw):backupText());bump('backups');save('lastBackup',Date.now());this.show()};
  $('bkImport').onchange=async()=>{const f=$('bkImport').files[0];if(!f)return;try{let t=await f.text();
    if(isEncrypted(t)){const pw=$('bkPw').value||prompt('This backup is encrypted. Password:');if(!pw)throw new Error('Password needed.');t=await decryptText(t,pw)}
    const j=parseBackup(t);
    if(confirm(`Replace everything here with the backup from ${new Date(j.saved).toLocaleString()}?`)){restoreData(j.data);restoreExtra(j.apps);location.reload()}}catch(e){toast(e.message)}$('bkImport').value=''};
  $('gTok').value=load('gistToken','');$('gId').value=load('gistId','');
  $('gTok').onchange=()=>save('gistToken',$('gTok').value.trim());$('gId').onchange=()=>save('gistId',$('gId').value.trim());
  $('gUp').onclick=async()=>{$('gMsg').textContent='Uploading…';try{const id=load('gistId',''),files={'toolbox.json':{content:backupText()}};
    const r=id?await gist('PATCH','/'+id,{files}):await gist('POST','',{description:'Useful Toolbox sync',public:false,files});
    save('gistId',r.id);$('gId').value=r.id;bump('backups');save('lastBackup',Date.now());$('gMsg').textContent='Uploaded ✓ '+new Date().toLocaleTimeString()}catch(e){$('gMsg').textContent=e.message}};
  $('gDown').onclick=async()=>{const id=load('gistId','');if(!id)return $('gMsg').textContent='Paste the Gist ID first.';$('gMsg').textContent='Downloading…';
    try{const g=await gist('GET','/'+id),f=g.files['toolbox.json'];if(!f)throw new Error('No toolbox.json in that gist.');
      const text=f.truncated?await(await fetch(f.raw_url)).text():f.content,j=parseBackup(text);
      if(confirm(`Replace everything here with the copy saved ${new Date(j.saved).toLocaleString()}?`)){restoreData(j.data);restoreExtra(j.apps);location.reload()}else $('gMsg').textContent=''}catch(e){$('gMsg').textContent=e.message}}},
async fdInfo(){const d=await FOLDER.get(),t=load('folderBackup',0);$('fdMsg').textContent=!window.showDirectoryPicker?'This browser can’t save to folders. Use Chrome or Edge, or the desktop app.':d?`Folder: ${d.name}. ${t?'Last saved '+new Date(t).toLocaleString()+'.':'Not saved yet.'}`:'No folder chosen.';
  ['fdNow','fdLoad','fdOff'].forEach(id=>$(id).hidden=!d);$('fdPick').hidden=!window.showDirectoryPicker},
show(){this.fdInfo();const n=Object.keys(allData()).length+Object.keys(extraData()).length,lb=load('lastBackup',0);$('bkInfo').textContent=`${n} kinds of data stored. `+(lb?`Last backup ${new Date(lb).toLocaleString()}.`:'Never backed up.')}});

// ---------- share with a friend ----------
const toB64=s=>btoa(String.fromCharCode(...new TextEncoder().encode(s)));
const fromB64=s=>new TextDecoder().decode(Uint8Array.from(atob(s),c=>c.charCodeAt(0)));
const SHARE={todos:{name:'To-do list',get:()=>load('todos',[]).filter(t=>!t.d),merge(d){const cur=load('todos',[]),ids=new Set(cur.map(t=>t.id));const add=d.filter(t=>!ids.has(t.id));save('todos',cur.concat(add));todos=load('todos',[]);return add.length}},
  split:{name:'Budget splitter',get:()=>load('split',{people:[],exp:[]}),merge(d){const cur=load('split',{people:[],exp:[]}),key=e=>e.p+'|'+e.w+'|'+e.a;let n=0;
    d.people.forEach(p=>cur.people.includes(p)||cur.people.push(p));const have=new Set(cur.exp.map(key));d.exp.forEach(e=>{if(!have.has(key(e))){cur.exp.push(e);n++}});save('split',cur);sp=cur;return n}},
  links:{name:'Links',get:()=>load('links',[]),merge(d){links=load('links',[]);let n=0;d.forEach(l=>{if(addLink(l.url,l.title,l.tags))n++});save('links',links);return n}},
  cards:{name:'Flashcards',get:()=>load('cards',[]).map(({q,a,deck})=>({q,a,deck})),merge(d){cards=load('cards',[]);const have=new Set(cards.map(c=>c.q+'|'+c.a));let n=0;d.forEach(c=>{if(!have.has(c.q+'|'+c.a)&&addCard(c.q,c.a,c.deck))n++});return n}},
  notes:{name:'Notes',get:()=>load('notes',[]),merge(d){const cur=load('notes',[]),ids=new Set(cur.map(x=>x.id));const add=d.filter(x=>!ids.has(x.id));save('notes',cur.concat(add));notes=load('notes',[]);return add.length}}};
tool({id:'share',name:'Share with a friend',group:'System',html:`
<h2>Share with a friend</h2><p class="sub">Send a list to someone without any account. Make a share code, send it over chat or email, and they paste it here. It's added to what they already have, nothing is replaced. To keep a shared to-do list or splitter in step, send codes back and forth.</p>
<div class="grid2"><div class="box"><b>Make a code</b><div class="row"><select id="shWhat"></select><button class="b" id="shMake">Make code</button><button class="g" id="shCopy">Copy</button><span id="shMsg" class="muted"></span></div><textarea id="shOut" readonly style="min-height:120px;font-family:ui-monospace,monospace;font-size:12px"></textarea></div>
<div class="box"><b>Add a friend's code</b><textarea id="shIn" style="min-height:120px;font-family:ui-monospace,monospace;font-size:12px" placeholder="Paste a TBX1:… code"></textarea><div class="row"><button class="b" id="shAdd">Add to mine</button><span id="shRes"></span></div></div></div>`,
init(){$('shWhat').innerHTML=Object.entries(SHARE).map(([k,v])=>`<option value="${k}">${v.name}</option>`).join('');
  $('shMake').onclick=()=>{const k=$('shWhat').value;$('shOut').value='TBX1:'+toB64(JSON.stringify({kind:k,from:new Date().toISOString(),data:SHARE[k].get()}))};
  $('shCopy').onclick=()=>{if(!$('shOut').value)$('shMake').click();copy($('shOut').value,$('shMsg'))};
  $('shAdd').onclick=()=>{try{const t=$('shIn').value.trim();if(!t.startsWith('TBX1:'))throw 0;const j=JSON.parse(fromB64(t.slice(5)));if(!SHARE[j.kind])throw 0;
    const n=SHARE[j.kind].merge(j.data);$('shRes').innerHTML=`<span style="color:var(--good)">Added ${n} new item${n===1?'':'s'} to ${SHARE[j.kind].name}.</span>`;$('shIn').value=''}
    catch{$('shRes').innerHTML='<span style="color:var(--bad)">That doesn\'t look like a share code.</span>'}}}});

// ---------- achievements ----------
function longestRun(days){const set=new Set(days);let best=0;set.forEach(d=>{if(set.has(isoDay(new Date(parseIso(d)-DAY))))return;let n=0,x=parseIso(d);while(set.has(isoDay(x))){n++;x=new Date(x.getFullYear(),x.getMonth(),x.getDate()+1)}best=Math.max(best,n)});return best}
const BADGES=[
  ['first-task','✅','First win','Finish a to-do',()=>stat('todosDone')>=1],
  ['ten-tasks','🏅','Getting things done','Finish 10 to-dos',()=>stat('todosDone')>=10],
  ['hundred-tasks','🏆','Unstoppable','Finish 100 to-dos',()=>stat('todosDone')>=100],
  ['first-card','🃏','Student','Add your first flashcard',()=>load('cards',[]).length>=1],
  ['reviews-100','🧠','Big brain','Do 100 flashcard reviews',()=>stat('reviews')>=100],
  ['study-7','📚','Week of study','Study flashcards 7 days in a row',()=>longestRun(Object.keys(load('reviewLog',{})))>=7],
  ['habit-7','🔥','On fire','Keep any habit 7 days in a row',()=>load('habits',[]).some(h=>longestRun(Object.keys(h.days))>=7)],
  ['habit-30','🌋','Habit master','Keep any habit 30 days in a row',()=>load('habits',[]).some(h=>longestRun(Object.keys(h.days))>=30)],
  ['pomo-1','🍅','Focused','Finish a Pomodoro',()=>stat('pomos')>=1],
  ['pomo-25','⏳','Deep worker','Finish 25 Pomodoros',()=>stat('pomos')>=25],
  ['clean','🧹','Clean sweep','Make a Downloads clean-up script',()=>stat('cleaned')>=1],
  ['scripts-5','🛠️','File wizard','Make 5 file scripts',()=>stat('scripts')>=5],
  ['settled','🤝','All square','Settle up a shared budget',()=>stat('settled')>=1],
  ['budget','📒','Budget keeper','Log 30 expenses',()=>load('expenses',[]).length>=30],
  ['bills','🗓️','Never late','Add 3 recurring bills',()=>load('bills',[]).length>=3],
  ['links-25','🔗','Collector','Save 25 links',()=>load('links',[]).length>=25],
  ['notes-10','📝','Note taker','Write 10 notes',()=>load('notes',[]).length>=10],
  ['backup','💾','Safe and sound','Make a backup',()=>stat('backups')>=1],
  ['commander','⌨️','Commander','Use the command bar 10 times',()=>stat('commands')>=10],
  ['plugin','🧩','Tinkerer','Add a plugin',()=>load('plugins',[]).length>=1],
  // achievements earned in the menu apps (their data lives under app_<id>_)
  ['parkour-1','🏃','Parkour rookie','Finish Parkour level 1',()=>appData('parkour','best0',null)!==null],
  ['parkour-all','🧗','Rooftop legend','Finish all 4 Parkour levels',()=>[0,1,2,3].every(i=>appData('parkour','best'+i,null)!==null)],
  ['snake-30','🐍','Long snake','Score 30 in any Snake mode',()=>['walls','twin','classic'].some(m=>appData('snake','best_'+m,0)>=30)],
  ['wordle-10','🟩','Word wizard','Win 10 Wordles',()=>appData('wordle','stats',{w:0}).w>=10],
  ['typerain-50','⌨️','Fast fingers','Score 50 in Falling words',()=>appData('typerain','best',0)>=50],
  ['rogue-3','🗡️','Dungeon diver','Reach 300 points in the roguelike',()=>appData('rogue','best',0)>=300],
  ['escape','🔓','Escape artist','Escape the escape room',()=>appData('escape','best',null)!==null],
  ['idle-prestige','🍪','Cookie tycoon','Prestige in the idle clicker',()=>(appData('idle','g',{prestige:0})||{prestige:0}).prestige>=1],
  ['journal-30','📓','Dear diary','Write 30 one-liner journal entries',()=>Object.keys(appData('journal','entries',{})).length>=30],
  ['story-ends','📖','Every ending','Find all 4 endings of the built-in story',()=>Object.keys(appData('story','ends',{})).filter(k=>k.startsWith('The Lighthouse Keeper|')).length>=4],
  ['pet-dragon','🐉','Dragon keeper','Grow your focus pet into a dragon',()=>appData('petfocus','pet',{xp:0}).xp>=2000],
  ['explorer','🧭','Explorer','Open 20 different apps from the menu',()=>{try{return JSON.parse(localStorage.getItem('menu_visited')||'[]').length>=20}catch{return false}}]];
function appData(app,k,d){try{const v=localStorage.getItem('app_'+app+'_'+k);return v?JSON.parse(v):d}catch{return d}}
function checkBadges(){const got=load('badges',{});let changed=false;
  BADGES.forEach(([id,e,name,,test])=>{if(!got[id]){let ok=false;try{ok=test()}catch{}if(ok){got[id]=Date.now();changed=true;toast(`${e} Achievement unlocked: ${name}!`)}}});
  if(changed)save('badges',got)}
tool({id:'badges',name:'Achievements',group:'System',html:`<h2>Achievements</h2><p class="sub" id="bgSum"></p><div class="grid3" id="bgGrid"></div>`,
show(){checkBadges();const got=load('badges',{});$('bgSum').textContent=`${Object.keys(got).length} of ${BADGES.length} unlocked.`;
  $('bgGrid').innerHTML=BADGES.map(([id,e,name,how])=>`<div class="badge ${got[id]?'':'locked'}"><span class="e">${e}</span><div><b>${name}</b><br><span class="muted" style="font-size:13px">${how}${got[id]?' · '+new Date(got[id]).toLocaleDateString():''}</span></div></div>`).join('')}});

// ---------- plugins ----------
const PLUGIN_EXAMPLE=`// "el" is this tab's box. "api" has: load(key, default), save(key, value), toast(msg), copy(text), esc(text)
el.innerHTML = '<h2>Tally counter</h2><div class="big" id="n"></div><button class="b" id="up">+1</button> <button class="g" id="reset">Reset</button>';
let n = api.load('n', 0);
const show = () => el.querySelector('#n').textContent = n;
el.querySelector('#up').onclick = () => { n++; api.save('n', n); show(); };
el.querySelector('#reset').onclick = () => { n = 0; api.save('n', n); show(); };
show();`;
const PLUGIN_GALLERY=[
 {emoji:'🔢',name:'Tally counter',about:'Count anything with a big +1 button.',code:PLUGIN_EXAMPLE},
 {emoji:'🫁',name:'Breathing',about:'A calm 4-7-8 breathing guide with a growing circle.',code:`el.innerHTML='<h2>Breathing</h2><p class="sub">Breathe in 4s, hold 7s, out 8s.</p><div style="display:flex;justify-content:center;padding:30px"><div id="c" style="width:80px;height:80px;border-radius:50%;background:var(--accent);transition:all 4s ease-in-out"></div></div><p id="t" style="text-align:center;font-size:22px">Press start</p><div style="text-align:center"><button class="b" id="go">Start</button></div>';
const c=el.querySelector('#c'),t=el.querySelector('#t');let on=false,tm;
const step=(i)=>{if(!on)return;const[s,ms,size,label]=[[0,4000,200,'Breathe in'],[1,7000,200,'Hold'],[2,8000,80,'Breathe out']][i];c.style.transitionDuration=(i===1?0:ms/1000)+'s';c.style.width=c.style.height=size+'px';t.textContent=label;tm=setTimeout(()=>step((i+1)%3),ms)};
el.querySelector('#go').onclick=e=>{on=!on;e.target.textContent=on?'Stop':'Start';clearTimeout(tm);if(on)step(0);else{t.textContent='Press start';c.style.width=c.style.height='80px'}};`},
 {emoji:'🧳',name:'Packing list',about:'A reusable trip checklist. Untick everything for the next trip.',code:`let items=api.load('items',['Passport','Phone charger','Toothbrush','Clothes','Medicine']);let done=api.load('done',[]);
const draw=()=>{api.save('items',items);api.save('done',done);el.innerHTML='<h2>Packing list</h2><div class="row"><input id="n" class="grow" placeholder="Add item"><button class="b" id="a">Add</button><button class="g" id="r">Untick all</button></div><ul class="clean">'+items.map((x,i)=>'<li><label><input type="checkbox" data-i="'+i+'" '+(done.includes(x)?'checked':'')+'> '+api.esc(x)+'</label><button class="x" data-d="'+i+'">✕</button></li>').join('')+'</ul><p class="muted">'+done.length+' of '+items.length+' packed</p>';
el.querySelector('#a').onclick=()=>{const v=el.querySelector('#n').value.trim();if(v){items.push(v);draw()}};
el.querySelector('#r').onclick=()=>{done=[];draw()};
el.querySelectorAll('[data-i]').forEach(c=>c.onchange=()=>{const x=items[c.dataset.i];done=c.checked?[...done,x]:done.filter(y=>y!==x);draw()});
el.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{items.splice(b.dataset.d,1);draw()})};draw();`},
 {emoji:'🗳️',name:'Quick poll',about:'Count votes for a few options, e.g. "where should we eat?".',code:`let p=api.load('poll',{q:'Where should we eat?',opts:{Pizza:0,Sushi:0,Tacos:0}});
const draw=()=>{api.save('poll',p);const tot=Object.values(p.opts).reduce((a,b)=>a+b,0)||1;el.innerHTML='<h2>'+api.esc(p.q)+'</h2>'+Object.entries(p.opts).map(([o,n])=>'<div class="row"><button class="g" data-o="'+api.esc(o)+'" style="width:130px">'+api.esc(o)+'</button><div style="flex:1;background:var(--line);border-radius:4px"><div class="bar" style="width:'+(n/tot*100)+'%"></div></div><b>'+n+'</b></div>').join('')+'<div class="row"><input id="o" placeholder="Add option"><button class="g" id="add">Add</button><button class="g" id="q">Change question</button><button class="g" id="z">Reset votes</button></div>';
el.querySelectorAll('[data-o]').forEach(b=>b.onclick=()=>{p.opts[b.dataset.o]++;draw()});
el.querySelector('#add').onclick=()=>{const v=el.querySelector('#o').value.trim();if(v){p.opts[v]=0;draw()}};
el.querySelector('#q').onclick=()=>{const q=prompt('Question:',p.q);if(q){p.q=q;draw()}};
el.querySelector('#z').onclick=()=>{Object.keys(p.opts).forEach(k=>p.opts[k]=0);draw()}};draw();`},
 {emoji:'🪙',name:'Coin jar',about:'Drop in a coin every time you skip a treat, and watch the jar fill.',code:`let j=api.load('jar',{goal:50,coins:0});const draw=()=>{api.save('jar',j);el.innerHTML='<h2>Coin jar</h2><div style="font-size:60px;text-align:center">🫙</div><div class="big" style="text-align:center">'+j.coins+' / '+j.goal+'</div><div style="background:var(--line);border-radius:4px;margin:8px 0"><div class="bar" style="width:'+Math.min(100,j.coins/j.goal*100)+'%"></div></div><div class="row" style="justify-content:center"><button class="b" id="a">+1 coin</button><button class="g" id="g">Set goal</button><button class="g" id="e">Empty jar</button></div>'+(j.coins>=j.goal?'<p style="text-align:center">🎉 Goal reached! Treat yourself.</p>':'');
el.querySelector('#a').onclick=()=>{j.coins++;draw()};el.querySelector('#g').onclick=()=>{const g=+prompt('Goal:',j.goal);if(g>0){j.goal=g;draw()}};el.querySelector('#e').onclick=()=>{if(confirm('Empty the jar?')){j.coins=0;draw()}}};draw();`}];
function pluginTools(){return load('plugins',[]).filter(p=>p.on).map(p=>({id:'plugin_'+p.id,name:p.name||'Plugin',group:'Plugins',html:'<div class="pluginBody"></div>',
  init(sec){const el=sec.querySelector('.pluginBody'),api={load:(k,d)=>load('plugin_'+p.id+'_'+k,d),save:(k,v)=>save('plugin_'+p.id+'_'+k,v),toast,copy,esc};
    try{new Function('el','api',p.code)(el,api)}catch(e){el.innerHTML=`<h2>${esc(p.name)}</h2><p style="color:var(--bad)">This plugin crashed: ${esc(e.message)}</p><p class="muted">Fix it in System → Plugins.</p>`}}}))}
tool({id:'plugins',name:'Plugins',group:'System',html:`
<h2>Plugins</h2><p class="sub">Write or paste a small JavaScript snippet and it becomes its own tab under "Plugins". <b>Only use code you wrote or fully trust</b>, because it can read everything stored in this toolbox.</p>
<ul class="clean" id="plList"></ul>
<h3>Plugin gallery</h3><p class="sub">Ready-made plugins you can add in one click and change later.</p><div class="grid3" id="plGallery"></div>
<div class="box"><b id="plHead">New plugin</b><div class="row"><input id="plName" class="grow" placeholder="Tab name"></div>
<textarea id="plCode" style="min-height:220px;font-family:ui-monospace,monospace;font-size:13px"></textarea>
<div class="row"><button class="b" id="plSave">Save &amp; reload</button><button class="g" id="plNew">Clear</button><button class="g" id="plEx">Load example</button></div></div>`,
init(){let editing=null;const plugins=()=>load('plugins',[]);
  const draw=()=>{$('plList').innerHTML='';plugins().forEach((p,i)=>{const li=document.createElement('li');
    li.innerHTML=`<label><input type="checkbox" ${p.on?'checked':''}> ${esc(p.name)}</label><button class="g" style="margin-left:auto">Edit</button><button class="x">✕</button>`;
    li.querySelector('input').onchange=e=>{const a=plugins();a[i].on=e.target.checked;save('plugins',a);location.reload()};
    li.querySelector('.g').onclick=()=>{editing=p.id;$('plHead').textContent='Editing '+p.name;$('plName').value=p.name;$('plCode').value=p.code};
    li.querySelector('.x').onclick=()=>{if(confirm(`Delete plugin "${p.name}"?`)){const a=plugins();a.splice(i,1);save('plugins',a);location.reload()}};$('plList').append(li)});
    if(!plugins().length)$('plList').innerHTML='<li class="muted">No plugins yet. Press "Load example" to see how one works.</li>'};
  $('plGallery').innerHTML=PLUGIN_GALLERY.map((g,i)=>`<div class="box"><b>${g.emoji} ${esc(g.name)}</b><p class="muted" style="font-size:13px;margin:4px 0 8px">${esc(g.about)}</p><button class="g" data-g="${i}">Add</button></div>`).join('');
  $('plGallery').querySelectorAll('[data-g]').forEach(b=>b.onclick=()=>{const g=PLUGIN_GALLERY[b.dataset.g],a=plugins(),id=uid();a.push({id,name:g.name,code:g.code,on:true});save('plugins',a);save('tab','plugin_'+id);location.reload()});
  $('plEx').onclick=()=>{$('plName').value='Tally counter';$('plCode').value=PLUGIN_EXAMPLE};
  $('plNew').onclick=()=>{editing=null;$('plHead').textContent='New plugin';$('plName').value=$('plCode').value=''};
  $('plSave').onclick=()=>{const name=$('plName').value.trim()||'Plugin',code=$('plCode').value;if(!code.trim())return toast('Write some code first.');
    try{new Function('el','api',code)}catch(e){return toast('Syntax error: '+e.message)}
    const a=plugins();if(editing){const p=a.find(x=>x.id===editing);p.name=name;p.code=code}else a.push({id:uid(),name,code,on:true});save('plugins',a);
    save('tab','plugin_'+(editing||a[a.length-1].id));location.reload()};draw()}});

// ---------- help ----------
tool({id:'help',name:'Help & install',group:'System',html:`
<h2>Help</h2>
<h3>Keyboard</h3><table>
<tr><td><kbd>Ctrl</kbd>+<kbd>K</kbd></td><td>Command bar (add to-dos, timers, expenses… by typing)</td></tr>
<tr><td><kbd>/</kbd></td><td>Search everything</td></tr>
<tr><td><kbd>1</kbd>–<kbd>9</kbd></td><td>Switch to the Nth tool in the current group</td></tr>
<tr><td><kbd>[</kbd> <kbd>]</kbd></td><td>Previous / next group</td></tr>
<tr><td><kbd>F</kbd></td><td>Focus mode (<kbd>Esc</kbd> to leave)</td></tr>
<tr><td><kbd>S</kbd></td><td>Screensaver now (any key to leave)</td></tr>
<tr><td>🎤 in the command bar</td><td>Speak a command: "timer ten minutes", "add eggs to shopping list", "I spent 20 on lunch"</td></tr>
<tr><td><kbd>Space</kbd>, <kbd>←</kbd> <kbd>→</kbd></td><td>Flashcards: flip, wrong, right</td></tr>
<tr><td><kbd>M</kbd></td><td>Video chapters: mark here</td></tr></table>
<h3>Commands</h3><table id="helpCmds"></table>
<h3>Install as an app</h3><p>To install it and use it offline, the toolbox must be opened from a web address rather than a file. Put the <code>toolbox</code> folder on any static host (GitHub Pages, Netlify, or your own server), open it in Chrome or Edge, then click the install icon in the address bar. You can also run it locally with:</p>
<pre>npx serve toolbox</pre><p class="muted" id="pwaState"></p>`,
show(){$('helpCmds').innerHTML=COMMANDS.map(c=>`<tr><td><code>${esc(c.help)}</code></td></tr>`).join('');
  $('pwaState').textContent=location.protocol.startsWith('http')?(navigator.serviceWorker?.controller?'✓ Offline mode is active.':'Offline mode will be ready after the next reload.'):'Right now it is opened as a file, so installing is not available.'}});
