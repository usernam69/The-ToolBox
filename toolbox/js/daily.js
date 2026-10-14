// Daily: dashboard, habits, notes, timers, calendar, focus mode.

// ---------- to-dos (shared by dashboard, focus mode, calendar) ----------
// p = priority (1 high, 2 normal, 3 low), rep = '' | daily | weekly | monthly, pomos = Pomodoros spent on it
let todos=load('todos',[]).map(t=>({id:t.id||uid(),t:t.t,d:!!t.d,due:t.due||'',doneAt:t.doneAt||(t.d?Date.now():0),p:t.p||2,rep:t.rep||'',pomos:t.pomos||0}));
const saveTodos=()=>{save('todos',todos);refreshTodoViews()};
function todoClass(t){if(t.d||!t.due)return'';const today=isoDay();return t.due<today?'overdue':t.due===today?'soon':''}
function addTodo(text,due='',p=2,rep=''){text=text.trim();if(!text)return false;todos.push({id:uid(),t:text,d:false,due:due||(rep?isoDay():''),doneAt:0,p:+p||2,rep,pomos:0});saveTodos();return true}
function shiftDay(iso,rep){const d=parseIso(iso);if(rep==='daily')d.setDate(d.getDate()+1);else if(rep==='weekly')d.setDate(d.getDate()+7);else d.setMonth(d.getMonth()+1);return isoDay(d)}
function toggleTodo(t){t.d=!t.d;t.doneAt=t.d?Date.now():0;
  if(t.d){bump('todosDone');bump('todosDone_'+isoDay());
    // recurring: queue the next one (move its date forward past today)
    if(t.rep&&!todos.some(x=>x.repOf===t.id&&!x.d)){let due=shiftDay(t.due||isoDay(),t.rep);while(due<=isoDay())due=shiftDay(due,t.rep);
      todos.push({id:uid(),t:t.t,d:false,due,doneAt:0,p:t.p,rep:t.rep,pomos:0,repOf:t.id})}}
  saveTodos()}
const PRI_DOT={1:'<span title="High priority" style="color:var(--bad)">●</span>',2:'',3:'<span title="Low priority" class="muted">○</span>'};
function drawTodoList(ul,{onlyOpen=false}={}){
  ul.innerHTML='';
  const list=todos.filter(t=>!onlyOpen||!t.d).sort((a,b)=>(a.d-b.d)||(a.p-b.p)||((a.due||'9')>(b.due||'9')?1:-1));
  if(!list.length){ul.innerHTML='<li class="muted">Nothing here.</li>';return}
  list.forEach(t=>{const li=document.createElement('li');
    li.innerHTML=`<input type="checkbox" ${t.d?'checked':''}>${PRI_DOT[t.p]||''}<span class="${t.d?'done':todoClass(t)}">${esc(t.t)}</span>${t.rep?`<span class="muted" title="Repeats ${t.rep}">↻</span>`:''}${t.pomos?`<span class="muted" style="font-size:12px" title="Pomodoros spent">🍅${t.pomos}</span>`:''}${t.due?`<span class="muted" style="font-size:12px">${t.due}</span>`:''}<button class="x" title="Delete">✕</button>`;
    li.children[0].onchange=()=>toggleTodo(t);
    li.querySelector('.x').onclick=()=>removeWithUndo(todos,todos.indexOf(t),saveTodos,'Task deleted');
    ul.append(li)})}
function refreshTodoViews(){
  if($('tList'))drawTodoList($('tList'));
  if($('focusTodos'))drawTodoList($('focusTodos'),{onlyOpen:true});
  if($('doneList'))drawDone();
  if($('brief'))drawBrief();
  if(toolById('calendar')?.sec?.classList.contains('on'))drawCalendar()}

// "Done today" = finished to-dos + quick wins typed in
let wins=load('wins',[]);
function drawDone(){
  const today=isoDay(),items=[...todos.filter(t=>t.d&&t.doneAt&&isoDay(new Date(t.doneAt))===today).map(t=>t.t),...wins.filter(w=>w.day===today).map(w=>w.t)];
  $('doneList').innerHTML=items.length?items.map(t=>`<li>✓ ${esc(t)}</li>`).join(''):'<li class="muted">Nothing yet. You\'ll get there.</li>';
  $('doneCount').textContent=items.length?`(${items.length})`:''}
function addWin(t){t=t.trim();if(!t)return;wins.push({t,day:isoDay()});wins=wins.slice(-300);save('wins',wins);drawDone()}

