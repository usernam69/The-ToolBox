// Files: a web page can't touch your disk, so these tools write a PowerShell script you check and run yourself.
const splitExt=n=>{const i=n.lastIndexOf('.');return i>0?[n.slice(0,i),n.slice(i)]:[n,'']};
// path inside the picked folder, Windows style ("sub\a.jpg"); plain file pickers give just the name
const relPath=f=>f.webkitRelativePath?f.webkitRelativePath.split('/').slice(1).join('\\'):f.name;
const humanSize=b=>b<1024?b+' B':b<1048576?(b/1024).toFixed(1)+' KB':b<1073741824?(b/1048576).toFixed(1)+' MB':(b/1073741824).toFixed(2)+' GB';
const cd=folder=>`Set-Location -LiteralPath ${ps(folder||'.')}`;
// Renames in two passes through temporary names so swaps (a→b, b→a) can't clash.
function renameScript(folder,pairs){const ch=pairs.filter(([o,n])=>o!==n);if(!ch.length)return'';
  return[cd(folder),...ch.map(([o],i)=>`Rename-Item -LiteralPath ${ps(o)} -NewName ${ps('__tmp_'+i+'__'+splitExt(o.split('\\').pop())[1])}`),
    ...ch.map(([o,n],i)=>{const dir=o.includes('\\')?o.slice(0,o.lastIndexOf('\\')+1):'';return`Rename-Item -LiteralPath ${ps(dir+'__tmp_'+i+'__'+splitExt(o.split('\\').pop())[1])} -NewName ${ps(n.split('\\').pop())}`})].join('\n')}
function moveScript(folder,groups){const ks=Object.keys(groups);if(!ks.length)return'';
  return[cd(folder),...ks.flatMap(k=>[`New-Item -ItemType Directory -Force ${ps(k)} | Out-Null`,...groups[k].map(n=>`Move-Item -LiteralPath ${ps(n)} -Destination ${ps(k)}`)])].join('\n')}
function previewTable(tbody,pairs){const seen=new Set();
  tbody.innerHTML=pairs.map(([o,n])=>{const k=n.toLowerCase(),dup=seen.has(k);seen.add(k);
    return`<tr><td>${esc(o)}</td><td style="color:${dup?'var(--bad)':o===n?'var(--muted)':'var(--good)'}">${esc(n)}${dup?' (duplicate!)':''}</td></tr>`}).join('')||'<tr><td class="muted">No files chosen.</td></tr>'}
const scriptBlock=id=>`<div class="row"><button class="b" id="${id}Copy">Copy script</button><button class="g" id="${id}Save">Save as .ps1</button><span id="${id}Msg" class="muted"></span></div><pre id="${id}Script"></pre>`;
function wireScript(id,name){$(id+'Copy').onclick=()=>{if(!$(id+'Script').textContent)return toast('Nothing to do yet.');copy($(id+'Script').textContent,$(id+'Msg'));bump('scripts')};
  $(id+'Save').onclick=()=>{if(!$(id+'Script').textContent)return toast('Nothing to do yet.');download(name+'.ps1',$(id+'Script').textContent,'text/plain');bump('scripts')}}
const folderRow=id=>`<div class="row"><input id="${id}" class="grow" placeholder="Folder path (e.g. C:\\Users\\me\\Pictures)"></div>`;
const live=(ids,fn)=>ids.forEach(id=>$(id).addEventListener('input',fn));

// ---------- file renamer ----------
tool({id:'rename',name:'File renamer',group:'Files',html:`
<h2>File renamer</h2><p class="sub">Choose files, set rules, check the preview, then copy the script and run it in PowerShell.</p>
<div class="row"><input type="file" id="rFiles" multiple></div>${folderRow('rFolder')}
<div class="row"><input id="rFind" placeholder="Find"><input id="rRep" placeholder="Replace with"><input id="rPre" placeholder="Prefix"><input id="rSuf" placeholder="Suffix (before extension)"></div>
<div class="row"><label><input type="checkbox" id="rNum"> Number them</label><input id="rBase" placeholder="Base name (with numbering)">
<select id="rCase"><option value="">Keep case</option><option value="l">lowercase</option><option value="u">UPPERCASE</option></select><label><input type="checkbox" id="rSpace"> Spaces → _</label></div>
<table><thead><tr><th>Old</th><th>New</th></tr></thead><tbody id="rPrev"></tbody></table>${scriptBlock('r')}`,
init(){const draw=()=>{const fs=[...$('rFiles').files].sort((a,b)=>a.name.localeCompare(b.name)),pad=Math.max(2,String(fs.length).length);
  const pairs=fs.map((f,i)=>{let[b,e]=splitExt(f.name);const fd=$('rFind').value;if(fd)b=b.split(fd).join($('rRep').value);
    if($('rNum').checked)b=($('rBase').value||b)+'_'+String(i+1).padStart(pad,'0');b=$('rPre').value+b+$('rSuf').value;
    let n=b+e;if($('rSpace').checked)n=n.replace(/ /g,'_');if($('rCase').value==='l')n=n.toLowerCase();if($('rCase').value==='u')n=splitExt(n)[0].toUpperCase()+splitExt(n)[1];return[f.name,n]});
  previewTable($('rPrev'),pairs);$('rScript').textContent=renameScript($('rFolder').value,pairs)};
  live(['rFiles','rFind','rRep','rPre','rSuf','rNum','rBase','rCase','rSpace','rFolder'],draw);draw();wireScript('r','rename')}});

