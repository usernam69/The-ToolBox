// Money: budget splitter (with receipt scan), tip calculator, expense tracker, bills.

// ---------- budget splitter ----------
let sp=load('split',{people:[],exp:[]});
function settleUp(){
  const bal={};sp.people.forEach(p=>bal[p]=0);let total=0;
  sp.exp.forEach(e=>{const among=(e.among&&e.among.length?e.among:sp.people).filter(p=>p in bal);if(!among.length)return;
    total+=e.a;bal[e.p]=(bal[e.p]||0)+e.a;among.forEach(p=>bal[p]-=e.a/among.length)});
  const cr=Object.entries(bal).filter(x=>x[1]>0.005).sort((a,b)=>b[1]-a[1]),db=Object.entries(bal).filter(x=>x[1]<-0.005).map(([p,v])=>[p,-v]).sort((a,b)=>b[1]-a[1]);
  const pays=[];let i=0,j=0;
  while(i<db.length&&j<cr.length){const m=Math.min(db[i][1],cr[j][1]);pays.push([db[i][0],cr[j][0],m]);db[i][1]-=m;cr[j][1]-=m;if(db[i][1]<0.005)i++;if(cr[j][1]<0.005)j++}
  return{total,pays}}
function drawSplit(){save('split',sp);
  $('pList').innerHTML=sp.people.map((p,i)=>`<span class="tag" data-i="${i}" title="Remove">${esc(p)} ✕</span>`).join('');
  [...$('pList').children].forEach(t=>t.onclick=()=>{const p=sp.people[t.dataset.i];if(sp.exp.some(e=>e.p===p||(e.among||[]).includes(p)))return toast(p+' is still in some expenses.');sp.people.splice(t.dataset.i,1);drawSplit()});
  $('ePayer').innerHTML=$('rcPayer').innerHTML=sp.people.map(p=>`<option>${esc(p)}</option>`).join('');
  $('eAmong').innerHTML=sp.people.map(p=>`<label class="tag"><input type="checkbox" value="${esc(p)}" checked> ${esc(p)}</label>`).join('');
  $('eList').innerHTML='';
  sp.exp.forEach((e,i)=>{const li=document.createElement('li');const among=e.among&&e.among.length&&e.among.length<sp.people.length?` <span class="muted">(split: ${e.among.map(esc).join(', ')})</span>`:'';
    li.innerHTML=`<span><b>${esc(e.p)}</b> paid ${money(e.a)} for ${esc(e.w||'something')}${among}</span><button class="x">✕</button>`;
    li.lastChild.onclick=()=>removeWithUndo(sp.exp,i,drawSplit,'Expense removed');$('eList').append(li)});
  if(!sp.people.length||!sp.exp.length){$('settle').innerHTML='<li class="muted">Nothing to settle.</li>';return}
  const{total,pays}=settleUp();
  $('settle').innerHTML=`<li class="muted">Total ${money(total)}</li>`+(pays.map(([a,b,m])=>`<li><b>${esc(a)}</b> pays <b>${esc(b)}</b> ${money(m)}</li>`).join('')||'<li>All square!</li>')}
function addSplitExpense(payer,what,amt,among){if(!sp.people.includes(payer)||!(amt>0))return false;sp.exp.push({p:payer,w:what,a:amt,among:among&&among.length?among:null});drawSplit();return true}

let receiptItems=[];
function drawReceipt(){const t=$('rcItems');
  if(!receiptItems.length){t.innerHTML='';$('rcActions').style.display='none';return}
  $('rcActions').style.display='';
  t.innerHTML=`<tr><th>Item</th><th>Amount</th>${sp.people.map(p=>`<th>${esc(p)}</th>`).join('')}<th></th></tr>`+receiptItems.map((it,i)=>
    `<tr><td><input data-i="${i}" data-k="name" value="${esc(it.name)}" style="width:100%"></td><td><input data-i="${i}" data-k="amt" type="number" step="0.01" value="${it.amt}" style="width:90px"></td>${sp.people.map(p=>`<td><input type="checkbox" data-i="${i}" data-p="${esc(p)}" ${it.who.includes(p)?'checked':''}></td>`).join('')}<td><button class="x" data-rm="${i}">✕</button></td></tr>`).join('');
  t.querySelectorAll('input').forEach(inp=>inp.onchange=()=>{const it=receiptItems[inp.dataset.i];
    if(inp.dataset.p){it.who=inp.checked?[...it.who,inp.dataset.p]:it.who.filter(x=>x!==inp.dataset.p)}else it[inp.dataset.k]=inp.dataset.k==='amt'?+inp.value:inp.value});
  t.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>{receiptItems.splice(b.dataset.rm,1);drawReceipt()})}