// ---------- weather ----------
let lastWeather=load('lastWeather',null);
const wcode=c=>c===0?'clear':c<=3?'partly cloudy':c<=48?'foggy':c<=67?'rainy':c<=77?'snowy':c<=82?'showery':'stormy';
const useF=()=>load('fahrenheit',false);
const temp=c=>Math.round(useF()?c*9/5+32:c)+(useF()?'°F':'°C');
async function fetchWeather(city){
  const g=await(await fetch('https://geocoding-api.open-meteo.com/v1/search?count=1&name='+encodeURIComponent(city))).json();
  if(!g.results)throw new Error('not found');const p=g.results[0];
  const w=await(await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.latitude}&longitude=${p.longitude}&current=temperature_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`)).json();
  lastWeather={city:p.name+(p.country?', '+p.country:''),t:w.current.temperature_2m,desc:wcode(w.current.weather_code),wind:w.current.wind_speed_10m,hi:w.daily.temperature_2m_max[0],lo:w.daily.temperature_2m_min[0],at:Date.now()};
  save('lastWeather',lastWeather)}
function drawWeather(){const w=lastWeather;$('wUnit').textContent=useF()?'°F':'°C';
  $('wOut').innerHTML=w?`<div class="big">${temp(w.t)}</div>${w.desc[0].toUpperCase()+w.desc.slice(1)} · wind ${Math.round(w.wind)} km/h<br><span class="muted">${esc(w.city)} · high ${temp(w.hi)} / low ${temp(w.lo)}</span>`:'Enter a city.';
  drawBrief()}
async function weather(){const c=$('city').value.trim();if(!c)return;save('city',c);$('wOut').textContent='Loading…';
  try{await fetchWeather(c);drawWeather()}catch{$('wOut').textContent='Could not get weather for that city.'}}

// ---------- briefing ----------
function drawBrief(){
  const h=new Date().getHours(),hi=h<12?'Good morning':h<18?'Good afternoon':'Good evening';
  const parts=[];
  if(lastWeather)parts.push(`It's ${temp(lastWeather.t)} and ${lastWeather.desc} in ${lastWeather.city.split(',')[0]}.`);
  const open=todos.filter(t=>!t.d),over=open.filter(t=>todoClass(t)==='overdue').length;
  parts.push(open.length?`You have ${open.length} task${open.length>1?'s':''}${over?` (${over} overdue)`:''}.`:'Your to-do list is empty.');
  const cd=typeof cardsDueCount==='function'?cardsDueCount():0;if(cd)parts.push(`${cd} flashcard${cd>1?'s are':' is'} due.`);
  const bills=typeof billsDueSoon==='function'?billsDueSoon(7):[];if(bills.length)parts.push(bills.map(b=>`${b.name} is due ${b.when}`).join(', ')+'.');
  const hb=load('habits',[]),left=hb.filter(x=>!x.days[isoDay()]).length;if(hb.length)parts.push(left?`${left} habit${left>1?'s':''} left today.`:'All habits done today!');
  BRIEF_EXTRAS.forEach(f=>{try{parts.push(...f())}catch{}});
  const lb=load('lastBackup',0),hasData=todos.length+load('cards',[]).length+load('notes',[]).length+load('links',[]).length>0;
  if(hasData&&Date.now()-lb>7*DAY)parts.push(lb?`Your last backup was ${Math.floor((Date.now()-lb)/DAY)} days ago. Time for a new one (System → Backup).`:'You have never backed up. Time for one (System → Backup).');
  $('brief').innerHTML=`<b>${hi}!</b> `+esc(parts.join(' '))}

// ---------- dashboard ----------
const QUOTES=["The best way to get started is to quit talking and begin doing. — Walt Disney","Simplicity is the soul of efficiency. — Austin Freeman","Make it work, make it right, make it fast. — Kent Beck","Done is better than perfect.","Small steps every day.","What you do every day matters more than what you do once in a while. — Gretchen Rubin","Action is the foundational key to all success. — Pablo Picasso","Start where you are. Use what you have. Do what you can. — Arthur Ashe","Well begun is half done. — Aristotle","You don't have to see the whole staircase, just take the first step. — Martin Luther King Jr."];
const WIDGETS={brief:'Briefing',challenge:'Daily challenge',pet:'Pet',recent:'Recently used',weather:'Weather',todos:'To-do',done:'Done today',quote:'Quote',bills:'Bills due',habits:'Habits today',cards:'Flashcards'};
// the dashboard takes on today's mood (from the Mood journal): a soft wash of color and a line that fits
function moodTint(){const m=(load('moods',{})[isoDay()]||{}).v,sec=$('dash');if(!sec)return;
  const T={1:['#5b7db1','Rough day. Be kind to yourself, one small thing at a time.'],2:['#7a8cad','A bit low today. A short walk or a song might help.'],3:['#9aa39a','An okay day. Steady wins.'],4:['#e0a83a','Good mood! A great day to start something.'],5:['#ef6c8f','Fantastic! Spread it around.']}[m];
  sec.style.background=T?`linear-gradient(180deg,${T[0]}22,transparent 260px)`:'';sec.style.borderRadius=T?'16px':'';
  let n=$('moodLine');if(!T){if(n)n.remove();return}if(!n){n=document.createElement('p');n.id='moodLine';n.className='muted';sec.querySelector('h2')?.after(n)}n.textContent='🎨 '+T[1]}
