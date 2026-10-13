// More money & study tools: savings goals, subscription audit, loan calculator, grade calculator, typing trainer.

// ---------- savings goals ----------
let savings=load('savings',[]);const saveSavings=()=>{save('savings',savings);drawSavings()};
function drawSavings(){$('svList').innerHTML='';
  savings.forEach((g,i)=>{const pct=Math.min(100,g.saved/g.target*100),div=document.createElement('div');div.className='box';
    const left=g.target-g.saved,weeks=g.due?Math.max(1,Math.ceil((parseIso(g.due)-parseIso(isoDay()))/(7*DAY))):null;
    div.innerHTML=`<div class="row" style="margin:0"><span style="font-size:28px">${pct>=100?'🎉':'🫙'}</span><b class="grow">${esc(g.name)}</b><button class="x">✕</button></div>
      <div class="big" style="font-size:22px">${money(g.saved)} <span class="muted" style="font-size:15px">of ${money(g.target)}</span></div>
      <div style="background:var(--line);border-radius:4px;height:14px;margin:6px 0"><div class="bar" style="height:14px;width:${pct}%;background:${pct>=100?'var(--good)':'var(--accent)'}"></div></div>
      <div class="muted" style="font-size:13px">${pct>=100?'Goal reached!':`${money(left)} to go`}${weeks&&left>0?` · save ${money(left/weeks)} a week to make it by ${g.due}`:''}</div>
      <div class="row"><input type="number" step="0.01" placeholder="Amount" style="width:100px"><button class="b">Add</button><button class="g">Take out</button></div>`;
    const[inp]=div.querySelectorAll('input'),[,add,take]=div.querySelectorAll('button');
    add.onclick=()=>{const v=+inp.value;if(v>0){g.saved+=v;if(g.saved>=g.target&&g.saved-v<g.target)toast('🎉 You reached '+g.name+'!');saveSavings()}};
    take.onclick=()=>{const v=+inp.value;if(v>0){g.saved=Math.max(0,g.saved-v);saveSavings()}};
    div.querySelector('.x').onclick=()=>removeWithUndo(savings,i,saveSavings,'Goal removed');$('svList').append(div)});
  if(!savings.length)$('svList').innerHTML='<p class="muted">No savings goals yet.</p>'}
tool({id:'savings',name:'Savings goals',group:'Money',html:`
<h2>Savings goals</h2><p class="sub">Name it, set a target, and add to the jar as you save. With a date, it shows how much to put away each week.</p>
<div class="row"><input id="svName" class="grow" placeholder="New bike"><input id="svTarget" type="number" step="0.01" placeholder="Target" style="width:110px"><input id="svDue" type="date" title="By when (optional)"><button class="b" id="svAdd">Add</button></div><div class="grid3" id="svList"></div>`,
init(){$('svAdd').onclick=()=>{const n=$('svName').value.trim(),t=+$('svTarget').value;if(!n||!(t>0))return toast('Add a name and a target.');savings.push({id:uid(),name:n,target:t,saved:0,due:$('svDue').value});$('svName').value=$('svTarget').value=$('svDue').value='';saveSavings()}},
show(){savings=load('savings',savings);drawSavings()}});

