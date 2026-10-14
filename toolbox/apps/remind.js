// Reminders as real system notifications (Chromebook, Windows, Android) while The ToolBox is open,
// even in the background: habits, bills, birthdays, finished timers, flashcards due, water, budget limits.
// Notifications can be snoozed for an hour, bills marked paid, and every one is kept in a short history.
var REMIND={
  ICON:new URL('../icon-192.png',document.currentScript.src).href,
  get(k,d){try{const v=localStorage.getItem('tb_'+k);return v?JSON.parse(v):d}catch{return d}},
  set(k,v){try{localStorage.setItem('tb_'+k,JSON.stringify(v))}catch{}},
  cfg(){return Object.assign({on:false,habitTime:'20:00',smart:false,bills:true,billsEarly:false,birthdays:true,timers:true,cards:true,water:false,budget:true,quietFrom:'',quietTo:'',voice:false},REMIND.get('reminders',{}))},
  ok(){return 'Notification' in window&&Notification.permission==='granted'&&REMIND.cfg().on},
  hm(d=new Date()){return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')},
  // quiet hours (may wrap past midnight) and family school hours hold reminders back
  quiet(){const c=REMIND.cfg(),t=REMIND.hm();if(c.quietFrom&&c.quietTo&&(c.quietFrom<c.quietTo?t>=c.quietFrom&&t<c.quietTo:t>=c.quietFrom||t<c.quietTo))return true;
    try{return !!(window.FAM&&FAM.schoolNow(FAM.rules()))}catch{return false}},
  async show(title,body,tag,actions){if(!REMIND.ok())return false;if(REMIND.quiet()&&tag!=='test')return false;
    const o={body,tag,icon:REMIND.ICON,badge:REMIND.ICON,data:{title,body,tag},actions:actions||[{action:'snooze',title:'⏰ In 1 hour'}]};
    const log=REMIND.get('remindLog',[]);log.unshift({t:Date.now(),title,body});REMIND.set('remindLog',log.slice(0,30));
    if(REMIND.cfg().voice&&'speechSynthesis' in window)try{speechSynthesis.speak(new SpeechSynthesisUtterance(title.replace(/\p{Extended_Pictographic}/gu,'')+'. '+body))}catch{}
    try{const reg=navigator.serviceWorker&&await navigator.serviceWorker.getRegistration();if(reg){await reg.showNotification(title,o);return true}}catch{}
    try{const{actions:_,...plain}=o;new Notification(title,plain)}catch{}return true},
  day(d=new Date()){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')},
  once(key,fn){const f=REMIND.get('remindFired',{}),k=REMIND.day()+':'+key;if(f[k]||REMIND.quiet())return;
    Promise.resolve(fn()).then(shown=>{if(shown===false)return;const g=REMIND.get('remindFired',{});g[k]=1;REMIND.set('remindFired',Object.fromEntries(Object.keys(g).filter(x=>x>=REMIND.day()).map(x=>[x,1])))})},
  // learn when habits usually get ticked: remember the time each new tick shows up
  learn(){const today=REMIND.day(),n=REMIND.get('habits',[]).filter(h=>(h.days||{})[today]).length,s=REMIND.get('habitSeen',{d:'',n:0});
    if(s.d===today&&n>s.n){const hrs=REMIND.get('habitHours',[]);hrs.push(new Date().getHours()*60+new Date().getMinutes());REMIND.set('habitHours',hrs.slice(-30))}
    if(s.d!==today||s.n!==n)REMIND.set('habitSeen',{d:today,n})},
  habitTime(){const c=REMIND.cfg(),h=REMIND.get('habitHours',[]);if(!c.smart||h.length<5)return c.habitTime;
    const m=[...h].sort((a,b)=>a-b)[h.length>>1]-30;return String(Math.max(0,m/60|0)).padStart(2,'0')+':'+String(Math.max(0,m)%60).padStart(2,'0')},
  billsDue(date){const last=new Date(date.getFullYear(),date.getMonth()+1,0).getDate(),mon=REMIND.day(date).slice(0,7);
    return REMIND.get('bills',[]).filter(b=>Math.min(b.day,last)===date.getDate()&&b.paid!==mon)},
  check(){REMIND.learn();if(!REMIND.ok())return;const c=REMIND.cfg(),now=new Date(),hm=REMIND.hm(now),today=REMIND.day();
    // snoozed reminders whose hour is up
    const sn=REMIND.get('snoozed',[]),due=sn.filter(s=>s.at<=Date.now());if(due.length){REMIND.set('snoozed',sn.filter(s=>s.at>Date.now()));due.forEach(s=>REMIND.show(s.title,s.body,s.tag))}
    const ht=REMIND.habitTime();if(c.habitTime&&hm>=ht){const left=REMIND.get('habits',[]).filter(h=>!(h.days||{})[today]);
      if(left.length)REMIND.once('habits',()=>REMIND.show('🔥 Keep your streaks going','Still to do today: '+left.map(h=>h.name).slice(0,4).join(', ')+(left.length>4?'…':''),'habits'))}
    if(c.bills&&now.getHours()>=9){const d=REMIND.billsDue(now);
      if(d.length)REMIND.once('bills',()=>REMIND.show('💸 Bills due today',d.map(b=>b.name+(b.amt?' ('+b.amt+')':'')).join(', '),'bills',[{action:'paid',title:'✓ Mark paid'},{action:'snooze',title:'⏰ In 1 hour'}]));
      if(c.billsEarly){const t=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1),e=REMIND.billsDue(t);
        if(e.length)REMIND.once('billsEarly',()=>REMIND.show('💸 Bills due tomorrow',e.map(b=>b.name+(b.amt?' ('+b.amt+')':'')).join(', '),'billsEarly'))}}
    if(c.birthdays&&now.getHours()>=8){const bd=REMIND.get('birthdays',[]).filter(b=>b.m===now.getMonth()+1&&b.d===now.getDate());
      if(bd.length)REMIND.once('birthdays',()=>REMIND.show('🎂 Birthday today',bd.map(b=>b.name+(b.y?' turns '+(now.getFullYear()-b.y):'')).join(', '),'birthdays'))}
    if(c.cards&&now.getHours()>=16){const dn=Math.round(new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime()/864e5),n=REMIND.get('cards',[]).filter(x=>x.due<=dn).length;
      if(n)REMIND.once('cards',()=>REMIND.show('🃏 Flashcards to review',n+' card'+(n>1?'s are':' is')+' due today. A few minutes keeps them fresh.','cards'))}
    if(c.water&&now.getHours()>=9&&now.getHours()<21&&now.getHours()%2===1)REMIND.once('water'+now.getHours(),()=>REMIND.show('💧 Water break','Have a glass of water.','water'));
    if(c.budget){const lim=REMIND.get('budgetLimits',{}),mon=today.slice(0,7),by={};REMIND.get('expenses',[]).filter(x=>String(x.d).startsWith(mon)).forEach(x=>by[x.cat]=(by[x.cat]||0)+x.amt);
      Object.entries(lim).forEach(([cat,max])=>{if(max>0&&by[cat]>max)REMIND.once('budget:'+mon+':'+cat,()=>REMIND.show('📉 Over budget: '+cat,`You spent ${(by[cat]).toFixed(2)} on ${cat} this month (limit ${(+max).toFixed(2)}).`,'budget'))})}},
  // buttons on a notification (handled by sw.js and passed here)
  act(action,data){if(!data)return;if(action==='snooze'){const s=REMIND.get('snoozed',[]);s.push({at:Date.now()+36e5,title:data.title,body:data.body,tag:data.tag});REMIND.set('snoozed',s)}
    if(action==='paid'){const now=new Date(),mon=REMIND.day(now).slice(0,7),ids=REMIND.billsDue(now).map(b=>b.id),bills=REMIND.get('bills',[]);bills.forEach(b=>{if(ids.includes(b.id))b.paid=mon});REMIND.set('bills',bills)}},
  start(){REMIND.check();setInterval(REMIND.check,60000);
    if(navigator.serviceWorker)navigator.serviceWorker.addEventListener('message',e=>{if(e.data&&e.data.remind)REMIND.act(e.data.remind,e.data.data)});
    const p=new URLSearchParams(location.search).get('remind');if(p){try{REMIND.act(p,JSON.parse(new URLSearchParams(location.search).get('rdata')))}catch{}}},
  open(){const c=REMIND.cfg(),d=document.createElement('dialog');d.className='qrd';d.style.textAlign='left';const ck=(id,on,t)=>`<label><input type="checkbox" id="${id}" ${on?'checked':''}> ${t}</label><br>`;
    d.innerHTML=`<h3 style="margin-top:0">🔔 Reminders</h3><p class="muted" style="font-size:13px">Notifications show up while The ToolBox is open, even in the background. Install the app and keep its window open (minimised is fine).</p>
     ${ck('rOn',c.on,'Turn reminders on')}
     <label><input type="checkbox" id="rHab" ${c.habitTime?'checked':''}> Habits not done by <input type="time" id="rHabT" value="${c.habitTime||'20:00'}"></label><br>
     ${ck('rSmart',c.smart,'Smart time: learn when I usually do my habits')}${ck('rBill',c.bills,'Bills due today')}${ck('rBillE',c.billsEarly,'…and the day before')}
     ${ck('rBd',c.birthdays,'Birthdays today')}${ck('rTim',c.timers,'Timers and focus sessions that finish in the background')}${ck('rCards',c.cards,'Flashcards due (after 4pm)')}
     ${ck('rWater',c.water,'Water breaks every 2 hours (9am–9pm)')}${ck('rBud',c.budget,'Spending over a budget limit (set limits in the Expense tracker)')}${ck('rVoice',c.voice,'Read reminders out loud')}
     <label>Quiet hours: <input type="time" id="rQF" value="${c.quietFrom}"> to <input type="time" id="rQT" value="${c.quietTo}"></label>
     <p class="muted" style="font-size:12px;margin:2px 0 0">Nothing is shown during quiet hours or family school hours.</p>
     <p id="rMsg" class="muted" style="font-size:13px"></p>
     <div class="row"><button class="b" id="rSave">Save</button><select id="rWhich" aria-label="Which test"><option value="test">Test</option><option value="habits">Habits</option><option value="bills">Bills</option><option value="birthdays">Birthday</option><option value="cards">Flashcards</option><option value="water">Water</option></select><button class="g" id="rTest">Send a test</button><button class="g" id="rClose">Close</button></div>
     <details style="margin-top:8px"><summary>Recent reminders</summary><ul class="clean" id="rLog" style="font-size:13px"></ul></details>`;
    document.body.append(d);d.showModal();const q=id=>d.querySelector('#'+id);
    q('rLog').innerHTML=REMIND.get('remindLog',[]).map(l=>`<li><span class="muted">${new Date(l.t).toLocaleString([], {dateStyle:'short',timeStyle:'short'})}</span> ${String(l.title).replace(/[&<>]/g,'')}: ${String(l.body).replace(/[&<>]/g,'')}</li>`).join('')||'<li class="muted">None yet.</li>';
    if(!('Notification' in window))q('rMsg').textContent='This browser can’t show notifications.';
    else if(Notification.permission==='denied')q('rMsg').textContent='Notifications are blocked for this site. Allow them in the site settings (the icon left of the address).';
    const store=async()=>{const on=q('rOn').checked;if(on&&'Notification' in window&&Notification.permission==='default')await Notification.requestPermission();
      REMIND.set('reminders',{on,habitTime:q('rHab').checked?q('rHabT').value:'',smart:q('rSmart').checked,bills:q('rBill').checked,billsEarly:q('rBillE').checked,birthdays:q('rBd').checked,timers:q('rTim').checked,
        cards:q('rCards').checked,water:q('rWater').checked,budget:q('rBud').checked,voice:q('rVoice').checked,quietFrom:q('rQF').value,quietTo:q('rQT').value})};
    const SAMPLE={test:['🔔 Test from The ToolBox','Reminders are working.'],habits:['🔥 Keep your streaks going','Still to do today: (sample) Read'],bills:['💸 Bills due today','(sample) Phone (25)'],
      birthdays:['🎂 Birthday today','(sample) Sam turns 10'],cards:['🃏 Flashcards to review','(sample) 5 cards are due today.'],water:['💧 Water break','Have a glass of water.']};
    q('rSave').onclick=async()=>{await store();d.close();REMIND.check()};
    q('rTest').onclick=async()=>{q('rOn').checked=true;await store();if(Notification.permission==='granted'){const[t,b]=SAMPLE[q('rWhich').value];REMIND.show(t,b,'test')}else q('rMsg').textContent='Permission was not given.'};
    q('rClose').onclick=()=>d.close();d.addEventListener('close',()=>d.remove())}};
// finished timers in the toolbox: also notify when the window is in the background
if(typeof beep==='function'){const b0=beep;beep=function(...a){b0.apply(this,a);if(document.hidden&&REMIND.cfg().timers)REMIND.show('⏰ Time’s up!','A ToolBox timer just finished.','timer')}}
REMIND.start();