tool({id:'dash',name:'Dashboard',group:'Daily',html:`
<div class="row"><h2 style="margin-right:auto">Dashboard</h2><button class="g" id="dCustom">Customize</button></div>
<div id="dCustomBox" class="box" style="display:none;margin-bottom:12px"><div class="muted" style="font-size:13px">Tick to show, drag to reorder.</div><ul class="clean" id="dWidgetList"></ul></div>
<div class="grid3" id="dGrid">
 <div class="box" data-w="brief" style="grid-column:1/-1"><p id="brief" style="margin:0"></p></div>
 <div class="box" data-w="challenge"><b>Daily challenge</b><p id="dChal" style="margin:6px 0 0"></p></div>
 <div class="box" data-w="pet" style="text-align:center"><div id="petFace" style="font-size:56px;line-height:1.1"></div><b id="petName" style="cursor:pointer" title="Click to rename"></b><div id="petInfo" class="muted" style="font-size:13px"></div><div style="background:var(--line);border-radius:4px;margin-top:6px"><div class="bar" id="petBar"></div></div></div>
 <div class="box" data-w="recent"><b>Recently used</b><div id="dRecent" class="row"></div></div>
 <div class="box" data-w="weather"><div class="row" style="margin-top:0"><b style="margin-right:auto">Weather</b><button class="g" id="wUnit" title="Switch units"></button></div>
  <div class="row"><input id="city" class="grow" placeholder="City (e.g. London)"><button class="b" id="wGo">Go</button></div><div id="wOut" class="muted"></div></div>
 <div class="box" data-w="todos"><b>To-do</b>
  <div class="row"><input id="tIn" class="grow" placeholder="Add a task"><input id="tDue" type="date" title="Due date"><button class="b" id="tAdd">Add</button></div>
  <div class="row" style="margin-top:0"><select id="tPri" title="Priority"><option value="1">High</option><option value="2" selected>Normal</option><option value="3">Low</option></select><select id="tRep" title="Repeat"><option value="">Once</option><option value="daily">Every day</option><option value="weekly">Every week</option><option value="monthly">Every month</option></select></div>
  <ul class="clean" id="tList"></ul><button class="g" id="tClear">Clear finished</button></div>
 <div class="box" data-w="done"><b>Done today <span id="doneCount" class="muted"></span></b><ul class="clean" id="doneList"></ul>
  <div class="row"><input id="winIn" class="grow" placeholder="Something else you did"><button class="g" id="winAdd">Add</button></div></div>
 <div class="box" data-w="quote"><b>Quote</b><p id="quote"></p><button class="g" id="qNew">Another</button></div>
 <div class="box" data-w="bills"><b>Bills due this week</b><ul class="clean" id="dBills"></ul></div>
 <div class="box" data-w="habits"><b>Habits today</b><ul class="clean" id="dHabits"></ul></div>
 <div class="box" data-w="cards"><b>Flashcards</b><p id="dCards"></p><button class="g" id="dCardsGo">Study now</button></div>
</div>`,
init(){
  const newQuote=()=>$('quote').textContent=QUOTES[Math.floor(Math.random()*QUOTES.length)];newQuote();$('qNew').onclick=newQuote;
  const add=()=>{if(addTodo($('tIn').value,$('tDue').value,$('tPri').value,$('tRep').value)){$('tIn').value='';$('tDue').value='';$('tRep').value=''}};
  $('tAdd').onclick=add;$('tIn').onkeydown=e=>e.key==='Enter'&&add();
  $('tClear').onclick=()=>{const before=todos.slice();todos=todos.filter(t=>!t.d);const n=before.length-todos.length;saveTodos();if(n)toast(`Cleared ${n} finished`,()=>{todos=before;saveTodos()})};
  $('winAdd').onclick=()=>{addWin($('winIn').value);$('winIn').value=''};$('winIn').onkeydown=e=>e.key==='Enter'&&$('winAdd').click();
  $('wGo').onclick=weather;$('city').onkeydown=e=>e.key==='Enter'&&weather();
  $('wUnit').onclick=()=>{save('fahrenheit',!useF());drawWeather()};
  $('city').value=load('city','');drawWeather();
  if($('city').value&&(!lastWeather||Date.now()-lastWeather.at>30*6e4))weather();
  $('dCardsGo').onclick=()=>showTool('cards');
  // widget customizing: show/hide + drag order
  $('dCustom').onclick=()=>{const b=$('dCustomBox');b.style.display=b.style.display==='none'?'':'none'};
  let drag=null;
  const drawWidgetList=()=>{const ul=$('dWidgetList');ul.innerHTML='';
    widgetOrder().forEach(w=>{const li=document.createElement('li');li.draggable=true;li.dataset.w=w;
      li.innerHTML=`<span style="cursor:grab">☰</span><label><input type="checkbox" ${hiddenW().includes(w)?'':'checked'}> ${WIDGETS[w]}</label>`;
      li.querySelector('input').onchange=e=>{let h=hiddenW().filter(x=>x!==w);if(!e.target.checked)h.push(w);save('dashHidden',h);applyWidgets()};
      li.ondragstart=()=>{drag=w;li.classList.add('dragging')};li.ondragend=()=>li.classList.remove('dragging');
      li.ondragover=e=>e.preventDefault();
      li.ondrop=e=>{e.preventDefault();const o=widgetOrder().filter(x=>x!==drag);o.splice(o.indexOf(w),0,drag);save('dashOrder',o);applyWidgets();drawWidgetList()};
      ul.append(li)})};
  drawWidgetList();applyWidgets()},
show(){refreshTodoViews();drawWeather();drawBrief();moodTint();
  const bills=typeof billsDueSoon==='function'?billsDueSoon(7):[];
  $('dBills').innerHTML=bills.length?bills.map(b=>`<li><span class="${b.days<=1?'overdue':'soon'}">${esc(b.name)}</span> ${money(b.amt)}<span class="muted" style="margin-left:auto">${b.when}</span></li>`).join(''):'<li class="muted">Nothing due.</li>';
  const hb=load('habits',[]);$('dHabits').innerHTML='';
  if(!hb.length)$('dHabits').innerHTML='<li class="muted">No habits yet (Habits tab).</li>';
  hb.forEach(h=>{const li=document.createElement('li');li.innerHTML=`<label><input type="checkbox" ${h.days[isoDay()]?'checked':''}> ${esc(h.name)}</label>`;
    li.querySelector('input').onchange=e=>{toggleHabitDay(h.id,isoDay(),e.target.checked)};$('dHabits').append(li)});
  drawChallenge();drawPet();
  $('dRecent').innerHTML=load('recent',[]).filter(id=>id!=='dash'&&toolById(id)).slice(0,5).map(id=>`<button class="g" data-go="${id}">${esc(toolById(id).name)}</button>`).join('')||'<span class="muted">Nothing yet.</span>';
  $('dRecent').querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>showTool(b.dataset.go));
  const n=typeof cardsDueCount==='function'?cardsDueCount():0;$('dCards').textContent=n?`${n} card${n>1?'s':''} due today.`:'Nothing due. Nice!'},
search(q){return todos.filter(t=>t.t.toLowerCase().includes(q)).map(t=>({text:'To-do: '+t.t,go:()=>showTool('dash')}))}});
// ---------- daily challenge ----------
const todayIs=ts=>ts&&isoDay(new Date(ts))===isoDay();
const CHALLENGES=[
  ['Finish 3 to-dos today',()=>stat('todosDone_'+isoDay())>=3],
  ['Do one Pomodoro',()=>stat('pomos_'+isoDay())>=1],
  ['Review 10 flashcards',()=>(load('reviewLog',{})[isoDay()]?.n||0)>=10],
  ['Tick every habit today',()=>{const h=load('habits',[]);return h.length&&h.every(x=>x.days[isoDay()])}],
  ['Log something you spent today',()=>load('expenses',[]).some(x=>x.d===isoDay())],
  ['Write a note',()=>load('notes',[]).some(n=>todayIs(n.at))],
  ['Save a useful link',()=>load('links',[]).some(l=>todayIs(l.at))],
  ['Add 2 things to Done today',()=>load('wins',[]).filter(w=>w.day===isoDay()).length>=2],
  ['Clear every overdue to-do',()=>!todos.some(t=>!t.d&&t.due&&t.due<isoDay())&&todos.some(t=>t.d&&todayIs(t.doneAt))]];
