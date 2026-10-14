// Family rules: profiles, time tracking, daily limits, school hours and kiosk mode.
// Loaded by the menu and by every app page. It's a gentle lock for kids, not real security:
// someone who knows developer tools can get around it.
var FAM={
  get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch{return d}},
  set(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}},
  rules(){return FAM.get('menu_family',{limit:0,perApp:{},school:{on:false,days:[1,2,3,4,5],from:'08:00',to:'15:00',block:['games']},kiosk:{on:false,allow:[]},pin:''})},
  today(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')},
  time(){return FAM.get('menu_time',{})},
  usedToday(app){const t=FAM.time()[FAM.today()]||{};return app?(t[app]||0):Object.values(t).reduce((a,b)=>a+b,0)},
  // extra minutes earned today (family quests)
  bonus(){const b=FAM.get('menu_bonus',{});return +b[FAM.today()]||0},
  addBonus(min){const b=FAM.get('menu_bonus',{}),d=FAM.today();FAM.set('menu_bonus',{[d]:(+b[d]||0)+min})},
  unlocked(){return Date.now()<FAM.get('menu_unlockUntil',0)},
  schoolNow(r=FAM.rules()){if(!r.school||!r.school.on)return false;const d=new Date(),hm=String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
    return r.school.days.includes(d.getDay())&&hm>=r.school.from&&hm<r.school.to},
  // why an app is blocked right now, or '' if it's allowed
  why(app,cat){if(!app||app==='family'||FAM.unlocked())return'';const r=FAM.rules();
    if(r.kiosk&&r.kiosk.on&&!r.kiosk.allow.includes(cat==='tools'?'tools':app))return'kiosk';
    if(FAM.schoolNow(r)&&r.school.block.includes(cat))return'school';
    if(r.limit>0&&FAM.usedToday()>=(r.limit+FAM.bonus())*60)return'limit';
    const per=r.perApp&&r.perApp[app];if(per>0&&FAM.usedToday(app)>=per*60)return'applimit';return''},
  async hash(pin){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('toolbox-pin:'+pin));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')},
  async check(pin){const r=FAM.rules();return !r.pin||(await FAM.hash(pin))===r.pin},
  MSG:{kiosk:['🔒','This app isn’t switched on','A grown-up has picked which apps can be used on this device.'],
    school:['🏫','School time','Games are paused during school hours. Try a study tool instead!'],
    limit:['⏰','That’s all for today','You’ve used today’s ToolBox time. See you tomorrow!'],
    applimit:['⏰','Time’s up for this app','You’ve used today’s time for this app. Try something else!']},
  // full-screen notice with a grown-up unlock
  block(reason,menuHref){if(document.getElementById('famBlock'))return;const[e,t,m]=FAM.MSG[reason];const d=document.createElement('div');d.id='famBlock';
    d.style.cssText='position:fixed;inset:0;z-index:9999;background:var(--bg,#fff);color:var(--ink,#111);display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;font-family:system-ui,sans-serif';
    d.innerHTML=`<div style="max-width:420px"><div style="font-size:64px">${e}</div><h2>${t}</h2><p>${m}</p><p><a href="${menuHref}" style="font-size:18px">← Back to the menu</a></p>
      <details style="margin-top:24px"><summary style="cursor:pointer;color:#888">Grown-up unlock</summary><input type="password" inputmode="numeric" placeholder="PIN" id="famPin" style="font-size:18px;padding:6px;margin-top:8px;width:120px"> <button id="famGo" style="font-size:16px;padding:6px 12px">Unlock 30 min</button><div id="famErr" style="color:#c33"></div></details></div>`;
    document.body.append(d);document.querySelectorAll('audio,video').forEach(v=>v.pause());
    d.querySelector('#famGo').onclick=async()=>{if(await FAM.check(d.querySelector('#famPin').value)){FAM.set('menu_unlockUntil',Date.now()+30*6e4);d.remove()}else d.querySelector('#famErr').textContent='Wrong PIN'}},
  // count visible seconds for this app, and re-check the rules every 20 s
  track(app,cat,menuHref){let last=Date.now();setInterval(()=>{const now=Date.now(),dt=Math.min(30,(now-last)/1000);last=now;if(document.hidden||document.getElementById('famBlock'))return;
      const all=FAM.time(),day=FAM.today();all[day]=all[day]||{};all[day][app]=(all[day][app]||0)+dt;
      const keep=Object.keys(all).sort().slice(-60);FAM.set('menu_time',Object.fromEntries(keep.map(k=>[k,all[k]])));
      const w=FAM.why(app,cat);if(w)FAM.block(w,menuHref)},5000)}};
// Profiles: each person's data is swapped in and out of local storage. Keys starting tb_, app_ and menu_ belong to a profile.
Object.assign(FAM,{
  SWAP:['tb_','app_','menu_'],
  current(){return FAM.get('prof__current','Me')},
  list(){const l=FAM.get('prof__list',null);return l&&l.length?l:[FAM.current()]},
  mine(){const o={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(FAM.SWAP.some(p=>k.startsWith(p)))o[k]=localStorage.getItem(k)}return o},
  switchTo(name){const cur=FAM.current();if(name===cur)return true;
    const snap=FAM.mine(),next=FAM.get('prof_'+name,{});
    try{localStorage.setItem('prof_'+cur,JSON.stringify(snap))}catch{alert('Not enough storage space to switch profiles.');return false}
    Object.keys(snap).forEach(k=>localStorage.removeItem(k));
    try{Object.entries(next).forEach(([k,v])=>localStorage.setItem(k,v))}catch{}
    localStorage.removeItem('prof_'+name);FAM.set('prof__current',name);const l=FAM.list();if(!l.includes(name))l.push(name);if(!l.includes(cur))l.unshift(cur);FAM.set('prof__list',l);return true},
  add(name){const l=FAM.list();if(!l.includes(FAM.current()))l.unshift(FAM.current());if(!l.includes(name))l.push(name);FAM.set('prof__list',l)},
  remove(name){if(name===FAM.current())return false;localStorage.removeItem('prof_'+name);FAM.set('prof__list',FAM.list().filter(n=>n!==name));return true}});