async function scanReceipt(file){
  if(!sp.people.length)return toast('Add people first.');
  $('rcMsg').textContent='Loading the text reader (first time takes a moment)…';
  try{await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js');
    $('rcMsg').textContent='Reading the receipt…';
    const{data:{text}}=await Tesseract.recognize(file,'eng');
    receiptItems=text.split('\n').map(l=>l.trim()).map(l=>l.match(/^(.*?)[\s.:]*[$€£₪]?\s*(\d+[.,]\d{2})\s*[A-Z]?$/)).filter(Boolean)
      .filter(m=>!/total|change|cash|card|visa|mastercard|balance|amount due|paid/i.test(m[1]))
      .map(m=>({name:m[1].trim()||'Item',amt:+m[2].replace(',','.'),who:[...sp.people]}));
    $('rcMsg').textContent=receiptItems.length?`Found ${receiptItems.length} items. Check them, untick people who didn't share each one, then add.`:'No prices found. Try a sharper, straighter photo.';
    drawReceipt()}catch(e){$('rcMsg').textContent='Could not read the receipt: '+e.message}}

tool({id:'split',name:'Budget splitter',group:'Money',html:`
<h2>Budget splitter</h2><p class="sub">Add people and expenses, and it works out the fewest payments to settle up. Untick people who weren't part of an expense.</p>
<div class="row"><input id="pName" placeholder="Person"><button class="b" id="pAdd">Add person</button><span id="pList"></span>
 <select id="curSel" style="margin-left:auto" title="Currency"><option>$</option><option>€</option><option>£</option><option>₪</option><option>¥</option><option>₹</option><option>C$</option><option>A$</option></select></div>
<div class="row"><select id="ePayer" title="Paid by"></select><input id="eWhat" class="grow" placeholder="What for"><input id="eAmt" type="number" step="0.01" placeholder="Amount" style="width:110px"><button class="b" id="eAdd">Add expense</button></div>
<div class="row muted" style="font-size:13px">Split among: <span id="eAmong"></span></div>
<ul class="clean" id="eList"></ul>
<b>Settle up</b><ul class="clean" id="settle"></ul>
<div class="row"><button class="g" id="sDone">We settled up (clear)</button></div>
<h3>Scan a receipt</h3><p class="sub">Take a photo of a receipt. It reads the items and prices, and you tick who had what.</p>
<div class="row"><select id="rcPayer" title="Who paid the receipt"></select><input type="file" id="rcFile" accept="image/*"></div>
<div id="rcMsg" class="muted"></div><div style="overflow-x:auto"><table id="rcItems"></table></div>
<div class="row" id="rcActions" style="display:none"><button class="b" id="rcAdd">Add items to splitter</button><button class="g" id="rcCancel">Discard</button></div>`,
init(){
  $('curSel').value=load('currency','$');$('curSel').onchange=()=>{save('currency',$('curSel').value);drawSplit()};
  $('pAdd').onclick=()=>{const v=$('pName').value.trim();if(v&&!sp.people.includes(v)){sp.people.push(v);$('pName').value='';drawSplit();drawReceipt()}};
  $('pName').onkeydown=e=>e.key==='Enter'&&$('pAdd').click();
  $('eAdd').onclick=()=>{const among=[...$('eAmong').querySelectorAll('input:checked')].map(c=>c.value);
    if(!among.length)return toast('Tick at least one person to split among.');
    if(addSplitExpense($('ePayer').value,$('eWhat').value.trim(),parseFloat($('eAmt').value),among.length===sp.people.length?null:among)){$('eWhat').value=$('eAmt').value=''}};
  $('eAmt').onkeydown=e=>e.key==='Enter'&&$('eAdd').click();
  $('sDone').onclick=()=>{if(!sp.exp.length)return;const before=sp.exp;sp.exp=[];bump('settled');drawSplit();toast('Cleared. Nice!',()=>{sp.exp=before;drawSplit()})};
  $('rcFile').onchange=()=>{const f=$('rcFile').files[0];if(f)scanReceipt(f);$('rcFile').value=''};
  $('rcAdd').onclick=()=>{let n=0;receiptItems.forEach(it=>{if(it.who.length&&addSplitExpense($('rcPayer').value,it.name,it.amt,it.who.length===sp.people.length?null:it.who))n++});
    receiptItems=[];drawReceipt();$('rcMsg').textContent=`Added ${n} items.`};
  $('rcCancel').onclick=()=>{receiptItems=[];drawReceipt();$('rcMsg').textContent=''}},
show(){sp=load('split',sp);drawSplit()},
search(q){return sp.exp.filter(e=>(e.w+' '+e.p).toLowerCase().includes(q)).map(e=>({text:`Split: ${e.p} paid ${money(e.a)} for ${e.w}`,go:()=>showTool('split')}))}});
command({word:'split',help:'split 40 dinner [paid by Sam]',run(r){
  const m=r.match(/^\s*(\d+(?:\.\d+)?)\s*(.*?)(?:\s+paid by\s+(.+))?$/i);if(!m)return'Try: split 40 dinner paid by Sam';
  sp=load('split',sp);if(!sp.people.length)return'Add people in the Budget splitter first.';
  const payer=m[3]?sp.people.find(p=>p.toLowerCase()===m[3].trim().toLowerCase()):sp.people[0];if(!payer)return`No person called "${m[3]}".`;
  addSplitExpense(payer,m[2]||'something',+m[1]);return`Added: ${payer} paid ${money(+m[1])} for ${m[2]||'something'}, split among everyone.`}});

