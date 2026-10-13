// Shared helpers for app pages. Each page sets <body data-title="…" data-app="id"> before loading this.
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const APP=document.body.dataset.app||'app';
// Each app keeps its data under its own prefix; shared toolbox data uses 'tb_'.
function load(k,d){try{const v=localStorage.getItem('app_'+APP+'_'+k);return v?JSON.parse(v):d}catch{return d}}
function save(k,v){try{localStorage.setItem('app_'+APP+'_'+k,JSON.stringify(v))}catch{}}
function loadTb(k,d){try{const v=localStorage.getItem('tb_'+k);return v?JSON.parse(v):d}catch{return d}}
function saveTb(k,v){try{localStorage.setItem('tb_'+k,JSON.stringify(v))}catch{}}
const rnd=n=>Math.floor(Math.random()*n),pick=a=>a[rnd(a.length)];
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const pad2=n=>String(n).padStart(2,'0');
const isoDay=(d=new Date())=>d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());
const DAY=864e5;
let toastT;function toast(m){let t=$('toast');if(!t){t=document.createElement('div');t.id='toast';document.body.append(t)}t.textContent=m;t.style.display='block';clearTimeout(toastT);toastT=setTimeout(()=>t.style.display='none',3000)}
function download(name,data,type='text/plain'){const a=document.createElement('a');a.href=typeof data==='string'&&data.startsWith('data:')?data:URL.createObjectURL(data instanceof Blob?data:new Blob([data],{type}));a.download=name;a.click()}
async function copy(t){try{await navigator.clipboard.writeText(t);toast('Copied!')}catch{toast('Could not copy')}}
const cssVar=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
// keep the toolbox's theme & accent choices
(()=>{const t=loadTb('theme','auto');if(t!=='auto')document.documentElement.dataset.theme=t;const a=loadTb('accent','');if(a)document.documentElement.style.setProperty('--accent',a)})();
// top bar with a way back to the menu
(()=>{const bar=document.createElement('div');bar.className='topbar';
  bar.innerHTML=`<a href="../index.html#${esc(document.body.dataset.cat||'')}" title="Back to the main menu">← Menu</a><h1>${esc(document.body.dataset.title||document.title)}</h1>`;
  document.body.prepend(bar);document.title=(document.body.dataset.title||document.title)+' · The ToolBox';
  try{const r=JSON.parse(localStorage.getItem('menu_recent')||'[]');localStorage.setItem('menu_recent',JSON.stringify([APP,...r.filter(x=>x!==APP)].slice(0,8)))}catch{}})();
let audioCtx;const AC=()=>audioCtx||(audioCtx=new (window.AudioContext||window.webkitAudioContext)());
function tone(freq,dur=.15,type='sine',vol=.15,when=0){try{const a=AC(),o=a.createOscillator(),g=a.createGain(),t=a.currentTime+when;o.type=type;o.frequency.value=freq;
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(a.destination);o.start(t);o.stop(t+dur+.02)}catch{}}
// Hold-to-move keys helper for games
const keys=new Set();addEventListener('keydown',e=>{if(!/INPUT|TEXTAREA/.test(document.activeElement.tagName)){keys.add(e.key.toLowerCase());if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(e.key.toLowerCase()))e.preventDefault()}});addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
function bindTouch(el){el.querySelectorAll('[data-key]').forEach(b=>{const k=b.dataset.key;
  b.addEventListener('pointerdown',e=>{e.preventDefault();keys.add(k)});['pointerup','pointerleave','pointercancel'].forEach(ev=>b.addEventListener(ev,()=>keys.delete(k)))})}
