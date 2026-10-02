/* UI and rendering only. Deterministic game rules live in simulation.js. */
(() => {
  'use strict';
  const R = window.RelayRules;
  const $ = id => document.getElementById(id);
  const canvas = $('scene'), ctx = canvas.getContext('2d');
  const STORE = 'naiwa-relay-progress-v1';
  let saved = { completed: [], lastLevel: 0 };
  try { const v = JSON.parse(localStorage.getItem(STORE)); if(v && Array.isArray(v.completed)) saved={ completed:v.completed.filter(i=>Number.isInteger(i)&&i>=0&&i<5),lastLevel:Math.max(0,Math.min(4,Number(v.lastLevel)||0)) }; } catch {}
  let game, selected, nodesDOM = new Map(), lastHistory = [], showTrail = true, resultShown = false;
  let lastStamp = 0, accumulator = 0, lastUI = 0, helpResume = false, transient = '', transientUntil = 0;
  const levelNames = ['一栋','二栋','三栋','四栋','五栋'];
  const nav = $('level-nav');
  R.LEVELS.forEach((level, index) => {
    const b = document.createElement('button'); b.textContent = levelNames[index]; b.dataset.level = index;
    b.setAttribute('aria-label',`进入${levelNames[index]}：${level.title}`); b.addEventListener('click',()=>loadLevel(index)); nav.appendChild(b);
  });
  const persist = () => { try { localStorage.setItem(STORE,JSON.stringify(saved)); } catch {} };
  const currentLevel = () => R.LEVELS[game.index ?? game.levelIndex ?? 0];
  const currentIndex = () => game.index ?? game.levelIndex ?? 0;
  const findNode = id => game.nodes.find(n=>n.id===id);
  const notify = text => { transient=text; transientUntil=performance.now()+5500; };
  function loadLevel(index) {
    if (game && currentIndex()===index) lastHistory=game.history.map(h=>({...h})); else lastHistory=[];
    game=R.createGame(index); game.index=index; selected=game.nodes.find(n=>n.starter)?.id ?? game.nodes[0].id;
    resultShown=false; accumulator=0; transient=''; saved.lastLevel=index; persist();
    for(const d of document.querySelectorAll('dialog')) if(d.open)d.close();
    $('rooms').replaceChildren(); nodesDOM=new Map();
    for(const n of game.nodes){
      const b=document.createElement('button'); b.className='room'; b.id=`room-${n.id}`;
      b.style.left=`${n.x/6}%`; b.style.top=`${n.y/6.5}%`;
      b.innerHTML='<span class="name"></span><span class="sprite" aria-hidden="true"></span><span class="state-tag"></span><span class="target-mark" aria-hidden="true"></span><span class="cooldown" aria-hidden="true"></span><span class="horn-tag" aria-hidden="true"></span>';
      b.addEventListener('click',()=>{if(game.paused)return;selected=n.id;updateUI();});
      $('rooms').appendChild(b); nodesDOM.set(n.id,b);
    }
    const level=currentLevel();
    notify(level.brief || level.hint || '点窗户选人 → 开窗 → 开始 → 点火。');
    updateUI(); draw();
  }
  function action(type){
    if(game.paused || $('help-dialog').open || $('result-dialog').open)return;
    if(type==='ignite' && game.status==='ready'){
      const n=findNode(selected);
      if(n.starter&&n.open&&n.state==='idle'&&game.remaining>0)R.act(game,{type:'start'});
    }
    R.act(game,{type,id:selected}); transient=''; updateUI();
  }
  function start(){R.act(game,{type:'start'});transient='';updateUI();}
  function pause(){if(game.status==='playing'){R.act(game,{type:'pause'});accumulator=0;updateUI();}}
  $('start-button').addEventListener('click',start);
  $('window-button').addEventListener('click',()=>action('window'));
  $('horn-button').addEventListener('click',()=>action('horn'));
  $('ignite-button').addEventListener('click',()=>action('ignite'));
  $('pause-button').addEventListener('click',pause); $('resume-button').addEventListener('click',pause);
  $('retry-button').addEventListener('click',()=>loadLevel(currentIndex()));
  $('hint-button').addEventListener('click',()=>{notify(currentLevel().hint);updateUI();});
  $('trail-button').addEventListener('click',()=>{showTrail=!showTrail;updateUI();});
  $('help-button').addEventListener('click',()=>{
    helpResume=game.status==='playing'&&!game.paused;if(helpResume)pause();$('help-dialog').showModal();
  });
  $('help-close').addEventListener('click',()=>{$('help-dialog').close();if(helpResume&&game.paused)pause();});
  $('help-dialog').addEventListener('cancel',()=>{if(helpResume&&game.paused)pause();});
  $('result-retry').addEventListener('click',()=>loadLevel(currentIndex()));
  $('result-next').addEventListener('click',()=>loadLevel(game.status==='won'?(currentIndex()+1)%R.LEVELS.length:currentIndex()));
  $('result-dialog').addEventListener('cancel',e=>e.preventDefault());
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&game.status==='playing'&&!game.paused)pause();});
  const KEY_ACTIONS = {w:'window',h:'horn',' ':'ignite'};
  document.addEventListener('keydown',e=>{
    if(e.repeat||e.altKey||e.ctrlKey||e.metaKey)return;
    if(document.querySelector('dialog[open]'))return;
    const key=e.key.toLowerCase();
    if(key==='p'||key==='escape'){e.preventDefault();pause();return;}
    if(game.paused)return;
    if(key==='r'){e.preventDefault();loadLevel(currentIndex());return;}
    if(KEY_ACTIONS[key]){e.preventDefault();action(KEY_ACTIONS[key]);return;}
    if(e.key.startsWith('Arrow')){
      e.preventDefault();const n=findNode(selected);const dx=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0,dy=e.key==='ArrowDown'?1:e.key==='ArrowUp'?-1:0;
      const candidates=game.nodes.filter(m=>m.id!==n.id&&(m.x-n.x)*dx+(m.y-n.y)*dy>10);
      candidates.sort((a,b)=>{const score=m=>Math.hypot(m.x-n.x,m.y-n.y)+Math.abs(dx?(m.y-n.y):(m.x-n.x))*1.5;return score(a)-score(b);});
      if(candidates[0])selected=candidates[0].id; updateUI();
    }
  });
  function updateUI(){
    const l=currentLevel(), n=findNode(selected), active=game.status==='playing', editable=(active||game.status==='ready')&&!game.paused;
    $('level-title').textContent=`${levelNames[currentIndex()]} · ${l.title}`;
    const targets=game.nodes.filter(x=>x.target), hit=targets.filter(x=>x.visited).length;
    $('goal').textContent=`星标 ${hit}/${targets.length} · ${l.roofRequired>1?'两路笑声须在2.5秒内到顶':'让笑声传到屋顶'}`;
    $('matches').textContent=Array.from({length:3},(_,i)=>i<game.remaining?'●':'○').join(' ');
    $('matches').setAttribute('aria-label',`剩余 ${game.remaining} 次点火`);
    const remaining=Math.max(0,Math.ceil(l.timeLimit-game.time));
    $('timer').innerHTML=`${remaining}<small>s</small>`; $('timer').classList.toggle('urgent',remaining<10);
    nav.querySelectorAll('button').forEach((b,i)=>{b.classList.toggle('current',i===currentIndex());b.classList.toggle('complete',saved.completed.includes(i));b.setAttribute('aria-current',i===currentIndex()?'step':'false');b.textContent=`${levelNames[i]}${saved.completed.includes(i)?' ✓':''}`;});
    for(const m of game.nodes){
      const b=nodesDOM.get(m.id),seconds=Math.ceil(m.remaining||0);
      b.className=`room ${m.state} ${m.roof?'roof':''} ${!m.open?'closed':''} ${m.id===selected?'selected':''} ${m.visited?'visited':''}`;
      const state=m.roof?(game.status==='won'?'笑醒了！':l.roofRequired>1?`屋顶 ${game.roofHits?.filter(h=>game.time-h.time<=(l.syncWindow||999)).length||0}/${l.roofRequired}`:'等一声笑'):!m.open?'窗关着':m.state==='rest'?`喘气 ${seconds}s`:m.state==='laugh'?(m.emitted?'哈哈哈！':'即将传出'):(m.starter?'✦ 点火户':'憋笑中');
      b.querySelector('.name').textContent=m.name;
      b.querySelector('.state-tag').textContent=state;
      b.setAttribute('aria-label',`${m.name}，${state}${m.target?'，星标目标':''}${m.id===selected?'，已选择':''}`);
      b.setAttribute('aria-pressed',String(m.id===selected));
      const mark=b.querySelector('.target-mark');mark.hidden=!m.target;mark.textContent=m.visited?'✓':'★';
      const cooldown=b.querySelector('.cooldown');cooldown.hidden=m.state!=='rest';cooldown.dataset.value=seconds;cooldown.style.setProperty('--ring',`${360*Math.min(1,(m.remaining||0)/(m.restDuration||8))}deg`);
      const horn=b.querySelector('.horn-tag');horn.hidden=!(m.routes?.length>1);horn.textContent=m.routes?.length>1?`↗ ${m.routeLabels?.[m.routeIndex]||'路线 '+(m.routeIndex+1)}`:'';
    }
    $('selected-name').textContent=n.name;
    const route=n.routeLabels?.[n.routeIndex];
    $('selected-info').textContent=n.roof?'屋顶接收笑声，无需操作':n.state==='rest'?`再喘 ${Math.ceil(n.remaining)} 秒可接力`:route?`${route} · 笑出声前可转向`:n.starter?'可主动点火 · 每次花一根火柴':'沿箭头自动接力';
    $('window-button').innerHTML=`<span>▣</span> ${n.open?'关窗':'开窗'}`;
    $('window-button').disabled=!editable||n.roof;
    $('horn-button').disabled=!editable||!(n.routes?.length>1);
    $('horn-button').innerHTML=`<span>↻</span> ${route||'无喇叭'}`;
    $('ignite-button').disabled=!editable||!n.starter||!n.open||n.state!=='idle'||game.remaining<=0;
    $('ignite-button').innerHTML=`<span>✦</span> ${game.status==='ready'?'开始并点火':'点火'}`;
    $('message').textContent=transient&&performance.now()<transientUntil?transient:(game.message||l.brief||'选择住户，再开窗或点火。');
    $('start-button').hidden=game.status!=='ready'; $('pause-button').hidden=!active;
    $('pause-button').textContent=game.paused?'继续':'暂停';$('pause-screen').hidden=!game.paused;
    $('board-phase').textContent=game.status==='ready'?'布置中 · 时间静止':game.paused?'已暂停':game.status==='won'?'接力成功':game.status==='lost'?'接力中断':'虚线：当前路线 · 亮点：在途笑声';
    $('trail-button').textContent=`上一轮轨迹 ${showTrail?'✓':'○'}`;$('trail-button').setAttribute('aria-pressed',String(showTrail));
    if((game.status==='won'||game.status==='lost')&&!resultShown)showResult();
  }
  function showResult(){
    resultShown=true; const won=game.status==='won';
    if(won&&!saved.completed.includes(currentIndex())){saved.completed.push(currentIndex());persist();}
    const finished=won&&saved.completed.length===R.LEVELS.length;
    $('result-kicker').textContent=finished?'FIVE BUILDINGS · ALL LAUGHING':won?'接力成功':'再试一次，换个时机';
    $('result-title').textContent=finished?'五栋楼，都绷不住了。':won?'笑声到顶！':'笑声断在了半路';
    $('result-description').textContent=won?(finished?'五栋全部接通。可以换条路线，再挑战少用一根火柴。':'看看剩下几根火柴，再去下一栋。'):(game.message||'笑声没有抵达屋顶。看一眼轨迹，再试一次。');
    $('result-stats').textContent=`用时 ${game.time.toFixed(1)} 秒　·　剩余 ${game.remaining} 次点火　·　成功接力 ${game.history.filter(h=>h.success).length} 段`;
    $('result-next').textContent=won?(finished?'从第一栋再来':'下一栋'):'重新布置';
    $('result-retry').hidden=!won;$('result-dialog').showModal();
  }
  function routeGeometry(a,b){
    const dx=b.x-a.x,dy=b.y-a.y,dist=Math.hypot(dx,dy)||1;
    const padA=a.roof?58:56,padB=b.roof?68:64;
    const sx=a.x+dx/dist*padA,sy=a.y+dy/dist*padA,tx=b.x-dx/dist*padB,ty=b.y-dy/dist*padB;
    const bend=Math.abs(dx)>240?35:Math.abs(dx)>100?12:0;
    return {sx,sy,tx,ty,cx:(sx+tx)/2-dy/dist*bend,cy:(sy+ty)/2+dx/dist*bend};
  }
  function point(g,t){const k=1-t;return {x:k*k*g.sx+2*k*t*g.cx+t*t*g.tx,y:k*k*g.sy+2*k*t*g.cy+t*t*g.ty};}
  function line(from,to,color,width,dash=[]){
    const a=findNode(from),b=findNode(to);if(!a||!b)return;
    const g=routeGeometry(a,b);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.beginPath();ctx.moveTo(g.sx,g.sy);ctx.quadraticCurveTo(g.cx,g.cy,g.tx,g.ty);ctx.stroke();ctx.setLineDash([]);
    const angle=Math.atan2(g.ty-g.cy,g.tx-g.cx);ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(g.tx,g.ty);ctx.lineTo(g.tx-11*Math.cos(angle-.5),g.ty-11*Math.sin(angle-.5));ctx.lineTo(g.tx-11*Math.cos(angle+.5),g.ty-11*Math.sin(angle+.5));ctx.fill();return g;
  }
  function draw(){
    ctx.clearRect(0,0,600,650);
    const sky=ctx.createLinearGradient(0,0,0,650);sky.addColorStop(0,'#14283b');sky.addColorStop(1,'#36535b');ctx.fillStyle=sky;ctx.fillRect(0,0,600,650);
    for(let i=0;i<35;i++){const x=(i*137+17)%600,y=(i*83+25)%250;ctx.fillStyle=i%3?'#c6cfb557':'#f1d89388';ctx.fillRect(x,y,i%3?1.5:2,2);}
    ctx.fillStyle='#d7d9b5';ctx.beginPath();ctx.arc(518,55,18,0,Math.PI*2);ctx.fill();ctx.fillStyle='#192e40';ctx.beginPath();ctx.arc(525,48,18,0,Math.PI*2);ctx.fill();
    for(let i=0;i<9;i++){const x=i*79-28,top=210+(i*137)%260;ctx.fillStyle=i%2?'#192f40':'#223b49';ctx.fillRect(x,top,64,650-top);ctx.fillStyle='#a3b59722';for(let yy=top+18;yy<630;yy+=29){ctx.fillRect(x+10,yy,6,9);ctx.fillRect(x+36,yy,6,9);}}
    // A tactile paper apartment, rendered separately from the playable residents.
    ctx.fillStyle='#10263377';ctx.fillRect(57,179,518,448);
    const facade=ctx.createLinearGradient(40,160,560,650);facade.addColorStop(0,'#687873');facade.addColorStop(.6,'#536c6d');facade.addColorStop(1,'#39545d');ctx.fillStyle=facade;ctx.fillRect(42,174,516,445);
    ctx.fillStyle='#8c9480';ctx.beginPath();ctx.moveTo(24,179);ctx.lineTo(80,136);ctx.lineTo(518,136);ctx.lineTo(577,179);ctx.closePath();ctx.fill();
    ctx.fillStyle='#263e49';ctx.fillRect(30,175,540,12);ctx.fillStyle='#a6a993';ctx.fillRect(39,174,522,3);
    for(let row=0;row<12;row++){ctx.strokeStyle='#b3b6a512';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(43,198+row*35);ctx.lineTo(558,198+row*35);ctx.stroke();for(let col=0;col<7;col++){ctx.beginPath();const x=45+col*85+(row%2)*40;ctx.moveTo(x,198+row*35);ctx.lineTo(x,233+row*35);ctx.stroke();}}
    ctx.fillStyle='#aeb4a04d';ctx.fillRect(42,174,9,445);ctx.fillStyle='#213c4977';ctx.fillRect(545,186,13,433);
    for(const y of [330,488]){ctx.fillStyle='#223e4988';ctx.fillRect(42,y,516,7);ctx.fillStyle='#a6aa922e';ctx.fillRect(42,y-2,516,2);}
    ctx.strokeStyle='#778b8155';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(74,136);ctx.lineTo(74,79);ctx.moveTo(54,90);ctx.lineTo(95,90);ctx.moveTo(59,80);ctx.lineTo(87,80);ctx.stroke();
    ctx.fillStyle='#233d46';ctx.fillRect(33,619,534,9);ctx.fillStyle='#7b8e81';ctx.fillRect(40,617,520,3);
    if(showTrail){for(const h of lastHistory)line(h.from,h.to,h.success?'#dcb1de65':'#f2a29365',5,[3,7]);}
    const edges=R.availableEdges(game);
    for(const e of edges){const chosen=e.from===selected;const g=line(e.from,e.to,chosen?(e.active?'#f5d087':'#bdb098'):(e.active?'#9bd8c0ac':'#82939670'),chosen?3:2,[6,7]);if(chosen&&g){const p=point(g,.5);ctx.fillStyle='#183340';ctx.fillRect(p.x-17,p.y-9,34,17);ctx.fillStyle='#ebdab7';ctx.font='11px system-ui';ctx.textAlign='center';ctx.fillText(`${e.travel.toFixed(1)}s`,p.x,p.y+4);}}
    for(const p of game.packets){const a=findNode(p.from),b=findNode(p.to);if(!a||!b)continue;const g=routeGeometry(a,b),t=Math.min(1,p.elapsed/p.duration),v=point(g,t);ctx.save();ctx.shadowBlur=16;ctx.shadowColor='#ffcb77';ctx.fillStyle='#ffdf8f';ctx.beginPath();ctx.arc(v.x,v.y,6,0,Math.PI*2);ctx.fill();ctx.restore();ctx.strokeStyle='#f7d99899';ctx.lineWidth=1;ctx.beginPath();ctx.arc(v.x,v.y,11+(game.time*6)%4,0,Math.PI*2);ctx.stroke();}
    // Current failed and successful arrivals are short feedback, never extra gameplay state.
    for(const h of game.history.slice(-10)){const age=game.time-h.time;if(age>1.4||age<0)continue;const n=findNode(h.to);if(!n)continue;ctx.strokeStyle=h.success?`rgba(221,232,154,${1-age/1.4})`:`rgba(242,151,150,${1-age/1.4})`;ctx.lineWidth=3;ctx.beginPath();ctx.arc(n.x,n.y,55+age*20,0,Math.PI*2);ctx.stroke();}
  }
  function frame(stamp){
    if(lastStamp===0)lastStamp=stamp;accumulator+=Math.min(.1,(stamp-lastStamp)/1000);lastStamp=stamp;
    while(accumulator>=1/60){R.step(game,1/60);accumulator-=1/60;}
    draw();if(stamp-lastUI>90){updateUI();lastUI=stamp;}requestAnimationFrame(frame);
  }
  loadLevel(saved.lastLevel);requestAnimationFrame(frame);
})();
