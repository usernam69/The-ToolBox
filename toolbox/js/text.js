// Text & convert: small single-purpose tools.

// ---------- unit converter ----------
const UNITS={
  Length:{m:1,km:1000,cm:.01,mm:.001,mi:1609.344,yd:.9144,ft:.3048,in:.0254,'nautical mi':1852},
  Weight:{kg:1,g:.001,mg:1e-6,lb:.45359237,oz:.028349523,stone:6.35029318,'metric ton':1000},
  Volume:{l:1,ml:.001,'US gal':3.785411784,'US qt':.946352946,'US pint':.473176473,'US cup':.2365882365,'US fl oz':.0295735296,tbsp:.0147867648,tsp:.00492892159,'m³':1000},
  Speed:{'km/h':1,'mph':1.609344,'m/s':3.6,knots:1.852},
  Data:{B:1,KB:1e3,MB:1e6,GB:1e9,TB:1e12,KiB:1024,MiB:1048576,GiB:1073741824,bit:.125},
  Area:{'m²':1,'km²':1e6,'ft²':.09290304,acre:4046.8564224,hectare:1e4,'mi²':2589988.11},
  Time:{s:1,min:60,h:3600,day:86400,week:604800,year:31557600},
  Temperature:{'°C':1,'°F':1,K:1}};
function convertTemp(v,from,to){const c=from==='°C'?v:from==='°F'?(v-32)*5/9:v-273.15;return to==='°C'?c:to==='°F'?c*9/5+32:c+273.15}
const nice=n=>Math.abs(n)>=1e6||(Math.abs(n)<1e-4&&n!==0)?n.toExponential(4):String(+n.toPrecision(8));
tool({id:'units',name:'Unit converter',group:'Text & convert',html:`
<h2>Unit converter</h2><p class="sub">Type a number and see it in every unit of that kind.</p>
<div class="row"><select id="uCat"></select><input id="uVal" type="number" value="1" style="width:140px"><select id="uFrom"></select></div><table id="uOut"></table>`,
init(){$('uCat').innerHTML=Object.keys(UNITS).map(c=>`<option>${c}</option>`).join('');
  const fill=()=>{$('uFrom').innerHTML=Object.keys(UNITS[$('uCat').value]).map(u=>`<option>${u}</option>`).join('');draw()};
  const draw=()=>{const cat=$('uCat').value,u=UNITS[cat],v=+$('uVal').value,from=$('uFrom').value;
    $('uOut').innerHTML=Object.keys(u).filter(k=>k!==from).map(k=>`<tr><td style="width:50%;text-align:right;font-variant-numeric:tabular-nums"><b>${nice(cat==='Temperature'?convertTemp(v,from,k):v*u[from]/u[k])}</b></td><td>${k}</td></tr>`).join('')};
  $('uCat').onchange=fill;$('uFrom').onchange=draw;$('uVal').oninput=draw;fill()}});

// ---------- recipe scaler with unit conversion ----------
const UNI={'½':.5,'⅓':1/3,'⅔':2/3,'¼':.25,'¾':.75,'⅛':.125};
function fmtQty(x){if(x>=10)return String(Math.round(x));const w=Math.floor(x+1e-9),f=x-w,fr=[[0,''],[.125,'1/8'],[.25,'1/4'],[1/3,'1/3'],[.5,'1/2'],[2/3,'2/3'],[.75,'3/4'],[1,'']];
  const best=fr.reduce((b,c)=>Math.abs(c[0]-f)<Math.abs(b[0]-f)?c:b);if(Math.abs(best[0]-f)>.04)return String(+x.toFixed(2));
  const W=best[0]===1?w+1:w;return(W?W:'')+(best[1]?(W?' ':'')+best[1]:'')||'0'}
const VOL_ML={cup:236.6,cups:236.6,c:236.6,tbsp:14.79,tablespoon:14.79,tablespoons:14.79,tsp:4.93,teaspoon:4.93,teaspoons:4.93,'fl oz':29.57,pint:473,pints:473,quart:946,quarts:946,gallon:3785,gallons:3785,ml:1,l:1000,liter:1000,liters:1000,litre:1000};
const WT_G={oz:28.35,ounce:28.35,ounces:28.35,lb:453.6,lbs:453.6,pound:453.6,pounds:453.6,g:1,gram:1,grams:1,kg:1000};
const DENSITY={flour:120/236.6,'brown sugar':220/236.6,sugar:200/236.6,butter:227/236.6,rice:185/236.6,oats:90/236.6,cocoa:85/236.6,honey:340/236.6,'powdered sugar':120/236.6};
function toUS(ml){return ml>=59?[ml/236.6,'cup']:ml>=14?[ml/14.79,'tbsp']:[ml/4.93,'tsp']}
function processLine(l,k,mode){
  let out=l.replace(/^(\s*)(\d+\s+\d+\/\d+|\d+\/\d+|\d*\.?\d+\s*[½⅓⅔¼¾⅛]?|[½⅓⅔¼¾⅛])(\s*)(fl oz|[a-zA-Z]+\.?)?/,(m,sp,q,gap,unit)=>{
    let v;q=q.trim();const mixed=q.match(/^(\d+)\s+(\d+)\/(\d+)$/),frac=q.match(/^(\d+)\/(\d+)$/);
    if(mixed)v=+mixed[1]+mixed[2]/mixed[3];else if(frac)v=frac[1]/frac[2];else{const u=q.slice(-1);v=UNI[u]?UNI[u]+(parseFloat(q.slice(0,-1))||0):parseFloat(q)}
    v*=k;const u=(unit||'').toLowerCase().replace(/\.$/,''),rest=unit||'';
    if(mode==='metric'&&VOL_ML[u]&&!['ml','l','liter','liters','litre'].includes(u)){const ml=v*VOL_ML[u],ing=Object.keys(DENSITY).find(d=>l.toLowerCase().includes(d));
      if(ing)return`${sp}${Math.round(ml*DENSITY[ing])} g`;return`${sp}${ml>=1000?+(ml/1000).toFixed(2)+' l':Math.round(ml)+' ml'}`}
    if(mode==='metric'&&WT_G[u]&&!['g','gram','grams','kg'].includes(u)){const g=v*WT_G[u];return`${sp}${g>=1000?+(g/1000).toFixed(2)+' kg':Math.round(g)+' g'}`}
    if(mode==='us'&&['ml','l','liter','liters','litre'].includes(u)){const[n,un]=toUS(v*VOL_ML[u]);return`${sp}${fmtQty(n)} ${un}`}
    if(mode==='us'&&['g','gram','grams','kg'].includes(u)){const g=v*WT_G[u];return g>=453.6?`${sp}${+(g/453.6).toFixed(2)} lb`:`${sp}${fmtQty(g/28.35)} oz`}
    return sp+fmtQty(v)+(gap||(unit?' ':''))+rest});
  if(mode==='metric')out=out.replace(/(\d+)\s*°?\s*F\b/g,(m,f)=>Math.round((f-32)*5/9/5)*5+'°C');
  if(mode==='us')out=out.replace(/(\d+)\s*°?\s*C\b/g,(m,c)=>Math.round((c*9/5+32)/5)*5+'°F');
  return out}