// ---------- subscription audit ----------
let subs=load('subs',[]);const saveSubs=()=>{save('subs',subs);drawSubs()};
const PER_YEAR={week:52,month:12,year:1};
function drawSubs(){const yearly=s=>s.price*PER_YEAR[s.cycle],tot=subs.reduce((a,s)=>a+yearly(s),0),unused=subs.filter(s=>s.unused).reduce((a,s)=>a+yearly(s),0);
  $('suList').innerHTML='';[...subs].sort((a,b)=>yearly(b)-yearly(a)).forEach(s=>{const li=document.createElement('li');
    li.innerHTML=`<span class="grow ${s.unused?'done':''}"><b>${esc(s.name)}</b> <span class="muted">${money(s.price)} / ${s.cycle}</span></span><b>${money(yearly(s))}/yr</b><label style="font-size:13px"><input type="checkbox" ${s.unused?'checked':''}> Don't use it</label><button class="x">✕</button>`;
    li.querySelector('input').onchange=e=>{s.unused=e.target.checked;saveSubs()};li.querySelector('.x').onclick=()=>removeWithUndo(subs,subs.indexOf(s),saveSubs,'Removed');$('suList').append(li)});
  $('suTotals').innerHTML=subs.length?`<div class="grid3"><div class="box"><div class="muted">Each month</div><div class="big">${money(tot/12)}</div></div><div class="box"><div class="muted">Each year</div><div class="big">${money(tot)}</div></div><div class="box"><div class="muted">Over 5 years 😱</div><div class="big">${money(tot*5)}</div></div></div>`+
    (unused?`<p style="color:var(--good)">Cancelling the ones you don't use saves <b>${money(unused)}</b> a year.</p>`:''):'<p class="muted">Add your subscriptions (streaming, apps, gym, cloud storage…).</p>'}
tool({id:'subs',name:'Subscriptions',group:'Money',html:`
<h2>Subscription audit</h2><p class="sub">List every subscription to see the real yearly cost. Tick "Don't use it" to see what cancelling would save.</p>
<div class="row"><input id="suName" class="grow" placeholder="Netflix"><input id="suPrice" type="number" step="0.01" placeholder="Price" style="width:100px"><select id="suCycle"><option value="month">per month</option><option value="year">per year</option><option value="week">per week</option></select><button class="b" id="suAdd">Add</button></div>
<div id="suTotals"></div><ul class="clean" id="suList"></ul>`,
init(){$('suAdd').onclick=()=>{const n=$('suName').value.trim(),p=+$('suPrice').value;if(!n||!(p>0))return toast('Add a name and a price.');subs.push({id:uid(),name:n,price:p,cycle:$('suCycle').value,unused:false});$('suName').value=$('suPrice').value='';saveSubs()}},
show(){subs=load('subs',subs);drawSubs()}});

// ---------- loan / interest calculator ----------
tool({id:'loan',name:'Loan calculator',group:'Money',html:`
<h2>Loan &amp; interest calculator</h2><p class="sub">Monthly payment, total interest, and how the balance goes down year by year. Paying a little extra each month can save a lot.</p>
<div class="row">Amount <input id="lnAmt" type="number" value="20000" style="width:120px"> Rate <input id="lnRate" type="number" step="0.01" value="6" style="width:80px">% a year · <input id="lnYears" type="number" value="5" style="width:70px"> years · Extra each month <input id="lnExtra" type="number" value="0" style="width:90px"></div>
<div class="grid3" id="lnSum"></div><div style="overflow-x:auto"><table id="lnTable"></table></div>`,
init(){const draw=()=>{const P=+$('lnAmt').value||0,r=(+$('lnRate').value||0)/1200,n=Math.round((+$('lnYears').value||0)*12),extra=+$('lnExtra').value||0;if(!P||!n){$('lnSum').innerHTML='';$('lnTable').innerHTML='';return}
  const pay=r?P*r/(1-(1+r)**-n):P/n;let bal=P,month=0,interest=0;const years=[];let yi=0,yp=0;
  while(bal>0.005&&month<1200){const i=bal*r,p=Math.min(bal,pay+extra-i);interest+=i;yi+=i;yp+=p;bal-=p;month++;if(month%12===0||bal<=0.005){years.push([Math.ceil(month/12),yp,yi,Math.max(0,bal)]);yi=yp=0}}
  const base=pay*n-P;
  $('lnSum').innerHTML=`<div class="box"><div class="muted">Monthly payment</div><div class="big">${money(pay+extra)}</div></div><div class="box"><div class="muted">Total interest</div><div class="big">${money(interest)}</div></div><div class="box"><div class="muted">Paid off in</div><div class="big">${Math.floor(month/12)}y ${month%12}m</div></div>`+
    (extra>0?`<div class="box" style="grid-column:1/-1;color:var(--good)">Paying ${money(extra)} extra saves <b>${money(base-interest)}</b> in interest and finishes <b>${n-month} months</b> sooner.</div>`:'');
  $('lnTable').innerHTML='<tr><th>Year</th><th>Paid off</th><th>Interest</th><th>Still owed</th></tr>'+years.map(([y,p,i,b])=>`<tr><td>${y}</td><td>${money(p)}</td><td>${money(i)}</td><td>${money(b)}</td></tr>`).join('')};
  live(['lnAmt','lnRate','lnYears','lnExtra'],draw);draw()}});

