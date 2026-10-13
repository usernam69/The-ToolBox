// Reviews: weekly review, year in review, time machine (daily snapshots of the dashboard).

const inRange=(iso,a,b)=>iso>=a&&iso<=b;
const tsIso=ts=>ts?isoDay(new Date(ts)):'';
function daysBetween(a,b){const out=[];for(let d=parseIso(a);isoDay(d)<=b;d=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1))out.push(isoDay(d));return out}
// Everything the toolbox knows about a date range [a, b] (inclusive ISO days).
function summarize(a,b){const days=daysBetween(a,b),st=load('stats',{}),log=load('reviewLog',{}),hb=load('habits',[]),health=load('health',{}),moods=load('moods',{});
  const tasks=load('todos',[]).filter(t=>t.d&&inRange(tsIso(t.doneAt),a,b)),wins=load('wins',[]).filter(w=>inRange(w.day,a,b));
  const spent=load('expenses',[]).filter(x=>inRange(x.d,a,b)),byCat={};spent.forEach(x=>byCat[x.cat]=(byCat[x.cat]||0)+x.amt);
  const rv=days.reduce((s,d)=>({n:s.n+(log[d]?.n||0),r:s.r+(log[d]?.r||0)}),{n:0,r:0});
  const habitPct=hb.length?Math.round(days.reduce((s,d)=>s+hb.filter(h=>h.days[d]).length,0)/(hb.length*days.length)*100):null;
  const md=days.map(d=>moods[d]?.v).filter(Boolean),sl=days.map(d=>health[d]?.sleep).filter(v=>v!=null),wt=days.map(d=>health[d]?.water||0);
  const perDay=days.map(d=>({d,n:(st['todosDone_'+d]||0)+(st['pomos_'+d]||0)+(log[d]?.n?1:0)+hb.filter(h=>h.days[d]).length}));
  const best=perDay.reduce((x,y)=>y.n>x.n?y:x,{d:null,n:0});
  return{days,tasks,wins,pomos:days.reduce((s,d)=>s+(st['pomos_'+d]||0),0),reviews:rv,habitPct,spent:spent.reduce((s,x)=>s+x.amt,0),byCat,
    notes:load('notes',[]).filter(n=>inRange(tsIso(n.at),a,b)).length,links:load('links',[]).filter(l=>inRange(tsIso(l.at),a,b)).length,
    mood:md.length?md.reduce((x,y)=>x+y,0)/md.length:null,sleep:sl.length?sl.reduce((x,y)=>x+y,0)/sl.length:null,water:wt.reduce((x,y)=>x+y,0)/days.length,best,
    goalsDone:load('goals',[]).filter(g=>g.steps.length&&g.steps.every(s=>s.d)).length}}
const delta=(now,prev,goodUp=true)=>{if(prev==null||now==null||isNaN(prev))return'';const d=now-prev;if(Math.abs(d)<1e-9)return' <span class="muted">(same)</span>';
  const good=(d>0)===goodUp;return` <span style="color:var(--${good?'good':'bad'})">${d>0?'▲':'▼'} ${Math.abs(d)%1?Math.abs(d).toFixed(1):Math.abs(d)}</span>`};
function statTiles(s,p){const t=(label,val,extra='')=>`<div class="box"><div class="muted" style="font-size:13px">${label}</div><div class="big" style="font-size:26px">${val}</div><div style="font-size:13px">${extra}</div></div>`;
  return`<div class="grid3" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">`+
    t('Tasks done',s.tasks.length+s.wins.length,p?delta(s.tasks.length+s.wins.length,p.tasks.length+p.wins.length):'')+
    t('Pomodoros',s.pomos,p?delta(s.pomos,p.pomos):'')+
    t('Cards reviewed',s.reviews.n,(s.reviews.n?Math.round(s.reviews.r/s.reviews.n*100)+'% right':'')+(p?delta(s.reviews.n,p.reviews.n):''))+
    t('Habits kept',s.habitPct==null?'—':s.habitPct+'%',p&&s.habitPct!=null?delta(s.habitPct,p.habitPct):'')+
    t('Spent',money(s.spent),p?delta(s.spent,p.spent,false):'')+
    t('Mood',s.mood?s.mood.toFixed(1)+' '+MOODS[Math.round(s.mood)-1][1]:'—',p&&s.mood?delta(+s.mood.toFixed(1),p.mood&&+p.mood.toFixed(1)):'')+
    t('Sleep',s.sleep?s.sleep.toFixed(1)+' h':'—',p&&s.sleep?delta(+s.sleep.toFixed(1),p.sleep&&+p.sleep.toFixed(1)):'')+
    t('Notes · links',`${s.notes} · ${s.links}`)+'</div>'}
