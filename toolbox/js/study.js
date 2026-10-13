// Study: flashcards with spaced repetition, reverse mode, stats, and cards made from text.
// Leitner boxes: after a right answer a card waits 2, 4, 8, 16, 32 days.
let cards=load('cards',[]),cur=null,flipped=false,curReverse=false;
function cardsDueCount(){return load('cards',[]).filter(c=>c.due<=dayNum()).length}
const saveCards=()=>save('cards',cards);
function addCard(q,a,deck=''){q=String(q).trim();a=String(a).trim();if(!q||!a)return false;cards.push({id:uid(),q,a,box:0,due:dayNum(),deck});saveCards();return true}
function logReview(right){const log=load('reviewLog',{}),d=isoDay();log[d]=log[d]||{n:0,r:0};log[d].n++;if(right)log[d].r++;save('reviewLog',log);bump('reviews')}
function studyStreak(){const log=load('reviewLog',{});let d=new Date(),n=0;if(!log[isoDay(d)])d=new Date(d-DAY);while(log[isoDay(d)]){n++;d=new Date(d-DAY)}return n}
const inDeck=c=>{const d=$('fDeckSel')?.value||'';return!d||(c.deck||'(no deck)')===d};
function drawDeckSel(){const sel=$('fDeckSel'),v=sel.value||load('cardDeck',''),decks=[...new Set(cards.map(c=>c.deck||'(no deck)'))].sort();
  sel.innerHTML='<option value="">All decks</option>'+decks.map(d=>`<option>${esc(d)}</option>`).join('');sel.value=decks.includes(v)?v:''}
function nextCard(){saveCards();drawDeckSel();const due=cards.filter(c=>c.due<=dayNum()&&inDeck(c));
  $('fStat').textContent=`${cards.length} cards · ${due.length} due today · study streak ${studyStreak()} day${studyStreak()===1?'':'s'}`;
  cur=due[Math.floor(Math.random()*due.length)]||null;flipped=false;$('fBtns').style.display='none';
  const mode=$('fMode').value;curReverse=mode==='back'||(mode==='mix'&&Math.random()<.5);
  $('fCard').textContent=cur?(curReverse?cur.a:cur.q):(cards.length?'All done for today 🎉':'Add some cards to start.');
  $('fSide').textContent=cur?(curReverse?'Back shown first · click to flip':'Click to flip'):'';drawCardList();drawStudyStats()}
function drawCardList(){$('fDecks').innerHTML=[...new Set(cards.map(c=>c.deck).filter(Boolean))].map(d=>`<option>${esc(d)}</option>`).join('');const q=($('fFind')?.value||'').toLowerCase();$('fList').innerHTML='';
  cards.forEach((c,i)=>{if(q&&!(c.q+' '+c.a).toLowerCase().includes(q))return;const li=document.createElement('li');
    li.innerHTML=`<span class="grow">${esc(c.q)} <span class="muted">→ ${esc(c.a)} · box ${c.box+1}${c.deck?' · '+esc(c.deck):''}</span></span><button class="x">✕</button>`;
    li.lastChild.onclick=()=>removeWithUndo(cards,i,()=>{saveCards();nextCard()},'Card deleted');$('fList').append(li)})}
function drawStudyStats(){const log=load('reviewLog',{}),days=[...Array(14)].map((_,i)=>isoDay(new Date(Date.now()-(13-i)*DAY)));
  const mx=Math.max(1,...days.map(d=>log[d]?.n||0));
  $('fChart').innerHTML=days.map(d=>{const v=log[d]||{n:0,r:0},acc=v.n?Math.round(v.r/v.n*100):null;
    return`<div style="flex:1;text-align:center;font-size:11px" title="${d}: ${v.n} reviews${acc!==null?', '+acc+'% right':''}"><div style="height:90px;display:flex;align-items:flex-end;justify-content:center"><div class="bar" style="width:70%;height:${v.n/mx*100}%;min-height:${v.n?2:0}px;background:${acc===null?'var(--line)':acc>=80?'var(--good)':acc>=50?'var(--warn)':'var(--bad)'}"></div></div>${parseIso(d).getDate()}</div>`}).join('');
  const tot=Object.values(log).reduce((s,v)=>({n:s.n+v.n,r:s.r+v.r}),{n:0,r:0});
  const boxes=[0,1,2,3,4,5].map(b=>cards.filter(c=>c.box===b).length);
  $('fTotals').textContent=`${tot.n} reviews all time · ${tot.n?Math.round(tot.r/tot.n*100):0}% right · cards by box: ${boxes.join(' / ')}`}