// ---------- grade calculator ----------
tool({id:'grades',name:'Grade calculator',group:'Study',html:`
<h2>Grade calculator</h2><p class="sub">Find your current grade from weighted parts, and the score you need on the final to hit your target.</p>
<div class="box"><b>Your marks so far</b><table id="grRows"></table><button class="g" id="grAddRow">+ Add part</button><div id="grNow" style="margin-top:8px"></div></div>
<div class="box" style="margin-top:12px"><b>What do I need on the final?</b><div class="row">Final is worth <input id="grFinalW" type="number" value="40" style="width:70px">% · I want <input id="grTarget" type="number" value="85" style="width:70px">% overall</div><div id="grNeed" class="big" style="font-size:22px"></div></div>`,
init(){let rows=load('gradeRows',[{n:'Homework',s:90,w:20},{n:'Midterm',s:78,w:40}]);
  const calc=()=>{save('gradeRows',rows);const w=rows.reduce((a,r)=>a+(+r.w||0),0),cur=w?rows.reduce((a,r)=>a+(+r.s||0)*(+r.w||0),0)/w:0;
    $('grNow').innerHTML=w?`Current grade: <b>${cur.toFixed(1)}%</b> <span class="muted">(from ${w}% of the course)</span>`:'';
    const fw=(+$('grFinalW').value||0)/100,tg=+$('grTarget').value||0,need=fw?(tg-cur*(1-fw))/fw:NaN;
    $('grNeed').innerHTML=isNaN(need)?'':need<=0?'<span style="color:var(--good)">You already have it, even with 0 on the final! 🎉</span>':need>100?`<span style="color:var(--bad)">You'd need ${need.toFixed(1)}%, which isn't possible 😬</span>`:`You need <b>${need.toFixed(1)}%</b> on the final`};
  const draw=()=>{$('grRows').innerHTML='<tr><th>Part</th><th>Score %</th><th>Weight %</th><th></th></tr>'+rows.map((r,i)=>`<tr><td><input data-i="${i}" data-k="n" value="${esc(r.n)}" style="width:100%"></td><td><input data-i="${i}" data-k="s" type="number" value="${r.s}" style="width:80px"></td><td><input data-i="${i}" data-k="w" type="number" value="${r.w}" style="width:80px"></td><td><button class="x" data-rm="${i}">✕</button></td></tr>`).join('');
    $('grRows').querySelectorAll('input').forEach(inp=>inp.oninput=()=>{rows[inp.dataset.i][inp.dataset.k]=inp.value;calc()});
    $('grRows').querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>{rows.splice(b.dataset.rm,1);draw()});calc()};
  $('grAddRow').onclick=()=>{rows.push({n:'',s:'',w:''});draw()};live(['grFinalW','grTarget'],calc);draw()}});