const catBars=byCat=>{const e=Object.entries(byCat).sort((a,b)=>b[1]-a[1]),mx=Math.max(1,...e.map(x=>x[1]));
  return e.length?`<table>${e.map(([c,v])=>`<tr><td style="width:110px">${esc(c)}</td><td><div class="bar" style="width:${v/mx*100}%"></div></td><td style="text-align:right;width:90px">${money(v)}</td></tr>`).join('')}</table>`:'<p class="muted">No spending logged.</p>'};

// ---------- weekly review ----------
let reviewWeek=0;// 0 = this week, -1 = last week…
function weekRange(off){const t=parseIso(isoDay()),mon=new Date(t.getFullYear(),t.getMonth(),t.getDate()-((t.getDay()+6)%7)+off*7);return[isoDay(mon),isoDay(new Date(mon.getFullYear(),mon.getMonth(),mon.getDate()+6))]}
function drawWeek(){const[a,b]=weekRange(reviewWeek),[pa,pb]=weekRange(reviewWeek-1),s=summarize(a,b),p=summarize(pa,pb);
  $('wrTitle').textContent=`${parseIso(a).toLocaleDateString(undefined,{month:'short',day:'numeric'})} – ${parseIso(b).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}`+(reviewWeek===0?' (this week)':reviewWeek===-1?' (last week)':'');
  $('wrTiles').innerHTML=statTiles(s,p)+'<div class="muted" style="font-size:12px;margin-top:4px">▲▼ compared with the week before.</div>';
  $('wrBest').innerHTML=s.best.n?`🌟 Best day: <b>${parseIso(s.best.d).toLocaleDateString(undefined,{weekday:'long'})}</b>`:'';
  const items=[...s.tasks.map(t=>t.t),...s.wins.map(w=>w.t)];$('wrTasks').innerHTML=items.length?items.map(t=>`<li>✓ ${esc(t)}</li>`).join(''):'<li class="muted">Nothing marked done this week.</li>';
  $('wrMoney').innerHTML=catBars(s.byCat);
  const notes=load('weekNotes',{})[a]||{};$('wrWell').value=notes.well||'';$('wrChange').value=notes.change||'';$('wrNext').value=notes.next||''}
tool({id:'weekly',name:'Weekly review',group:'Daily',html:`
<div class="row"><h2 style="margin-right:auto">Weekly review</h2><button class="g" id="wrPrev">‹</button><b id="wrTitle"></b><button class="g" id="wrNext2">›</button></div>
<p class="sub">Your week in one page, pulled from every tool. Take five minutes on Sunday to look back and plan ahead.</p>
<div id="wrTiles"></div><p id="wrBest"></p>
<div class="grid2"><div><h3>Done this week</h3><ul class="clean" id="wrTasks" style="max-height:260px;overflow:auto"></ul></div><div><h3>Money by category</h3><div id="wrMoney"></div></div></div>
<h3>Reflect</h3><div class="grid3"><div><b>What went well?</b><textarea id="wrWell"></textarea></div><div><b>What would I change?</b><textarea id="wrChange"></textarea></div><div><b>Top 3 for next week</b><textarea id="wrNext" placeholder="One per line. Press the button to send them to your to-dos."></textarea><button class="g" id="wrToTodo">Add these to to-dos</button></div></div>`,
init(){$('wrPrev').onclick=()=>{reviewWeek--;drawWeek()};$('wrNext2').onclick=()=>{if(reviewWeek<0){reviewWeek++;drawWeek()}};
  const saveNotes=()=>{const all=load('weekNotes',{}),[a]=weekRange(reviewWeek);all[a]={well:$('wrWell').value,change:$('wrChange').value,next:$('wrNext').value};save('weekNotes',all)};
  ['wrWell','wrChange','wrNext'].forEach(id=>$(id).oninput=saveNotes);
  $('wrToTodo').onclick=()=>{const[,b]=weekRange(reviewWeek),due=isoDay(new Date(parseIso(b).getTime()+DAY*7));let n=0;$('wrNext').value.split('\n').map(s=>s.replace(/^\s*(\d+[.)]|[-*•])\s*/,'')).forEach(t=>{if(addTodo(t,due,1))n++});toast(n?`Added ${n} high-priority to-do${n>1?'s':''} for next week`:'Write some goals first.')}},
show(){drawWeek()}});