// ---------- batch extension changer ----------
tool({id:'ext',name:'Extension changer',group:'Files',html:`
<h2>Batch extension changer</h2><p class="sub">Change one file extension to another for many files at once, e.g. .jpeg → .jpg. Only the name changes, not the file's format.</p>
<div class="row"><input type="file" id="xtFiles" multiple></div>${folderRow('xtFolder')}
<div class="row">From <input id="xtFrom" placeholder=".jpeg" style="width:100px"> to <input id="xtTo" placeholder=".jpg" style="width:100px"></div>
<table><thead><tr><th>Old</th><th>New</th></tr></thead><tbody id="xtPrev"></tbody></table>${scriptBlock('xt')}`,
init(){const norm=s=>{s=s.trim().toLowerCase();return s&&!s.startsWith('.')?'.'+s:s};
  const draw=()=>{const from=norm($('xtFrom').value),to=norm($('xtTo').value);
    const pairs=[...$('xtFiles').files].map(f=>{const[b,e]=splitExt(f.name);return[f.name,from&&e.toLowerCase()===from?b+to:f.name]});
    previewTable($('xtPrev'),pairs);$('xtScript').textContent=renameScript($('xtFolder').value,pairs)};
  live(['xtFiles','xtFolder','xtFrom','xtTo'],draw);draw();wireScript('xt','change-extensions')}});

// ---------- photo date renamer ----------
tool({id:'photodate',name:'Photo date renamer',group:'Files',html:`
<h2>Photo date renamer</h2><p class="sub">Renames photos to names like 2026-10-13_001.jpg, using each file's last-modified date. That's usually when the photo was taken or copied.</p>
<div class="row"><input type="file" id="pdFiles" multiple accept="image/*,video/*"></div>${folderRow('pdFolder')}
<div class="row"><input id="pdPre" placeholder="Optional prefix (e.g. Trip_)"><label><input type="checkbox" id="pdTime"> Include time (2026-10-13_142501)</label></div>
<table><thead><tr><th>Old</th><th>New</th></tr></thead><tbody id="pdPrev"></tbody></table>${scriptBlock('pd')}`,
init(){const draw=()=>{const fs=[...$('pdFiles').files].sort((a,b)=>a.lastModified-b.lastModified),count={};
  const pairs=fs.map(f=>{const d=new Date(f.lastModified),day=isoDay(d),e=splitExt(f.name)[1].toLowerCase();let b=$('pdPre').value+day;
    if($('pdTime').checked)b+='_'+pad2(d.getHours())+pad2(d.getMinutes())+pad2(d.getSeconds());count[b]=(count[b]||0)+1;
    return[f.name,b+(($('pdTime').checked&&count[b]===1)?'':'_'+String(count[b]).padStart(3,'0'))+e]});
  previewTable($('pdPrev'),pairs);$('pdScript').textContent=renameScript($('pdFolder').value,pairs)};
  live(['pdFiles','pdFolder','pdPre','pdTime'],draw);draw();wireScript('pd','photo-dates')}});

// ---------- screenshot organizer ----------
tool({id:'shots',name:'Screenshot organizer',group:'Files',html:`
<h2>Screenshot organizer</h2><p class="sub">Choose screenshots and they're sorted into folders by month or by day.</p>
<div class="row"><input type="file" id="sFiles" multiple accept="image/*"></div>
<div class="row"><input id="sFolder" class="grow" placeholder="Folder path"><select id="sBy"><option value="m">By month (2026-10)</option><option value="d">By day (2026-10-13)</option></select></div>
<div id="sSum" class="muted"></div>${scriptBlock('s')}`,
init(){const draw=()=>{const fs=[...$('sFiles').files],g={};
  fs.forEach(f=>{const k=isoDay(new Date(f.lastModified)).slice(0,$('sBy').value==='d'?10:7);(g[k]=g[k]||[]).push(f.name)});
  const ks=Object.keys(g).sort();$('sSum').textContent=fs.length?`${fs.length} files → ${ks.length} folders: `+ks.map(k=>`${k} (${g[k].length})`).join(', '):'';
  $('sScript').textContent=moveScript($('sFolder').value,g)};
  live(['sFiles','sBy','sFolder'],draw);wireScript('s','organize-screenshots')}});

