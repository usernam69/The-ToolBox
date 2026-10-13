// Turns a Parkour level into a short link-safe code and back. Tiles: . # ^ S G, rows separated by z.
const LV_MAP={'.':'a','#':'b','^':'c','S':'s','G':'g'},LV_BACK={a:'.',b:'#',c:'^',s:'S',g:'G'};
function encodeLevel(name,rows){const body=rows.map(r=>r.replace(/(.)\1*/g,m=>(m.length>1?m.length:'')+LV_MAP[m[0]])).join('z');
  return encodeURIComponent(name.slice(0,30))+'~'+body}
function decodeLevel(code){const[n,body]=code.split('~');if(!body)throw new Error('bad level');
  const rows=body.split('z').map(r=>r.replace(/(\d*)([abcsg])/g,(_,k,ch)=>LV_BACK[ch].repeat(Math.min(+k||1,200))));
  const w=Math.max(...rows.map(r=>r.length));if(rows.length<4||rows.length>30||w>200||/[^.#^SG]/.test(rows.join('')))throw new Error('bad level');
  return{name:decodeURIComponent(n).slice(0,30)||'Custom level',rows:rows.map(r=>r.padEnd(w,'.'))}}
