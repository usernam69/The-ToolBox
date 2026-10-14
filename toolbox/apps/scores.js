// World top-10 boards with no server of our own: each board is one "retained" message on a free public MQTT relay.
// Posting is opt-in. The board is public and anyone could edit it, so it's for fun, not for prizes.
const WORLD={BROKER:'wss://broker.hivemq.com:8884/mqtt',client:null,ready:null,boards:{},
  lib(){return window.mqtt?Promise.resolve():new Promise((ok,no)=>{const s=document.createElement('script');s.src=new URL('vendor/mqtt.min.js',document.querySelector('script[src$="scores.js"]').src).href;s.onload=ok;s.onerror=no;document.head.append(s)})},
  connect(){if(WORLD.ready)return WORLD.ready;WORLD.ready=WORLD.lib().then(()=>new Promise((ok,no)=>{const c=mqtt.connect(WORLD.BROKER,{clientId:'tbs_'+Math.random().toString(36).slice(2,10),connectTimeout:8000,reconnectPeriod:5000});
    WORLD.client=c;c.on('connect',()=>ok(c));c.on('error',e=>no(e));c.on('message',(t,buf)=>{const id=t.split('/').pop();try{const list=JSON.parse(new TextDecoder().decode(buf));if(Array.isArray(list))WORLD.boards[id]=WORLD.clean(list)}catch{}(WORLD.listeners[id]||[]).forEach(f=>f(WORLD.boards[id]||[]))})}));
    WORLD.ready.catch(()=>{WORLD.ready=null});return WORLD.ready},
  listeners:{},topic:id=>'the-toolbox/v1/scores/'+id,
  clean(list){return list.filter(e=>e&&typeof e.n==='string'&&typeof e.s==='number'&&isFinite(e.s)).map(e=>({n:e.n.replace(/[^\p{L}\p{N} _.\-!]/gu,'').slice(0,16)||'Player',s:e.s,d:String(e.d||'').slice(0,10)})).slice(0,10)},
  async watch(id,fn){(WORLD.listeners[id]=WORLD.listeners[id]||[]).push(fn);const c=await WORLD.connect();c.subscribe(WORLD.topic(id))},
  async post(id,name,score,lower){const c=await WORLD.connect();await new Promise(r=>setTimeout(r,900));// let the retained board arrive first
    const list=(WORLD.boards[id]||[]).filter(e=>e.n!==name||(lower?e.s<score:e.s>score));if(!list.some(e=>e.n===name))list.push({n:name,s:score,d:new Date().toISOString().slice(0,10)});
    list.sort((a,b)=>lower?a.s-b.s:b.s-a.s);const top=WORLD.clean(list);c.publish(WORLD.topic(id),JSON.stringify(top),{retain:true,qos:1});WORLD.boards[id]=top;(WORLD.listeners[id]||[]).forEach(f=>f(top));return top.findIndex(e=>e.n===name)+1}};
// Drop-in panel: worldBoard(container, boardId, {lower, unit, title, getScore})
function worldBoard(el,id,{lower=false,unit='',title='🌍 World top 10',getScore}={}){
  const fmt=v=>lower?v.toFixed(2)+unit:v+unit;
  el.innerHTML=`<details class="box world"><summary><b>${title}</b> <span class="muted" style="font-size:12px">(online, public)</span></summary><ol class="clean wl"><li class="muted">Loading…</li></ol>
   <div class="row"><input class="wn" maxlength="16" placeholder="Nickname" value="${esc(loadTb('worldName',''))}"><button class="g wp">Post my best</button></div>
   <p class="muted" style="font-size:12px;margin:4px 0 0">Only your nickname and score are shared. Don’t use your real name.</p></details>`;
  const draw=list=>{el.querySelector('.wl').innerHTML=list.length?list.map((e,i)=>`<li>${['🥇','🥈','🥉'][i]||(i+1)+'.'} <b>${esc(e.n)}</b> ${fmt(e.s)} <span class="muted" style="font-size:12px">${esc(e.d)}</span></li>`).join(''):'<li class="muted">No scores yet. Be the first!</li>'};
  el.querySelector('details').addEventListener('toggle',function f(){if(!this.open)return;this.removeEventListener('toggle',f);WORLD.watch(id,draw).catch(()=>{el.querySelector('.wl').innerHTML='<li class="muted">Couldn’t reach the score board (offline?).</li>'})});
  el.querySelector('.wp').onclick=async()=>{const n=el.querySelector('.wn').value.trim(),s=getScore();if(!n)return toast('Pick a nickname first.');
    // two capitalised words looks like a real full name: check before it goes on a public board
    if(/^\p{Lu}\p{Ll}+\s+\p{Lu}\p{Ll}+$/u.test(n)&&loadTb('worldName','')!==n&&!confirm(`"${n}" looks like a real name. The board is public. Post it anyway?`))return;if(s==null||!(lower?s>0:s>0))return toast('Play a round first!');
    saveTb('worldName',n);try{const r=await WORLD.post(id,n,s,lower);toast(r?`You’re #${r} in the world!`:'Not in the top 10 this time. Keep going!')}catch{toast('Couldn’t reach the score board.')}}}
