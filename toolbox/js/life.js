// Life: shopping list, meal planner, goals, mood journal, water & sleep, countdowns, birthdays.

// ---------- shopping list ----------
const AISLES={'Fruit & veg':'apple banana orange lemon lime grape berries strawberry tomato potato onion garlic carrot lettuce salad spinach cucumber pepper avocado mushroom broccoli herbs basil parsley ginger',
  'Dairy & eggs':'milk cheese yogurt yoghurt butter cream eggs egg',
  'Bakery':'bread rolls bagel pita tortilla wraps croissant cake',
  'Meat & fish':'chicken beef pork mince turkey fish salmon tuna sausage bacon ham shrimp',
  'Pantry':'pasta rice flour sugar salt oil vinegar beans lentils cereal oats sauce spice spices honey jam peanut nuts coffee tea soup stock',
  'Frozen':'frozen ice peas pizza fries',
  'Drinks':'water juice soda cola wine beer',
  'Household':'soap detergent toilet paper towels tissues sponge bags foil batteries shampoo toothpaste'};
const guessAisle=n=>{const w=n.toLowerCase();for(const[a,list]of Object.entries(AISLES))if(list.split(' ').some(k=>new RegExp('\\b'+k+'(e?s)?\\b').test(w)))return a;return'Other'};
let shop=load('shopping',[]);const saveShop=()=>{save('shopping',shop);drawShop()};
function addShop(names){let n=0;names.map(s=>s.trim()).filter(Boolean).forEach(name=>{if(shop.some(x=>!x.done&&x.name.toLowerCase()===name.toLowerCase()))return;shop.push({id:uid(),name,aisle:guessAisle(name),done:false});n++});save('shopping',shop);if($('shList'))drawShop();return n}
function drawShop(){const by={};shop.forEach(x=>(by[x.aisle]=by[x.aisle]||[]).push(x));
  $('shList').innerHTML=Object.keys(by).sort((a,b)=>(a==='Other')-(b==='Other')||a.localeCompare(b)).map(a=>`<h3>${esc(a)}</h3><ul class="clean">${by[a].sort((x,y)=>x.done-y.done).map(x=>`<li><label class="grow" style="font-size:17px"><input type="checkbox" data-id="${x.id}" ${x.done?'checked':''}> <span class="${x.done?'done':''}">${esc(x.name)}</span></label><select data-aisle="${x.id}" style="font-size:12px;padding:2px">${[...Object.keys(AISLES),'Other'].map(o=>`<option ${o===x.aisle?'selected':''}>${o}</option>`).join('')}</select><button class="x" data-del="${x.id}">✕</button></li>`).join('')}</ul>`).join('')||'<p class="muted">The list is empty.</p>';
  $('shList').querySelectorAll('[data-id]').forEach(c=>c.onchange=()=>{shop.find(x=>x.id===c.dataset.id).done=c.checked;saveShop()});
  $('shList').querySelectorAll('[data-aisle]').forEach(s=>s.onchange=()=>{shop.find(x=>x.id===s.dataset.aisle).aisle=s.value;saveShop()});
  $('shList').querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>removeWithUndo(shop,shop.findIndex(x=>x.id===b.dataset.del),saveShop,'Removed'));
  const left=shop.filter(x=>!x.done).length;$('shCount').textContent=shop.length?`${left} left of ${shop.length}`:''}
tool({id:'shopping',name:'Shopping list',group:'Life',html:`
<h2>Shopping list</h2><p class="sub">Items are grouped by aisle automatically. Change the aisle if it guesses wrong. Add several at once with commas.</p>
<div class="row"><input id="shIn2" class="grow" placeholder="milk, bread, apples"><button class="b" id="shAdd2">Add</button></div>
<div class="row"><b id="shCount" class="grow"></b><button class="g" id="shClear">Clear ticked</button><button class="g" id="shCopyL">Copy as text</button></div><div id="shList"></div>`,
init(){const add=()=>{addShop($('shIn2').value.split(','));$('shIn2').value=''};$('shAdd2').onclick=add;$('shIn2').onkeydown=e=>e.key==='Enter'&&add();
  $('shClear').onclick=()=>{const b=shop;shop=shop.filter(x=>!x.done);saveShop();if(b.length!==shop.length)toast('Cleared',()=>{shop=b;saveShop()})};
  $('shCopyL').onclick=()=>copy(shop.filter(x=>!x.done).map(x=>'☐ '+x.name).join('\n'))},
show(){shop=load('shopping',shop);drawShop()},
search(q){return shop.filter(x=>x.name.toLowerCase().includes(q)).map(x=>({text:'Shopping: '+x.name,go:()=>showTool('shopping')}))}});
command({word:'buy',help:'buy milk, eggs  (shopping list)',run(r){const n=addShop(r.split(','));return n?`Added ${n} to the shopping list.`:'Type what to buy.'}});

