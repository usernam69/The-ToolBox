// Shared helpers and the tool registry. Every other script calls tool({...}).
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ps=s=>"'"+String(s).replace(/'/g,"''")+"'";
const pad2=n=>String(n).padStart(2,'0');
const DAY=864e5;
const isoDay=(d=new Date())=>d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());
const parseIso=s=>{const[y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
const dayNum=(d=new Date())=>Math.round(parseIso(isoDay(d)).getTime()/DAY);
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);

const PREFIX='tb_';
function load(k,d){try{const v=localStorage.getItem(PREFIX+k);return v?JSON.parse(v):d}catch{return d}}
function save(k,v){try{localStorage.setItem(PREFIX+k,JSON.stringify(v))}catch{}}

// counters used by achievements
function bump(k,n=1){const s=load('stats',{});s[k]=(s[k]||0)+n;save('stats',s)}
const stat=k=>load('stats',{})[k]||0;

function money(n){return load('currency','$')+(+n||0).toFixed(2)}

async function copy(text,msgEl){
  try{await navigator.clipboard.writeText(text);if(msgEl)msgEl.textContent='Copied!';else toast('Copied!')}
  catch{if(msgEl)msgEl.textContent='Select the text and copy it.'}
  if(msgEl)setTimeout(()=>msgEl.textContent='',2000)}

function download(name,text,type='application/json'){
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000)}

let toastTimer;
function toast(msg,undo){
  $('toastMsg').textContent=msg;$('toastUndo').style.display=undo?'':'none';
  $('toastUndo').onclick=()=>{undo();$('toast').style.display='none'};
  $('toast').style.display='flex';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').style.display='none',5000)}

// Remove arr[i], persist, redraw, and offer Undo for 5 seconds.
function removeWithUndo(arr,i,persist,label='Deleted'){
  const [item]=arr.splice(i,1);persist();
  toast(label,()=>{arr.splice(Math.min(i,arr.length),0,item);persist()})}

function beep(times=3){
  try{const ac=new (window.AudioContext||window.webkitAudioContext)();
    for(let i=0;i<times;i++){const o=ac.createOscillator(),g=ac.createGain();o.frequency.value=880;o.connect(g);g.connect(ac.destination);
      const t=ac.currentTime+i*.35;g.gain.setValueAtTime(.2,t);g.gain.exponentialRampToValueAtTime(.001,t+.3);o.start(t);o.stop(t+.3)}}catch{}}

function loadScript(src){return new Promise((ok,bad)=>{if(document.querySelector(`script[src="${src}"]`))return ok();
  const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=()=>bad(new Error('Could not load '+src));document.head.append(s)})}

const isTyping=()=>/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)||document.activeElement?.isContentEditable;

// ---- tool registry ----
// tool({id, name, group, html, init(sec), show(sec), search(q) -> [{text, go}]})
const TOOLS=[];
const GROUPS=['Daily','Life','Money','Study','Files','Text & convert','Media & dev','Saved','System'];
// functions returning extra sentences for the dashboard briefing
const BRIEF_EXTRAS=[];
function tool(t){TOOLS.push(t)}
const toolById=id=>TOOLS.find(t=>t.id===id);

// ---- commands for the command bar ----
// command({word, help, run(rest) -> message})
const COMMANDS=[];
function command(c){COMMANDS.push(c)}
