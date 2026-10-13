// Voice launcher on the main menu: "open snake", "play parkour", "start a 10 minute timer", "add todo buy milk",
// "spent 12 on lunch". Uses the browser's speech recognition (Chrome, Edge, ChromeOS).
(()=>{const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return;
  const toast=window.toast||(m=>{let t=document.getElementById('toast');if(!t){t=document.createElement('div');t.id='toast';document.body.append(t)}t.textContent=m;t.style.display='block';clearTimeout(t._h);t._h=setTimeout(()=>t.style.display='none',3000)});
  const b=document.createElement('button');b.className='g';b.textContent='🎤';b.title='Say “open snake” or “start a 10 minute timer”';b.setAttribute('aria-label','Voice command');$('menuBar').append(b);
  const words=s=>s.toLowerCase().replace(/[^\p{L}\p{N} ]/gu,' ').split(/\s+/).filter(Boolean);
  const NUM={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,fifteen:15,twenty:20,thirty:30,forty:40,fifty:50,sixty:60};
  const num=s=>s.replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|fifteen|twenty|thirty|forty|fifty|sixty)\b/g,w=>NUM[w]);
  function findApp(q){const w=words(q).filter(x=>!['the','a','an','app','game','my'].includes(x));if(!w.length)return null;let best=null,score=0;
    for(const a of ALL_APPS){const name=words(a.name+' '+a.id),s=w.filter(x=>name.some(n=>n===x||(x.length>3&&n.startsWith(x)))).length/w.length;if(s>score){score=s;best=a}}return score>=.5?best:null}
  function act(said){const t=num(said.toLowerCase().trim());let m;
    if((m=t.match(/^(?:open|play|start|launch|go to|show)\s+(.+)$/))&&!/timer/.test(t)){const a=findApp(m[1]);if(a){toast('Opening '+a.name);location.href=a.href;return}}
    if((m=t.match(/(\d+)\s*(second|minute|hour)s?\b.*timer|timer\s+(?:for\s+)?(\d+)\s*(second|minute|hour)s?/))){const n=m[1]||m[3],u=(m[2]||m[4])[0];location.href='tools.html?cmd='+encodeURIComponent(`timer ${n}${u==='m'?'m':u==='h'?'h':'s'}`)+'#timers';return}
    if((m=t.match(/^(?:add\s+)?(?:a\s+)?(?:to ?do|task)\s+(.+)$|^remind me to\s+(.+)$/))){location.href='tools.html?cmd='+encodeURIComponent('todo '+(m[1]||m[2]));return}
    if((m=t.match(/^(?:i\s+)?spent\s+(\d+(?:\.\d+)?)\s*(?:dollars|euros|pounds|shekels)?\s*(?:on\s+)?(.*)$/))){location.href='tools.html?cmd='+encodeURIComponent(`spent ${m[1]} ${m[2]||''}`.trim());return}
    const a=findApp(t);if(a){toast('Opening '+a.name);location.href=a.href;return}
    $('q').value=said;$('q').oninput();toast('Searching for “'+said+'”')}
  let rec=null;b.onclick=()=>{if(rec){rec.stop();return}rec=new SR();rec.lang=document.documentElement.lang||'en';rec.interimResults=false;rec.maxAlternatives=1;
    b.textContent='🔴';toast('Listening… say “open snake” or “10 minute timer”');
    rec.onresult=e=>{const s=e.results[0][0].transcript;act(s)};rec.onerror=e=>toast(e.error==='not-allowed'?'Microphone access was blocked.':'Didn’t catch that. Try again.');
    rec.onend=()=>{rec=null;b.textContent='🎤'};rec.start()};
  window.VOICE={act}})();