// ---------- meal planner ----------
const DAYS=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],MEALS=['Breakfast','Lunch','Dinner'];
tool({id:'meals',name:'Meal planner',group:'Life',html:`
<h2>Meal planner</h2><p class="sub">Plan the week. Write ingredients after a colon, like <code>Tacos: tortillas, mince, salsa</code>, and one click sends them all to the shopping list.</p>
<div style="overflow-x:auto"><table id="mpGrid"></table></div>
<div class="row"><button class="b" id="mpShop">Add ingredients to shopping list</button><button class="g" id="mpClear">Clear week</button></div>`,
init(){let plan=load('meals',{});
  $('mpGrid').innerHTML=`<tr><th></th>${MEALS.map(m=>`<th>${m}</th>`).join('')}</tr>`+DAYS.map(d=>`<tr><td><b>${d}</b></td>${MEALS.map(m=>`<td><input data-k="${d}-${m}" style="width:100%;min-width:150px" value="${esc(plan[d+'-'+m]||'')}"></td>`).join('')}</tr>`).join('');
  $('mpGrid').querySelectorAll('input').forEach(i=>i.oninput=()=>{plan[i.dataset.k]=i.value;save('meals',plan)});
  $('mpShop').onclick=()=>{const ing=Object.values(plan).flatMap(v=>v.includes(':')?v.split(':').slice(1).join(':').split(','):[]);const n=addShop(ing);toast(n?`Added ${n} ingredients to the shopping list`:'No ingredients found. Write them after a colon.')};
  $('mpClear').onclick=()=>{const b={...plan};plan={};save('meals',plan);$('mpGrid').querySelectorAll('input').forEach(i=>i.value='');toast('Week cleared',()=>{plan=b;save('meals',b);$('mpGrid').querySelectorAll('input').forEach(i=>i.value=b[i.dataset.k]||'')})}}});

// ---------- goals ----------
let goals=load('goals',[]);const saveGoals=()=>{save('goals',goals);drawGoals()};
function drawGoals(){$('glList').innerHTML='';
  goals.forEach((g,gi)=>{const done=g.steps.filter(s=>s.d).length,pct=g.steps.length?Math.round(done/g.steps.length*100):0,box=document.createElement('div');box.className='box';box.style.margin='8px 0';
    const days=g.due?Math.round((parseIso(g.due)-parseIso(isoDay()))/DAY):null;
    box.innerHTML=`<div class="row" style="margin:0"><b class="grow" style="font-size:16px">${pct===100?'🏆 ':''}${esc(g.name)}</b>${g.due?`<span class="${days<0&&pct<100?'overdue':'muted'}" style="font-size:13px">${days<0?Math.abs(days)+' days late':days+' days left'}</span>`:''}<button class="x">✕</button></div>
      <div style="background:var(--line);border-radius:4px;margin:6px 0"><div class="bar" style="width:${pct}%;background:${pct===100?'var(--good)':'var(--accent)'}"></div></div><div class="muted" style="font-size:12px">${done}/${g.steps.length} steps · ${pct}%</div>
      <ul class="clean">${g.steps.map((s,si)=>`<li><label class="grow"><input type="checkbox" data-s="${si}" ${s.d?'checked':''}> <span class="${s.d?'done':''}">${esc(s.t)}</span></label><button class="x" data-rs="${si}">✕</button></li>`).join('')}</ul>
      <div class="row"><input class="grow" placeholder="Add a step"><button class="g">Add step</button></div>`;
    box.querySelector('.x').onclick=()=>removeWithUndo(goals,gi,saveGoals,'Goal deleted');
    box.querySelectorAll('[data-s]').forEach(c=>c.onchange=()=>{g.steps[c.dataset.s].d=c.checked;if(g.steps.every(s=>s.d)){bump('goalsDone');toast('🏆 Goal complete: '+g.name)}saveGoals()});
    box.querySelectorAll('[data-rs]').forEach(b=>b.onclick=()=>{g.steps.splice(b.dataset.rs,1);saveGoals()});
    const inp=box.querySelector('.row:last-child input'),add=()=>{if(inp.value.trim()){g.steps.push({t:inp.value.trim(),d:false});saveGoals()}};
    box.querySelector('.row:last-child button').onclick=add;inp.onkeydown=e=>e.key==='Enter'&&add();$('glList').append(box)});
  if(!goals.length)$('glList').innerHTML='<p class="muted">No goals yet.</p>'}