tool({id:'recipe',name:'Recipe scaler',group:'Text & convert',html:`
<h2>Recipe scaler</h2><p class="sub">Paste ingredients one per line. Amounts are scaled and can be switched between US and metric. Cups of flour, sugar, butter and similar become grams, and oven temperatures convert too.</p>
<textarea id="rcIn" placeholder="2 cups flour&#10;1/2 tsp salt&#10;3 eggs&#10;Bake at 350°F"></textarea>
<div class="row">Serves <input id="rcFrom" type="number" value="4" style="width:70px"> → <input id="rcTo" type="number" value="6" style="width:70px">
 <select id="rcUnits"><option value="">Keep units</option><option value="metric">Convert to metric</option><option value="us">Convert to US</option></select></div><pre id="rcOut"></pre>`,
init(){const draw=()=>{save('recipe',$('rcIn').value);const k=(+$('rcTo').value||0)/(+$('rcFrom').value||1);
  $('rcOut').textContent=$('rcIn').value.split('\n').map(l=>processLine(l,k,$('rcUnits').value)).join('\n')};
  $('rcIn').value=load('recipe','');live(['rcIn','rcFrom','rcTo','rcUnits'],draw);draw()}});

// ---------- password generator ----------
const WORDS='apple river candle tiger orbit maple pencil rocket velvet canyon lemon harbor puzzle meadow falcon garden silver thunder pillow comet marble jungle violet anchor bridge cactus dragon ember forest glacier hollow island jacket kettle lantern mango nectar oyster pepper quartz raven saddle tunnel umbrella valley walnut yonder zebra acorn blossom cobalt dolphin eclipse feather goblin hazel igloo jigsaw koala lagoon magnet nutmeg olive parrot quiver ribbon sprout tulip unicorn vortex willow pixel yogurt zigzag breeze copper dune echo fable gravel harvest ivory juniper kayak lotus mosaic noodle onyx prism quill rumble sapphire timber ultra vessel wander bamboo cinder drift ferry glow hammock ink jasmine kite lilac mist nova opal pebble ripple shadow tango'.split(' ');
function rnd(n){const a=new Uint32Array(1),lim=Math.floor(2**32/n)*n;do crypto.getRandomValues(a);while(a[0]>=lim);return a[0]%n}
tool({id:'password',name:'Password generator',group:'Text & convert',html:`
<h2>Password generator</h2><p class="sub">Strong random passwords made on your device with the browser's secure random generator. Nothing is sent or saved.</p>
<div class="row"><label><input type="radio" name="pwT" value="chars" checked> Characters</label><label><input type="radio" name="pwT" value="words"> Passphrase (words)</label></div>
<div class="row">Length <input id="pwLen" type="range" min="6" max="64" value="20"><span id="pwLenV"></span></div>
<div class="row" id="pwOpts"><label><input type="checkbox" id="pwU" checked> A-Z</label><label><input type="checkbox" id="pwL" checked> a-z</label><label><input type="checkbox" id="pwD" checked> 0-9</label><label><input type="checkbox" id="pwS" checked> !@#$</label><label><input type="checkbox" id="pwA"> Skip look-alikes (l 1 O 0)</label></div>
<div class="box"><div id="pwOut" style="font-family:ui-monospace,monospace;font-size:20px;word-break:break-all"></div><div id="pwStr" class="muted"></div></div>
<div class="row"><button class="b" id="pwNew">New password</button><button class="g" id="pwCopy">Copy</button><span id="pwMsg" class="muted"></span></div>`,
init(){const gen=()=>{const words=document.querySelector('[name=pwT]:checked').value==='words';let pw,bits;
  $('pwLen').min=words?3:6;$('pwLen').max=words?12:64;if(words&&+$('pwLen').value>12)$('pwLen').value=5;if(!words&&+$('pwLen').value<6)$('pwLen').value=20;
  const n=+$('pwLen').value;$('pwLenV').textContent=n+(words?' words':' characters');$('pwOpts').style.display=words?'none':'flex';
  if(words){pw=[...Array(n)].map(()=>WORDS[rnd(WORDS.length)]).join('-');bits=n*Math.log2(WORDS.length)}
  else{let sets=[$('pwU').checked&&'ABCDEFGHIJKLMNOPQRSTUVWXYZ',$('pwL').checked&&'abcdefghijklmnopqrstuvwxyz',$('pwD').checked&&'0123456789',$('pwS').checked&&'!@#$%^&*-_=+?'].filter(Boolean);
    if($('pwA').checked)sets=sets.map(s=>s.replace(/[lI1O0o]/g,''));if(!sets.length){$('pwOut').textContent='Pick at least one set.';return}
    const all=sets.join('');let a;do{a=[...Array(n)].map(()=>all[rnd(all.length)])}while(n>=sets.length&&!sets.every(s=>a.some(c=>s.includes(c))));
    pw=a.join('');bits=n*Math.log2(all.length)}
  $('pwOut').textContent=pw;$('pwStr').textContent=`About ${Math.round(bits)} bits: `+(bits<40?'weak':bits<60?'okay':bits<80?'strong':'very strong')};
  document.querySelectorAll('[name=pwT],#pwOpts input,#pwLen').forEach(e=>e.addEventListener('input',gen));
  $('pwNew').onclick=gen;$('pwCopy').onclick=()=>copy($('pwOut').textContent,$('pwMsg'));gen()}});