// ---------- downloads cleaner ----------
const TYPES={Images:'jpg jpeg png gif webp bmp svg heic ico tif tiff',Videos:'mp4 mkv mov avi webm wmv m4v',Audio:'mp3 wav flac m4a aac ogg',Documents:'pdf doc docx txt rtf odt xls xlsx csv ppt pptx md epub',Archives:'zip rar 7z tar gz bz2 xz',Installers:'exe msi msix appx dmg iso',Code:'js ts py html css json java c cpp cs go rs sh ps1 bat'};
const typeOf=n=>{const e=splitExt(n)[1].slice(1).toLowerCase();for(const[k,v]of Object.entries(TYPES))if(v.split(' ').includes(e))return k;return'Other'};
tool({id:'clean',name:'Downloads cleaner',group:'Files',html:`
<h2>Downloads folder cleaner</h2><p class="sub">Choose everything in Downloads (Ctrl+A in the picker). Files are sorted into folders by type, and old files can go to an "Old" folder.</p>
<div class="row"><input type="file" id="cFiles" multiple></div>${folderRow('cFolder')}
<div class="row"><label>Older than <input id="cDays" type="number" value="90" style="width:70px"> days → "Old" folder</label><label><input type="checkbox" id="cOld" checked> on</label></div>
<table><tbody id="cSum"></tbody></table>${scriptBlock('c')}`,
init(){const draw=()=>{const fs=[...$('cFiles').files],g={},cut=Date.now()-(+$('cDays').value||0)*DAY;
  fs.forEach(f=>{const k=$('cOld').checked&&f.lastModified<cut?'Old':typeOf(f.name);(g[k]=g[k]||[]).push(f.name)});
  $('cSum').innerHTML=Object.entries(g).map(([k,v])=>`<tr><td>${k}</td><td>${v.length} files</td></tr>`).join('');$('cScript').textContent=moveScript($('cFolder').value,g)};
  live(['cFiles','cFolder','cDays','cOld'],draw);wireScript('c','clean-downloads');
  $('cCopy').addEventListener('click',()=>$('cScript').textContent&&bump('cleaned'));$('cSave').addEventListener('click',()=>$('cScript').textContent&&bump('cleaned'))}});

// ---------- duplicate finder ----------
async function sha(f){const h=await crypto.subtle.digest('SHA-256',await f.arrayBuffer());return[...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,'0')).join('')}
tool({id:'dupes',name:'Duplicate finder',group:'Files',html:`
<h2>Duplicate file finder</h2><p class="sub">Pick a folder. Files with exactly the same contents are found, even if their names differ. The script moves the extra copies into a "_Duplicates" folder for you to check and delete. It doesn't delete anything itself.</p>
<div class="row"><input type="file" id="dFiles" webkitdirectory multiple></div>${folderRow('dFolder')}
<div class="muted" style="font-size:13px">Enter the path of the folder you picked.</div><div id="dMsg" class="muted"></div>
<div id="dGroups"></div>${scriptBlock('d')}`,
init(){$('dFiles').onchange=async()=>{const fs=[...$('dFiles').files],bySize={};fs.forEach(f=>(bySize[f.size]=bySize[f.size]||[]).push(f));
  const cand=Object.values(bySize).filter(g=>g.length>1&&g[0].size>0).flat();const byHash={};let done=0;
  for(const f of cand){$('dMsg').textContent=`Checking ${++done} of ${cand.length} possible matches…`;try{const h=await sha(f);(byHash[h]=byHash[h]||[]).push(f)}catch{}}
  this.groups=Object.values(byHash).filter(g=>g.length>1).map(g=>g.sort((a,b)=>relPath(a).length-relPath(b).length||a.lastModified-b.lastModified));
  const waste=this.groups.reduce((s,g)=>s+g[0].size*(g.length-1),0);
  $('dMsg').textContent=`${fs.length} files scanned. ${this.groups.length} sets of duplicates, ${humanSize(waste)} could be freed.`;
  $('dGroups').innerHTML=this.groups.map(g=>`<div class="box" style="margin:6px 0"><b>${humanSize(g[0].size)}</b> · keep <span style="color:var(--good)">${esc(relPath(g[0]))}</span><br>${g.slice(1).map(f=>`<span class="muted">move ${esc(relPath(f))}</span>`).join('<br>')}</div>`).join('');
  this.draw()};
  this.draw=()=>{const g=this.groups||[];if(!g.length){$('dScript').textContent='';return}const used={};
    $('dScript').textContent=[cd($('dFolder').value),`New-Item -ItemType Directory -Force '_Duplicates' | Out-Null`,...g.flatMap(set=>set.slice(1).map(f=>{
      let n=f.name;if(used[n.toLowerCase()]){const[b,e]=splitExt(n);n=`${b}_${used[n.toLowerCase()]}${e}`}used[f.name.toLowerCase()]=(used[f.name.toLowerCase()]||0)+1;
      return`Move-Item -LiteralPath ${ps(relPath(f))} -Destination ${ps('_Duplicates\\'+n)}`}))].join('\n')};
  $('dFolder').oninput=this.draw;wireScript('d','move-duplicates')}});

