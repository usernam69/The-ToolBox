// Shared bits for the Arcade games (load after common.js, and after scores.js for world boards and online rooms).
// ARC.best(score,{lower}) keeps your best · ARC.board(id) adds a world top 10 · ARC.room(game,onMsg) plays online with a code
// ARC.loop(fn) runs fn(dt) every frame · ARC.over(text,again) shows a game-over card · ARC.rng(seed) gives repeatable randoms
// ARC.daily(score) records today's score for the Daily mix · ARC.WORDS a word list · ARC.pad() reads a game controller
const ARC={
  // opened from the Tournament bracket (?bracket=<match>&p1=&p2=): show who is playing, and send the winner back
  match:(()=>{const q=new URLSearchParams(location.search);return q.get('bracket')?{key:q.get('bracket'),p:[(q.get('p1')||'Player 1').slice(0,40),(q.get('p2')||'Player 2').slice(0,40)]}:null})(),
  report(k){if(!ARC.match||(k!==0&&k!==1))return;try{localStorage.setItem('tb_bracketResult',JSON.stringify({key:ARC.match.key,p:ARC.match.p,k}))}catch{}toast(`🏆 ${ARC.match.p[k]} goes through! Back to the bracket…`);setTimeout(()=>location.href='bracket.html',2200)},
  // opened from a friend's "Challenge a friend" link (?challenge=<score>): the score to beat
  challenge:(()=>{const n=parseFloat(new URLSearchParams(location.search).get('challenge'));return isFinite(n)?{score:n}:null})(),
  last:null,
  best(score,{lower=false,key='best'}={}){const b=load(key,null),isNew=b===null||(lower?score<b:score>b);if(isNew)save(key,score);ARC.daily(score);
    ARC.last={score,lower};const c=ARC.challenge;if(c&&(lower?score<c.score:score>c.score)&&!c.won){c.won=true;toast(`🏁 You beat your friend's ${c.score}!`)}
    return{best:isNew?score:b,isNew}},
  board(id,opts={}){const el=$('world');if(el&&typeof worldBoard==='function')worldBoard(el,'arc-'+id,{getScore:()=>load(opts.key||'best',0),...opts})},
  // today's scores, read by the Daily mix and by Wrapped
  daily(score){try{const k='tb_arcadeDay',d=JSON.parse(localStorage.getItem(k)||'{}'),day=isoDay();if(d.day!==day){d.day=day;d.s={}}d.s[APP]=Math.max(d.s[APP]||0,+score||0);localStorage.setItem(k,JSON.stringify(d))}catch{}},
  loop(fn){let last=performance.now(),on=true;const f=t=>{if(!on)return;const dt=Math.min(.05,(t-last)/1000);last=t;fn(dt);requestAnimationFrame(f)};requestAnimationFrame(f);return()=>on=false},
  over(text,again,el=document.querySelector('main')){let o=$('arcOver');if(!o){o=document.createElement('div');o.id='arcOver';o.className='box';o.style.cssText='text-align:center;margin:10px auto;max-width:420px';el.append(o)}
    const L=ARC.last;o.hidden=false;o.innerHTML=`<p style="font-size:20px;margin:0 0 8px">${text}</p>${again?'<button class="b">Play again</button>':''}${L?' <button class="g" id="arcChal" title="Copy a link; your friend plays and tries to beat this score">🏁 Challenge a friend</button>':''}`;if(again)o.querySelector('button').onclick=()=>{o.hidden=true;again()};
    if(L)$('arcChal').onclick=()=>{const u=location.href.split(/[?#]/)[0]+'?challenge='+L.score;navigator.clipboard.writeText(u).then(()=>toast('Link copied. Send it to a friend!'),()=>prompt('Copy this link:',u))};[523,392,330].forEach((f,i)=>tone(f,.15,'triangle',.08,i*.12))},
  hideOver(){const o=$('arcOver');if(o)o.hidden=true},
  rng(seed){let s=0;for(const c of String(seed))s=(s*31+c.charCodeAt(0))>>>0;s=s||1;return()=>((s=Math.imul(s^s>>>15,1|s)+0x6d2b79f5>>>0)%1e9)/1e9},
  shuffle(a,r=Math.random){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a},
  pad(){const g=navigator.getGamepads?[...navigator.getGamepads()].filter(Boolean):[];return g.map(p=>({x:Math.abs(p.axes[0])>.3?p.axes[0]:(p.buttons[15]?.pressed?1:0)-(p.buttons[14]?.pressed?1:0),y:Math.abs(p.axes[1])>.3?p.axes[1]:(p.buttons[13]?.pressed?1:0)-(p.buttons[12]?.pressed?1:0),a:!!p.buttons[0]?.pressed,b:!!p.buttons[1]?.pressed}))},
  canvas(id,w,h){const c=$(id);c.width=w;c.height=h;return c.getContext('2d')},
  // pointer position in canvas pixels
  pos(c,e){const r=c.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width*c.width,y:(e.clientY-r.top)/r.height*c.height}},
  WORDS:'apple beach brave bread chair cloud dance dream eagle earth flame frost ghost grape heart honey house juice knife lemon light magic money mouse music night ocean paint party piano pizza plant queen radio river robot salad snake space spoon storm sugar table tiger toast tower train water whale world zebra pixel bug code laser rocket comet planet forest castle dragon garden jungle island candle button puzzle window'.split(' '),
  // online rooms: a short code, both players subscribe to …/arcade/<game>/<code>; messages carry who sent them
  room(game,onMsg,{el=$('room'),onJoin}={}){if(!el)return null;const me=uid(),R={me,code:null,host:false,peers:new Set(),send(o){if(!R.c||!R.code)return;R.c.publish(`the-toolbox/v1/arcade/${game}/${R.code}`,JSON.stringify({...o,from:me}),{qos:0})}};
    el.innerHTML=`<div class="row"><button class="g" data-a="new">🌐 New online game</button><input data-a="code" maxlength="6" placeholder="Code" style="width:90px;text-transform:uppercase"><button class="g" data-a="join">Join</button><span class="muted" data-a="msg"></span></div>`;
    const msg=t=>el.querySelector('[data-a=msg]').textContent=t;
    const go=async(code,host)=>{try{msg('Connecting…');R.c=await WORLD.connect();R.code=code;R.host=host;const t=`the-toolbox/v1/arcade/${game}/${code}`;R.c.subscribe(t);
        R.c.on('message',(topic,buf)=>{if(topic!==t)return;let m;try{m=JSON.parse(new TextDecoder().decode(buf))}catch{return}if(!m||m.from===me)return;
          if(m.t==='hello'){if(!R.peers.has(m.from)){R.peers.add(m.from);R.send({t:'hello'});onJoin&&onJoin(m.from)}msg(`Code ${code} · ${R.peers.size+1} playing`);return}onMsg(m)});
        R.send({t:'hello'});msg(host?`Code ${code}: tell a friend to join`:`Joined ${code}`)}catch{msg('Couldn’t connect (offline?)')}};
    el.querySelector('[data-a=new]').onclick=()=>{const c=Math.random().toString(36).slice(2,6).toUpperCase();el.querySelector('[data-a=code]').value=c;go(c,true)};
    el.querySelector('[data-a=join]').onclick=()=>{const c=el.querySelector('[data-a=code]').value.trim().toUpperCase().replace(/[^A-Z0-9]/g,'');if(c.length<3)return toast('Type the code your friend sees.');go(c,false)};
    return R}
};
if(ARC.match){const b=document.createElement('p');b.className='box';b.style.textAlign='center';b.innerHTML=`🏆 Bracket match: <b>${esc(ARC.match.p[0])}</b> (player 1) vs <b>${esc(ARC.match.p[1])}</b> (player 2)`;document.querySelector('main')?.prepend(b)}
if(ARC.challenge){const b=document.createElement('p');b.className='box';b.style.textAlign='center';b.innerHTML=`🏁 A friend challenged you! Score to beat: <b>${esc(String(ARC.challenge.score))}</b>`;(document.querySelector('main .sub')||document.querySelector('main').firstChild).before(b)}