tool({id:'goals',name:'Goals',group:'Life',html:`
<h2>Goal tracker</h2><p class="sub">Break a big goal into small steps and watch the bar fill.</p>
<div class="row"><input id="glName" class="grow" placeholder="Big goal (e.g. Run a 5K)"><input id="glDue" type="date" title="Target date"><button class="b" id="glAdd">Add goal</button></div><div id="glList"></div>`,
init(){$('glAdd').onclick=()=>{const n=$('glName').value.trim();if(!n)return;goals.push({id:uid(),name:n,due:$('glDue').value,steps:[]});$('glName').value=$('glDue').value='';saveGoals()};$('glName').onkeydown=e=>e.key==='Enter'&&$('glAdd').click()},
show(){goals=load('goals',goals);drawGoals()},
search(q){return goals.filter(g=>(g.name+' '+g.steps.map(s=>s.t).join(' ')).toLowerCase().includes(q)).map(g=>({text:'Goal: '+g.name,go:()=>showTool('goals')}))}});

// ---------- mood journal ----------
const MOODS=[[1,'😞','#c23b3b'],[2,'🙁','#e07b39'],[3,'😐','#c9a227'],[4,'🙂','#6fae4f'],[5,'😄','#1f8a4c']];
let moodMonth=new Date();moodMonth.setDate(1);
function drawMood(){const m=load('moods',{}),today=m[isoDay()];
  $('moToday').innerHTML=MOODS.map(([v,e])=>`<button class="g" data-v="${v}" style="font-size:28px;${today?.v===v?'background:var(--accent)':''}">${e}</button>`).join('');
  $('moToday').querySelectorAll('button').forEach(b=>b.onclick=()=>{const all=load('moods',{});all[isoDay()]={...(all[isoDay()]||{}),v:+b.dataset.v};save('moods',all);drawMood()});
  $('moNote').value=today?.note||'';
  const y=moodMonth.getFullYear(),mo=moodMonth.getMonth(),n=new Date(y,mo+1,0).getDate(),first=new Date(y,mo,1).getDay();
  $('moTitle').textContent=moodMonth.toLocaleDateString(undefined,{month:'long',year:'numeric'});
  let html=['S','M','T','W','T','F','S'].map(d=>`<div class="hd">${d}</div>`).join('')+'<div style="border:0"></div>'.repeat(first);const vals=[];
  for(let d=1;d<=n;d++){const iso=`${y}-${pad2(mo+1)}-${pad2(d)}`,e=m[iso],c=e&&MOODS[e.v-1];if(e)vals.push(e.v);
    html+=`<div title="${esc(e?.note||'')}" style="min-height:44px;text-align:center;${c?`background:${c[2]}33;border-color:${c[2]}`:''}"><span class="muted">${d}</span><br>${c?c[1]:''}</div>`}
  $('moGrid').innerHTML=html;$('moAvg').textContent=vals.length?`Average this month: ${(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1)} / 5 ${MOODS[Math.round(vals.reduce((a,b)=>a+b,0)/vals.length)-1][1]} (${vals.length} days logged)`:'No moods logged this month.'}
tool({id:'mood',name:'Mood journal',group:'Life',html:`
<h2>Mood journal</h2><p class="sub">One tap a day. Over time the month fills with color. Hover a day to read its note.</p>
<div class="row" id="moToday"></div><div class="row"><input id="moNote" class="grow" placeholder="Why? (optional note for today)"></div>
<div class="row"><button class="g" id="moPrev">‹</button><b id="moTitle"></b><button class="g" id="moNext">›</button></div><div class="cal" id="moGrid"></div><p id="moAvg" class="muted"></p>`,
init(){$('moNote').oninput=()=>{const all=load('moods',{});all[isoDay()]={...(all[isoDay()]||{}),note:$('moNote').value};save('moods',all)};$('moNote').onchange=drawMood;
  $('moPrev').onclick=()=>{moodMonth.setMonth(moodMonth.getMonth()-1);drawMood()};$('moNext').onclick=()=>{moodMonth.setMonth(moodMonth.getMonth()+1);drawMood()}},
show(){drawMood()}});

