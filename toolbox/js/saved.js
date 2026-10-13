// Saved: link saver (with bookmark import) and clipboard history.

let links=load('links',[]),tagF='';
const saveLinks=()=>{save('links',links);drawLinks()};
const safeUrl=u=>/^https?:\/\//i.test(u)?u:'https://'+u;
function addLink(url,title='',tags=[]){url=url.trim();if(!url)return false;if(links.some(l=>l.url===url))return false;links.unshift({url,title:title.trim(),tags,at:Date.now()});return true}
function drawLinks(){if(!$('lList'))return;const q=$('lSearch').value.toLowerCase(),all=[...new Set(links.flatMap(l=>l.tags))].sort();
  $('lTagFilter').innerHTML=all.map(t=>`<span class="tag ${t===tagF?'on':''}">${esc(t)}</span>`).join('');
  [...$('lTagFilter').children].forEach(s=>s.onclick=()=>{tagF=tagF===s.textContent?'':s.textContent;drawLinks()});
  const shown=links.filter(l=>(!tagF||l.tags.includes(tagF))&&(l.url+' '+l.title+' '+l.tags.join(' ')+' '+(l.note||'')).toLowerCase().includes(q));
  $('lCount').textContent=`${shown.length} of ${links.length} links`;$('lList').innerHTML='';
  shown.slice(0,300).forEach(l=>{const li=document.createElement('li');
    li.innerHTML=`<div style="min-width:0"><a href="${esc(safeUrl(l.url))}" target="_blank" rel="noopener">${esc(l.title||l.url)}</a><br><span class="muted" style="font-size:12px;word-break:break-all">${esc(l.url)}</span><br>${l.note?`<div style="font-size:13px;margin:2px 0;white-space:pre-wrap">📝 ${esc(l.note)}</div>`:''}${l.tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div><button class="g" style="margin-left:auto;padding:2px 8px" title="Add or edit a note">📝</button><button class="x">✕</button>`;
    li.querySelector('.g').onclick=()=>{const n=prompt('Note for this link:',l.note||'');if(n===null)return;l.note=n.trim();saveLinks()};
    li.querySelectorAll('.tag').forEach(s=>s.onclick=()=>{tagF=s.textContent;drawLinks()});
    li.querySelector('.x').onclick=()=>removeWithUndo(links,links.indexOf(l),saveLinks,'Link deleted');$('lList').append(li)});
  if(!links.length)$('lList').innerHTML='<li class="muted">No links saved yet.</li>'}
// Netscape bookmark files (exported by every browser): folder names become tags.
function importBookmarks(html){const doc=new DOMParser().parseFromString(html,'text/html');let n=0;
  doc.querySelectorAll('a[href]').forEach(a=>{const href=a.getAttribute('href');if(!/^https?:/i.test(href))return;const tags=[];let dl=a.closest('dl');
    while(dl){const h=dl.previousElementSibling;if(h&&h.tagName==='H3'){const t=h.textContent.trim().toLowerCase();if(!/^(bookmarks bar|bookmarks toolbar|favorites bar|other bookmarks|bookmarks menu)$/.test(t))tags.unshift(t)}dl=dl.parentElement?.closest('dl')}
    if(addLink(href,a.textContent,[...new Set(tags)]))n++});saveLinks();return n}