// ---------- tip calculator ----------
tool({id:'tip',name:'Tip calculator',group:'Money',html:`
<h2>Tip calculator</h2><p class="sub">Bill, tip and people, giving each person's share.</p>
<div class="row">Bill <input id="tBill" type="number" step="0.01" style="width:120px"> People <input id="tPeople" type="number" min="1" value="1" style="width:70px"></div>
<div class="row">Tip % <input id="tPct" type="number" value="15" style="width:70px"><span id="tPcts"></span><label><input type="checkbox" id="tRound"> Round each share up</label></div>
<div class="grid3"><div class="box"><div class="muted">Tip</div><div class="big" id="tTip"></div></div><div class="box"><div class="muted">Total</div><div class="big" id="tTotal"></div></div><div class="box"><div class="muted">Each person</div><div class="big" id="tEach"></div></div></div>`,
init(){$('tPcts').innerHTML=[10,12,15,18,20,25].map(p=>`<button class="g" data-p="${p}">${p}%</button>`).join(' ');
  $('tPcts').querySelectorAll('button').forEach(b=>b.onclick=()=>{$('tPct').value=b.dataset.p;calc()});
  const calc=()=>{const bill=+$('tBill').value||0,n=Math.max(1,+$('tPeople').value||1),tip=bill*(+$('tPct').value||0)/100;
    let each=(bill+tip)/n;if($('tRound').checked)each=Math.ceil(each);
    $('tTip').textContent=money($('tRound').checked?each*n-bill:tip);$('tTotal').textContent=money(each*n);$('tEach').textContent=money(each)};
  ['tBill','tPeople','tPct','tRound'].forEach(id=>$(id).addEventListener('input',calc));calc();this.calc=calc},
show(){this.calc()}});