// ---------- big file finder ----------
tool({id:'bigfiles',name:'Big file finder',group:'Files',html:`
<h2>Big file finder</h2><p class="sub">Pick a folder (for example Downloads or Videos) to see the biggest files and folders inside it.</p>
<div class="row"><input type="file" id="bfFiles" webkitdirectory multiple><label>Show top <input id="bfTop" type="number" value="30" style="width:70px"></label></div>
<div id="bfSum" class="muted"></div><div class="grid2"><div><h3>Biggest files</h3><table id="bfList"></table></div><div><h3>Biggest folders</h3><table id="bfDirs"></table></div></div>`,
init(){const draw=()=>{const fs=[...$('bfFiles').files];if(!fs.length)return;const top=+$('bfTop').value||30,total=fs.reduce((s,f)=>s+f.size,0),mx=Math.max(...fs.map(f=>f.size),1);
  $('bfSum').textContent=`${fs.length} files, ${humanSize(total)} in total.`;
  $('bfList').innerHTML=fs.sort((a,b)=>b.size-a.size).slice(0,top).map(f=>`<tr><td style="word-break:break-all">${esc(relPath(f))}<div class="bar" style="width:${f.size/mx*100}%"></div></td><td style="white-space:nowrap;text-align:right">${humanSize(f.size)}</td></tr>`).join('');
  const dirs={};fs.forEach(f=>{const p=relPath(f).split('\\');p.pop();for(let i=1;i<=p.length;i++){const k=p.slice(0,i).join('\\');dirs[k]=(dirs[k]||0)+f.size}});
  $('bfDirs').innerHTML=Object.entries(dirs).sort((a,b)=>b[1]-a[1]).slice(0,top).map(([d,s])=>`<tr><td style="word-break:break-all">${esc(d)}</td><td style="white-space:nowrap;text-align:right">${humanSize(s)}</td></tr>`).join('')||'<tr><td class="muted">No subfolders.</td></tr>'};
  live(['bfFiles','bfTop'],draw)}});

// ---------- empty folder sweeper ----------
tool({id:'empty',name:'Empty folder sweeper',group:'Files',html:`
<h2>Empty folder sweeper</h2><p class="sub">Writes a script that finds empty folders inside a folder (and folders that only held empty folders) and removes them. Run it once in "preview" mode to see the list first.</p>
${folderRow('eFolder')}<div class="row"><label><input type="checkbox" id="ePreview" checked> Preview only (lists them, removes nothing)</label></div>${scriptBlock('e')}`,
init(){const draw=()=>{const f=$('eFolder').value.trim();
  $('eScript').textContent=f?[`$root = ${ps(f)}`,`Get-ChildItem -LiteralPath $root -Directory -Recurse -Force |`,`  Sort-Object { $_.FullName.Length } -Descending |`,
    `  Where-Object { -not (Get-ChildItem -LiteralPath $_.FullName -Force) } |`,$('ePreview').checked?`  ForEach-Object { "Empty: " + $_.FullName }`:`  ForEach-Object { Write-Host "Removing" $_.FullName; Remove-Item -LiteralPath $_.FullName }`].join('\n'):''};
  live(['eFolder','ePreview'],draw);wireScript('e','sweep-empty-folders')}});