function todaysChallenge(){const k=isoDay().split('').reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,7);return CHALLENGES[k%CHALLENGES.length]}
function drawChallenge(){const[name,test]=todaysChallenge();let ok=false;try{ok=!!test()}catch{}
  const done=load('challengeDone',{});if(ok&&!done[isoDay()]){done[isoDay()]=1;save('challengeDone',done);bump('challenges');toast('🎯 Daily challenge complete!')}
  $('dChal').innerHTML=`${ok?'✅':'🎯'} <b>${esc(name)}</b><br><span class="muted" style="font-size:13px">${ok?'Done! Come back tomorrow for a new one.':'A new challenge every day.'} · ${Object.keys(done).length} completed so far</span>`}

// ---------- pet: grows with everything you finish ----------
const PET_STAGES=[[0,'🥚','Egg'],[10,'🐣','Hatchling'],[30,'🐥','Chick'],[70,'🐤','Young bird'],[150,'🐔','Grown up'],[300,'🦚','Peacock'],[600,'🐉','Dragon']];
function petXp(){const habitTicks=load('habits',[]).reduce((s,h)=>s+Object.keys(h.days).length,0);
  return stat('todosDone')+stat('reviews')+habitTicks+stat('pomos')*3+stat('challenges')*5}
function drawPet(){const xp=petXp();let i=PET_STAGES.length-1;while(PET_STAGES[i][0]>xp)i--;const[,face,stage]=PET_STAGES[i],next=PET_STAGES[i+1];
  const today=stat('todosDone_'+isoDay())+stat('pomos_'+isoDay())+(load('reviewLog',{})[isoDay()]?.n?1:0)+load('habits',[]).filter(h=>h.days[isoDay()]).length;
  const mood=today===0?'😴 sleepy, so do something!':today<3?'🙂 happy':'🤩 thrilled';
  $('petFace').textContent=face;$('petName').textContent=load('petName','Pip');
  $('petInfo').textContent=`${stage} · ${xp} XP · feeling ${mood}`+(next?` · ${next[0]-xp} XP to grow`:' · fully grown!');
  $('petBar').style.width=next?((xp-PET_STAGES[i][0])/(next[0]-PET_STAGES[i][0])*100)+'%':'100%';
  $('petName').onclick=()=>{const n=prompt('Name your pet:',load('petName','Pip'));if(n&&n.trim()){save('petName',n.trim().slice(0,20));drawPet()}}}

const widgetOrder=()=>{const o=load('dashOrder',[]).filter(w=>WIDGETS[w]);Object.keys(WIDGETS).forEach(w=>o.includes(w)||o.push(w));return o};
const hiddenW=()=>load('dashHidden',[]);
function applyWidgets(){const g=$('dGrid');widgetOrder().forEach(w=>{const el=g.querySelector(`[data-w="${w}"]`);g.append(el);el.style.display=hiddenW().includes(w)?'none':''})}

command({word:'todo',help:'todo buy milk [tomorrow|2026-10-20]',run(r){
  let due='';const m=r.match(/\s+(today|tomorrow|\d{4}-\d{2}-\d{2})$/i);
  if(m){r=r.slice(0,m.index);due=m[1].toLowerCase()==='today'?isoDay():m[1].toLowerCase()==='tomorrow'?isoDay(new Date(Date.now()+DAY)):m[1]}
  return addTodo(r,due)?`Added to-do "${r}"${due?' due '+due:''}.`:'Type a task after "todo".'}});
command({word:'did',help:'did call grandma  (adds to Done today)',run(r){if(!r.trim())return'Type what you did.';addWin(r);return'Nice, added to Done today.'}});

// ---------- habits ----------
let habits=load('habits',[]);
function saveHabits(){save('habits',habits);if(toolById('habits').sec.classList.contains('on'))drawHabits()}
function toggleHabitDay(id,day,on){habits=load('habits',habits);const h=habits.find(x=>x.id===id);if(!h)return;
  if(on)h.days[day]=true;else delete h.days[day];awardFreezes();saveHabits();if($('brief'))drawBrief()}
// a day counts if it was done or covered by a streak freeze
const kept=(h,iso)=>h.days[iso]||h.frozen?.[iso];
function streak(h){let d=new Date(),n=0;if(!kept(h,isoDay(d)))d=new Date(d-DAY);while(kept(h,isoDay(d))){if(h.days[isoDay(d)])n++;d=new Date(d-DAY)}return n}
// every 7 days of streak earns one freeze (hold at most 2)
function awardFreezes(){let f=load('freezes',0),changed=false;
  habits.forEach(h=>{const m=Math.floor(streak(h)/7);if(!streak(h)&&h.aw){h.aw=0;changed=true}if(m>(h.aw||0)){h.aw=m;changed=true;if(f<2){f++;toast('🧊 You earned a streak freeze for '+h.name+'!')}}});
  save('freezes',f);if(changed)save('habits',habits)}