// Cloze cards: blank out the longest uncommon word in each sentence.
const STOP=new Set('about above after again against because before being below between could during every their there these those through under until where which while would should other first after also into than then them they this that with from have were what when your more most some such only very will just like make made many much'.split(' '));
function clozeCards(text){return text.replace(/\s+/g,' ').split(/(?<=[.!?])\s+/).map(s=>s.trim()).filter(s=>s.length>=30&&s.length<=240).map(s=>{
  const words=[...s.matchAll(/[A-Za-z][A-Za-z'-]{3,}/g)].map(m=>m[0]).filter(w=>!STOP.has(w.toLowerCase()));if(!words.length)return null;
  const pick=words.reduce((a,b)=>b.length>a.length||(b[0]===b[0].toUpperCase()&&b.length>=a.length-1&&a[0]!==a[0].toUpperCase())?b:a);
  return{q:s.replace(new RegExp('\\b'+pick.replace(/[-']/g,'\\$&')+'\\b'),'_____'),a:pick}}).filter(Boolean)}
let clozePreview=[];
tool({id:'cards',name:'Flashcards',group:'Study',html:`
<h2>Study flashcards</h2><p class="sub">Spaced repetition: a card you get right waits longer before it comes back, and a card you get wrong comes back tomorrow.</p>
<div class="row"><input id="fQ" class="grow" placeholder="Front"><input id="fA" class="grow" placeholder="Back"><input id="fNewDeck" list="fDecks" placeholder="Deck" style="width:120px"><datalist id="fDecks"></datalist><button class="b" id="fAdd">Add</button></div>
<details><summary>Bulk add (front | back, one per line)</summary><textarea id="fBulk"></textarea><button class="g" id="fBulkAdd">Add all</button></details>
<details><summary>Make cards from an article or notes</summary><p class="sub">Paste text (copy it from the page you saved). Each good sentence becomes a fill-in-the-blank card.</p>
 <textarea id="fText" placeholder="Paste article text here"></textarea><div class="row"><input id="fDeck" placeholder="Deck name (optional)"><button class="g" id="fCloze">Preview cards</button><button class="b" id="fClozeAdd" style="display:none">Add these</button></div><ul class="clean" id="fClozeList"></ul></details>
<div class="row"><p id="fStat" class="muted grow" style="margin:0"></p><select id="fDeckSel" title="Deck"></select><select id="fMode"><option value="front">Front first</option><option value="back">Back first (reverse)</option><option value="mix">Mixed</option></select></div>
<div id="fCard" class="card"></div><div id="fSide" class="muted" style="text-align:center;font-size:12px"></div>
<div class="row" id="fBtns" style="display:none;justify-content:center"><button class="g" id="fWrong">✗ Wrong</button><button class="b" id="fRight">✓ Right</button></div>
<h3>Progress (last 14 days)</h3><div id="fChart" style="display:flex;gap:2px"></div><div id="fTotals" class="muted" style="font-size:13px"></div>
<details><summary>All cards</summary><input id="fFind" placeholder="Filter cards" style="margin-top:6px"><ul class="clean" id="fList"></ul></details>`,
init(){
  $('fMode').value=load('cardMode','front');$('fMode').onchange=()=>{save('cardMode',$('fMode').value);nextCard()};
  const flip=()=>{if(!cur)return;flipped=!flipped;$('fCard').textContent=(flipped!==curReverse)?cur.a:cur.q;$('fBtns').style.display=flipped?'flex':'none'};
  $('fCard').onclick=flip;
  $('fRight').onclick=()=>{cur.box=Math.min(cur.box+1,5);cur.due=dayNum()+2**cur.box;logReview(true);nextCard()};
  $('fWrong').onclick=()=>{cur.box=0;cur.due=dayNum()+1;logReview(false);nextCard()};
  document.addEventListener('keydown',e=>{if(!this.sec.classList.contains('on')||isTyping())return;
    if(e.key===' '){e.preventDefault();flip()}else if(flipped&&(e.key==='ArrowRight'||e.key==='y'))$('fRight').click();else if(flipped&&(e.key==='ArrowLeft'||e.key==='n'))$('fWrong').click()});
  $('fDeckSel').onchange=()=>{save('cardDeck',$('fDeckSel').value);nextCard()};
  $('fAdd').onclick=()=>{if(addCard($('fQ').value,$('fA').value,$('fNewDeck').value.trim())){$('fQ').value=$('fA').value='';$('fQ').focus();nextCard()}};
  $('fA').onkeydown=e=>e.key==='Enter'&&$('fAdd').click();
  $('fBulkAdd').onclick=()=>{let n=0;$('fBulk').value.split('\n').forEach(l=>{const[q,...a]=l.split('|');if(addCard(q||'',a.join('|')))n++});$('fBulk').value='';toast(`Added ${n} cards`);nextCard()};
  $('fCloze').onclick=()=>{clozePreview=clozeCards($('fText').value);$('fClozeAdd').style.display=clozePreview.length?'':'none';
    $('fClozeList').innerHTML=clozePreview.length?clozePreview.map(c=>`<li><span>${esc(c.q)} <span class="muted">→ ${esc(c.a)}</span></span></li>`).join(''):'<li class="muted">No usable sentences found.</li>'};
  $('fClozeAdd').onclick=()=>{clozePreview.forEach(c=>addCard(c.q,c.a,$('fDeck').value.trim()));toast(`Added ${clozePreview.length} cards`);clozePreview=[];$('fClozeList').innerHTML='';$('fText').value='';$('fClozeAdd').style.display='none';nextCard()};
  $('fFind').oninput=drawCardList},
show(){cards=load('cards',cards);nextCard()},
search(q){return cards.filter(c=>(c.q+' '+c.a).toLowerCase().includes(q)).map(c=>({text:`Card: ${c.q} → ${c.a}`,go:()=>{showTool('cards');$('fList').parentElement.open=true;$('fFind').value=q;drawCardList()}}))}});
command({word:'card',help:'card capital of France | Paris',run(r){const[q,...a]=r.split('|');return addCard(q||'',a.join('|'))?'Card added.':'Try: card front | back'}});
