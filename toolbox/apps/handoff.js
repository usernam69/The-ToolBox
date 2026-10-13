// Hands a file or text from "Open with The ToolBox" / "Share to The ToolBox" (open.html) to an app.
// The target page is opened with ?handoff=<input id>; this finds that file input or text field and fills it.
var HANDOFF={
  db(){return new Promise((ok,no)=>{const r=indexedDB.open('toolbox-handoff',1);r.onupgradeneeded=()=>r.result.createObjectStore('h');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})},
  async put(v){const d=await HANDOFF.db();await new Promise(ok=>{const t=d.transaction('h','readwrite');t.objectStore('h').put(v,'x');t.oncomplete=ok})},
  async take(){const d=await HANDOFF.db();return new Promise(ok=>{const t=d.transaction('h','readwrite'),s=t.objectStore('h'),q=s.get('x');q.onsuccess=()=>{s.delete('x');ok(q.result||null)};q.onerror=()=>ok(null)})},
  async receive(){const id=new URLSearchParams(location.search).get('handoff');if(!id||!/^[\w-]+$/.test(id))return;
    let el=null;for(let i=0;i<50&&!(el=document.getElementById(id));i++)await new Promise(r=>setTimeout(r,100));
    const v=await HANDOFF.take();try{history.replaceState(null,'',location.pathname+location.hash)}catch{}if(!el||!v)return;
    if(v.text!=null&&el.type!=='file'){el.value=v.text;el.dispatchEvent(new Event('input',{bubbles:true}));el.focus();return}
    if(v.files&&el.type==='file'){const dt=new DataTransfer();(el.multiple?v.files:v.files.slice(0,1)).forEach(f=>dt.items.add(f));el.files=dt.files;el.dispatchEvent(new Event('change',{bubbles:true}))}}};
HANDOFF.receive();