// ---------- year in review ----------
let reviewYear=new Date().getFullYear();
function drawYear(){const y=reviewYear,s=summarize(`${y}-01-01`,`${y}-12-31`>isoDay()?isoDay():`${y}-12-31`);$('yrTitle').textContent=y;
  $('yrTiles').innerHTML=statTiles(s);
  const months=[...Array(12)].map((_,m)=>{const a=`${y}-${pad2(m+1)}-01`,b=isoDay(new Date(y,m+1,0));return a>isoDay()?null:summarize(a,b>isoDay()?isoDay():b)});
  const bars=(fn,label)=>{const v=months.map(m=>m?fn(m):0),mx=Math.max(1,...v);return`<div><b style="font-size:13px">${label}</b><div style="display:flex;gap:3px;height:90px;align-items:flex-end">${v.map((x,i)=>`<div style="flex:1;text-align:center;font-size:10px" title="${x}"><div class="bar" style="height:${x/mx*70}px;min-height:${x?2:0}px"></div>${'JFMAMJJASOND'[i]}</div>`).join('')}</div></div>`};
  $('yrCharts').innerHTML=bars(m=>m.tasks.length+m.wins.length,'Tasks done each month')+bars(m=>m.reviews.n,'Flashcard reviews')+bars(m=>Math.round(m.spent),'Money spent');
  const hb=load('habits',[]).map(h=>[h.name,longestRun(Object.keys(h.days).filter(d=>d.startsWith(y)))]).sort((a,b)=>b[1]-a[1]);
  const topCat=Object.entries(s.byCat).sort((a,b)=>b[1]-a[1])[0],busiest=months.map((m,i)=>[i,m?m.tasks.length+m.wins.length:0]).sort((a,b)=>b[1]-a[1])[0];
  const nDone=s.tasks.length+s.wins.length,focusMin=s.pomos*load('pomo',{work:25}).work;
  const facts=[nDone?`You finished <b>${nDone}</b> thing${nDone===1?'':'s'}.`:'',
    busiest&&busiest[1]?`Your busiest month was <b>${new Date(y,busiest[0]).toLocaleDateString(undefined,{month:'long'})}</b>.`:'',
    hb[0]&&hb[0][1]?`Longest streak: <b>${hb[0][1]} days</b> of ${esc(hb[0][0])} 🔥`:'',
    s.pomos?`<b>${s.pomos}</b> Pomodoro${s.pomos===1?'':'s'}, about <b>${focusMin>=90?Math.round(focusMin/60)+' hours':focusMin+' minutes'}</b> of focus.`:'',
    s.reviews.n?`<b>${s.reviews.n}</b> flashcard reviews, ${Math.round(s.reviews.r/s.reviews.n*100)}% right.`:'',
    topCat?`Most money went to <b>${esc(topCat[0])}</b> (${money(topCat[1])}).`:'',
    s.goalsDone?`<b>${s.goalsDone}</b> goal${s.goalsDone>1?'s':''} completed 🏆`:'',
    `<b>${Object.keys(load('badges',{})).length}</b> achievements unlocked.`].filter(Boolean);
  $('yrFacts').innerHTML=facts.map(f=>`<li>${f}</li>`).join('')}
tool({id:'yearly',name:'Year in review',group:'Daily',html:`
<div class="row"><h2 style="margin-right:auto">Year in review</h2><button class="g" id="yrPrev">‹</button><b id="yrTitle"></b><button class="g" id="yrNext">›</button></div>
<p class="sub">A recap of your year in the toolbox. Some counts (Pomodoros per day, tasks per day) only started recording when this page was added.</p>
<div id="yrTiles"></div><h3>Highlights</h3><ul id="yrFacts" style="line-height:1.9"></ul><div class="grid3" id="yrCharts"></div>`,
init(){$('yrPrev').onclick=()=>{reviewYear--;drawYear()};$('yrNext').onclick=()=>{if(reviewYear<new Date().getFullYear()){reviewYear++;drawYear()}}},show(){drawYear()}});