// ---------- video chapters + trimmer ----------
let chs=[],vidName='';
const ts=s=>{s=Math.floor(s);const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return(h?h+':'+pad2(m):m)+':'+pad2(x)};
const chList=()=>{const l=[...chs].sort((a,b)=>a.t-b.t);if(l.length&&l[0].t>=1)l.unshift({t:0,n:'Intro'});return l};
tool({id:'chap',name:'Video chapters',group:'Files',html:`
<h2>Video chapter maker &amp; trimmer</h2><p class="sub">Open a video and press <b>M</b> (or the button) to mark chapters. Copy them as a YouTube chapter list, get ffmpeg commands that cut each chapter into its own clip, or turn them into flashcards.</p>
<div class="row"><input type="file" id="vFile" accept="video/*"></div><video id="vid" controls></video>
<div class="row"><input id="vTitle" class="grow" placeholder="Chapter title"><button class="b" id="vMark">Mark here (M)</button></div>
<ul class="clean" id="vList"></ul>
<h3>Chapter list</h3><div class="row"><button class="b" id="vCopy">Copy chapters</button><span id="vMsg" class="muted"></span></div><pre id="vOut"></pre>
<h3>Cut into clips (ffmpeg)</h3><p class="sub">Needs <a href="https://ffmpeg.org/download.html" target="_blank" rel="noopener">ffmpeg</a> installed. Run the commands in the video's folder. "Fast" copies without re-encoding, so cuts land on the nearest keyframe.</p>
<div class="row"><label><input type="checkbox" id="vFast" checked> Fast (no re-encode)</label><button class="g" id="vTrimCopy">Copy commands</button><span id="vTMsg" class="muted"></span></div><pre id="vTrim"></pre>
<h3>Make flashcards</h3><div class="row"><button class="g" id="vCards">Make a card for each chapter</button><span class="muted" style="font-size:13px">Front: what happens at the time · back: the chapter title</span></div>`,
init(){
  $('vFile').onchange=()=>{const f=$('vFile').files[0];if(f){$('vid').src=URL.createObjectURL(f);vidName=f.name;chs=[];this.draw()}};
  const mark=()=>{if(!$('vid').src)return toast('Open a video first.');chs.push({t:$('vid').currentTime,n:$('vTitle').value.trim()||'Chapter '+(chs.length+1)});$('vTitle').value='';this.draw()};
  $('vid').addEventListener('loadedmetadata',()=>this.draw());
  this.draw=()=>{chs.sort((a,b)=>a.t-b.t);$('vList').innerHTML='';
    chs.forEach((c,i)=>{const li=document.createElement('li');li.innerHTML=`<a href="#">${ts(c.t)}</a><input class="grow" value="${esc(c.n)}"><button class="x">✕</button>`;
      li.children[0].onclick=e=>{e.preventDefault();$('vid').currentTime=c.t};li.children[1].oninput=e=>{c.n=e.target.value;this.out()};
      li.children[2].onclick=()=>{chs.splice(i,1);this.draw()};$('vList').append(li)});this.out()};
  this.out=()=>{const l=chList(),dur=$('vid').duration;$('vOut').textContent=l.map(c=>ts(c.t)+' '+c.n).join('\n');
    const[b,e]=splitExt(vidName||'video.mp4'),q=s=>'"'+s.replace(/"/g,'')+'"',safe=s=>s.replace(/[\\/:*?"<>|]/g,'').trim()||'clip';
    $('vTrim').textContent=l.map((c,i)=>{const end=l[i+1]?l[i+1].t:(isFinite(dur)?dur:null);
      return`ffmpeg -ss ${c.t.toFixed(2)} ${end!==null?'-to '+end.toFixed(2)+' ':''}-i ${q(vidName||'video.mp4')} ${$('vFast').checked?'-c copy ':''}${q(pad2(i+1)+' '+safe(c.n)+e)}`}).join('\n')};
  $('vFast').onchange=this.out;
  $('vMark').onclick=mark;$('vTitle').onkeydown=e=>{if(e.key==='Enter')mark()};
  document.addEventListener('keydown',e=>{if(this.sec.classList.contains('on')&&(e.key==='m'||e.key==='M')&&!isTyping()&&!e.ctrlKey&&!e.metaKey)mark()});
  $('vCopy').onclick=()=>copy($('vOut').textContent,$('vMsg'));$('vTrimCopy').onclick=()=>copy($('vTrim').textContent,$('vTMsg'));
  $('vCards').onclick=()=>{const l=chList();if(!l.length)return toast('Mark some chapters first.');const deck=splitExt(vidName)[0];
    l.forEach(c=>addCard(`${deck}: what happens at ${ts(c.t)}?`,c.n,deck));toast(`Added ${l.length} flashcards`)}}});
