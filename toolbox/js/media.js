// Media & dev: regex tester, encoder, fake data, colors from image, PDF merger, audio trimmer, GIF maker.

// ---------- regex tester ----------
tool({id:'regex',name:'Regex tester',group:'Media & dev',html:`
<h2>Regex tester</h2><p class="sub">Type a pattern and some text. Matches are highlighted live, with each one's capture groups listed below.</p>
<div class="row"><span style="font-family:ui-monospace,monospace">/</span><input id="reP" class="grow" style="font-family:ui-monospace,monospace" placeholder="(\\d{3})-(\\d{4})" spellcheck="false"><span style="font-family:ui-monospace,monospace">/</span><input id="reF" style="width:70px;font-family:ui-monospace,monospace" value="g" placeholder="flags"></div>
<div id="reErr" style="color:var(--bad)"></div>
<textarea id="reIn" style="min-height:120px;font-family:ui-monospace,monospace" spellcheck="false">Call 555-1234 or 555-9876 today.</textarea>
<div id="reOut" class="box" style="font-family:ui-monospace,monospace;white-space:pre-wrap;word-break:break-word"></div>
<div class="row"><input id="reRep" class="grow" placeholder="Replace with (use $1, $2 for groups)" style="font-family:ui-monospace,monospace"></div><pre id="reRepOut"></pre>
<h3>Matches</h3><table id="reList"></table>
<details><summary>Cheat sheet</summary><table style="font-size:13px"><tr><td><code>\\d \\w \\s</code></td><td>digit, word character, space (capital = NOT)</td></tr><tr><td><code>. * + ?</code></td><td>any character; 0 or more; 1 or more; optional</td></tr><tr><td><code>{2,4}</code></td><td>between 2 and 4 times</td></tr><tr><td><code>[abc] [^abc]</code></td><td>one of / none of</td></tr><tr><td><code>^ $ \\b</code></td><td>start, end, word edge</td></tr><tr><td><code>(…) (?:…) (?&lt;name&gt;…)</code></td><td>group, non-capturing group, named group</td></tr><tr><td>flags</td><td>g all matches · i ignore case · m multiline · s dot matches newlines</td></tr></table></details>`,
init(){const draw=()=>{const p=$('reP').value,t=$('reIn').value;$('reErr').textContent='';
  if(!p){$('reOut').textContent=t;$('reList').innerHTML='';$('reRepOut').textContent='';return}
  let re;try{re=new RegExp(p,[...new Set(($('reF').value.replace(/[^gimsuyd]/g,'')+'g'))].join(''))}catch(e){$('reErr').textContent=e.message;return}
  const ms=[...t.matchAll(re)].filter(m=>m[0]!==''||true).slice(0,500);let html='',last=0;
  ms.forEach((m,i)=>{html+=esc(t.slice(last,m.index))+`<mark title="Match ${i+1}" style="background:color-mix(in srgb,var(--accent) 35%,transparent);color:inherit;border-radius:3px">${esc(m[0])||'│'}</mark>`;last=m.index+m[0].length});
  $('reOut').innerHTML=html+esc(t.slice(last));
  $('reList').innerHTML=ms.length?'<tr><th>#</th><th>Match</th><th>Groups</th><th>At</th></tr>'+ms.map((m,i)=>`<tr><td>${i+1}</td><td><code>${esc(m[0])}</code></td><td>${m.slice(1).map((g,j)=>`<code>$${j+1}=${esc(g??'')}</code>`).join(' ')}${m.groups?' '+Object.entries(m.groups).map(([k,v])=>`<code>${esc(k)}=${esc(v??'')}</code>`).join(' '):''}</td><td>${m.index}</td></tr>`).join(''):'<tr><td class="muted">No matches.</td></tr>';
  try{$('reRepOut').textContent=$('reRep').value?t.replace(new RegExp(p,$('reF').value.replace(/[^gimsuyd]/g,'')),$('reRep').value):''}catch{}};
  live(['reP','reF','reIn','reRep'],draw);draw()}});

