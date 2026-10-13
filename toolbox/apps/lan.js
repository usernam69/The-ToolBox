// Connects a page to the home-network server (see toolbox-desktop/lan-server.js).
// - Opened from the desktop app: "Host" starts the server inside the app.
// - Opened by a friend at http://<host-ip>:<port>/apps/…: it's already connected to that host.
const LAN={mode:'lan',base:null,es:null,room:null,name:null,
  servedByHost:()=>location.protocol.startsWith('http'),
  canHost:()=>!!window.toolboxDesktop,
  async host(){const info=await window.toolboxDesktop.startLan();LAN.base=`http://localhost:${info.port}`;return info},
  async probe(){if(LAN.servedByHost()){LAN.base='';try{const r=await fetch('/api/info');if(r.ok)return await r.json()}catch{}LAN.base=null}return null},
  join(room,name,onMsg,onState){if(LAN.mode==='online')return ONLINE.join(room,name,onMsg,onState);LAN.room=room;LAN.name=name;if(LAN.es)LAN.es.close();
    const es=new EventSource(`${LAN.base}/api/events?room=${encodeURIComponent(room)}&name=${encodeURIComponent(name)}`);LAN.es=es;
    es.onmessage=e=>{try{onMsg(JSON.parse(e.data))}catch(err){console.error(err)}};es.onopen=()=>onState&&onState('connected');es.onerror=()=>onState&&onState(es.readyState===2?'closed':'reconnecting')},
  send(obj){if(LAN.mode==='online')return ONLINE.send(obj);return fetch(`${LAN.base}/api/send?room=${encodeURIComponent(LAN.room)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(obj)}).catch(()=>toast('Could not reach the host'))},
  joinUrl(info,page){return info.ips.map(ip=>`http://${ip}:${info.port}/apps/${page}`)}};
// Shared "connect" panel: fills #lanPanel and calls start(room,name) once connected.
async function lanPanel(page,start){const el=$('lanPanel'),saved=loadTb('lanName','');
  const form=(extra)=>`<div class="row"><input id="lpName" placeholder="Your name" maxlength="24" value="${esc(saved)}"><input id="lpRoom" placeholder="Room name" maxlength="40" value="${esc(load('room','friends'))}">${extra}</div>`;
  const go=()=>{const n=$('lpName').value.trim(),r=$('lpRoom').value.trim().toLowerCase();if(!n||!r)return toast('Type a name and a room.');saveTb('lanName',n);save('room',r);start(r,n)};
  const info=await LAN.probe();
  if(info){el.innerHTML=`<p class="sub">You're connected to a host on your home Wi-Fi. Pick a name and a room. Everyone who uses the same room name is together.</p>${form('<button class="b" id="lpGo">Join</button>')}`+onlineBox();$('lpGo').onclick=go;wireOnline(start);return}
  if(LAN.canHost()){el.innerHTML=`<p class="sub">Host a room from this computer, and friends on the same Wi-Fi join from any browser, phone or laptop.</p>${form('<button class="b" id="lpGo">Host &amp; join</button>')}<div id="lpInfo"></div>`+onlineBox();wireOnline(start);
    $('lpGo').onclick=async()=>{try{const i=await LAN.host();$('lpInfo').innerHTML=`<div class="box" style="margin-top:8px"><b>Friends open this address:</b><br>${LAN.joinUrl(i,page).map(u=>`<code style="font-size:16px">${esc(u)}</code> <button class="g" data-u="${esc(u)}">Copy</button>`).join('<br>')}<p class="muted" style="font-size:12px;margin:6px 0 0">If Windows asks about the firewall, allow <b>private networks</b>. Only people on your Wi-Fi can connect, and only while this app is open.</p></div>`;
      $('lpInfo').querySelectorAll('[data-u]').forEach(b=>b.onclick=()=>copy(b.dataset.u));go()}catch(e){toast('Could not start hosting: '+e.message)}};return}
  el.innerHTML=onlineBox()+`<details class="box" style="margin-top:10px"><summary><b>🏠 Home Wi-Fi only</b> (no internet needed)</summary><p class="sub" style="margin:6px 0">Open this in <b>The ToolBox desktop app</b> on Windows and press Host. Friends on the same Wi-Fi join from their browser. You can also run <code>npm run lan</code> in the <code>toolbox-desktop</code> folder.</p></details>${page==='draw.html'?'<p><button class="g" id="lpLocal">Play on this screen instead</button></p>':''}`;wireOnline(start);
  if($('lpLocal'))$('lpLocal').onclick=()=>start(null,null)}

// ---- Online rooms (no PC needed: works on Chromebooks, phones, anywhere) ----
// Messages travel through a free public MQTT relay, but they are encrypted in the browser with a key made
// from the room code (AES-GCM), so the relay and anyone without the code only see scrambled bytes.
const ONLINE={client:null,key:null,topic:null,id:null,name:null,seen:new Map(),onMsg:null,beat:null,
  BROKERS:['wss://broker.hivemq.com:8884/mqtt','wss://broker.emqx.io:8084/mqtt'],
  newCode(){const W='apple bear cloud dragon ember fox ghost honey island jelly koala lemon mango ninja otter panda quartz river storm tiger violet whale yeti zebra'.split(' ');
    const n=crypto.getRandomValues(new Uint32Array(3));return W[n[0]%W.length]+'-'+W[n[1]%W.length]+'-'+(n[2]%900+100)},
  async keys(code,page){const enc=new TextEncoder(),base=await crypto.subtle.importKey('raw',enc.encode(code),'PBKDF2',false,['deriveKey']);
    const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:enc.encode('toolbox-online:'+page),iterations:120000,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
    const t=new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode('topic:'+page+':'+code)));
    return{key,topic:'the-toolbox/v1/'+[...t.slice(0,12)].map(b=>b.toString(16).padStart(2,'0')).join('')}},
  async seal(obj){const iv=crypto.getRandomValues(new Uint8Array(12)),ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},ONLINE.key,new TextEncoder().encode(JSON.stringify(obj))));
    const out=new Uint8Array(12+ct.length);out.set(iv);out.set(ct,12);return out},
  async open(buf){const u=new Uint8Array(buf);return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:u.slice(0,12)},ONLINE.key,u.slice(12))))},
  lib(){return window.mqtt?Promise.resolve():new Promise((ok,no)=>{const sc=document.createElement('script');sc.src=new URL('vendor/mqtt.min.js',document.querySelector('script[src$="lan.js"]').src).href;sc.onload=ok;sc.onerror=no;document.head.append(sc)})},
  members(){return[...ONLINE.seen.entries()].map(([id,m])=>({id,name:m.name})).sort((a,b)=>a.id<b.id?-1:1)},
  async join(code,name,onMsg,onState){try{await ONLINE.lib()}catch{return toast('Could not load the online module.')}
    const page=location.pathname.split('/').pop();Object.assign(ONLINE,await ONLINE.keys(code,page));
    ONLINE.id=Math.random().toString(36).slice(2,9);ONLINE.name=name;ONLINE.onMsg=onMsg;ONLINE.seen.clear();
    // use every relay at once, so players always meet even if one relay is down; each message carries a
    // random 12-byte IV, which doubles as an id to drop the copy that arrives through the second relay
    onMsg({type:'hello',id:ONLINE.id,history:[]});const dupes=new Set();let up=0;
    ONLINE.clients=ONLINE.BROKERS.map((url,bi)=>{const c=mqtt.connect(url,{clientId:'tb_'+ONLINE.id+'_'+bi,clean:true,reconnectPeriod:3000,connectTimeout:8000});
      c.on('connect',()=>{c.subscribe(ONLINE.topic,{qos:0});if(!up++)onState&&onState('connected');ONLINE.presence(true)});
      c.on('close',()=>{if(c.wasUp)up--;c.wasUp=false;if(!up)onState&&onState('reconnecting')});c.on('connect',()=>{c.wasUp=true});
      c.on('message',async(t,buf)=>{const k=[...new Uint8Array(buf).slice(0,12)].join(',');if(dupes.has(k))return;dupes.add(k);if(dupes.size>2000)dupes.clear();
        let m;try{m=await ONLINE.open(buf)}catch{return}ONLINE.handle(m)});return c});
    ONLINE.client={get connected(){return ONLINE.clients.some(c=>c.connected)},publish(t,b,o){ONLINE.clients.forEach(c=>{if(c.connected)c.publish(t,b,o)})}};
    clearInterval(ONLINE.beat);ONLINE.beat=setInterval(()=>{ONLINE.presence(false);ONLINE.prune()},5000);
    addEventListener('pagehide',()=>ONLINE.raw({type:'_bye',from:ONLINE.id}))},
  handle(m){if(m.type==='_here'||m.type==='_bye'){const had=ONLINE.seen.has(m.from);
      if(m.type==='_bye'){if(had){const n=ONLINE.seen.get(m.from).name;ONLINE.seen.delete(m.from);ONLINE.onMsg({type:'members',members:ONLINE.members(),left:n})}return}
      ONLINE.seen.set(m.from,{name:m.name,t:Date.now()});
      if(!had){ONLINE.onMsg({type:'members',members:ONLINE.members(),joined:m.name});if(m.from!==ONLINE.id&&m.hi)ONLINE.presence(false)}return}
    ONLINE.onMsg(m)},
  prune(){const gone=[];for(const[id,m]of ONLINE.seen)if(id!==ONLINE.id&&Date.now()-m.t>=16000){gone.push(m.name);ONLINE.seen.delete(id)}
    if(gone.length)ONLINE.onMsg({type:'members',members:ONLINE.members(),left:gone.join(', ')})},
  presence(hi){ONLINE.raw({type:'_here',from:ONLINE.id,name:ONLINE.name,hi})},
  async raw(obj){if(ONLINE.client&&ONLINE.client.connected)ONLINE.client.publish(ONLINE.topic,await ONLINE.seal(obj),{qos:0})},
  async send(obj){if(obj.type==='chat'){obj.text=String(obj.text||'').slice(0,1000);obj.name=String(obj.name||'').slice(0,24)}obj.at=Date.now();
    if(!ONLINE.client||!ONLINE.client.connected)return toast('Not connected yet…');const b=await ONLINE.seal(obj);
    if(b.length>200000)return toast('That is too big to send online.');ONLINE.client.publish(ONLINE.topic,b,{qos:0})}};