function canFreeze(h){const y=isoDay(new Date(Date.now()-DAY)),y2=isoDay(new Date(Date.now()-2*DAY));return!kept(h,y)&&kept(h,y2)&&load('freezes',0)>0}
function bestStreak(){return Math.max(0,...load('habits',[]).map(streak))}
function drawHabits(){
  const days=[...Array(7)].map((_,i)=>new Date(Date.now()-(6-i)*DAY));
  $('hTable').innerHTML=habits.length?`<tr><th>Habit</th>${days.map(d=>`<th style="text-align:center">${'SMTWTFS'[d.getDay()]}<br><span class="muted">${d.getDate()}</span></th>`).join('')}<th>Streak</th><th></th></tr>`+
    habits.map((h,i)=>`<tr><td>${esc(h.name)}</td>${days.map(d=>{const iso=isoDay(d),note=h.notes?.[iso];return`<td style="text-align:center"><input type="checkbox" title="${esc(note||'')}" data-h="${h.id}" data-d="${iso}" ${h.days[iso]?'checked':''}>${h.frozen?.[iso]?'🧊':''}${note?'<sup>📝</sup>':''}</td>`}).join('')}<td style="white-space:nowrap">🔥 ${streak(h)}${canFreeze(h)?` <button class="g" data-fz="${h.id}" title="Yesterday was missed. Use a freeze to keep the streak.">🧊 Save streak</button>`:''}</td><td><button class="g" data-note="${h.id}" title="Note for today">📝</button></td><td><button class="x" data-del="${i}">✕</button></td></tr>`).join('')
    :'<tr><td class="muted">No habits yet. Add one above.</td></tr>';
  $('hTable').querySelectorAll('input').forEach(c=>c.onchange=()=>toggleHabitDay(c.dataset.h,c.dataset.d,c.checked));
  $('hTable').querySelectorAll('[data-note]').forEach(b=>b.onclick=()=>{const h=habits.find(x=>x.id===b.dataset.note),t=prompt('Note for today ('+h.name+'):',h.notes?.[isoDay()]||'');
    if(t===null)return;h.notes=h.notes||{};if(t.trim())h.notes[isoDay()]=t.trim();else delete h.notes[isoDay()];saveHabits()});
  $('hTable').querySelectorAll('[data-fz]').forEach(b=>b.onclick=()=>{const h=habits.find(x=>x.id===b.dataset.fz);h.frozen=h.frozen||{};h.frozen[isoDay(new Date(Date.now()-DAY))]=true;save('freezes',load('freezes',0)-1);saveHabits();toast('🧊 Streak saved!')});
  $('hFreezes').textContent=load('freezes',0);
  $('hTable').querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>removeWithUndo(habits,+b.dataset.del,saveHabits,'Habit deleted'))}
tool({id:'habits',name:'Habits',group:'Daily',html:`
<h2>Habit tracker</h2><p class="sub">Tick each day you did it, and press 📝 to add a note for today. Streaks count back from today (or yesterday, if today isn't ticked yet). Every 7-day streak earns a 🧊 freeze (you can hold 2), and a freeze saves a streak after one missed day. Freezes: <b id="hFreezes"></b></p>
<div class="row"><input id="hName" class="grow" placeholder="New habit (e.g. Read 10 pages)"><button class="b" id="hAdd">Add</button></div>
<div style="overflow-x:auto"><table id="hTable"></table></div>`,
init(){$('hAdd').onclick=()=>{const v=$('hName').value.trim();if(!v)return;habits.push({id:uid(),name:v,days:{}});$('hName').value='';saveHabits()};
  $('hName').onkeydown=e=>e.key==='Enter'&&$('hAdd').click()},
show(){habits=load('habits',[]);awardFreezes();drawHabits()},
search(q){return habits.filter(h=>h.name.toLowerCase().includes(q)).map(h=>({text:'Habit: '+h.name,go:()=>showTool('habits')}))}});

// ---------- notes ----------
let notes=load('notes',[]),curNote=null;
const saveNotes=()=>{save('notes',notes);drawNoteList()};
function drawNoteList(){const q=($('nSearch')?.value||'').toLowerCase();
  const list=notes.filter(n=>(n.title+' '+n.body).toLowerCase().includes(q)).sort((a,b)=>(b.pin-a.pin)||(b.at-a.at));
  $('nList').innerHTML='';
  list.forEach(n=>{const li=document.createElement('li');li.style.cursor='pointer';if(n.id===curNote)li.style.fontWeight='600';
    li.innerHTML=`<span>${n.pin?'📌 ':''}${esc(n.title||'Untitled')}<br><span class="muted" style="font-size:12px;font-weight:400">${esc(n.body.slice(0,50))}</span></span>`;
    li.onclick=()=>openNote(n.id);$('nList').append(li)});
  if(!list.length)$('nList').innerHTML='<li class="muted">No notes.</li>'}
function openNote(id){curNote=id;const n=notes.find(x=>x.id===id);$('nEdit').style.display=n?'':'none';
  if(n){$('nTitle').value=n.title;$('nBody').value=n.body;$('nPin').textContent=n.pin?'Unpin':'Pin'}drawNoteList()}
function newNote(body=''){const n={id:uid(),title:'',body,pin:false,at:Date.now()};notes.unshift(n);saveNotes();bump('notes');return n}
tool({id:'notes',name:'Notes',group:'Daily',html:`
<h2>Notes</h2><p class="sub">Quick notes that save as you type. Pin the important ones to the top.</p>
<div class="grid2" style="grid-template-columns:minmax(200px,1fr) 2fr">
 <div><div class="row"><input id="nSearch" class="grow" placeholder="Search notes"><button class="b" id="nNew">New</button></div><ul class="clean" id="nList"></ul></div>
 <div id="nEdit" style="display:none"><input id="nTitle" style="width:100%;font-weight:600" placeholder="Title"><textarea id="nBody" style="min-height:260px;margin-top:8px" placeholder="Write…"></textarea>
  <div class="row"><button class="g" id="nPin">Pin</button><button class="g" id="nToTodo" title="Lines starting with [ ] become to-dos">[ ] → To-do</button><button class="g" id="nDel">Delete</button><span class="muted" id="nSaved"></span></div></div>
</div>`,
init(){
  $('nNew').onclick=()=>{openNote(newNote().id);$('nTitle').focus()};$('nSearch').oninput=drawNoteList;
  const edit=()=>{const n=notes.find(x=>x.id===curNote);if(!n)return;n.title=$('nTitle').value;n.body=$('nBody').value;n.at=Date.now();saveNotes();$('nSaved').textContent='Saved'};
  $('nTitle').oninput=edit;$('nBody').oninput=edit;
  $('nToTodo').onclick=()=>{const n=notes.find(x=>x.id===curNote);if(!n)return;let c=0;
    n.body=n.body.split('\n').map(l=>{const m=l.match(/^(\s*(?:[-*]\s*)?)\[ \]\s+(.+)$/);if(!m)return l;addTodo(m[2]);c++;return m[1]+'[→] '+m[2]}).join('\n');
    $('nBody').value=n.body;saveNotes();toast(c?`Sent ${c} to-do${c>1?'s':''} (marked [→])`:'No lines starting with [ ] found.')};
  $('nPin').onclick=()=>{const n=notes.find(x=>x.id===curNote);n.pin=!n.pin;saveNotes();openNote(n.id)};
  $('nDel').onclick=()=>{removeWithUndo(notes,notes.findIndex(x=>x.id===curNote),()=>{saveNotes();openNote(curNote)},'Note deleted');openNote(null)}},
show(){drawNoteList();if(curNote)openNote(curNote)},
search(q){return notes.filter(n=>(n.title+' '+n.body).toLowerCase().includes(q)).map(n=>({text:'Note: '+(n.title||n.body.slice(0,40)||'Untitled'),go:()=>{showTool('notes');openNote(n.id)}}))}});
command({word:'note',help:'note remember the wifi password is on the fridge',run(r){if(!r.trim())return'Type the note text.';newNote(r.trim());return'Note saved.'}});