// ---------- encoder / decoder ----------
const b64enc=s=>btoa(String.fromCharCode(...new TextEncoder().encode(s))),b64dec=s=>new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/').replace(/\s/g,'')),c=>c.charCodeAt(0)));
const CODECS={'Base64':[b64enc,b64dec],'Base64 URL-safe':[s=>b64enc(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''),b64dec],
  'URL (encodeURIComponent)':[encodeURIComponent,decodeURIComponent],'HTML entities':[s=>s.replace(/[&<>"']/g,c=>`&#${c.charCodeAt(0)};`),s=>{const t=document.createElement('textarea');t.innerHTML=s;return t.value}],
  'Hex':[s=>[...new TextEncoder().encode(s)].map(b=>b.toString(16).padStart(2,'0')).join(' '),s=>new TextDecoder().decode(Uint8Array.from(s.replace(/[^0-9a-f]/gi,'').match(/../g)||[],h=>parseInt(h,16)))],
  'Binary':[s=>[...new TextEncoder().encode(s)].map(b=>b.toString(2).padStart(8,'0')).join(' '),s=>new TextDecoder().decode(Uint8Array.from(s.replace(/[^01]/g,'').match(/.{8}/g)||[],b=>parseInt(b,2)))],
  'ROT13':[s=>s.replace(/[a-z]/gi,c=>String.fromCharCode((c<='Z'?90:122)>=(c=c.charCodeAt(0)+13)?c:c-26)),null],
  'JWT (decode only)':[null,s=>s.split('.').slice(0,2).map(p=>JSON.stringify(JSON.parse(b64dec(p)),null,2)).join('\n\n')]};
CODECS['ROT13'][1]=CODECS['ROT13'][0];
tool({id:'encode',name:'Encoder / decoder',group:'Media & dev',html:`
<h2>Encoder / decoder</h2><p class="sub">Base64, URL, HTML entities, hex, binary, ROT13, and reading JWT tokens.</p>
<div class="row"><select id="enKind"></select><button class="b" id="enEnc">Encode ↓</button><button class="b" id="enDec">Decode ↓</button><button class="g" id="enSwap">⇅ Swap</button><button class="g" id="enCopy">Copy result</button></div>
<textarea id="enIn" placeholder="Input" spellcheck="false" style="font-family:ui-monospace,monospace"></textarea><div id="enErr" style="color:var(--bad)"></div>
<textarea id="enOut" placeholder="Result" readonly style="font-family:ui-monospace,monospace"></textarea>`,
init(){$('enKind').innerHTML=Object.keys(CODECS).map(k=>`<option>${k}</option>`).join('');
  const run=i=>{$('enErr').textContent='';const f=CODECS[$('enKind').value][i];if(!f)return $('enErr').textContent='That direction is not available for this format.';
    try{$('enOut').value=f($('enIn').value)}catch(e){$('enErr').textContent='Could not '+(i?'decode':'encode')+': '+e.message}};
  $('enEnc').onclick=()=>run(0);$('enDec').onclick=()=>run(1);$('enSwap').onclick=()=>{[$('enIn').value,$('enOut').value]=[$('enOut').value,$('enIn').value]};$('enCopy').onclick=()=>copy($('enOut').value)}});

// ---------- lorem ipsum & fake data ----------
const LOREM='lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum'.split(' ');
const FIRST='Ava Liam Noah Emma Olivia Mia Lucas Ethan Zoe Leo Maya Omar Aria Yusuf Sofia Hana Kai Nora Eli Amara Theo Ivy Ravi Lena Felix'.split(' '),LAST='Smith Johnson Garcia Chen Patel Kim Cohen Müller Rossi Nguyen Silva Okafor Haddad Larsen Novak Tanaka Brown Levi Moreau Singh'.split(' ');
const CITIES='Springfield Riverton Lakeside Fairview Oakridge Maplewood Brookfield Hillcrest Westbury Easton'.split(' '),STREETS='Main Oak Pine Maple Cedar Elm Park Lake Hill Sunset'.split(' ');
const pickR=a=>a[rnd(a.length)],sentence=()=>{const w=[...Array(6+rnd(10))].map(()=>pickR(LOREM));w[0]=w[0][0].toUpperCase()+w[0].slice(1);return w.join(' ')+'.'};
const FAKE={name:()=>pickR(FIRST)+' '+pickR(LAST),email:n=>n.toLowerCase().replace(/[^a-z ]/g,'').replace(' ','.')+'@example.com',phone:()=>`(555) ${100+rnd(900)}-${1000+rnd(9000)}`,
  address:()=>`${1+rnd(999)} ${pickR(STREETS)} St, ${pickR(CITIES)}`,date:()=>isoDay(new Date(Date.now()-rnd(3650)*DAY)),age:()=>18+rnd(60),company:()=>pickR(LAST)+' '+pickR(['Labs','& Co','Group','Studio','Systems','Foods'])};
tool({id:'fake',name:'Placeholder text & data',group:'Media & dev',html:`
<h2>Lorem ipsum &amp; fake data</h2><p class="sub">Filler text and made-up people for mockups and tests. Every name, phone number and address is invented. Phone numbers use 555 and emails use example.com, so none of them reach a real person.</p>
<div class="grid2"><div class="box"><b>Text</b><div class="row"><input id="loN" type="number" value="3" style="width:70px"><select id="loKind"><option value="p">paragraphs</option><option value="s">sentences</option><option value="w">words</option></select><button class="b" id="loGo">Make</button><button class="g" id="loCopy">Copy</button></div><textarea id="loOut" style="min-height:160px"></textarea></div>
<div class="box"><b>People</b><div class="row"><input id="fkN" type="number" value="10" style="width:70px"> rows as <select id="fkFmt"><option>CSV</option><option>JSON</option><option>Table</option></select><button class="b" id="fkGo">Make</button><button class="g" id="fkCopy">Copy</button></div>
<div class="row" id="fkCols"></div><div id="fkOut"></div></div></div>`,
init(){$('loGo').onclick=()=>{const n=Math.min(200,+$('loN').value||1),k=$('loKind').value;
  $('loOut').value=k==='w'?[...Array(n)].map(()=>pickR(LOREM)).join(' '):k==='s'?[...Array(n)].map(sentence).join(' '):[...Array(n)].map(()=>[...Array(4+rnd(4))].map(sentence).join(' ')).join('\n\n')};
  $('loCopy').onclick=()=>copy($('loOut').value);$('loGo').click();
  const cols=Object.keys(FAKE);$('fkCols').innerHTML=cols.map(c=>`<label class="tag"><input type="checkbox" value="${c}" ${['name','email','phone','city'].includes(c)||c==='address'?'checked':''}> ${c}</label>`).join('');
  let text='';$('fkGo').onclick=()=>{const use=[...$('fkCols').querySelectorAll('input:checked')].map(c=>c.value);if(!use.length)return toast('Pick some columns.');
    const rows=[...Array(Math.min(1000,+$('fkN').value||1))].map(()=>{const n=FAKE.name(),r={};use.forEach(c=>r[c]=c==='name'?n:c==='email'?FAKE.email(n):FAKE[c]());return r}),fmt=$('fkFmt').value;
    text=fmt==='JSON'?JSON.stringify(rows,null,2):[use.join(','),...rows.map(r=>use.map(c=>/[",]/.test(r[c])?`"${String(r[c]).replace(/"/g,'""')}"`:r[c]).join(','))].join('\n');
    $('fkOut').innerHTML=fmt==='Table'?`<div style="overflow-x:auto"><table><tr>${use.map(c=>`<th>${c}</th>`).join('')}</tr>${rows.map(r=>`<tr>${use.map(c=>`<td>${esc(r[c])}</td>`).join('')}</tr>`).join('')}</table></div>`:`<pre>${esc(text)}</pre>`};
  $('fkCopy').onclick=()=>{if(!text)$('fkGo').click();copy(text)};$('fkGo').click()}});

// ---------- colors from an image ----------
// Median-cut-ish palette: bucket pixels, merge similar, rank by count (vivid colors get a bonus).
function paletteFromCanvas(ctx,w,h,n=6){const d=ctx.getImageData(0,0,w,h).data,b={};
  for(let i=0;i<d.length;i+=16){if(d[i+3]<128)continue;const k=(d[i]>>4)<<8|(d[i+1]>>4)<<4|(d[i+2]>>4);const e=b[k]||(b[k]={r:0,g:0,b:0,n:0});e.r+=d[i];e.g+=d[i+1];e.b+=d[i+2];e.n++}
  const cols=Object.values(b).map(e=>{const c=[e.r/e.n,e.g/e.n,e.b/e.n],[,s,l]=toHsl(c);return{c,n:e.n,score:e.n*(1+s/50)*(l>8&&l<92?1:.3)}}).sort((a,b)=>b.score-a.score),out=[];
  for(const x of cols){if(out.every(o=>Math.hypot(o.c[0]-x.c[0],o.c[1]-x.c[1],o.c[2]-x.c[2])>48))out.push(x);if(out.length>=n)break}return out.map(o=>toHex(o.c))}
async function imageToCanvas(file,max=320){const bmp=await createImageBitmap(file),k=Math.min(1,max/Math.max(bmp.width,bmp.height)),c=document.createElement('canvas');c.width=Math.round(bmp.width*k);c.height=Math.round(bmp.height*k);
  const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(bmp,0,0,c.width,c.height);return{c,ctx}}
tool({id:'imgcolors',name:'Colors from image',group:'Media & dev',html:`
<h2>Colors from an image</h2><p class="sub">Upload a picture to get its main colors. Click anywhere on the picture to pick that exact pixel. Click a swatch to copy it.</p>
<div class="row"><input type="file" id="icFile" accept="image/*"></div><div class="grid2"><div><canvas id="icCanvas" style="max-width:100%;border-radius:8px;cursor:crosshair"></canvas></div>
<div><b>Palette</b><div id="icPal" style="display:flex;flex-wrap:wrap;gap:6px;margin:6px 0"></div><b>Picked</b><div id="icPick" class="row"></div></div></div>`,
init(){const sw=h=>`<div title="Copy ${h}" data-c="${h}" style="cursor:pointer;text-align:center;font-size:12px"><div class="swatch" style="background:${h}"></div>${h}</div>`;
  const wire=el=>el.querySelectorAll('[data-c]').forEach(s=>s.onclick=()=>copy(s.dataset.c));
  $('icFile').onchange=async()=>{const f=$('icFile').files[0];if(!f)return;const{c}=await imageToCanvas(f,640),v=$('icCanvas');v.width=c.width;v.height=c.height;const ctx=v.getContext('2d',{willReadFrequently:true});ctx.drawImage(c,0,0);
    $('icPal').innerHTML=paletteFromCanvas(ctx,v.width,v.height,8).map(sw).join('');wire($('icPal'))};
  $('icCanvas').onclick=e=>{const v=$('icCanvas'),r=v.getBoundingClientRect(),x=Math.floor((e.clientX-r.left)*v.width/r.width),y=Math.floor((e.clientY-r.top)*v.height/r.height),p=v.getContext('2d').getImageData(x,y,1,1).data;
    $('icPick').insertAdjacentHTML('afterbegin',sw(toHex([p[0],p[1],p[2]])));wire($('icPick'))}}});

// ---------- PDF merger ----------
tool({id:'pdf',name:'PDF merger',group:'Media & dev',html:`
<h2>PDF merger</h2><p class="sub">Combine PDFs into one, in the order you choose. Everything happens in your browser and no files are uploaded. Needs internet the first time to load the PDF library.</p>
<div class="row"><input type="file" id="pdfFiles" accept="application/pdf" multiple></div><ul class="clean" id="pdfList"></ul>
<div class="row"><input id="pdfName" value="merged.pdf"><button class="b" id="pdfGo">Merge &amp; download</button><span id="pdfMsg" class="muted"></span></div>`,
init(){let files=[];const draw=()=>{$('pdfList').innerHTML='';files.forEach((f,i)=>{const li=document.createElement('li');
  li.innerHTML=`<span class="grow">${i+1}. ${esc(f.name)} <span class="muted">${humanSize(f.size)}</span></span><button class="g" ${i?'':'disabled'}>↑</button><button class="g" ${i<files.length-1?'':'disabled'}>↓</button><button class="x">✕</button>`;
  const[u,d,x]=li.querySelectorAll('button');u.onclick=()=>{[files[i-1],files[i]]=[files[i],files[i-1]];draw()};d.onclick=()=>{[files[i+1],files[i]]=[files[i],files[i+1]];draw()};x.onclick=()=>{files.splice(i,1);draw()};$('pdfList').append(li)})};
  $('pdfFiles').onchange=()=>{files.push(...$('pdfFiles').files);$('pdfFiles').value='';draw()};
  $('pdfGo').onclick=async()=>{if(files.length<2)return toast('Add at least two PDFs.');$('pdfMsg').textContent='Loading…';
    try{await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js');const out=await PDFLib.PDFDocument.create();let pages=0;
      for(const f of files){$('pdfMsg').textContent='Adding '+f.name+'…';const src=await PDFLib.PDFDocument.load(await f.arrayBuffer(),{ignoreEncryption:true});(await out.copyPages(src,src.getPageIndices())).forEach(p=>{out.addPage(p);pages++})}
      const bytes=await out.save(),a=document.createElement('a');a.href=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));a.download=($('pdfName').value||'merged').replace(/(\.pdf)?$/i,'.pdf');a.click();
      $('pdfMsg').textContent=`Done: ${pages} pages, ${humanSize(bytes.length)}.`}catch(e){$('pdfMsg').textContent='Could not merge: '+e.message}}}});

// ---------- audio trimmer ----------
function wavBlob(buf,from,to,fadeIn,fadeOut){const sr=buf.sampleRate,ch=buf.numberOfChannels,s0=Math.floor(from*sr),s1=Math.floor(to*sr),n=s1-s0,fi=fadeIn*sr,fo=fadeOut*sr;
  const view=new DataView(new ArrayBuffer(44+n*ch*2)),w=(o,s)=>[...s].forEach((c,i)=>view.setUint8(o+i,c.charCodeAt(0)));
  w(0,'RIFF');view.setUint32(4,36+n*ch*2,true);w(8,'WAVE');w(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,ch,true);view.setUint32(24,sr,true);view.setUint32(28,sr*ch*2,true);view.setUint16(32,ch*2,true);view.setUint16(34,16,true);w(36,'data');view.setUint32(40,n*ch*2,true);
  const data=[...Array(ch)].map((_,c)=>buf.getChannelData(c));let o=44;
  for(let i=0;i<n;i++){const g=Math.min(1,fi?i/fi:1,fo?(n-i)/fo:1);for(let c=0;c<ch;c++){const v=Math.max(-1,Math.min(1,data[c][s0+i]*g));view.setInt16(o,v<0?v*32768:v*32767,true);o+=2}}
  return new Blob([view],{type:'audio/wav'})}
tool({id:'audio',name:'Audio trimmer',group:'Media & dev',html:`
<h2>Audio trimmer</h2><p class="sub">Open an MP3, WAV or M4A file, choose the start and end, add fades, preview it, and download the clip as WAV. Browsers can't write MP3 files.</p>
<div class="row"><input type="file" id="auFile" accept="audio/*,video/*"></div><canvas id="auWave" style="width:100%;height:110px;background:var(--bg);border-radius:8px;cursor:pointer" title="Click: set start · Shift+click: set end"></canvas>
<div class="row">Start <input id="auS" type="number" step="0.1" min="0" style="width:90px"> End <input id="auE" type="number" step="0.1" min="0" style="width:90px"> s · Fade in <input id="auFi" type="number" step="0.1" value="0" style="width:70px"> Fade out <input id="auFo" type="number" step="0.1" value="0.5" style="width:70px"> s</div>
<div class="row"><button class="b" id="auPlay">▶ Preview</button><button class="b" id="auSave">Download WAV</button><span id="auMsg" class="muted"></span></div>`,
init(){let buf=null,ac=null,src=null;const S=()=>+$('auS').value||0,E=()=>Math.min(buf?.duration||0,+$('auE').value||0);
  const draw=()=>{const c=$('auWave'),x=c.getContext('2d');c.width=c.clientWidth*devicePixelRatio;c.height=110*devicePixelRatio;x.clearRect(0,0,c.width,c.height);if(!buf)return;
    const d=buf.getChannelData(0),step=Math.ceil(d.length/c.width),mid=c.height/2,cs=getComputedStyle(document.documentElement);
    x.fillStyle=cs.getPropertyValue('--accent');x.globalAlpha=.25;x.fillRect(S()/buf.duration*c.width,0,(E()-S())/buf.duration*c.width,c.height);x.globalAlpha=1;x.fillStyle=cs.getPropertyValue('--ink');
    for(let i=0;i<c.width;i++){let mn=1,mx=-1;for(let j=0;j<step;j+=8){const v=d[i*step+j]||0;if(v<mn)mn=v;if(v>mx)mx=v}x.fillRect(i,mid+mn*mid,1,Math.max(1,(mx-mn)*mid))}};
  $('auFile').onchange=async()=>{const f=$('auFile').files[0];if(!f)return;$('auMsg').textContent='Reading…';ac=ac||new AudioContext();
    try{buf=await ac.decodeAudioData(await f.arrayBuffer());$('auS').value=0;$('auE').value=buf.duration.toFixed(1);$('auMsg').textContent=`${buf.duration.toFixed(1)} s, ${buf.numberOfChannels} channel(s)`;this.name=f.name.replace(/\.[^.]+$/,'');draw()}
    catch{$('auMsg').textContent='This browser cannot read that file.'}};
  $('auWave').onclick=e=>{if(!buf)return;const r=$('auWave').getBoundingClientRect(),t=((e.clientX-r.left)/r.width*buf.duration).toFixed(1);if(e.shiftKey)$('auE').value=t;else $('auS').value=t;draw()};
  live(['auS','auE'],draw);window.addEventListener('resize',()=>this.sec.classList.contains('on')&&draw());
  $('auPlay').onclick=()=>{if(!buf)return toast('Open a file first.');if(src){src.stop();src=null;$('auPlay').textContent='▶ Preview';return}
    const g=ac.createGain(),now=ac.currentTime,len=E()-S(),fi=+$('auFi').value||0,fo=+$('auFo').value||0;g.gain.setValueAtTime(fi?0:1,now);if(fi)g.gain.linearRampToValueAtTime(1,now+fi);
    if(fo){g.gain.setValueAtTime(1,now+Math.max(fi,len-fo));g.gain.linearRampToValueAtTime(0,now+len)}
    src=ac.createBufferSource();src.buffer=buf;src.connect(g);g.connect(ac.destination);src.start(0,S(),len);$('auPlay').textContent='■ Stop';src.onended=()=>{src=null;$('auPlay').textContent='▶ Preview'}};
  $('auSave').onclick=()=>{if(!buf)return toast('Open a file first.');if(E()<=S())return toast('End must be after start.');
    const b=wavBlob(buf,S(),E(),+$('auFi').value||0,+$('auFo').value||0),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=(this.name||'clip')+'_trim.wav';a.click();$('auMsg').textContent='Saved '+humanSize(b.size)}}});

// ---------- GIF maker ----------
tool({id:'gif',name:'GIF maker',group:'Media & dev',html:`
<h2>GIF maker</h2><p class="sub">Turn a few seconds of a video into a looping GIF. If you marked chapters in Video chapters, pick one to start from. Needs internet the first time to load the GIF encoder.</p>
<div class="row"><input type="file" id="gfFile" accept="video/*"><select id="gfChap"><option value="">(start from a chapter…)</option></select></div><video id="gfVid" controls muted style="max-height:280px"></video>
<div class="row">Start <input id="gfS" type="number" step="0.1" value="0" style="width:80px"> s · Length <input id="gfLen" type="number" step="0.5" value="3" min="0.5" max="15" style="width:70px"> s · <input id="gfFps" type="number" value="10" min="2" max="20" style="width:60px"> fps · width <input id="gfW" type="number" value="360" min="80" max="800" style="width:80px"> px <button class="g" id="gfHere">Use current time</button></div>
<div class="row"><button class="b" id="gfGo">Make GIF</button><span id="gfMsg" class="muted"></span></div><div id="gfOut"></div>`,
init(){const v=$('gfVid');
  $('gfFile').onchange=()=>{const f=$('gfFile').files[0];if(f){v.src=URL.createObjectURL(f);this.name=f.name.replace(/\.[^.]+$/,'')}};
  $('gfHere').onclick=()=>$('gfS').value=v.currentTime.toFixed(1);$('gfChap').onchange=()=>{if($('gfChap').value!==''){$('gfS').value=(+$('gfChap').value).toFixed(1);v.currentTime=+$('gfChap').value}};
  $('gfGo').onclick=async()=>{if(!v.src)return toast('Open a video first.');$('gfMsg').textContent='Loading encoder…';
    let G;try{G=await import('https://cdn.jsdelivr.net/npm/gifenc@1.0.3/+esm')}catch{$('gfMsg').textContent='Could not load the GIF encoder (offline?)';return}
    const fps=Math.min(20,Math.max(2,+$('gfFps').value||10)),len=Math.min(15,Math.max(.5,+$('gfLen').value||3)),s=+$('gfS').value||0,w=Math.min(800,+$('gfW').value||360),h=Math.round(w*v.videoHeight/v.videoWidth/2)*2;
    const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d',{willReadFrequently:true}),gif=G.GIFEncoder(),n=Math.round(len*fps);v.pause();
    for(let i=0;i<n;i++){const t=s+i/fps;if(t>v.duration)break;await new Promise(r=>{v.onseeked=r;v.currentTime=t});ctx.drawImage(v,0,0,w,h);
      const d=ctx.getImageData(0,0,w,h).data,pal=G.quantize(d,256);gif.writeFrame(G.applyPalette(d,pal),w,h,{palette:pal,delay:Math.round(1000/fps)});$('gfMsg').textContent=`Frame ${i+1} of ${n}…`}
    gif.finish();const blob=new Blob([gif.bytes()],{type:'image/gif'}),url=URL.createObjectURL(blob);
    $('gfOut').innerHTML=`<img src="${url}" style="max-width:100%;border-radius:8px"><div class="row"><a class="b" style="padding:6px 12px;border-radius:8px;background:var(--accent);color:var(--accent-ink);text-decoration:none" href="${url}" download="${esc((this.name||'clip')+'.gif')}">Download GIF</a><span class="muted">${humanSize(blob.size)}</span></div>`;$('gfMsg').textContent='Done!'}},
show(){$('gfChap').innerHTML='<option value="">(start from a chapter…)</option>'+(typeof chList==='function'?chList():[]).map(c=>`<option value="${c.t}">${ts(c.t)} ${esc(c.n)}</option>`).join('')}});
