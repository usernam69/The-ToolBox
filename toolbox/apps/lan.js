// Connects a page to the home-network server (see toolbox-desktop/lan-server.js).
// - Opened from the desktop app: "Host" starts the server inside the app.
// - Opened by a friend at http://<host-ip>:<port>/apps/…: it's already connected to that host.
const LAN={base:null,es:null,room:null,name:null,
  servedByHost:()=>location.protocol.startsWith('http'),
  canHost:()=>!!window.toolboxDesktop,
  async host(){const info=await window.toolboxDesktop.startLan();LAN.base=`http://localhost:${info.port}`;return info},
  async probe(){if(LAN.servedByHost()){LAN.base='';try{const r=await fetch('/api/info');if(r.ok)return await r.json()}catch{}LAN.base=null}return null},
  join(room,name,onMsg,onState){LAN.room=room;LAN.name=name;if(LAN.es)LAN.es.close();
    const es=new EventSource(`${LAN.base}/api/events?room=${encodeURIComponent(room)}&name=${encodeURIComponent(name)}`);LAN.es=es;
    es.onmessage=e=>{try{onMsg(JSON.parse(e.data))}catch(err){console.error(err)}};es.onopen=()=>onState&&onState('connected');es.onerror=()=>onState&&onState(es.readyState===2?'closed':'reconnecting')},
  send(obj){return fetch(`${LAN.base}/api/send?room=${encodeURIComponent(LAN.room)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(obj)}).catch(()=>toast('Could not reach the host'))},
  joinUrl(info,page){return info.ips.map(ip=>`http://${ip}:${info.port}/apps/${page}`)}};
// Shared "connect" panel: fills #lanPanel and calls start(room,name) once connected.
async function lanPanel(page,start){const el=$('lanPanel'),saved=loadTb('lanName','');
  const form=(extra)=>`<div class="row"><input id="lpName" placeholder="Your name" maxlength="24" value="${esc(saved)}"><input id="lpRoom" placeholder="Room name" maxlength="40" value="${esc(load('room','friends'))}">${extra}</div>`;
  const go=()=>{const n=$('lpName').value.trim(),r=$('lpRoom').value.trim().toLowerCase();if(!n||!r)return toast('Type a name and a room.');saveTb('lanName',n);save('room',r);start(r,n)};
  const info=await LAN.probe();
  if(info){el.innerHTML=`<p class="sub">You're connected to a host on your home Wi-Fi. Pick a name and a room. Everyone who uses the same room name is together.</p>${form('<button class="b" id="lpGo">Join</button>')}`;$('lpGo').onclick=go;return}
  if(LAN.canHost()){el.innerHTML=`<p class="sub">Host a room from this computer, and friends on the same Wi-Fi join from any browser, phone or laptop.</p>${form('<button class="b" id="lpGo">Host &amp; join</button>')}<div id="lpInfo"></div>`;
    $('lpGo').onclick=async()=>{try{const i=await LAN.host();$('lpInfo').innerHTML=`<div class="box" style="margin-top:8px"><b>Friends open this address:</b><br>${LAN.joinUrl(i,page).map(u=>`<code style="font-size:16px">${esc(u)}</code> <button class="g" data-u="${esc(u)}">Copy</button>`).join('<br>')}<p class="muted" style="font-size:12px;margin:6px 0 0">If Windows asks about the firewall, allow <b>private networks</b>. Only people on your Wi-Fi can connect, and only while this app is open.</p></div>`;
      $('lpInfo').querySelectorAll('[data-u]').forEach(b=>b.onclick=()=>copy(b.dataset.u));go()}catch(e){toast('Could not start hosting: '+e.message)}};return}
  el.innerHTML=`<div class="box"><b>Multiplayer needs a host.</b><p class="sub" style="margin:6px 0">Open this in <b>The ToolBox desktop app</b> and press Host. Friends on the same Wi-Fi can then join from their browser. You can also run <code>npm run lan</code> in the <code>toolbox-desktop</code> folder and open the address it prints.</p>${page==='draw.html'?'<button class="b" id="lpLocal">Play on this screen instead</button>':''}</div>`;
  if($('lpLocal'))$('lpLocal').onclick=()=>start(null,null)}