// ---------- QR code ----------
tool({id:'qr',name:'QR code maker',group:'Text & convert',html:`
<h2>QR code maker</h2><p class="sub">Turn a link, text or Wi-Fi details into a QR code you can download. Needs internet the first time to load the QR library.</p>
<div class="row"><label><input type="radio" name="qrT" value="text" checked> Link / text</label><label><input type="radio" name="qrT" value="wifi"> Wi-Fi</label></div>
<div id="qrText"><textarea id="qrIn" placeholder="https://example.com" style="min-height:60px"></textarea></div>
<div id="qrWifi" style="display:none" class="row"><input id="qrSsid" placeholder="Network name"><input id="qrPass" placeholder="Password"><select id="qrSec"><option>WPA</option><option>WEP</option><option value="nopass">None</option></select></div>
<div class="row">Size <input id="qrSize" type="range" min="4" max="16" value="8"><button class="b" id="qrDl">Download PNG</button><span id="qrMsg" class="muted"></span></div>
<canvas id="qrCanvas" style="background:#fff;border-radius:8px;max-width:100%"></canvas>`,
init(){const draw=async()=>{const wifi=document.querySelector('[name=qrT]:checked').value==='wifi';$('qrText').style.display=wifi?'none':'';$('qrWifi').style.display=wifi?'flex':'none';
  const e=s=>s.replace(/([\\;,:"])/g,'\\$1');const data=wifi?`WIFI:T:${$('qrSec').value};S:${e($('qrSsid').value)};P:${e($('qrPass').value)};;`:$('qrIn').value;
  const c=$('qrCanvas'),ctx=c.getContext('2d');if(!data.trim()||(wifi&&!$('qrSsid').value)){c.width=c.height=0;return}
  try{await loadScript('https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js')}catch{$('qrMsg').textContent='Could not load the QR library (offline?)';return}
  try{const q=qrcode(0,'M');q.addData(unescape(encodeURIComponent(data)));q.make();const n=q.getModuleCount(),s=+$('qrSize').value,m=4*s;
    c.width=c.height=n*s+2*m;ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#000';
    for(let r=0;r<n;r++)for(let k=0;k<n;k++)if(q.isDark(r,k))ctx.fillRect(m+k*s,m+r*s,s,s);$('qrMsg').textContent=''}catch{$('qrMsg').textContent='Too much text for one QR code.'}};
  document.querySelectorAll('[name=qrT]').forEach(r=>r.onchange=draw);live(['qrIn','qrSsid','qrPass','qrSec','qrSize'],draw);
  $('qrDl').onclick=()=>{if(!$('qrCanvas').width)return toast('Type something first.');const a=document.createElement('a');a.href=$('qrCanvas').toDataURL('image/png');a.download='qr-code.png';a.click()}}});

// ---------- word counter ----------
tool({id:'words',name:'Word counter',group:'Text & convert',html:`
<h2>Word &amp; character counter</h2><p class="sub">Live counts, reading time and your most-used words.</p>
<textarea id="wcIn" style="min-height:200px" placeholder="Paste or type text…"></textarea>
<div class="grid3" id="wcStats" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr))"></div><h3>Most used words</h3><div id="wcTop"></div>`,
init(){const draw=()=>{const t=$('wcIn').value,words=t.match(/[\p{L}\p{N}'’-]+/gu)||[];
  const st=[['Words',words.length],['Characters',t.length],['No spaces',t.replace(/\s/g,'').length],['Sentences',(t.match(/[^.!?]+[.!?]+/g)||[]).length||(t.trim()?1:0)],['Paragraphs',t.split(/\n\s*\n/).filter(p=>p.trim()).length],['Reading time',Math.ceil(words.length/200)+' min'],['Speaking time',Math.ceil(words.length/130)+' min']];
  $('wcStats').innerHTML=st.map(([k,v])=>`<div class="box"><div class="muted" style="font-size:13px">${k}</div><div class="big" style="font-size:24px">${v}</div></div>`).join('');
  const f={};words.forEach(w=>{w=w.toLowerCase();if(w.length>3&&!STOP.has(w))f[w]=(f[w]||0)+1});
  $('wcTop').innerHTML=Object.entries(f).sort((a,b)=>b[1]-a[1]).slice(0,15).map(([w,n])=>`<span class="tag">${esc(w)} ${n}</span>`).join('')||'<span class="muted">—</span>'};
  $('wcIn').oninput=draw;draw()}});

// ---------- text cleaner ----------
const titleCase=s=>s.toLowerCase().replace(/(^|[\s(\["'-])(\p{L})/gu,(m,a,b)=>a+b.toUpperCase());
const TEXT_OPS={'UPPERCASE':s=>s.toUpperCase(),'lowercase':s=>s.toLowerCase(),'Title Case':titleCase,'Sentence case':s=>s.toLowerCase().replace(/(^\s*|[.!?]\s+)(\p{L})/gu,(m,a,b)=>a+b.toUpperCase()),
  'Trim extra spaces':s=>s.split('\n').map(l=>l.replace(/[ \t]+/g,' ').trim()).join('\n'),'Remove empty lines':s=>s.split('\n').filter(l=>l.trim()).join('\n'),
  'Sort lines A→Z':s=>s.split('\n').sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})).join('\n'),'Reverse lines':s=>s.split('\n').reverse().join('\n'),
  'Remove duplicate lines':s=>[...new Set(s.split('\n'))].join('\n'),'Number lines':s=>s.split('\n').map((l,i)=>`${i+1}. ${l}`).join('\n'),
  'Join into one line':s=>s.split('\n').map(l=>l.trim()).filter(Boolean).join(' '),'Remove line numbers / bullets':s=>s.split('\n').map(l=>l.replace(/^\s*(\d+[.)]|[-*•])\s+/,'')).join('\n'),
  'Smart quotes → plain':s=>s.replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/[–—]/g,'-').replace(/…/g,'...')};
tool({id:'cleaner',name:'Text cleaner',group:'Text & convert',html:`
<h2>Text cleaner</h2><p class="sub">Paste text and click a fix. Each fix changes the text in place, and Undo steps back.</p>
<div class="row" id="tcOps"></div><textarea id="tcIn" style="min-height:240px"></textarea>
<div class="row"><button class="g" id="tcUndo">Undo</button><button class="b" id="tcCopy">Copy</button><span id="tcMsg" class="muted"></span></div>`,
init(){const hist=[];$('tcOps').innerHTML=Object.keys(TEXT_OPS).map(k=>`<button class="g">${k}</button>`).join('');
  [...$('tcOps').children].forEach(b=>b.onclick=()=>{hist.push($('tcIn').value);$('tcIn').value=TEXT_OPS[b.textContent]($('tcIn').value)});
  $('tcUndo').onclick=()=>{if(hist.length)$('tcIn').value=hist.pop()};$('tcCopy').onclick=()=>copy($('tcIn').value,$('tcMsg'))}});

// ---------- color picker ----------
function parseColor(s){const d=document.createElement('canvas').getContext('2d');d.fillStyle='#010203';d.fillStyle=s.trim();const v=d.fillStyle;
  if(v==='#010203'&&!/^#?010203$/i.test(s.trim()))return null;if(v.startsWith('#'))return[1,3,5].map(i=>parseInt(v.slice(i,i+2),16));const m=v.match(/[\d.]+/g);return m?m.slice(0,3).map(Number):null}
const toHex=c=>'#'+c.map(x=>pad2(Math.round(x).toString(16))).join('');
function toHsl([r,g,b]){r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2;let h=0,s=0;
  if(mx!==mn){const d=mx-mn;s=l>.5?d/(2-mx-mn):d/(mx+mn);h=mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4;h*=60}return[Math.round(h),Math.round(s*100),Math.round(l*100)]}
const lum=c=>{const[r,g,b]=c.map(v=>{v/=255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4});return .2126*r+.7152*g+.0722*b};
const contrast=(a,b)=>{const x=lum(a),y=lum(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
tool({id:'color',name:'Color tool',group:'Text & convert',html:`
<h2>Color picker &amp; converter</h2><p class="sub">Pick or paste a color (HEX, rgb(), hsl() or a name) to get every format, and check text contrast against a second color.</p>
<div class="grid2"><div class="box"><b>Color</b><div class="row"><input type="color" id="coPick" value="#2f6fde"><input id="coIn" class="grow" value="#2f6fde"></div><table id="coOut"></table></div>
<div class="box"><b>Contrast with</b><div class="row"><input type="color" id="co2Pick" value="#ffffff"><input id="co2In" class="grow" value="#ffffff"></div>
<div id="coSample" style="padding:14px;border-radius:8px;font-size:18px">Sample text Aa<br><small>Smaller text sample</small></div><div id="coRatio" style="margin-top:8px"></div></div></div>
<h3>Shades</h3><div id="coShades" style="display:flex;gap:4px;flex-wrap:wrap"></div>`,
init(){const draw=()=>{const a=parseColor($('coIn').value),b=parseColor($('co2In').value);if(!a||!b)return;$('coPick').value=toHex(a);$('co2Pick').value=toHex(b);
  const h=toHsl(a);const rows=[['HEX',toHex(a)],['RGB',`rgb(${a.join(', ')})`],['HSL',`hsl(${h[0]}, ${h[1]}%, ${h[2]}%)`]];
  $('coOut').innerHTML=rows.map(([k,v])=>`<tr><td>${k}</td><td><code>${v}</code></td><td><button class="g" data-c="${v}">Copy</button></td></tr>`).join('');
  $('coOut').querySelectorAll('button').forEach(x=>x.onclick=()=>copy(x.dataset.c));
  $('coSample').style.background=toHex(b);$('coSample').style.color=toHex(a);const r=contrast(a,b),ok=(v,t)=>`<span style="color:var(--${r>=v?'good':'bad'})">${r>=v?'✓':'✗'} ${t}</span>`;
  $('coRatio').innerHTML=`Contrast <b>${r.toFixed(2)}:1</b><br>${ok(4.5,'AA normal text')} · ${ok(3,'AA large text')} · ${ok(7,'AAA normal text')}`;
  $('coShades').innerHTML=[10,20,30,40,50,60,70,80,90].map(l=>{const c=`hsl(${h[0]}, ${h[1]}%, ${l}%)`;return`<div title="${c}" data-c="${toHex(parseColor(c))}" style="width:56px;height:40px;border-radius:6px;background:${c};cursor:pointer;font-size:10px;color:${l>55?'#000':'#fff'};display:flex;align-items:end;justify-content:center">${l}%</div>`}).join('');
  $('coShades').querySelectorAll('div').forEach(s=>s.onclick=()=>{$('coIn').value=s.dataset.c;draw()})};
  $('coPick').oninput=()=>{$('coIn').value=$('coPick').value;draw()};$('co2Pick').oninput=()=>{$('co2In').value=$('co2Pick').value;draw()};live(['coIn','co2In'],draw);draw()}});

// ---------- timezone converter ----------
const allZones=()=>{try{return Intl.supportedValuesOf('timeZone')}catch{return['UTC','Europe/London','America/New_York','America/Los_Angeles','Asia/Jerusalem','Asia/Tokyo','Australia/Sydney']}};
tool({id:'tz',name:'Time zones',group:'Text & convert',html:`
<h2>Time zone converter</h2><p class="sub">Pick a time and see it in each city. Leave it blank to see the time right now.</p>
<div class="row">From <select id="tzFrom"></select> at <input id="tzDate" type="date"><input id="tzTime" type="time"><button class="g" id="tzNow">Now</button></div>
<table id="tzOut"></table><div class="row"><input id="tzAdd" list="tzList" class="grow" placeholder="Add a city / zone (e.g. Asia/Tokyo)"><datalist id="tzList"></datalist><button class="b" id="tzAddBtn">Add</button></div>`,
init(){const local=Intl.DateTimeFormat().resolvedOptions().timeZone;let zones=load('zones',[local,'UTC','America/New_York','Europe/London','Asia/Tokyo']);
  $('tzList').innerHTML=allZones().map(z=>`<option>${z}</option>`).join('');
  const fillFrom=()=>{const v=$('tzFrom').value||local;$('tzFrom').innerHTML=[...new Set([local,...zones])].map(z=>`<option>${z}</option>`).join('');$('tzFrom').value=v};
  // offset in minutes of zone at a given instant
  const off=(z,d)=>{const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:z,hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}).formatToParts(d).map(x=>[x.type,x.value]));
    return(Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second)-d.getTime())/6e4};
  const instant=()=>{if(!$('tzTime').value)return new Date();const[y,m,d]=($('tzDate').value||isoDay()).split('-').map(Number),[hh,mm]=$('tzTime').value.split(':').map(Number);
    let t=Date.UTC(y,m-1,d,hh,mm);t-=off($('tzFrom').value,new Date(t))*6e4;return new Date(t)};
  const draw=()=>{const t=instant(),z0=$('tzFrom').value;
    $('tzOut').innerHTML=zones.map((z,i)=>{const diff=(off(z,t)-off(z0,t))/60;
      return`<tr><td>${esc(z.replace(/_/g,' '))}</td><td><b>${t.toLocaleTimeString(undefined,{timeZone:z,hour:'2-digit',minute:'2-digit'})}</b> <span class="muted">${t.toLocaleDateString(undefined,{timeZone:z,weekday:'short',month:'short',day:'numeric'})}</span></td><td class="muted">${diff===0?'same':(diff>0?'+':'')+diff+'h'}</td><td><button class="x" data-i="${i}">✕</button></td></tr>`}).join('');
    $('tzOut').querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{zones.splice(b.dataset.i,1);save('zones',zones);fillFrom();draw()})};
  $('tzAddBtn').onclick=()=>{const v=$('tzAdd').value.trim(),z=allZones().find(x=>x.toLowerCase()===v.toLowerCase())||allZones().find(x=>x.toLowerCase().includes(v.toLowerCase().replace(/ /g,'_')));
    if(!v||!z)return toast('Zone not found. Pick one from the list.');if(!zones.includes(z))zones.push(z);save('zones',zones);$('tzAdd').value='';fillFrom();draw()};
  $('tzNow').onclick=()=>{$('tzTime').value='';$('tzDate').value='';draw()};live(['tzFrom','tzDate','tzTime'],draw);fillFrom();draw();setInterval(()=>{if(!$('tzTime').value&&this.sec.classList.contains('on'))draw()},15e3);this.draw=draw},
show(){this.draw()}});

// ---------- random picker ----------
tool({id:'random',name:'Random picker',group:'Text & convert',html:`
<h2>Random picker</h2><p class="sub">Flip a coin, roll dice, pick a number, or pick from a list. Uses fair, secure randomness.</p>
<div class="grid2">
 <div class="box"><b>Coin &amp; dice</b><div class="row"><button class="b" id="rdCoin">Flip coin</button><input id="rdDice" value="2d6" style="width:80px"><button class="b" id="rdRoll">Roll</button></div><div class="big" id="rdOut1">—</div><div class="muted" id="rdDetail"></div></div>
 <div class="box"><b>Number</b><div class="row">From <input id="rdMin" type="number" value="1" style="width:80px"> to <input id="rdMax" type="number" value="100" style="width:80px"><button class="b" id="rdNum">Pick</button></div><div class="big" id="rdOut2">—</div></div>
 <div class="box" style="grid-column:1/-1"><b>Pick from a list</b><textarea id="rdList" placeholder="One item per line"></textarea>
  <div class="row"><button class="b" id="rdPick">Pick one</button><button class="g" id="rdShuffle">Shuffle all</button><label><input type="checkbox" id="rdRemove"> Remove picked items</label></div><div class="big" id="rdOut3">—</div><pre id="rdShuf" style="display:none"></pre></div></div>`,
init(){$('rdList').value=load('randList','');$('rdList').oninput=()=>save('randList',$('rdList').value);
  $('rdCoin').onclick=()=>{$('rdOut1').textContent=rnd(2)?'Heads':'Tails';$('rdDetail').textContent=''};
  $('rdRoll').onclick=()=>{const m=$('rdDice').value.match(/^(\d*)d(\d+)([+-]\d+)?$/i);if(!m)return toast('Use dice like 2d6 or d20+3');
    const n=Math.min(100,+m[1]||1),s=+m[2],r=[...Array(n)].map(()=>rnd(s)+1),bonus=+(m[3]||0);$('rdOut1').textContent=r.reduce((a,b)=>a+b,0)+bonus;$('rdDetail').textContent=`Rolls: ${r.join(', ')}${bonus?` ${m[3]}`:''}`};
  $('rdNum').onclick=()=>{const a=Math.ceil(+$('rdMin').value),b=Math.floor(+$('rdMax').value);if(b<a)return toast('"To" must be bigger.');$('rdOut2').textContent=a+rnd(b-a+1)};
  const items=()=>$('rdList').value.split('\n').map(s=>s.trim()).filter(Boolean);
  $('rdPick').onclick=()=>{const l=items();if(!l.length)return toast('Add some items.');const i=rnd(l.length);$('rdOut3').textContent=l[i];$('rdShuf').style.display='none';
    if($('rdRemove').checked){l.splice(i,1);$('rdList').value=l.join('\n');save('randList',$('rdList').value)}};
  $('rdShuffle').onclick=()=>{const l=items();for(let i=l.length-1;i>0;i--){const j=rnd(i+1);[l[i],l[j]]=[l[j],l[i]]}$('rdShuf').style.display='';$('rdShuf').textContent=l.map((x,i)=>`${i+1}. ${x}`).join('\n');$('rdOut3').textContent='—'}}});
command({word:'roll',help:'roll 2d6',run(r){const m=(r.trim()||'d6').match(/^(\d*)d(\d+)$/i);if(!m)return'Try: roll 2d6';const n=Math.min(100,+m[1]||1),x=[...Array(n)].map(()=>rnd(+m[2])+1);return`🎲 ${x.reduce((a,b)=>a+b,0)} (${x.join(', ')})`}});
command({word:'flip',help:'flip  (coin)',run(){return rnd(2)?'🪙 Heads':'🪙 Tails'}});

// ---------- calculator ----------
function calcEval(expr,ans){const s=expr.toLowerCase().replace(/×/g,'*').replace(/÷/g,'/');
  if(!/^[\d\s.+\-*/%(),^]*$/.test(s.replace(/sqrt|sin|cos|tan|log|ln|abs|round|floor|ceil|pi|ans|e/g,'')))throw new Error('Only numbers, + - * / ^ % ( ) and sqrt, sin, cos, tan, log, ln, abs, round, pi, ans');
  const js=s.replace(/\^/g,'**').replace(/\b(sqrt|sin|cos|tan|abs|round|floor|ceil)\b/g,'Math.$1').replace(/\blog\b/g,'Math.log10').replace(/\bln\b/g,'Math.log').replace(/\bpi\b/g,'Math.PI').replace(/\bans\b/g,'('+ans+')').replace(/\be\b/g,'Math.E');
  const v=Function('"use strict";return ('+js+')')();if(typeof v!=='number'||!isFinite(v))throw new Error('Not a number');return+v.toPrecision(12)}
let calcHist=load('calcHist',[]);
tool({id:'calc',name:'Calculator',group:'Text & convert',html:`
<h2>Calculator with history</h2><p class="sub">Type a sum and press Enter. "ans" is the last answer. Click any past line to reuse it.</p>
<div class="row"><input id="caIn" class="grow" style="font-size:20px;font-family:ui-monospace,monospace" placeholder="(12.5 + 3) * 4 ^ 2"><button class="b" id="caGo">=</button></div>
<div id="caLive" class="muted"></div><ul class="clean" id="caHist"></ul><button class="g" id="caClear">Clear history</button>`,
init(){const ans=()=>calcHist[0]?.r??0;
  const draw=()=>{$('caHist').innerHTML='';calcHist.forEach(h=>{const li=document.createElement('li');li.style.cursor='pointer';
    li.innerHTML=`<span class="muted" style="font-family:ui-monospace,monospace">${esc(h.e)} =</span><b style="font-size:18px">${h.r}</b><button class="x" title="Copy result">⧉</button>`;
    li.onclick=e=>{if(e.target.classList.contains('x'))return copy(String(h.r));$('caIn').value=h.e;$('caIn').focus()};$('caHist').append(li)})};
  const go=()=>{const e=$('caIn').value.trim();if(!e)return;try{const r=calcEval(e,ans());calcHist.unshift({e,r});calcHist=calcHist.slice(0,100);save('calcHist',calcHist);$('caIn').value='';$('caLive').textContent='';draw()}catch(err){$('caLive').textContent=err.message}};
  $('caIn').oninput=()=>{try{$('caLive').textContent=$('caIn').value.trim()?'= '+calcEval($('caIn').value,ans()):''}catch{$('caLive').textContent=''}};
  $('caIn').onkeydown=e=>e.key==='Enter'&&go();$('caGo').onclick=go;$('caClear').onclick=()=>{const b=calcHist;calcHist=[];save('calcHist',[]);draw();toast('History cleared',()=>{calcHist=b;save('calcHist',b);draw()})};draw()}});
command({word:'calc',help:'calc 15% of... → calc 240*0.15',run(r){try{return'= '+calcEval(r,0)}catch(e){return e.message}}});

// ---------- date calculator ----------
tool({id:'dates',name:'Date calculator',group:'Text & convert',html:`
<h2>Date calculator</h2><p class="sub">Find the days between two dates, or add and subtract days from a date.</p>
<div class="grid2"><div class="box"><b>Between two dates</b><div class="row"><input id="dcA" type="date"> → <input id="dcB" type="date"></div><div id="dcOut1"></div></div>
<div class="box"><b>Add / subtract</b><div class="row"><input id="dcC" type="date"><select id="dcSign"><option value="1">+</option><option value="-1">−</option></select><input id="dcN" type="number" value="30" style="width:80px">
<select id="dcUnit"><option value="d">days</option><option value="w">weeks</option><option value="m">months</option><option value="y">years</option><option value="b">working days</option></select></div><div id="dcOut2"></div></div></div>`,
init(){$('dcA').value=$('dcC').value=isoDay();$('dcB').value=isoDay(new Date(Date.now()+30*DAY));
  const draw=()=>{if($('dcA').value&&$('dcB').value){const a=parseIso($('dcA').value),b=parseIso($('dcB').value),days=Math.round((b-a)/DAY);
    let wd=0;const step=days<0?-1:1;for(let i=0;i!==days;i+=step){const d=new Date(a.getFullYear(),a.getMonth(),a.getDate()+i+(step>0?1:0));if(d.getDay()%6)wd++}
    let mo=(b.getFullYear()-a.getFullYear())*12+b.getMonth()-a.getMonth();if(b.getDate()<a.getDate())mo--;
    $('dcOut1').innerHTML=`<div class="big">${Math.abs(days)} days</div><div class="muted">${(Math.abs(days)/7).toFixed(1)} weeks · about ${Math.abs(mo)} months · ${wd} working days${days<0?' (B is before A)':''}</div>`}
  if($('dcC').value){const d=parseIso($('dcC').value),n=(+$('dcN').value||0)*$('dcSign').value,u=$('dcUnit').value;
    if(u==='d')d.setDate(d.getDate()+n);else if(u==='w')d.setDate(d.getDate()+7*n);else if(u==='m')d.setMonth(d.getMonth()+n);else if(u==='y')d.setFullYear(d.getFullYear()+n);
    else{let left=Math.abs(n);const s=Math.sign(n);while(left>0){d.setDate(d.getDate()+s);if(d.getDay()%6)left--}}
    $('dcOut2').innerHTML=`<div class="big">${d.toLocaleDateString(undefined,{weekday:'short',year:'numeric',month:'short',day:'numeric'})}</div>`}};
  live(['dcA','dcB','dcC','dcSign','dcN','dcUnit'],draw);draw()}});

// ---------- markdown preview ----------
function md(src){const blocks=[];let s=esc(src).replace(/```(\w*)\n([\s\S]*?)```/g,(m,l,c)=>{blocks.push(`<pre>${c}</pre>`);return`\u0000${blocks.length-1}\u0000`});
  const inline=t=>t.replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>').replace(/__([^_]+)__/g,'<b>$1</b>').replace(/\*([^*]+)\*/g,'<i>$1</i>').replace(/(^|\W)_([^_]+)_(?=\W|$)/g,'$1<i>$2</i>').replace(/~~([^~]+)~~/g,'<s>$1</s>')
    .replace(/!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g,'<img alt="$1" src="$2" style="max-width:100%">').replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>');
  const out=[];let list=null,para=[];
  const flush=()=>{if(para.length){out.push('<p>'+inline(para.join(' '))+'</p>');para=[]}if(list){out.push(`</${list}>`);list=null}};
  s.split('\n').forEach(l=>{let m;
    if(/^\u0000\d+\u0000$/.test(l.trim())){flush();out.push(l.trim())}
    else if(m=l.match(/^(#{1,6})\s+(.*)/)){flush();out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`)}
    else if(/^\s*([-*_])\s*\1\s*\1[\s\1]*$/.test(l)){flush();out.push('<hr>')}
    else if(m=l.match(/^\s*(?:[-*+]|(\d+)\.)\s+(.*)/)){if(para.length){out.push('<p>'+inline(para.join(' '))+'</p>');para=[]}const t=m[1]?'ol':'ul';if(list!==t){if(list)out.push(`</${list}>`);out.push(`<${t}>`);list=t}
      out.push('<li>'+inline(m[2].replace(/^\[ \]\s/,'☐ ').replace(/^\[x\]\s/i,'☑ '))+'</li>')}
    else if(m=l.match(/^&gt;\s?(.*)/)){flush();out.push(`<blockquote style="border-left:3px solid var(--line);margin:0;padding-left:10px">${inline(m[1])}</blockquote>`)}
    else if(!l.trim())flush();else{if(list){out.push(`</${list}>`);list=null}para.push(l)}});
  flush();return out.join('\n').replace(/\u0000(\d+)\u0000/g,(m,i)=>blocks[i])}
tool({id:'markdown',name:'Markdown preview',group:'Text & convert',html:`
<h2>Markdown preview</h2><p class="sub">Type Markdown on the left and see it rendered on the right. Supports headings, **bold**, *italic*, lists, links, \`code\`, code blocks and quotes.</p>
<div class="grid2"><textarea id="mdIn" style="min-height:360px;font-family:ui-monospace,monospace"></textarea><div class="box md" id="mdOut" style="min-height:360px;overflow:auto"></div></div>
<div class="row"><button class="g" id="mdCopy">Copy HTML</button><button class="g" id="mdSave">Save .md</button><span id="mdMsg" class="muted"></span></div>`,
init(){$('mdIn').value=load('md','# Hello\n\nSome **bold** and *italic* text, plus a [link](https://example.com).\n\n- one\n- two\n\n> A quote\n\n```\ncode block\n```');
  const draw=()=>{save('md',$('mdIn').value);$('mdOut').innerHTML=md($('mdIn').value)};$('mdIn').oninput=draw;draw();
  $('mdCopy').onclick=()=>copy($('mdOut').innerHTML,$('mdMsg'));$('mdSave').onclick=()=>download('note.md',$('mdIn').value,'text/markdown')}});

// ---------- JSON formatter ----------
tool({id:'json',name:'JSON formatter',group:'Text & convert',html:`
<h2>JSON formatter</h2><p class="sub">Paste messy JSON to tidy it, shrink it, or find where it's broken.</p>
<textarea id="jsIn" style="min-height:260px;font-family:ui-monospace,monospace" placeholder='{"paste":"json here"}'></textarea>
<div class="row"><button class="b" id="jsFmt">Format</button><button class="g" id="jsMin">Minify</button><button class="g" id="jsSort">Sort keys</button><select id="jsInd"><option value="2">2 spaces</option><option value="4">4 spaces</option><option value="tab">Tabs</option></select><button class="g" id="jsCopy">Copy</button><span id="jsMsg"></span></div>`,
init(){const ind=()=>$('jsInd').value==='tab'?'\t':+$('jsInd').value;
  const sortKeys=v=>Array.isArray(v)?v.map(sortKeys):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,sortKeys(v[k])])):v;
  const run=fn=>{const t=$('jsIn').value;try{const v=JSON.parse(t);$('jsIn').value=fn(v);$('jsMsg').innerHTML='<span style="color:var(--good)">✓ Valid JSON</span>'}
    catch(e){let pos=+(e.message.match(/position (\d+)/)||[])[1];const lc=e.message.match(/line (\d+) column (\d+)/);
      if(!isNaN(pos)){const before=t.slice(0,pos);const line=before.split('\n').length,col=pos-before.lastIndexOf('\n');$('jsMsg').innerHTML=`<span style="color:var(--bad)">✗ Error at line ${line}, column ${col}</span>`;$('jsIn').focus();$('jsIn').setSelectionRange(pos,pos+1)}
      else $('jsMsg').innerHTML=`<span style="color:var(--bad)">✗ ${esc(lc?`Error at line ${lc[1]}, column ${lc[2]}`:e.message)}</span>`}};
  $('jsFmt').onclick=()=>run(v=>JSON.stringify(v,null,ind()));$('jsMin').onclick=()=>run(v=>JSON.stringify(v));$('jsSort').onclick=()=>run(v=>JSON.stringify(sortKeys(v),null,ind()));
  $('jsCopy').onclick=()=>copy($('jsIn').value)}});

// ---------- image resizer ----------
tool({id:'images',name:'Image resizer',group:'Text & convert',html:`
<h2>Image resizer &amp; compressor</h2><p class="sub">Shrink photos right in your browser. Nothing is uploaded.</p>
<div class="row"><input type="file" id="imFiles" multiple accept="image/*"></div>
<div class="row">Max width <input id="imW" type="number" value="1600" style="width:90px"> Max height <input id="imH" type="number" value="1600" style="width:90px">
<select id="imFmt"><option value="image/jpeg">JPEG</option><option value="image/webp">WebP</option><option value="image/png">PNG</option></select>Quality <input id="imQ" type="range" min="30" max="100" value="80"><span id="imQv"></span><button class="b" id="imGo">Resize</button></div>
<div id="imOut" class="grid3"></div>`,
init(){$('imQ').oninput=()=>$('imQv').textContent=$('imQ').value+'%';$('imQ').oninput();
  $('imGo').onclick=async()=>{const fs=[...$('imFiles').files];if(!fs.length)return toast('Choose images first.');$('imOut').innerHTML='';
    const ext={'image/jpeg':'.jpg','image/webp':'.webp','image/png':'.png'}[$('imFmt').value];
    for(const f of fs){try{const bmp=await createImageBitmap(f),k=Math.min(1,(+$('imW').value||1e9)/bmp.width,(+$('imH').value||1e9)/bmp.height);
      const c=document.createElement('canvas');c.width=Math.round(bmp.width*k);c.height=Math.round(bmp.height*k);const x=c.getContext('2d');
      if($('imFmt').value==='image/jpeg'){x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height)}x.drawImage(bmp,0,0,c.width,c.height);
      const blob=await new Promise(r=>c.toBlob(r,$('imFmt').value,+$('imQ').value/100)),url=URL.createObjectURL(blob),name=splitExt(f.name)[0]+'_small'+ext;
      const pct=Math.round((1-blob.size/f.size)*100);
      $('imOut').insertAdjacentHTML('beforeend',`<div class="box"><img src="${url}" style="width:100%;border-radius:6px"><div style="font-size:13px">${esc(f.name)}<br>${bmp.width}×${bmp.height} → ${c.width}×${c.height}<br>${humanSize(f.size)} → <b>${humanSize(blob.size)}</b> <span style="color:var(--${pct>0?'good':'bad'})">(${pct>0?'-':'+'}${Math.abs(pct)}%)</span></div><a class="b" style="display:inline-block;margin-top:6px;padding:5px 10px;border-radius:8px;background:var(--accent);color:var(--accent-ink);text-decoration:none" href="${url}" download="${esc(name)}">Download</a></div>`)}
      catch{$('imOut').insertAdjacentHTML('beforeend',`<div class="box">Could not read ${esc(f.name)}</div>`)}}}}});