function onlineBox(){return`<div class="box" style="margin-top:10px"><b>🌐 Play online</b> <span class="muted">(works on Chromebooks and phones, no PC needed)</span>
  <p class="sub" style="margin:6px 0">Make a room and send the code to friends. Everything is encrypted with the code, so only people who have it can read it.</p>
  <div class="row"><input id="olName" placeholder="Your name" maxlength="24" value="${esc(loadTb('lanName',''))}"><input id="olCode" placeholder="Room code, e.g. fox-river-123" maxlength="40" value="${esc(new URLSearchParams(location.search).get('room')||'')}">
  <button class="g" id="olNew">New code</button><button class="b" id="olGo">Join online</button></div></div>`}
function wireOnline(start){$('olNew').onclick=()=>{$('olCode').value=ONLINE.newCode()};
  $('olGo').onclick=()=>{const n=$('olName').value.trim(),c=$('olCode').value.trim().toLowerCase();if(!n)return toast('Type your name.');
    if(c.length<6)return toast('Use a room code with at least 6 characters, or press New code.');saveTb('lanName',n);LAN.mode='online';
    const link=location.href.split(/[?#]/)[0]+'?room='+encodeURIComponent(c);try{history.replaceState(null,'','?room='+encodeURIComponent(c))}catch{}
    const inf=document.createElement('p');inf.className='muted';inf.style.fontSize='13px';inf.innerHTML='🌐 Online room <b>'+esc(c)+'</b> · <a href="#" id="olCopy">copy invite link</a>';
    document.querySelector('main').prepend(inf);inf.querySelector('#olCopy').onclick=e=>{e.preventDefault();copy(link)};start(c,n)}}