// ---------- water & sleep ----------
function healthDay(iso=isoDay()){return load('health',{})[iso]||{water:0,sleep:null}}
function setHealth(patch,iso=isoDay()){const h=load('health',{});h[iso]={...healthDay(iso),...patch};save('health',h)}
function drawHealth(){const t=healthDay(),goal=load('waterGoal',8);
  $('hwCount').textContent=`${t.water} / ${goal}`;$('hwGlasses').textContent='💧'.repeat(Math.min(t.water,20))+'○'.repeat(Math.max(0,goal-t.water));
  $('hsHours').value=t.sleep??'';
  const days=[...Array(14)].map((_,i)=>isoDay(new Date(Date.now()-(13-i)*DAY))),h=load('health',{});
  const chart=(key,max,good)=>days.map(d=>{const v=h[d]?.[key]??0;return`<div style="flex:1;text-align:center;font-size:11px" title="${d}: ${v}"><div style="height:70px;display:flex;align-items:flex-end;justify-content:center"><div class="bar" style="width:70%;height:${Math.min(100,v/max*100)}%;background:${v>=good?'var(--good)':'var(--accent)'}"></div></div>${parseIso(d).getDate()}</div>`}).join('');
  $('hwChart').innerHTML=chart('water',Math.max(goal,...days.map(d=>h[d]?.water||0)),goal);$('hsChart').innerHTML=chart('sleep',12,7);
  const sl=days.map(d=>h[d]?.sleep).filter(v=>v!=null);$('hsAvg').textContent=sl.length?`Average sleep (14 days): ${(sl.reduce((a,b)=>a+b,0)/sl.length).toFixed(1)} h`:''}
tool({id:'health',name:'Water & sleep',group:'Life',html:`
<h2>Water &amp; sleep log</h2><p class="sub">Two numbers a day, with two weeks of trends.</p>
<div class="grid2"><div class="box"><b>Water today</b><div class="big" id="hwCount"></div><div id="hwGlasses" style="font-size:20px;letter-spacing:2px"></div>
 <div class="row"><button class="b" id="hwPlus">+1 glass</button><button class="g" id="hwMinus">−1</button><span class="muted" style="font-size:13px">Goal <input id="hwGoal" type="number" min="1" style="width:60px"></span></div><div id="hwChart" style="display:flex;gap:2px"></div></div>
<div class="box"><b>Sleep last night</b><div class="row"><input id="hsHours" type="number" step="0.5" min="0" max="24" style="width:90px"> hours</div><div id="hsChart" style="display:flex;gap:2px"></div><div id="hsAvg" class="muted"></div></div></div>`,
init(){$('hwPlus').onclick=()=>{setHealth({water:healthDay().water+1});drawHealth()};$('hwMinus').onclick=()=>{setHealth({water:Math.max(0,healthDay().water-1)});drawHealth()};
  $('hwGoal').value=load('waterGoal',8);$('hwGoal').onchange=()=>{save('waterGoal',Math.max(1,+$('hwGoal').value||8));drawHealth()};
  $('hsHours').onchange=()=>{setHealth({sleep:$('hsHours').value===''?null:+$('hsHours').value});drawHealth()}},
show(){drawHealth()}});
command({word:'water',help:'water  (+1 glass)',run(){setHealth({water:healthDay().water+1});return`💧 ${healthDay().water} glasses today.`}});
command({word:'slept',help:'slept 7.5',run(r){const v=+r;if(!(v>=0&&v<=24))return'Try: slept 7.5';setHealth({sleep:v});return`Logged ${v} hours of sleep.`}});

// ---------- countdowns ----------
let countdowns=load('countdowns',[]);const saveCd=()=>{save('countdowns',countdowns);drawCd()};
const daysUntil=iso=>Math.round((parseIso(iso)-parseIso(isoDay()))/DAY);
function drawCd(){const l=[...countdowns].sort((a,b)=>a.date.localeCompare(b.date));$('cdnList').innerHTML='';
  l.forEach(c=>{const d=daysUntil(c.date),div=document.createElement('div');div.className='box';div.style.textAlign='center';
    div.innerHTML=`<div style="font-size:30px">${esc(c.emoji||'⏳')}</div><div class="big">${d>0?d:d===0?'Today!':Math.abs(d)}</div><div class="muted">${d>0?'days until':d===0?'':'days since'}</div><b>${esc(c.name)}</b><div class="muted" style="font-size:12px">${parseIso(c.date).toLocaleDateString(undefined,{weekday:'short',year:'numeric',month:'short',day:'numeric'})}</div><button class="x" style="margin:4px auto 0">✕</button>`;
    div.querySelector('.x').onclick=()=>removeWithUndo(countdowns,countdowns.indexOf(c),saveCd,'Countdown removed');$('cdnList').append(div)});
  if(!l.length)$('cdnList').innerHTML='<p class="muted">No countdowns yet.</p>'}
