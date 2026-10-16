// Background music on every ToolBox page, made live in the browser (no music files, works offline).
// The style follows the page: chiptune in games, calm pads in tools, dreamy keys in creative apps, lo-fi on the menu.
// 🎵 in the corner turns it on/off and sets the volume (saved as tb_music). It keeps going from page to page,
// pauses while the tab is hidden, and stays quiet in apps that make their own music.
(()=>{
  if(window.top!==window||window.TB_MUSIC)return;// pages shown inside other pages (ToolBox OS, the mini window) stay quiet
  const QUIET=/^(lofi|rhythm|rhythmtype|radiorhythm|taptempo|simon|soundboard|moodmusic|musicalchairs|voicerunner|bubblecam|reaction|hotpotato)$/;
  const get=()=>{try{return Object.assign({on:true,vol:.5},JSON.parse(localStorage.getItem('tb_music')||'{}'))}catch{return{on:true,vol:.5}}};
  const put=s=>{try{localStorage.setItem('tb_music',JSON.stringify(s))}catch{}};
  const STYLE={games:{bpm:118,wave:'square',pad:false,arp:true,drums:true,oct:0},tools:{bpm:72,wave:'sine',pad:true,arp:false,drums:false,oct:-12},creative:{bpm:84,wave:'triangle',pad:true,arp:true,drums:false,oct:0},
    bigger:{bpm:90,wave:'triangle',pad:true,arp:true,drums:true,oct:-12},wild:{bpm:100,wave:'sawtooth',pad:true,arp:true,drums:false,oct:0},menu:{bpm:80,wave:'triangle',pad:true,arp:false,drums:true,oct:0}};
  // read when first needed: this file can load before the page's <body> exists
  let app='menu',st=STYLE.menu;const page=()=>{app=document.body?.dataset.app||'menu';st=STYLE[document.body?.dataset.cat]||STYLE.menu};
  const PROG=[[0,4,7,11],[9,12,16,19],[2,5,9,12],[7,11,14,17]],SCALE=[0,2,4,7,9,12,14,16];
  let ac=null,master=null,timer=null,next=0,step=+sessionStorage.getItem('tb_musicStep')||0,playing=false;
  const f=m=>440*2**((m-69)/12);
  function note(m,t,d,type,vol){const o=ac.createOscillator(),g=ac.createGain(),lp=ac.createBiquadFilter();o.type=type;o.frequency.value=f(m);lp.type='lowpass';lp.frequency.value=type==='square'||type==='sawtooth'?1800:3000;
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+Math.min(.04,d/4));g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(lp).connect(g).connect(master);o.start(t);o.stop(t+d+.05)}
  function hat(t,v){const b=ac.createBuffer(1,ac.sampleRate*.03,ac.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);const s=ac.createBufferSource(),g=ac.createGain(),h=ac.createBiquadFilter();h.type='highpass';h.frequency.value=6000;s.buffer=b;g.gain.value=v;s.connect(h).connect(g).connect(master);s.start(t)}
  function kick(t){const o=ac.createOscillator(),g=ac.createGain();o.frequency.setValueAtTime(110,t);o.frequency.exponentialRampToValueAtTime(40,t+.15);g.gain.setValueAtTime(.35,t);g.gain.exponentialRampToValueAtTime(.001,t+.3);o.connect(g).connect(master);o.start(t);o.stop(t+.32)}
  // one sixteenth note at a time, scheduled slightly ahead
  function tick(){const spb=60/st.bpm/4;while(next<ac.currentTime+.2){const s=step%64,bar=Math.floor(s/16),chord=PROG[bar].map(n=>n+57+st.oct),t=next;
      if(s%16===0&&st.pad)chord.forEach(n=>note(n,t,spb*16,'sine',.035));
      if(s%16===0)note(chord[0]-12,t,spb*8,'triangle',.07);if(s%16===8)note(chord[0]-12,t,spb*6,'triangle',.05);
      if(st.arp&&s%2===0)note(chord[(s/2)%4]+12,t,spb*1.5,st.wave,st.wave==='square'?.025:.04);
      if(!st.arp&&s%4===2&&Math.random()<.5)note(SCALE[Math.floor(Math.random()*SCALE.length)]+69+st.oct,t,spb*4,st.wave,.035);
      if(st.drums){if(s%8===0)kick(t);if(s%4===2)hat(t,.04)}
      step++;next+=spb}
    sessionStorage.setItem('tb_musicStep',step)}
  function start(){page();const s=get();if(!s.on||playing||QUIET.test(app)||document.hidden)return;
    try{ac=ac||new (window.AudioContext||window.webkitAudioContext)();master=master||ac.createGain();master.connect(ac.destination);master.gain.value=s.vol*.6;ac.resume();next=ac.currentTime+.1;timer=setInterval(tick,50);playing=true}catch{}}
  function stop(){clearInterval(timer);playing=false;if(ac)ac.suspend().catch(()=>{})}
  // browsers only allow sound after you tap or press a key, so the music starts on the first one
  const first=()=>{if(ac)ac.resume();start();if(playing)['pointerdown','keydown'].forEach(e=>removeEventListener(e,first,true))};['pointerdown','keydown'].forEach(e=>addEventListener(e,first,true));
  document.addEventListener('visibilitychange',()=>document.hidden?stop():start());
  // the 🎵 button and its little panel
  function ui(){page();const b=document.createElement('button'),s=get();b.id='tbMusic';b.type='button';b.title='Background music';b.setAttribute('aria-label','Background music');
    b.style.cssText='position:fixed;left:10px;bottom:10px;z-index:9998;width:40px;height:40px;border-radius:50%;border:1px solid var(--line,#ccc);background:var(--card,#fff);font-size:18px;cursor:pointer;opacity:.8;box-shadow:0 2px 6px rgba(0,0,0,.15)';
    const draw=()=>{const s=get();b.textContent=s.on&&!QUIET.test(app)?'🎵':'🔇'};draw();
    b.onclick=e=>{e.stopPropagation();let p=document.getElementById('tbMusicPanel');if(p)return p.remove();const s=get();p=document.createElement('div');p.id='tbMusicPanel';
      p.style.cssText='position:fixed;left:10px;bottom:58px;z-index:9998;background:var(--card,#fff);color:var(--ink,#222);border:1px solid var(--line,#ccc);border-radius:12px;padding:10px 12px;box-shadow:0 4px 14px rgba(0,0,0,.2);font:14px system-ui;min-width:190px';
      p.innerHTML=`<label style="display:flex;gap:6px;align-items:center"><input type="checkbox" ${s.on?'checked':''} data-m="on"> Background music</label><label style="display:block;margin-top:6px">Volume <input type="range" min="0" max="1" step=".05" value="${s.vol}" data-m="vol" style="width:100%"></label>${QUIET.test(app)?'<p style="margin:6px 0 0;opacity:.7">Paused here: this app makes its own music.</p>':''}`;
      p.querySelector('[data-m=on]').onchange=e=>{const n=get();n.on=e.target.checked;put(n);n.on?start():stop();draw()};
      p.querySelector('[data-m=vol]').oninput=e=>{const n=get();n.vol=+e.target.value;put(n);if(master)master.gain.value=n.vol*.6};
      document.body.append(p);setTimeout(()=>addEventListener('pointerdown',function off(ev){if(!p.contains(ev.target)&&ev.target!==b){p.remove();removeEventListener('pointerdown',off)}}),0)};
    document.body.append(b)}
  window.TB_MUSIC={start,stop};document.body?ui():addEventListener('DOMContentLoaded',ui);
})();