// ---------- typing trainer ----------
const TYPING_SAMPLES=['The quick brown fox jumps over the lazy dog while the cat watches from the warm windowsill.','Small daily improvements are the key to staggering long-term results.','Practice does not make perfect; practice makes progress, and progress is what counts.','A journey of a thousand miles begins with a single step taken today.','Typing well is a superpower that saves you hours every single week.'];
tool({id:'typing',name:'Typing trainer',group:'Study',html:`
<h2>Typing trainer</h2><p class="sub">Type the text as fast and accurately as you can. Practice on sample sentences, your own notes, or your flashcards, which is study and typing at once.</p>
<div class="row"><select id="tyFrom"><option value="sample">Sample sentences</option><option value="notes">My notes</option><option value="cards">My flashcards</option></select><button class="b" id="tyNew">New text</button><span id="tyBest" class="muted"></span></div>
<div id="tyText" class="box" style="font-family:ui-monospace,monospace;font-size:19px;line-height:1.7;user-select:none"></div>
<textarea id="tyIn" style="min-height:70px;margin-top:8px;font-family:ui-monospace,monospace;font-size:17px" placeholder="Start typing here. The timer starts with your first key." spellcheck="false" autocomplete="off"></textarea>
<div class="grid3"><div class="box"><div class="muted">Speed</div><div class="big" id="tyWpm">0</div><div class="muted">words / min</div></div><div class="box"><div class="muted">Accuracy</div><div class="big" id="tyAcc">100%</div></div><div class="box"><div class="muted">Time</div><div class="big" id="tyTime">0s</div></div></div>`,
init(){let target='',start=0,errors=0,timer=null,lastLen=0;
  const pick=()=>{const src=$('tyFrom').value;let pool=TYPING_SAMPLES;
    if(src==='notes')pool=load('notes',[]).map(n=>n.body.replace(/\s+/g,' ').trim()).filter(t=>t.length>20).map(t=>t.slice(0,220).replace(/\s\S*$/,''));
    if(src==='cards')pool=[load('cards',[]).sort(()=>Math.random()-.5).slice(0,4).map(c=>`${c.q} ${c.a}.`).join(' ')].filter(t=>t.length>10);
    if(!pool.length){toast('Nothing to practice with there yet. Using samples.');pool=TYPING_SAMPLES}
    target=pool[Math.floor(Math.random()*pool.length)];$('tyIn').value='';$('tyIn').disabled=false;start=0;errors=0;lastLen=0;clearInterval(timer);render();stats()};
  const render=()=>{const typed=$('tyIn').value;$('tyText').innerHTML=[...target].map((c,i)=>{const t=typed[i];
    const st=t===undefined?(i===typed.length?'border-bottom:2px solid var(--accent)':'color:var(--muted)'):t===c?'color:var(--good)':'color:var(--bad);background:color-mix(in srgb,var(--bad) 20%,transparent)';return`<span style="${st}">${esc(c)}</span>`}).join('')};
  const stats=()=>{const secs=start?(Date.now()-start)/1000:0,typed=$('tyIn').value,correct=[...typed].filter((c,i)=>c===target[i]).length;
    $('tyWpm').textContent=secs>1?Math.round(correct/5/(secs/60)):0;$('tyAcc').textContent=typed.length?Math.max(0,Math.round((1-errors/Math.max(typed.length,1))*100))+'%':'100%';$('tyTime').textContent=Math.floor(secs)+'s';
    const best=load('typingBest',0);$('tyBest').textContent=best?`Best: ${best} wpm`:''};
  $('tyIn').oninput=()=>{const v=$('tyIn').value;if(!start&&v){start=Date.now();timer=setInterval(stats,500)}
    if(v.length>lastLen&&v[v.length-1]!==target[v.length-1])errors++;lastLen=v.length;render();stats();
    if(v.length>=target.length){clearInterval(timer);$('tyIn').disabled=true;stats();const w=+$('tyWpm').textContent;bump('typingTests');
      if(w>load('typingBest',0)&&$('tyAcc').textContent.replace('%','')>=90){save('typingBest',w);toast(`🏁 New best: ${w} wpm!`)}else toast(`Done: ${w} wpm, ${$('tyAcc').textContent} accurate`);stats()}};
  $('tyNew').onclick=pick;$('tyFrom').onchange=pick;pick()}});