tool({id:'countdowns',name:'Countdowns',group:'Life',html:`
<h2>Countdowns</h2><p class="sub">Days until trips, exams, holidays, or anything else. They also show on the calendar.</p>
<div class="row"><input id="cdnEmoji" style="width:56px" placeholder="🎉" maxlength="4"><input id="cdnName" class="grow" placeholder="What's happening?"><input id="cdnDate" type="date"><button class="b" id="cdnAdd">Add</button></div><div class="grid3" id="cdnList"></div>`,
init(){$('cdnAdd').onclick=()=>{const n=$('cdnName').value.trim();if(!n||!$('cdnDate').value)return toast('Add a name and a date.');countdowns.push({id:uid(),name:n,date:$('cdnDate').value,emoji:$('cdnEmoji').value.trim()});$('cdnName').value=$('cdnEmoji').value='';saveCd()}},
show(){countdowns=load('countdowns',countdowns);drawCd()},
search(q){return countdowns.filter(c=>c.name.toLowerCase().includes(q)).map(c=>({text:`Countdown: ${c.name} (${c.date})`,go:()=>showTool('countdowns')}))}});
BRIEF_EXTRAS.push(()=>load('countdowns',[]).map(c=>[c,daysUntil(c.date)]).filter(([,d])=>d>=0&&d<=3).map(([c,d])=>d===0?`${c.name} is today!`:`${d} day${d>1?'s':''} until ${c.name}.`));

// ---------- birthdays ----------
let bdays=load('birthdays',[]);const saveBd=()=>{save('birthdays',bdays);drawBd()};
function nextBday(b){const t=parseIso(isoDay());let d=new Date(t.getFullYear(),b.m-1,b.d);if(d<t)d=new Date(t.getFullYear()+1,b.m-1,b.d);return d}
function bdayInfo(b){const d=nextBday(b),days=Math.round((d-parseIso(isoDay()))/DAY);return{d,days,age:b.y?d.getFullYear()-b.y:null}}
function drawBd(){const l=bdays.map(b=>({b,...bdayInfo(b)})).sort((a,b)=>a.days-b.days);$('bdList').innerHTML='';
  l.forEach(({b,d,days,age})=>{const li=document.createElement('li');
    li.innerHTML=`<span style="font-size:22px">${days===0?'🎂':'🎈'}</span><span class="grow"><b class="${days<=7?'soon':''}">${esc(b.name)}</b>${age?` <span class="muted">turns ${age}</span>`:''}<br><span class="muted" style="font-size:13px">${d.toLocaleDateString(undefined,{month:'long',day:'numeric'})} · ${days===0?'today!':days===1?'tomorrow':'in '+days+' days'}</span></span><button class="x">✕</button>`;
    li.querySelector('.x').onclick=()=>removeWithUndo(bdays,bdays.indexOf(b),saveBd,'Removed');$('bdList').append(li)});
  if(!l.length)$('bdList').innerHTML='<li class="muted">No birthdays yet.</li>'}
tool({id:'birthdays',name:'Birthdays',group:'Life',html:`
<h2>Birthday reminders</h2><p class="sub">Birthdays in the next week show up in the dashboard briefing. Add the birth year to see how old they're turning.</p>
<div class="row"><input id="bdName" class="grow" placeholder="Name"><input id="bdDate" type="date" title="Birthday (any year works if you don't know it)"><label><input type="checkbox" id="bdYear" checked> I know the year</label><button class="b" id="bdAdd">Add</button></div><ul class="clean" id="bdList"></ul>`,
init(){$('bdAdd').onclick=()=>{const n=$('bdName').value.trim(),v=$('bdDate').value;if(!n||!v)return toast('Add a name and a date.');const[y,m,d]=v.split('-').map(Number);
  bdays.push({id:uid(),name:n,m,d,y:$('bdYear').checked?y:null});$('bdName').value='';saveBd()}},
show(){bdays=load('birthdays',bdays);drawBd()},
search(q){return bdays.filter(b=>b.name.toLowerCase().includes(q)).map(b=>({text:`Birthday: ${b.name} (${b.m}/${b.d})`,go:()=>showTool('birthdays')}))}});
BRIEF_EXTRAS.push(()=>load('birthdays',[]).map(b=>({b,...bdayInfo(b)})).filter(x=>x.days<=7).sort((a,b)=>a.days-b.days)
  .map(({b,days,age})=>`🎂 ${b.name}'s birthday${age?` (${age})`:''} is ${days===0?'today':days===1?'tomorrow':'in '+days+' days'}.`));