// ---------- timers: pomodoro, stopwatch, countdowns ----------
const fmtDur=ms=>{const s=Math.max(0,Math.ceil(ms/1000)),h=Math.floor(s/3600),m=Math.floor(s%3600/60);return(h?h+':'+pad2(m):m)+':'+pad2(s%60)};
function parseDur(s){s=s.trim().toLowerCase();let ms=0,hit=false;s.replace(/(\d+(?:\.\d+)?)\s*(h|m|s)/g,(_,n,u)=>{hit=true;ms+=n*{h:3600e3,m:60e3,s:1e3}[u]});
  if(!hit&&/^\d+(\.\d+)?$/.test(s))ms=s*60e3;return ms}
let pomo=load('pomo',{mode:'work',work:25,brk:5,end:0,left:25*60e3,running:false});
const savePomo=()=>save('pomo',pomo);
function pomoLeft(){return pomo.running?pomo.end-Date.now():pomo.left}
function pomoToggle(){if(pomo.running){pomo.left=pomoLeft();pomo.running=false}else{pomo.end=Date.now()+pomo.left;pomo.running=true}savePomo();tick()}
function pomoSwitch(finished){if(finished&&pomo.mode==='work'){bump('pomos');bump('pomos_'+isoDay());const t=todos.find(x=>x.id===pomo.task);if(t){t.pomos=(t.pomos||0)+1;saveTodos()}}pomo.mode=pomo.mode==='work'?'break':'work';pomo.left=(pomo.mode==='work'?pomo.work:pomo.brk)*60e3;pomo.end=Date.now()+pomo.left;savePomo()}
let timers=load('timers',[]);const saveTimers=()=>{save('timers',timers);drawTimers()};
function addTimer(ms,label){if(!(ms>0))return false;timers.push({id:uid(),label:label||fmtDur(ms)+' timer',dur:ms,end:Date.now()+ms,paused:null,rang:false});saveTimers();return true}
function drawTimers(){const ul=$('cdList');if(!ul)return;ul.innerHTML='';
  timers.forEach((t,i)=>{const li=document.createElement('li');
    li.innerHTML=`<span class="big" style="font-size:22px" data-t="${t.id}"></span><span class="grow">${esc(t.label)}</span><button class="g">${t.paused!==null?'Resume':'Pause'}</button><button class="g">Restart</button><button class="x">✕</button>`;
    const[p,r,x]=li.querySelectorAll('button');
    p.onclick=()=>{if(t.paused!==null){t.end=Date.now()+t.paused;t.paused=null}else t.paused=Math.max(0,t.end-Date.now());saveTimers()};
    r.onclick=()=>{t.end=Date.now()+t.dur;t.paused=null;t.rang=false;saveTimers()};
    x.onclick=()=>removeWithUndo(timers,i,saveTimers,'Timer removed');ul.append(li)});
  if(!timers.length)ul.innerHTML='<li class="muted">No timers.</li>';tick()}
let sw={start:0,acc:0,running:false,laps:[]};
const swTime=()=>sw.acc+(sw.running?Date.now()-sw.start:0);
function tick(){
  if(pomo.running&&pomoLeft()<=0){beep(4);pomoSwitch(true);toast(pomo.mode==='work'?'Break over. Back to work!':'Pomodoro done! Take a break.')}
  const pt=fmtDur(pomoLeft()),pl=pomo.mode==='work'?'Focus':'Break';
  document.querySelectorAll('.pomoTime').forEach(e=>e.textContent=pt);document.querySelectorAll('.pomoMode').forEach(e=>e.textContent=pl);
  document.querySelectorAll('.pomoGo').forEach(e=>e.textContent=pomo.running?'Pause':'Start');
  if($('swTime'))$('swTime').textContent=fmtDur(swTime()).replace(/$/,'.'+Math.floor(swTime()%1000/100));
  timers.forEach(t=>{const left=t.paused!==null?t.paused:t.end-Date.now();
    if(left<=0&&!t.rang&&t.paused===null){t.rang=true;save('timers',timers);beep(5);toast('⏰ '+t.label+' is done!')}
    const el=document.querySelector(`[data-t="${t.id}"]`);if(el){el.textContent=left<=0?'Done!':fmtDur(left);el.style.color=left<=0?'var(--bad)':''}});
  document.title=pomo.running?`${pt} ${pl} · Toolbox`:'Useful Toolbox'}
