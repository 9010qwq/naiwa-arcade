(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const setText = (id,value) => { const el=$(id), text=String(value); if(el.textContent!==text)el.textContent=text; };
  const canvas = $('board'), ctx = canvas.getContext('2d');
  const stage = document.querySelector('.stage');
  const game = new StackCore.Game('intro');
  const STORE = 'naiwa-stack-v1';
  const palettes = ['#e89970', '#adc98a', '#eed18b', '#a7c8bf'];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 480, H = 700, floor = 630, camera = 0, zoom = 1;
  let active = false, ready = false, resultShown = false, modalKind = '', lastEvent = 0;
  let accumulator = 0, lastFrame = 0, visualTime = 0, eventAge = 0, resultAge = 0;
  let pieces = [], particles = [], saved, primaryAction, secondaryAction, lastFocus;
  try { saved = JSON.parse(localStorage.getItem(STORE)) || {}; } catch { saved = {}; }
  if(typeof saved!=='object'||Array.isArray(saved))saved={};
  for (const mode of ['intro','challenge']) {
    const record = saved[mode] || {};
    saved[mode] = { height:Math.max(0,Math.min(mode==='intro'?12:18, Number(record.height)||0)), perfect:Math.max(0,Math.min(mode==='intro'?12:18, Number(record.perfect)||0)), wins:Math.max(0,Number(record.wins)||0), width:Math.max(0,Math.min(240,Number(record.width)||0)) };
  }
  function save() { try { localStorage.setItem(STORE,JSON.stringify(saved)); } catch { /* Private storage is optional. */ } }
  function bestText() {
    $('best').textContent = saved.intro.height || saved.challenge.height
      ? `本地纪录 · 入门 ${saved.intro.height}/12 · 挑战 ${saved.challenge.height}/18`
      : '本地纪录 · 等第一座塔开张';
  }
  bestText();
  const sprite = new Image(); sprite.src = 'assets/naiwa-sheet.png';
  sprite.onload = () => { ready = true; };
  sprite.onerror = () => { $('load-error').hidden = false; };
  function resize() {
    const rect = stage.getBoundingClientRect(), ratio = Math.min(devicePixelRatio || 1, 2);
    H = rect.height / rect.width * W; floor = H - 65;
    canvas.width = Math.round(rect.width * ratio); canvas.height = Math.round(rect.height * ratio);
  }
  new ResizeObserver(resize).observe(stage); resize();

  function openModal(kind, tag, title, copy, extra, first, second, action1, action2) {
    modalKind = kind; lastFocus = document.activeElement;
    $('modal-tag').textContent = tag; $('modal-title').textContent = title;
    $('modal-copy').textContent = copy; $('modal-extra').innerHTML = extra;
    $('modal-primary').textContent = first; $('modal-secondary').textContent = second;
    primaryAction = action1; secondaryAction = action2; $('modal').hidden = false;
    $('modal-primary').focus({preventScroll:true});
  }
  function closeModal() {
    $('modal').hidden = true; modalKind = '';
    if (lastFocus && lastFocus.isConnected && !lastFocus.disabled) lastFocus.focus({preventScroll:true});
  }
  $('modal-primary').addEventListener('click', () => primaryAction?.());
  $('modal-secondary').addEventListener('click', () => secondaryAction?.());
  function start(mode) {
    if (!ready) return;
    game.restart(mode); active = true; resultShown = false; resultAge = 0;
    closeModal(); $('menu').hidden = true; $('hud').hidden = false;
    $('pause').disabled = false; $('restart').disabled = false;
    pieces = []; particles = []; camera = 0; zoom = 1; accumulator = 0; eventAge = 5;
    lastEvent = game.state.lastEvent.id; $('feedback').className = 'feedback'; $('feedback').textContent='';
    $('drop').focus({preventScroll:true}); sync();
  }
  function home() {
    active = false; closeModal(); $('menu').hidden = false; $('hud').hidden = true;
    $('notice').hidden = true; $('pause').disabled = true; $('restart').disabled = true; $('drop').disabled = true;
    $('feedback').className = 'feedback'; $('feedback').textContent=''; bestText(); $('intro').focus({preventScroll:true});
  }
  $('intro').addEventListener('click', () => start('intro'));
  $('challenge').addEventListener('click', () => start('challenge'));
  $('rules').addEventListener('click', () => openModal('rules','一键上手','只要看准这一下',
    '把移动坐垫对准下面的坐垫，按空格、点画面或点「落下」。只计算坐垫的重叠。',
    '<ul><li>偏出去的坐垫会滑落，下一层承托面变窄；完全错开就结束。</li><li>绿色对齐提示是精准区。三连精准后，接下来两层减速、放宽精准区并稳住塔。</li><li>第5、10、15层先预告，再左右笑晃；等重叠合适再落，没有倒计时。</li><li>入门12层，挑战18层。通关后比剩余宽度和精准次数。</li></ul>',
    '知道了，开叠','回到选塔', () => start('intro'),closeModal));
  function pause() {
    if (!active || !game.pause()) return;
    sync(); openModal('pause','营业暂停','先憋一会儿', '回到游戏后，坐垫从暂停的位置继续移动。', '', '继续叠','回到选塔', () => { closeModal(); game.resume(); accumulator=0; sync(); },home);
  }
  $('pause').addEventListener('click',pause);
  $('restart').addEventListener('click', () => start(game.state.mode));
  function drop() { if (!active || !$('modal').hidden || !ready) return; const event=game.drop(); if(event) handleEvent(event); sync(); }
  canvas.addEventListener('pointerdown', e => { if(e.isPrimary && e.button===0) { e.preventDefault(); drop(); } });
  $('drop').addEventListener('pointerdown', e => { if(e.isPrimary && e.button===0) { e.preventDefault(); drop(); } });
  $('drop').addEventListener('click', e => { if(e.detail===0) drop(); });
  document.addEventListener('keydown', e => {
    if (!e.repeat && active && ['Space','ArrowDown'].includes(e.code) && $('modal').hidden) { e.preventDefault(); drop(); }
    if (e.repeat && ['Space','ArrowDown'].includes(e.code)) e.preventDefault();
    if (!e.repeat && ['Escape','KeyP'].includes(e.code) && active) { e.preventDefault(); if(modalKind==='pause') { closeModal(); game.resume(); sync(); } else if($('modal').hidden) pause(); }
    if (!e.repeat && e.code==='KeyR' && active && ['','pause','result'].includes(modalKind)) { e.preventDefault(); start(game.state.mode); }
    if (e.key==='Tab' && !$('modal').hidden) {
      const first=$('modal-primary'),last=$('modal-secondary');
      if(e.shiftKey && document.activeElement===first) {e.preventDefault();last.focus();}
      if(!e.shiftKey && document.activeElement===last) {e.preventDefault();first.focus();}
    }
  });
  document.addEventListener('visibilitychange', () => { if(document.hidden) pause(); lastFrame=0; });
  window.addEventListener('blur',pause);

  function showFeedback(text, miss=false) {
    $('feedback').textContent=text; $('feedback').className='feedback';
    void $('feedback').offsetWidth; $('feedback').className='feedback show'+(miss?' miss':'');
  }
  function handleEvent(event) {
    lastEvent=event.id; eventAge=0; const s=game.state;
    if(event.cut) pieces.push({x:event.cut.left,w:event.cut.width,y:floor-(event.kind==='lost'?s.height+1:s.height)*82,age:0,side:event.cut.side||((event.dropLeft<event.supportLeft)?-1:1),frog:event.kind==='lost',pose:s.mover.pose});
    if(event.kind==='lost') showFeedback('哎？坐歪了。',true);
    else if(event.shieldAwarded) showFeedback('三连精准！稳住两层');
    else if(event.perfect) showFeedback(['严丝合缝！','精准落座！','这下稳了。'][s.height%3]);
    else showFeedback(event.lostWidth<30?'差一点点。':'坐垫滑走一截！',true);
    if(event.perfect && !reducedMotion) for(let i=0;i<12;i++) particles.push({x:event.keptLeft+event.keptWidth/2,y:floor-s.height*82-12,vx:Math.cos(i*2.4)*65,vy:-35-Math.sin(i*1.9)*40,age:0,color:i%2?'#e9b750':'#6b9b6b'});
    const rec=saved[s.mode]; rec.height=Math.max(rec.height,s.height); rec.perfect=Math.max(rec.perfect,s.perfectCount);
    if(s.phase==='won') {rec.wins++;rec.width=Math.max(rec.width,s.layers.at(-1).width);}
    save();
    if(s.phase==='lost'||s.phase==='won') { resultAge=0; $('pause').disabled=true; }
  }
  function showResult() {
    const s=game.state, won=s.phase==='won'; resultShown=true;
    const percent=Math.round(s.layers.at(-1).width/240*100);
    openModal('result',won?'今日营业 · 成功封顶':'今日营业 · 下次坐稳',won?(s.target===12?'12层，憋住了！':'18层，笑着封顶！'):`叠到第 ${s.height} 层`,
      won?`还留下 ${percent}% 的坐垫。下次试试叠得更整齐。`:'坐垫完全错开了。下一把从宽坐垫和初始速度重新开始。',
      `<div class="result-stats"><div><strong>${s.height}<small>/${s.target}</small></strong><span>成功落座</span></div><div><strong>${s.perfectCount}</strong><span>精准次数</span></div><div><strong>${percent}%</strong><span>剩余宽度</span></div></div>`,
      won&&s.target===12?'继续 · 挑战18层':'再叠一把','回到选塔', () => start(won&&s.target===12?'challenge':s.mode),home);
  }
  function sync() {
    const s=game.state; setText('height',s.height); setText('target',s.target);
    const warning=s.phase==='moving'&&s.wobbleScheduled&&s.shield===0&&s.stageTime<StackCore.RULES.warningDuration;
    $('drop').disabled=!active||!game.canDrop();
    const top=s.layers.at(-1), dx=s.mover?Math.abs(s.mover.left-(top.left+game.supportOffset())):Infinity;
    const aligned=s.phase==='moving'&&dx<top.width&&dx<=game.perfectTolerance();
    setText('action-label',warning?'憋笑中…稍等一拍':aligned?'对齐了 · 落下':'看准 · 落下');
    $('drop').classList.toggle('aligned',aligned);
    $('pause').disabled=!active||s.phase==='lost'||s.phase==='won';
    const combo=document.querySelector('.combo'); combo.classList.toggle('stable',s.shield>0);
    setText('combo-text',s.shield>0?`稳固还剩 ${s.shield} 层`:'精准连击');
    document.querySelectorAll('.dots i').forEach((dot,i)=>dot.classList.toggle('on',i<s.streak));
    const notice=$('notice'); notice.className='notice'+(s.shield>0?' safe':'');
    notice.hidden=!active||s.paused||s.phase!=='moving'||(!s.wobbleScheduled&&s.shield===0);
    setText('notice',s.shield>0?'稳住了 · 移动更慢，精准更宽':s.wobblePhase==='warning'?`第 ${s.nextHeight} 层 · 憋笑预告，稍等一拍`:'正在笑晃 · 对准再落');
    setText('hint',active?(s.height===0?'看坐垫边缘 · 绿色提示亮起时落下':'三连精准稳两层 · P 暂停 · R 重来'):'三连精准稳两层 · 逢 5 层小心笑场');
    canvas.setAttribute('aria-label',`奶蛙叠塔，${s.height}/${s.target}层。${s.paused?'已暂停。':s.phase==='lost'?'本局结束。':s.phase==='won'?'成功封顶。':'按空格或落下按钮落座。'}`);
  }
  function roundRect(x,y,w,h,r,fill,stroke) {
    if(w<=0)return;ctx.beginPath();ctx.roundRect(x,y,w,h,Math.min(r,w/2));if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}
  }
  function frog(x,y,index,size=105,tilt=0,sy=1) {
    if(!ready)return;
    ctx.save();ctx.translate(x,y);ctx.rotate(tilt);ctx.scale(1,sy);
    // The processed sprite has a shared baseline at y=252 in a 256px cell.
    ctx.drawImage(sprite,(index%2)*256,Math.floor(index/2)*256,256,256,-size/2,-size*252/256,size,size);ctx.restore();
  }
  function cushion(left,y,width,index,perfect=false,guide=false) {
    const color=guide?'#e6efc4':palettes[index%palettes.length];
    ctx.save();ctx.shadowColor='#314d3820';ctx.shadowBlur=5;ctx.shadowOffsetY=3;
    roundRect(left,y,width,15,5,color,guide?'#6f9561':'#41583e70');ctx.restore();
    ctx.strokeStyle=perfect?'#557d4877':'#fbf6dfb0';ctx.lineWidth=1;ctx.setLineDash([3,4]);
    ctx.beginPath();ctx.moveTo(left+Math.min(6,width*.2),y+7);ctx.lineTo(left+width-Math.min(6,width*.2),y+7);ctx.stroke();ctx.setLineDash([]);
  }
  function background() {
    ctx.fillStyle='#f5f0df';ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#e9eddb';ctx.beginPath();ctx.arc(405,65,150,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#e2e9d6';ctx.beginPath();ctx.arc(35,H-20,140,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#dce1cb';ctx.lineWidth=1;
    for(let x=30;x<W;x+=35){ctx.beginPath();ctx.moveTo(x,H-28);ctx.lineTo(240,H-75);ctx.stroke();}
    ctx.fillStyle='#b0b99c';ctx.font='9px system-ui';ctx.textAlign='center';ctx.fillText('坐 垫 对 齐  ·  一 路 叠 高',240,H-22);
    ctx.fillStyle='#d9dfc8';ctx.fillRect(23,125,2,Math.max(50,H-230));
    const s=game.state;for(let i=0;i<s.target;i++){const y=H-105-(H-230)*(i/(s.target-1));ctx.fillStyle=i<s.height?'#5b8664':'#c6cfb6';ctx.beginPath();ctx.arc(24,y,i<s.height?3:2,0,7);ctx.fill();if((i+1)%5===0||i+1===s.target){ctx.font='8px system-ui';ctx.textAlign='left';ctx.fillText(i+1,34,y+3);}}
  }
  function render(dt) {
    ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);background();
    if(!active) return;
    const s=game.state, topY=floor-s.height*82;
    const cameraTarget=Math.max(0,H*.57-topY);
    camera+=(cameraTarget-camera)*Math.min(1,dt*8);
    const offset=game.supportOffset();
    ctx.save();ctx.translate(0,camera);
    roundRect(89,floor+11,302,22,6,'#44624e');roundRect(100,floor+14,280,4,2,'#7e9b73');
    s.layers.forEach((layer,i)=>{
      let y=floor-i*82;
      if(i===s.height&&eventAge<.18&&i>0&&s.phase!=='lost')y-=22*Math.pow(1-eventAge/.18,2);
      if(y+camera < -120 || y+camera>H+140)return;
      const left=layer.left+offset;
      cushion(left,y,layer.width,i,layer.perfect);
      if(i>=0){
        const wobble=s.wobblePhase==='shaking'&&!reducedMotion?Math.sin(s.time*7+i)*.065:0;
        const pose=s.wobblePhase==='shaking'?2+(i%2):(i===s.height&&eventAge<.7&&s.lastEvent.perfect?3:layer.pose);
        frog(left+layer.width/2,y,pose,Math.max(70,Math.min(105,layer.width*.9)),wobble);
      }
      if(i===s.height&&s.phase==='moving'){
        ctx.strokeStyle=s.shield>0?'#cda43a':'#548358';ctx.lineWidth=2;ctx.setLineDash([3,4]);
        ctx.beginPath();ctx.moveTo(left,y-5);ctx.lineTo(left,y-72);ctx.moveTo(left+layer.width,y-5);ctx.lineTo(left+layer.width,y-72);ctx.stroke();ctx.setLineDash([]);
      }
    });
    if(s.phase==='moving'){
      const m=s.mover, y=topY-82;
      const target=s.layers.at(-1).left+offset;
      const overlap=Math.min(m.left+m.width,target+s.layers.at(-1).width)-Math.max(m.left,target);
      const aligned=overlap>0&&Math.abs(m.left-target)<=game.perfectTolerance();
      if(aligned){ctx.fillStyle='#96c46b25';ctx.fillRect(target,y+15,m.width,67);}
      cushion(m.left,y,m.width,s.height+1,false,aligned);
      frog(m.left+m.width/2,y,s.shield>0?1:(s.wobblePhase==='shaking'?2:m.pose),Math.max(70,Math.min(105,m.width*.9)));
      if(aligned){ctx.fillStyle='#4f7944';ctx.font='bold 11px "Microsoft YaHei", sans-serif';ctx.textAlign='center';ctx.fillText(s.shield>0?'稳固精准区':'精准区',target+m.width/2,y+40);}
      else if(s.height===0){ctx.fillStyle='#7a886b';ctx.font='11px "Microsoft YaHei", sans-serif';ctx.textAlign='center';ctx.fillText('等坐垫重叠，点一下',240,topY+45);}
    }
    for(const p of pieces){const t=p.age;ctx.save();ctx.translate(p.x+p.w/2+p.side*t*70,p.y+t*t*350);ctx.rotate(p.side*t*1.6);ctx.globalAlpha=Math.max(0,1-t/1.4);cushion(-p.w/2,0,p.w,s.height+1);if(p.frog)frog(0,0,3,105);ctx.restore();}
    for(const p of particles){ctx.fillStyle=p.color;ctx.globalAlpha=Math.max(0,1-p.age);ctx.beginPath();ctx.arc(p.x+p.vx*p.age,p.y+p.vy*p.age+p.age*p.age*95,2.5,0,7);ctx.fill();}ctx.globalAlpha=1;
    ctx.restore();
    if(s.phase==='won'&&!resultShown){ctx.fillStyle='#277359';ctx.font='bold 24px "Microsoft YaHei", sans-serif';ctx.textAlign='center';ctx.fillText('封顶营业！',240,145);}
  }
  function frame(now) {
    const dt=lastFrame?Math.min((now-lastFrame)/1000,.1):0;lastFrame=now;
    if(active&&!game.state.paused&&$('modal').hidden){
      accumulator+=dt;
      while(accumulator>=1/120){game.step(1/120);accumulator-=1/120;}
      if(game.state.lastEvent.id!==lastEvent)handleEvent(game.state.lastEvent);
      visualTime+=dt;eventAge+=dt;
      if(eventAge>1.1&&$('feedback').textContent){$('feedback').textContent='';$('feedback').className='feedback';}
      pieces.forEach(p=>p.age+=dt);pieces=pieces.filter(p=>p.age<1.4);
      particles.forEach(p=>p.age+=dt);particles=particles.filter(p=>p.age<1);
      if(['lost','won'].includes(game.state.phase)&&!resultShown){resultAge+=dt;if(resultAge>1.1)showResult();}
      sync();
    }
    render(game.state.paused?0:dt);requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
