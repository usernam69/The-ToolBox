// Reminders as real system notifications (Chromebook, Windows, Android) while The ToolBox is open,
// even in the background: habits not done by your chosen time, bills due today, birthdays today, and finished timers.
var REMIND={
  ICON:new URL('../icon-192.png',document.currentScript.src).href,
  get(k,d){try{const v=localStorage.getItem('tb_'+k);return v?JSON.parse(v):d}catch{return d}},
  set(k,v){try{localStorage.setItem('tb_'+k,JSON.stringify(v))}catch{}},
  cfg(){return REMIND.get('reminders',{on:false,habitTime:'20:00',bills:true,birthdays:true,timers:true})},
  ok(){return 'Notification' in window&&Notification.permission==='granted'&&REMIND.cfg().on},
  async show(title,body,tag){if(!REMIND.ok())return;const o={body,tag,icon:REMIND.ICON,badge:REMIND.ICON};
    try{const reg=navigator.serviceWorker&&await navigator.serviceWorker.getRegistration();if(reg){await reg.showNotification(title,o);return}}catch{}
    try{new Notification(title,o)}catch{}},
  day(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')},
  once(key,fn){const f=REMIND.get('remindFired',{}),k=REMIND.day()+':'+key;if(f[k])return;f[k]=1;
    REMIND.set('remindFired',Object.fromEntries(Object.keys(f).filter(x=>x>=REMIND.day()).map(x=>[x,1])));fn()},
  check(){if(!REMIND.ok())return;const c=REMIND.cfg(),now=new Date(),hm=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0'),today=REMIND.day();
    if(c.habitTime&&hm>=c.habitTime){const left=REMIND.get('habits',[]).filter(h=>!(h.days||{})[today]);
      if(left.length)REMIND.once('habits',()=>REMIND.show('🔥 Keep your streaks going','Still to do today: '+left.map(h=>h.name).slice(0,4).join(', ')+(left.length>4?'…':''),'habits'))}
    if(c.bills&&now.getHours()>=9){const last=new Date(now.getFullYear(),now.getMonth()+1,0).getDate(),due=REMIND.get('bills',[]).filter(b=>Math.min(b.day,last)===now.getDate());
      if(due.length)REMIND.once('bills',()=>REMIND.show('💸 Bills due today',due.map(b=>b.name+(b.amt?' ('+b.amt+')':'')).join(', '),'bills'))}
    if(c.birthdays&&now.getHours()>=8){const bd=REMIND.get('birthdays',[]).filter(b=>b.m===now.getMonth()+1&&b.d===now.getDate());
      if(bd.length)REMIND.once('birthdays',()=>REMIND.show('🎂 Birthday today',bd.map(b=>b.name+(b.y?' turns '+(now.getFullYear()-b.y):'')).join(', '),'birthdays'))}},
  start(){REMIND.check();setInterval(REMIND.check,60000)},
  open(){const c=REMIND.cfg(),d=document.createElement('dialog');d.className='qrd';d.style.textAlign='left';
    d.innerHTML=`<h3 style="margin-top:0">🔔 Reminders</h3><p class="muted" style="font-size:13px">Notifications show up while The ToolBox is open, even in the background. Install the app and keep its window open (minimised is fine).</p>
     <label><input type="checkbox" id="rOn" ${c.on?'checked':''}> Turn reminders on</label><br>
     <label><input type="checkbox" id="rHab" ${c.habitTime?'checked':''}> Habits not done by <input type="time" id="rHabT" value="${c.habitTime||'20:00'}"></label><br>
     <label><input type="checkbox" id="rBill" ${c.bills?'checked':''}> Bills due today</label><br>
     <label><input type="checkbox" id="rBd" ${c.birthdays?'checked':''}> Birthdays today</label><br>
     <label><input type="checkbox" id="rTim" ${c.timers?'checked':''}> Timers that finish in the background</label>
     <p id="rMsg" class="muted" style="font-size:13px"></p><div class="row"><button class="b" id="rSave">Save</button><button class="g" id="rTest">Send a test</button><button class="g" id="rClose">Close</button></div>`;
    document.body.append(d);d.showModal();const q=id=>d.querySelector('#'+id);
    if(!('Notification' in window))q('rMsg').textContent='This browser can’t show notifications.';
    else if(Notification.permission==='denied')q('rMsg').textContent='Notifications are blocked for this site. Allow them in the site settings (the icon left of the address).';
    const store=async()=>{const on=q('rOn').checked;if(on&&'Notification' in window&&Notification.permission==='default')await Notification.requestPermission();
      REMIND.set('reminders',{on,habitTime:q('rHab').checked?q('rHabT').value:'',bills:q('rBill').checked,birthdays:q('rBd').checked,timers:q('rTim').checked})};
    q('rSave').onclick=async()=>{await store();d.close();REMIND.check()};
    q('rTest').onclick=async()=>{q('rOn').checked=true;await store();if(Notification.permission==='granted')REMIND.show('🔔 Test from The ToolBox','Reminders are working.','test');else q('rMsg').textContent='Permission was not given.'};
    q('rClose').onclick=()=>d.close();d.addEventListener('close',()=>d.remove())}};
// finished timers in the toolbox: also notify when the window is in the background
if(typeof beep==='function'){const b0=beep;beep=function(...a){b0.apply(this,a);if(document.hidden&&REMIND.cfg().timers)REMIND.show('⏰ Time’s up!','A ToolBox timer just finished.','timer')}}
REMIND.start();