// ---------- time machine: one snapshot per day ----------
function takeSnapshot(){try{const t=load('todos',[]),today=isoDay(),hb=load('habits',[]),snaps=load('snapshots',{});
  snaps[today]={open:t.filter(x=>!x.d).slice(0,15).map(x=>({t:x.t,due:x.due,p:x.p})),openCount:t.filter(x=>!x.d).length,
    done:[...t.filter(x=>x.d&&tsIso(x.doneAt)===today).map(x=>x.t),...load('wins',[]).filter(w=>w.day===today).map(w=>w.t)],
    habits:hb.map(h=>({n:h.name,ok:!!h.days[today]})),cardsDue:cardsDueCount(),spent:load('expenses',[]).filter(x=>x.d===today).reduce((s,x)=>s+x.amt,0),
    mood:load('moods',{})[today]||null,health:load('health',{})[today]||null,weather:load('lastWeather',null),savedAt:Date.now()};
  const keys=Object.keys(snaps).sort();keys.slice(0,Math.max(0,keys.length-400)).forEach(k=>delete snaps[k]);save('snapshots',snaps)}catch(e){console.warn('snapshot',e)}}
tool({id:'timemachine',name:'Time machine',group:'Daily',html:`
<div class="row"><h2 style="margin-right:auto">Time machine</h2><button class="g" id="tmPrev">‹ Earlier</button><input id="tmDate" type="date"><button class="g" id="tmNext">Later ›</button></div>
<p class="sub">Each day the toolbox saves a snapshot of your dashboard: what was open, what got done, habits, mood and weather. Pick a day to look back. Snapshots start from the day this was added and are kept for 400 days.</p><div id="tmOut"></div>`,
init(){const snaps=()=>load('snapshots',{}),keys=()=>Object.keys(snaps()).sort();
  const go=d=>{const k=keys();if(!k.length)return;const i=d===1?k.findIndex(x=>x>$('tmDate').value):k.map(x=>x<$('tmDate').value).lastIndexOf(true);if(i>=0){$('tmDate').value=k[i];this.draw()}};
  $('tmPrev').onclick=()=>go(-1);$('tmNext').onclick=()=>go(1);$('tmDate').oninput=()=>this.draw();
  this.draw=()=>{const s=snaps()[$('tmDate').value];if(!s){$('tmOut').innerHTML=`<p class="muted">No snapshot for that day. Days with snapshots: ${keys().length}.</p>`;return}
    const w=s.weather;$('tmOut').innerHTML=`<p><b>${parseIso($('tmDate').value).toLocaleDateString(undefined,{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</b>${w?` · ${temp(w.t)} and ${w.desc} in ${esc(w.city.split(',')[0])}`:''}${s.mood?.v?' · mood '+MOODS[s.mood.v-1][1]:''}${s.health?.water?` · 💧${s.health.water}`:''}${s.health?.sleep!=null?` · 😴${s.health.sleep}h`:''}</p>
    <div class="grid3"><div class="box"><b>Done that day (${s.done.length})</b><ul class="clean">${s.done.map(t=>`<li>✓ ${esc(t)}</li>`).join('')||'<li class="muted">Nothing marked done.</li>'}</ul></div>
    <div class="box"><b>Still open (${s.openCount})</b><ul class="clean">${s.open.map(t=>`<li>${PRI_DOT[t.p]||''} ${esc(t.t)}${t.due?` <span class="muted" style="font-size:12px">${t.due}</span>`:''}</li>`).join('')||'<li class="muted">Empty list 🎉</li>'}</ul></div>
    <div class="box"><b>Habits</b><ul class="clean">${s.habits.map(h=>`<li>${h.ok?'✅':'⬜'} ${esc(h.n)}</li>`).join('')||'<li class="muted">No habits then.</li>'}</ul><p class="muted">${s.cardsDue} cards due · ${money(s.spent)} spent</p></div></div>`}},
show(){takeSnapshot();if(!$('tmDate').value)$('tmDate').value=isoDay();this.draw()}});