// ---------- expense tracker ----------
const CATS=['Food','Groceries','Transport','Rent','Bills','Fun','Shopping','Health','Gifts','Other'];
let expenses=load('expenses',[]);const saveExpenses=()=>{save('expenses',expenses);drawExpenses()};
function drawExpenses(){if(!$('xMonth'))return;const mon=$('xMonth').value,list=expenses.filter(x=>x.d.startsWith(mon)).sort((a,b)=>b.d.localeCompare(a.d));
  const by={};list.forEach(x=>by[x.cat]=(by[x.cat]||0)+x.amt);const total=list.reduce((s,x)=>s+x.amt,0),max=Math.max(1,...Object.values(by));
  $('xTotal').textContent=`Total ${money(total)}`;
  $('xChart').innerHTML=Object.entries(by).sort((a,b)=>b[1]-a[1]).map(([c,v])=>`<tr><td style="width:110px">${esc(c)}</td><td><div class="bar" style="width:${v/max*100}%"></div></td><td style="width:90px;text-align:right">${money(v)}</td></tr>`).join('')||'<tr><td class="muted">No spending this month.</td></tr>';
  // last 6 months
  const months=[...Array(6)].map((_,i)=>{const d=parseIso(mon+'-01');d.setMonth(d.getMonth()-5+i);return d.getFullYear()+'-'+pad2(d.getMonth()+1)});
  const mt=months.map(m=>expenses.filter(x=>x.d.startsWith(m)).reduce((s,x)=>s+x.amt,0)),mm=Math.max(1,...mt);
  $('xMonths').innerHTML=months.map((m,i)=>`<div style="flex:1;text-align:center;font-size:12px"><div style="height:80px;display:flex;align-items:flex-end;justify-content:center"><div class="bar" style="width:60%;height:${mt[i]/mm*100}%;min-height:2px"></div></div>${parseIso(m+'-01').toLocaleDateString(undefined,{month:'short'})}<br><span class="muted">${Math.round(mt[i])}</span></div>`).join('');
  $('xList').innerHTML='';list.forEach(x=>{const li=document.createElement('li');
    li.innerHTML=`<span class="muted" style="width:90px">${x.d}</span><span class="tag">${esc(x.cat)}</span><span class="grow">${esc(x.note)}</span><b>${money(x.amt)}</b><button class="g" title="Add to the Budget splitter" style="padding:2px 8px">↗ Split</button><button class="x">✕</button>`;
    li.querySelector('.g').onclick=()=>{sp=load('split',sp);if(!sp.people.length)return toast('Add people in the Budget splitter first.');
      const who=prompt(`Who paid? (${sp.people.join(', ')})`,sp.people[0]);if(who===null)return;const p=sp.people.find(n=>n.toLowerCase()===who.trim().toLowerCase());
      if(!p)return toast('No person called '+who);addSplitExpense(p,x.note||x.cat,x.amt);toast(`Added to splitter: ${p} paid ${money(x.amt)}`)};
    li.lastChild.onclick=()=>removeWithUndo(expenses,expenses.indexOf(x),saveExpenses,'Expense removed');$('xList').append(li)})}