setInterval(tick,250);
tool({id:'timers',name:'Timers',group:'Daily',html:`
<h2>Timers</h2><p class="sub">A Pomodoro focus timer, a stopwatch and as many countdowns as you like. Each one chimes when it finishes.</p>
<div class="grid3">
 <div class="box"><b>Pomodoro · <span class="pomoMode"></span></b><div class="big pomoTime" style="font-size:44px"></div>
  <div class="row"><button class="b pomoGo"></button><button class="g" id="pSkip">Skip</button><button class="g" id="pReset">Reset</button></div>
  <div class="row muted" style="font-size:13px">Work <input id="pWork" type="number" min="1" style="width:60px"> min · Break <input id="pBrk" type="number" min="1" style="width:60px"> min</div>
  <div class="row" style="font-size:13px">Working on <select id="pTask" class="grow"></select></div>
  <div class="muted" style="font-size:13px">Pomodoros finished: <span id="pCount"></span></div></div>
 <div class="box"><b>Stopwatch</b><div class="big" id="swTime"></div>
  <div class="row"><button class="b" id="swGo">Start</button><button class="g" id="swLap">Lap</button><button class="g" id="swReset">Reset</button></div><ol id="swLaps" style="margin:0;padding-left:20px;max-height:140px;overflow:auto"></ol></div>
 <div class="box"><b>Countdowns</b><div class="row"><input id="cdTime" style="width:90px" placeholder="10m"><input id="cdLabel" class="grow" placeholder="Label (tea, laundry…)"><button class="b" id="cdAdd">Add</button></div>
  <div class="muted" style="font-size:12px">Times like 10m, 90s, 1h30m, or a plain number of minutes.</div><div class="row" id="cdPresets"></div><ul class="clean" id="cdList"></ul></div>
</div>`,
init(){
  document.querySelectorAll('.pomoGo').forEach(b=>b.onclick=pomoToggle);
  $('pSkip').onclick=()=>{const r=pomo.running;pomoSwitch(false);if(!r){pomo.running=false;}savePomo();tick()};
  $('pReset').onclick=()=>{pomo.mode='work';pomo.running=false;pomo.left=pomo.work*60e3;savePomo();tick()};
  $('pWork').value=pomo.work;$('pBrk').value=pomo.brk;
  $('pWork').onchange=()=>{pomo.work=Math.max(1,+$('pWork').value||25);if(!pomo.running&&pomo.mode==='work')pomo.left=pomo.work*60e3;savePomo();tick()};
  $('pBrk').onchange=()=>{pomo.brk=Math.max(1,+$('pBrk').value||5);if(!pomo.running&&pomo.mode==='break')pomo.left=pomo.brk*60e3;savePomo();tick()};
  $('swGo').onclick=()=>{if(sw.running){sw.acc=swTime();sw.running=false}else{sw.start=Date.now();sw.running=true}$('swGo').textContent=sw.running?'Stop':'Start'};
  $('swLap').onclick=()=>{if(!swTime())return;sw.laps.push(swTime());$('swLaps').innerHTML=sw.laps.map((l,i)=>`<li>${fmtDur(l)} <span class="muted">(+${fmtDur(l-(sw.laps[i-1]||0))})</span></li>`).join('')};
  $('swReset').onclick=()=>{sw={start:0,acc:0,running:false,laps:[]};$('swLaps').innerHTML='';$('swGo').textContent='Start'};
  const add=()=>{if(addTimer(parseDur($('cdTime').value),$('cdLabel').value.trim())){$('cdTime').value=$('cdLabel').value=''}else toast('Type a time like 10m')};
  $('cdAdd').onclick=add;
  $('pTask').onchange=()=>{pomo.task=$('pTask').value;savePomo()};
  const PRESETS=[['🍵 Tea','3m'],['🥚 Eggs','9m'],['🍝 Pasta','10m'],['😴 Nap','20m'],['🧺 Laundry','45m'],['🍕 Oven','25m']];
  $('cdPresets').innerHTML=PRESETS.map(([n,t])=>`<button class="g" data-t="${t}" data-n="${n}">${n} ${t}</button>`).join('');
  $('cdPresets').querySelectorAll('button').forEach(b=>b.onclick=()=>addTimer(parseDur(b.dataset.t),b.dataset.n));$('cdLabel').onkeydown=$('cdTime').onkeydown=e=>e.key==='Enter'&&add();drawTimers()},
show(){$('pCount').textContent=stat('pomos');drawTimers();
  $('pTask').innerHTML='<option value="">(no task)</option>'+todos.filter(t=>!t.d).map(t=>`<option value="${t.id}">${esc(t.t)}${t.pomos?' 🍅'+t.pomos:''}</option>`).join('');$('pTask').value=pomo.task||''}});
command({word:'timer',help:'timer 10m tea',run(r){const m=r.trim().match(/^(\S+)\s*(.*)$/);if(!m)return'Try: timer 10m tea';
  return addTimer(parseDur(m[1]),m[2])?`Timer set for ${fmtDur(parseDur(m[1]))}.`:'Try: timer 10m tea'}});
command({word:'pomo',help:'pomo  (start or pause the Pomodoro)',run(){pomoToggle();return pomo.running?'Pomodoro running.':'Pomodoro paused.'}});