tool({id:'links',name:'Link saver',group:'Saved',html:`
<h2>Link saver</h2><p class="sub">Save links with tags, then search or click a tag to filter.</p>
<div class="row"><input id="lUrl" class="grow" placeholder="https://..."><input id="lTitle" class="grow" placeholder="Title (optional)"><input id="lTags" placeholder="tags, comma, separated"><button class="b" id="lAdd">Save</button></div>
<div class="row"><input id="lSearch" class="grow" placeholder="Search links"><span id="lCount" class="muted"></span></div><div id="lTagFilter"></div>
<ul class="clean" id="lList"></ul>
<details><summary>Import browser bookmarks</summary><p class="sub">In your browser, open the bookmark manager, choose <i>Export bookmarks</i> and save the HTML file, then pick it here. Folder names become tags.</p>
<input type="file" id="lImport" accept=".html,.htm"></details>`,
init(){$('lAdd').onclick=()=>{if(addLink($('lUrl').value,$('lTitle').value,$('lTags').value.split(',').map(t=>t.trim().toLowerCase()).filter(Boolean))){$('lUrl').value=$('lTitle').value=$('lTags').value='';saveLinks()}else if($('lUrl').value.trim())toast('Already saved.')};
  $('lUrl').onkeydown=e=>e.key==='Enter'&&$('lAdd').click();$('lSearch').oninput=drawLinks;
  $('lImport').onchange=async()=>{const f=$('lImport').files[0];if(!f)return;const n=importBookmarks(await f.text());toast(`Imported ${n} new links`);$('lImport').value=''}},
show(){links=load('links',links);drawLinks()},
search(q){return links.filter(l=>(l.url+' '+l.title+' '+l.tags.join(' ')+' '+(l.note||'')).toLowerCase().includes(q)).map(l=>({text:'Link: '+(l.title||l.url),go:()=>window.open(safeUrl(l.url),'_blank','noopener')}))}});
command({word:'link',help:'link https://example.com [tag1 tag2]',run(r){const[url,...tags]=r.trim().split(/\s+/);if(!url)return'Try: link https://example.com recipes';
  if(!addLink(url,'',tags.map(t=>t.toLowerCase())))return'Already saved.';saveLinks();return'Link saved.'}});

// ---------- clipboard history ----------
let clips=load('clips',[]);
function addClip(t){t=String(t||'');if(!t.trim())return;clips=[{t,at:Date.now(),pin:false},...clips.filter(c=>c.t!==t||c.pin)].filter((c,i,a)=>a.findIndex(x=>x.t===c.t)===i);
  const pinned=clips.filter(c=>c.pin),rest=clips.filter(c=>!c.pin).slice(0,20);clips=[...pinned,...rest];save('clips',clips);drawClips()}
function drawClips(){if(!$('cbList'))return;$('cbList').innerHTML='';
  clips.forEach((c,i)=>{const li=document.createElement('li');
    li.innerHTML=`<pre style="flex:1;margin:0;max-height:80px;white-space:pre-wrap;cursor:pointer" title="Click to copy">${esc(c.t.slice(0,500))}</pre><button class="g">${c.pin?'Unpin':'Pin'}</button><button class="x">✕</button>`;
    li.querySelector('pre').onclick=()=>copy(c.t);li.querySelector('.g').onclick=()=>{c.pin=!c.pin;save('clips',clips);drawClips()};
    li.querySelector('.x').onclick=()=>removeWithUndo(clips,i,()=>{save('clips',clips);drawClips()},'Removed');$('cbList').append(li)});
  if(!clips.length)$('cbList').innerHTML='<li class="muted">Nothing yet. Paste anything into this page, or press "Grab clipboard".</li>'}
tool({id:'clips',name:'Clipboard history',group:'Saved',html:`
<h2>Clipboard history</h2><p class="sub">Keeps the last 20 things you paste anywhere in this page, plus anything you grab. Pinned items stay. Click an item to copy it again. Browsers only let a page see your clipboard when you paste or press the button.</p>
<div class="row"><button class="b" id="cbGrab">Grab clipboard</button><textarea id="cbPaste" style="min-height:40px;flex:1" placeholder="…or paste here (Ctrl+V)"></textarea></div><ul class="clean" id="cbList"></ul>`,
init(){$('cbGrab').onclick=async()=>{try{addClip(await navigator.clipboard.readText())}catch{toast('The browser blocked reading the clipboard. Paste into the box instead.')}};
  $('cbPaste').addEventListener('input',()=>{setTimeout(()=>$('cbPaste').value='',50)});
  document.addEventListener('paste',e=>addClip(e.clipboardData?.getData('text')))},
show(){clips=load('clips',clips);drawClips()},
search(q){return clips.filter(c=>c.t.toLowerCase().includes(q)).map(c=>({text:'Clipboard: '+c.t.slice(0,60),go:()=>{copy(c.t);showTool('clips')}}))}});