function addExpense(amt,cat,note,d=isoDay()){if(!(amt>0))return false;expenses.push({id:uid(),d,cat:cat||'Other',amt,note:note||''});saveExpenses();return true}
tool({id:'expenses',name:'Expense tracker',group:'Money',html:`
<h2>Expense tracker</h2><p class="sub">Log what you spend and see it by category and by month.</p>
<div class="row"><input id="xAmt" type="number" step="0.01" placeholder="Amount" style="width:110px"><input id="xCat" list="xCats" placeholder="Category" style="width:140px"><datalist id="xCats"></datalist>
 <input id="xNote" class="grow" placeholder="Note (optional)"><input id="xDate" type="date"><button class="b" id="xAdd">Add</button></div>
<div class="row"><input id="xMonth" type="month"><b id="xTotal" class="grow"></b><button class="g" id="xCsv">Export month (CSV)</button><button class="g" id="xCsvAll">Export all (CSV)</button></div>
<div class="grid2"><div><table id="xChart"></table></div><div><div class="muted" style="font-size:13px">Last 6 months</div><div id="xMonths" style="display:flex;gap:4px"></div></div></div>
<ul class="clean" id="xList"></ul>`,
init(){$('xCats').innerHTML=CATS.map(c=>`<option>${c}</option>`).join('');$('xDate').value=isoDay();$('xMonth').value=isoDay().slice(0,7);
  $('xAdd').onclick=()=>{if(addExpense(+$('xAmt').value,$('xCat').value.trim(),$('xNote').value.trim(),$('xDate').value||isoDay())){$('xAmt').value=$('xNote').value=''}};
  $('xAmt').onkeydown=$('xNote').onkeydown=e=>e.key==='Enter'&&$('xAdd').click();$('xMonth').oninput=drawExpenses;
  const csv=list=>['Date,Category,Note,Amount',...list.sort((a,b)=>a.d.localeCompare(b.d)).map(x=>[x.d,x.cat,x.note,x.amt.toFixed(2)].map(v=>/[",\n]/.test(v)?'"'+String(v).replace(/"/g,'""')+'"':v).join(','))].join('\r\n');
  $('xCsv').onclick=()=>download(`expenses-${$('xMonth').value}.csv`,'\ufeff'+csv(expenses.filter(x=>x.d.startsWith($('xMonth').value))),'text/csv');
  $('xCsvAll').onclick=()=>download('expenses-all.csv','\ufeff'+csv([...expenses]),'text/csv')},
show(){expenses=load('expenses',expenses);drawExpenses()},
search(q){return expenses.filter(x=>(x.cat+' '+x.note).toLowerCase().includes(q)).map(x=>({text:`Spent ${money(x.amt)} on ${x.note||x.cat} (${x.d})`,go:()=>showTool('expenses')}))}});
command({word:'spent',help:'spent 12 lunch [food]',run(r){const m=r.match(/^\s*(\d+(?:\.\d+)?)\s*(.*)$/);if(!m)return'Try: spent 12 lunch food';
  let note=m[2].trim(),cat='Other';const words=note.split(/\s+/),last=words[words.length-1]||'';
  const hit=CATS.find(c=>c.toLowerCase()===last.toLowerCase());if(hit&&words.length>1){cat=hit;note=words.slice(0,-1).join(' ')}else if(hit){cat=hit;note=''}
  addExpense(+m[1],cat,note);return`Logged ${money(+m[1])}${note?' for '+note:''} (${cat}).`}});

// ---------- recurring bills ----------
let bills=load('bills',[]);const saveBills=()=>{save('bills',bills);drawBills()};
function nextDue(b){const now=new Date(),t=parseIso(isoDay());let y=t.getFullYear(),m=t.getMonth();
  const mk=(y,m)=>new Date(y,m,Math.min(b.day,new Date(y,m+1,0).getDate()));let d=mk(y,m);if(d<t)d=mk(y,m+1);return d}
function whenLabel(days,d){return days===0?'today':days===1?'tomorrow':days<7?d.toLocaleDateString(undefined,{weekday:'long'}):d.toLocaleDateString(undefined,{month:'short',day:'numeric'})}
function billsDueSoon(n){return load('bills',[]).map(b=>{const d=nextDue(b),days=Math.round((d-parseIso(isoDay()))/DAY);return{...b,date:d,days,when:whenLabel(days,d)}}).filter(b=>b.days<=n&&b.paid!==isoDay(b.date).slice(0,7)).sort((a,b)=>a.days-b.days)}
function drawBills(){const list=bills.map(b=>{const d=nextDue(b),days=Math.round((d-parseIso(isoDay()))/DAY);return{b,d,days}}).sort((a,b)=>a.days-b.days);
  $('bList').innerHTML='';list.forEach(({b,d,days})=>{const li=document.createElement('li');
    const paidKey=isoDay(d).slice(0,7),paid=b.paid===paidKey;
    li.innerHTML=`<span class="grow ${paid?'done':days<=1?'overdue':days<=7?'soon':''}">${esc(b.name)}</span><b>${money(b.amt)}</b><span class="muted" style="width:150px;text-align:right">${paid?'paid ✓':whenLabel(days,d)}</span><button class="g" style="padding:2px 8px" ${paid?'disabled':''} title="Mark paid and log it as an expense">Paid</button><button class="x">✕</button>`;
    li.querySelector('.g').onclick=()=>{b.paid=paidKey;addExpense(b.amt,'Bills',b.name);saveBills();toast(`${b.name} paid and logged in Expenses`)};
    li.lastChild.onclick=()=>removeWithUndo(bills,bills.indexOf(b),saveBills,'Bill removed');$('bList').append(li)});
  if(!bills.length)$('bList').innerHTML='<li class="muted">No bills yet.</li>';
  $('bTotal').textContent=bills.length?`Every month: ${money(bills.reduce((s,b)=>s+b.amt,0))}`:''}
tool({id:'bills',name:'Bills',group:'Money',html:`
<h2>Recurring bills</h2><p class="sub">Monthly bills and when each is next due. Anything due within a week also shows on the dashboard and calendar.</p>
<div class="row"><input id="bName" class="grow" placeholder="Bill (e.g. Rent, Phone)"><input id="bAmt" type="number" step="0.01" placeholder="Amount" style="width:110px">Day of month <input id="bDay" type="number" min="1" max="31" style="width:70px"><button class="b" id="bAdd">Add</button></div>
<ul class="clean" id="bList"></ul><b id="bTotal"></b>`,
init(){$('bAdd').onclick=()=>{const name=$('bName').value.trim(),day=Math.min(31,Math.max(1,+$('bDay').value||0));if(!name||!+$('bDay').value)return toast('Add a name and a day of the month.');
  bills.push({id:uid(),name,amt:+$('bAmt').value||0,day});$('bName').value=$('bAmt').value=$('bDay').value='';saveBills()}},
show(){bills=load('bills',bills);drawBills()},
search(q){return bills.filter(b=>b.name.toLowerCase().includes(q)).map(b=>({text:`Bill: ${b.name} (day ${b.day})`,go:()=>showTool('bills')}))}});