// ---------- calendar ----------
let calMonth=new Date();calMonth.setDate(1);
// .ics import: one-off events go on the calendar, yearly ones become birthdays (skipping ones already there)
function importIcs(text){const lines=text.replace(/\r?\n[ \t]/g,'').split(/\r?\n/),out={events:0,bdays:0};let ev=null;
  const events=load('events',[]),bdays=load('birthdays',[]),unesc=s=>s.replace(/\\n/gi,' ').replace(/\\([,;\\])/g,'$1');
  for(const l of lines){if(l==='BEGIN:VEVENT')ev={};else if(l==='END:VEVENT'&&ev){const m=(ev.start||'').match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?/);
      if(m&&ev.name){const date=`${m[1]}-${m[2]}-${m[3]}`;
        if(/FREQ=YEARLY/.test(ev.rrule||'')){if(!bdays.some(b=>b.name===ev.name&&b.m===+m[2]&&b.d===+m[3])){bdays.push({id:uid(),name:ev.name.replace(/(’s|'s)? birthday$/i,''),m:+m[2],d:+m[3],y:null});out.bdays++}}
        else if(!events.some(e=>e.date===date&&e.name===ev.name)){events.push({id:uid(),date,name:ev.name.slice(0,80),time:m[4]?m[4]+':'+m[5]:''});out.events++}}ev=null}
    else if(ev){const i=l.indexOf(':'),k=l.slice(0,i).split(';')[0],v=l.slice(i+1);if(k==='SUMMARY')ev.name=unesc(v).trim();if(k==='DTSTART')ev.start=v;if(k==='RRULE')ev.rrule=v}}
  save('events',events.slice(-2000));save('birthdays',bdays);return out}
function drawCalendar(){
  const y=calMonth.getFullYear(),m=calMonth.getMonth(),first=new Date(y,m,1),start=new Date(y,m,1-first.getDay());
  $('calTitle').textContent=first.toLocaleDateString(undefined,{month:'long',year:'numeric'});
  const cards=load('cards',[]),bills=load('bills',[]),today=isoDay(),todayN=dayNum();
  let html='SMTWTFS'.split('').map((d,i)=>`<div class="hd">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][i]}</div>`).join('');
  for(let i=0;i<42;i++){const d=new Date(start.getFullYear(),start.getMonth(),start.getDate()+i),iso=isoDay(d),items=[];
    todos.filter(t=>t.due===iso).forEach(t=>items.push(`<div draggable="true" data-todo="${t.id}" style="cursor:grab" class="${t.d?'done':todoClass(t)}">• ${esc(t.t)}</div>`));
    load('countdowns',[]).filter(c=>c.date===iso).forEach(c=>items.push(`<div>⏳ ${esc(c.name)}</div>`));
    load('birthdays',[]).filter(b=>b.m===d.getMonth()+1&&b.d===d.getDate()).forEach(b=>items.push(`<div>🎂 ${esc(b.name)}</div>`));
    load('events',[]).filter(e=>e.date===iso).forEach(e=>items.push(`<div title="${esc(e.time||'')}">📅 ${esc(e.name)}</div>`));
    const last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
    bills.filter(b=>Math.min(b.day,last)===d.getDate()).forEach(b=>items.push(`<div>💸 ${esc(b.name)}</div>`));
    const dn=dayNum(d),nc=cards.filter(c=>dn===todayN?c.due<=dn:c.due===dn).length;if(nc&&dn>=todayN)items.push(`<div>🃏 ${nc} card${nc>1?'s':''}</div>`);
    html+=`<div data-day="${iso}" class="${iso===today?'today':''} ${d.getMonth()!==m?'other':''}"><b>${d.getDate()}</b>${items.join('')}</div>`}
  $('calGrid').innerHTML=html;
  $('calGrid').querySelectorAll('[data-todo]').forEach(el=>el.ondragstart=e=>e.dataTransfer.setData('text/plain','todo:'+el.dataset.todo));
  $('calGrid').querySelectorAll('[data-day]').forEach(c=>{c.ondragover=e=>{e.preventDefault();c.style.background='var(--bg)'};c.ondragleave=()=>c.style.background='';
    c.ondrop=e=>{e.preventDefault();c.style.background='';const id=e.dataTransfer.getData('text/plain').replace(/^todo:/,''),t=todos.find(x=>x.id===id);
      if(t){t.due=c.dataset.day;saveTodos();drawCalendar();toast('Moved to '+c.dataset.day)}}})}
tool({id:'calendar',name:'Calendar',group:'Daily',html:`
<div class="row"><h2 style="margin-right:auto">Calendar</h2><button class="g" id="calPrev">‹</button><b id="calTitle"></b><button class="g" id="calNext">›</button><button class="g" id="calToday">Today</button></div>
<p class="sub">Shows to-dos with due dates (•), bills (💸), flashcard reviews (🃏), countdowns (⏳), birthdays (🎂) and imported events (📅). Drag a to-do to another day to move it.</p>
<div class="cal" id="calGrid"></div>
<div class="row" style="margin-top:8px"><label class="g" style="cursor:pointer">📥 Import a calendar (.ics)<input type="file" id="calIcs" accept=".ics,text/calendar" hidden></label><span class="muted" id="calIcsMsg" style="font-size:13px">From Google Calendar: Settings → Import &amp; export → Export. Yearly events become birthdays.</span><button class="x" id="calClear" title="Remove imported events">Clear imported</button></div>`,
init(){$('calIcs').onchange=async()=>{const f=$('calIcs').files[0];if(!f)return;const r=importIcs(await f.text());$('calIcs').value='';
    $('calIcsMsg').textContent=`Imported ${r.events} event${r.events===1?'':'s'} and ${r.bdays} birthday${r.bdays===1?'':'s'}.`;drawCalendar()};
  $('calClear').onclick=()=>{const ev=load('events',[]);if(!ev.length)return toast('No imported events.');save('events',[]);drawCalendar();toast('Removed imported events',()=>{save('events',ev);drawCalendar()})};$('calPrev').onclick=()=>{calMonth.setMonth(calMonth.getMonth()-1);drawCalendar()};$('calNext').onclick=()=>{calMonth.setMonth(calMonth.getMonth()+1);drawCalendar()};
  $('calToday').onclick=()=>{calMonth=new Date();calMonth.setDate(1);drawCalendar()}},
show(){todos=load('todos',todos);drawCalendar()}});

// ---------- focus mode ----------
function enterFocus(){const f=$('focus');
  f.innerHTML=`<div style="max-width:520px;width:100%"><div class="row"><h2 style="margin-right:auto">Focus</h2><button class="g" id="focusExit">Exit focus (Esc)</button></div>
  <div class="box" style="text-align:center"><div class="pomoMode muted"></div><div class="big pomoTime" style="font-size:72px"></div><button class="b pomoGo"></button></div>
  <div class="box" style="margin-top:12px"><b>Today's to-dos</b><ul class="clean" id="focusTodos"></ul>
  <div class="row"><input id="focusIn" class="grow" placeholder="Add a task"><button class="g" id="focusAdd">Add</button></div></div></div>`;
  f.classList.add('on');f.querySelector('.pomoGo').onclick=pomoToggle;$('focusExit').onclick=exitFocus;
  const add=()=>{if(addTodo($('focusIn').value))$('focusIn').value=''};$('focusAdd').onclick=add;$('focusIn').onkeydown=e=>e.key==='Enter'&&add();
  refreshTodoViews();tick();bump('focusSessions')}
function exitFocus(){$('focus').classList.remove('on');$('focus').innerHTML='';refreshTodoViews()}
command({word:'focus',help:'focus  (hide everything but the timer and to-dos)',run(){enterFocus();return''}});
