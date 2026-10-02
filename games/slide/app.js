(function () {
  'use strict';
  const E=window.NaiwaEngine, levels=window.NaiwaLevels.map(E.parse), $=s=>document.querySelector(s);
  const canvas=$('#board'),ctx=canvas.getContext('2d'),dialog=$('#modal'),content=$('#modal-content');
  const KEY='naiwa.slide.ice-tray.v1', directionNames={U:'上',D:'下',L:'左',R:'右'};
  const mapping={ArrowUp:'U',KeyW:'U',ArrowDown:'D',KeyS:'D',ArrowLeft:'L',KeyA:'L',ArrowRight:'R',KeyD:'R'};
  let save={unlocked:0,best:Array(8).fill(null)},storageOK=true;
  try {const v=JSON.parse(localStorage.getItem(KEY));if(v&&Number.isInteger(v.unlocked)) {save.unlocked=Math.max(0,Math.min(7,v.unlocked));save.best=Array.from({length:8},(_,i)=>Number.isInteger(v.best?.[i])&&v.best[i]>0?v.best[i]:null);}} catch{storageOK=false;}
  let current=save.unlocked,level=levels[current],state=E.initial(level),history=[];
  let started=false,paused=false,anim=null,brakeMode=false,preview=null,selected=1,hover=null;
  let modalMode='welcome',clock=0,last=performance.now(),accumulator=0,assetsReady=false,laughTime=0,hintCount=0;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sprites={slide:new Image(),laugh:new Image()};
  const confetti=[];
  Promise.all(Object.entries(sprites).map(([k,img])=>new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=`assets/naiwa-${k}.webp`;}))).then(()=>{assetsReady=true;const b=$('[data-action="start"]');if(b){b.disabled=false;b.textContent=save.unlocked?'继续吃点心 →':'开滑 →';}}).catch(()=>{message('角色图加载失败，请保留 assets 文件夹并重新打开。',true);const b=$('[data-action="start"]');if(b)b.textContent='图片加载失败，请刷新';});
  function persist(){try{localStorage.setItem(KEY,JSON.stringify(save));}catch{storageOK=false;}}
  function message(text,alert=false){$('#message').textContent=text;$('#message').classList.toggle('alert',alert);}
  function popcount(v){let n=0;while(v){n+=v&1;v>>=1;}return n;}
  function normalHint(){return level.hint;}
  function clearPreview(){brakeMode=false;preview=null;hover=null;$('#brake-picker').hidden=true;}
  function refresh(){
    $('#level-number').textContent=`${String(current+1).padStart(2,'0')} / 08`;
    $('#level-title').textContent=level.title;
    $('#snack-count').textContent=`${popcount(state.collected)} / ${level.snacks.length}`;
    $('#move-count').textContent=state.moves;
    $('#brake-count').textContent=Array.from({length:2},(_,i)=>i<state.brakes?'●':'○').join(' ');
    $('#brake-button').setAttribute('aria-pressed',String(brakeMode));
    $('#brake-button').disabled=!started||state.status!=='playing'||!!anim||state.brakes===0;
    $('#brake-button span').textContent=brakeMode?'取消急刹':'笑到坐地';
    $('#undo-button').disabled=!history.length||!!anim;
    $('#pause-button').disabled=!started;
    $('#hint-button').disabled=!started||!!anim||state.status!=='playing';
    canvas.dataset.state=JSON.stringify({level:current+1,...state,animating:!!anim,paused,brakeMode});
    canvas.setAttribute('aria-label',`第${current+1}关${level.title}。点心${popcount(state.collected)}/${level.snacks.length}，急刹剩${state.brakes}次，${state.moves}步。方向键或WASD滑行，空格急刹，Z撤销。`);
  }
  function reset(index=current){current=index;level=levels[current];state=E.initial(level);history=[];anim=null;paused=false;laughTime=0;hintCount=0;confetti.length=0;clearPreview();refresh();message(normalHint());}
  function active(){return started&&!paused&&!dialog.open&&state.status==='playing'&&!anim;}
  function commit(direction,stop=null){
    if(!active())return;
    const result=E.move(level,state,direction,stop);
    if(!result){message('这边滑不动，换个方向试试。');return;}
    history.push({...state});clearPreview();
    anim={...result,from:{...state},elapsed:0,duration:reduced?.08:Math.min(.68,.18+result.path.length*.065)};
    message(result.braking?'哈哈哈——就在这格坐下！':'咻——');refresh();
  }
  function direction(d){
    if(!active())return;
    if(!brakeMode){commit(d);return;}
    const choices=E.brakeTargets(level,state,d);
    if(!choices.length){preview=null;$('#brake-picker').hidden=true;message('这个方向没有可急刹的中途格，换个方向。',true);return;}
    preview={direction:d,choices};selected=choices[0].stop;updatePicker();
    message('点亮起的格子停下；也可按数字选格，回车确认。');
  }
  function updatePicker(){
    $('#brake-picker').hidden=!preview;
    if(!preview)return;
    $('#stop-options').innerHTML=preview.choices.map(p=>`<button class="stop-option" data-stop="${p.stop}" aria-label="急刹停在第${p.stop}格" aria-pressed="${selected===p.stop}">${p.stop}</button>`).join('');
  }
  function toggleBrake(){if(!active()||state.brakes===0)return;brakeMode=!brakeMode;preview=null;$('#brake-picker').hidden=true;message(brakeMode?'先选一个方向，再点沿途亮起的格子。':normalHint());refresh();}
  function undo(){if(!history.length||anim)return;state=history.pop();paused=false;clearPreview();confetti.length=0;laughTime=0;refresh();message('退回上一步。点心、薄冰和急刹也一起恢复。');}
  function show(html,mode){modalMode=mode;content.innerHTML=html;const title=content.querySelector('h2');if(title)title.id='modal-title';if(!dialog.open)dialog.showModal();}
  function close(){if(dialog.open)dialog.close();paused=false;last=performance.now();accumulator=0;refresh();canvas.focus({preventScroll:true});}
  function pause(){if(!started||dialog.open)return;paused=true;refresh();show(`<p class="modal-eyebrow">TAKE IT SLOW</p><h2>先歇一下。</h2><p>冰盘和刚才的滑行都等你回来。</p><button class="modal-primary" data-action="resume">继续滑</button><button class="modal-secondary" data-action="restart">这一盘重来</button><button class="modal-secondary" data-action="levels">选关</button>`,'pause');}
  function showLevels(){paused=true;refresh();show(`<p class="modal-eyebrow">EIGHT LITTLE ICE TRAYS</p><h2>挑一盘。</h2><div class="level-grid">${levels.map((l,i)=>`<button class="level-tile ${i===current?'current':''}" data-level="${i}" ${i>save.unlocked?'disabled':''} aria-label="第${i+1}关 ${l.title}${i>save.unlocked?' 未解锁':''}">${String(i+1).padStart(2,'0')}<small>${save.best[i]?save.best[i]+'步 ✓':i>save.unlocked?'待解锁':'开滑'}</small></button>`).join('')}</div><button class="modal-primary" data-action="resume">回到冰盘</button>${!storageOK?'<p class="save-note">当前浏览器无法保存进度，这次游玩仍可继续。</p>':''}`,'levels');}
  function showHelp(){paused=true;refresh();show(`<h2>屁股的使用说明</h2><ol class="rule-list"><li>上下左右一滑到底，撞到冰块才停。</li><li>路过就能吃点心，收齐后<b>停在出口</b>。</li><li>每盘两次急刹：点「笑到坐地」→ 选方向 → 点沿途亮格。</li><li>带裂纹的薄冰，<b>离开就碎</b>。再滑进洞里会掉下去。</li><li>随时撤销一步或重开，不计时。</li></ol><p>方向键 / WASD · 空格急刹<br>数字选停靠格，回车确认 · Z 撤销 · R 重开 · Esc 暂停</p><button class="modal-primary" data-action="resume">懂了，继续滑</button>`,'help');}
  function finishMove(){
    const was=state,braking=anim.braking;state=anim.state;anim=null;if(braking)laughTime=1.2;
    refresh();
    if(state.status==='won'){
      save.unlocked=Math.max(save.unlocked,Math.min(7,current+1));save.best[current]=Math.min(save.best[current]??Infinity,state.moves);persist();
      for(let i=0;i<36&&!reduced;i++)confetti.push({x:350,y:300,vx:(Math.random()-.5)*470,vy:-200-Math.random()*220,t:1.6,color:['#f4bf46','#75bdb6','#eb9c95'][i%3]});
      const final=current===7;
      show(`<p class="modal-eyebrow">${final?'ALL EIGHT TRAYS CLEARED':'SNACKS SECURED'}</p><img class="modal-art" src="assets/naiwa-laugh.webp" alt="抱着肚子大笑的奶蛙"><h2>${final?'八盘，全吃到了！':'稳稳下盘。'}</h2><div class="result-stats"><span><b>${state.moves}</b>本盘步数</span><span><b>${state.brakes}</b>剩余急刹</span></div><p>${state.moves<=level.par?'刚好踩中最短路线，屁股很有想法。':'点心一份没少。换条路线，还能更省几步。'}</p><button class="modal-primary" data-action="${final?'levels':'next'}">${final?'看看八盘成绩':'下一盘 →'}</button><button class="modal-secondary" data-action="restart">再滑一次</button><button class="modal-secondary" data-action="levels">选关</button>${!storageOK?'<p class="save-note">当前浏览器无法保存进度。</p>':''}`,'won');
    } else if(state.status==='lost') {
      show(`<p class="modal-eyebrow">SPLASH</p><h2>屁股掉进去了。</h2><p>薄冰离开后会变成洞。<br>下次经过前，试试换路或提前急刹。</p><button class="modal-primary" data-action="undo">撤销这一滑</button><button class="modal-secondary" data-action="restart">整盘重来</button>`,'lost');
    } else if(state.x===level.exit.x&&state.y===level.exit.y&&state.collected!==level.all){message('到出口了，但点心还没收齐。继续滑！',true);}
    else if(state.collected!==was.collected){message(state.collected===level.all?'点心齐了！现在要停在绿色出口。':'吃到一份。下一份在哪条路上？');}
    else message(normalHint());
  }
  function hint(){if(!active())return;hintCount++;message('让我算一下这盘冰……');setTimeout(()=>{if(!active())return;const answer=E.solve(level,state);if(!answer){message('这条路线已到死路，撤销几步或重开再试。',true);return;}const a=answer[0];message(a.stop?`试试向${directionNames[a.direction]}，用急刹停在第 ${a.stop} 格。`:`试试向${directionNames[a.direction]}滑到底。`);},20);}
  $('#brake-button').addEventListener('click',toggleBrake);$('#undo-button').addEventListener('click',undo);
  $('#restart-button').addEventListener('click',()=>{if(started){reset();canvas.focus({preventScroll:true});}});
  $('#pause-button').addEventListener('click',pause);$('#levels-button').addEventListener('click',()=>{if(started)showLevels();});
  $('#help-button').addEventListener('click',()=>{if(started)showHelp();});$('#hint-button').addEventListener('click',hint);
  $('#stop-options').addEventListener('click',e=>{const n=Number(e.target.dataset.stop);if(preview&&preview.choices.some(p=>p.stop===n)){selected=n;updatePicker();}});
  $('#confirm-stop').addEventListener('click',()=>{if(preview)commit(preview.direction,selected);});
  document.querySelectorAll('[data-dir]').forEach(b=>{b.addEventListener('click',()=>direction(b.dataset.dir));b.addEventListener('pointerenter',()=>{if(active()&&!brakeMode)hover=b.dataset.dir;});b.addEventListener('pointerleave',()=>{hover=null;});});
  content.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b||b.disabled)return;
    if(b.dataset.level!==undefined){reset(Number(b.dataset.level));close();return;}
    switch(b.dataset.action){
      case'start':started=true;reset();close();break;
      case'resume':close();break;
      case'restart':reset();close();break;
      case'undo':close();undo();break;
      case'next':reset(current+1);close();break;
      case'levels':showLevels();break;
    }
  });
  dialog.addEventListener('cancel',e=>{e.preventDefault();if(['pause','help','levels'].includes(modalMode))close();});
  window.addEventListener('keydown',e=>{
    if(dialog.open)return;
    if(e.code==='Enter'&&e.target.closest('button'))return;
    if(['Space','Escape','KeyZ','KeyR','Enter',...Object.keys(mapping)].includes(e.code))e.preventDefault();
    if(e.repeat)return;
    if(e.code==='Escape'){pause();return;}
    if(e.code==='KeyZ'){undo();return;}
    if(e.code==='KeyR'){if(started)reset();return;}
    if(e.code==='Space'){toggleBrake();return;}
    if(mapping[e.code]){direction(mapping[e.code]);return;}
    if(preview&&/^Digit[1-9]$/.test(e.code)){const n=+e.code.slice(5);if(preview.choices.some(p=>p.stop===n)){selected=n;updatePicker();}return;}
    if(e.code==='Enter'&&preview)commit(preview.direction,selected);
  });
  let pointerStart=null;
  canvas.addEventListener('pointerdown',e=>{if(!active())return;e.preventDefault();pointerStart={x:e.clientX,y:e.clientY,id:e.pointerId};canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});});
  canvas.addEventListener('pointerup',e=>{
    if(!pointerStart||e.pointerId!==pointerStart.id)return;e.preventDefault();
    const dx=e.clientX-pointerStart.x,dy=e.clientY-pointerStart.y;pointerStart=null;
    if(!active())return;
    if(Math.hypot(dx,dy)>22){direction(Math.abs(dx)>Math.abs(dy)?dx>0?'R':'L':dy>0?'D':'U');return;}
    const rect=canvas.getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width*700,y=(e.clientY-rect.top)/rect.height*700;
    const cell=700/level.width,gx=Math.floor(x/cell),gy=Math.floor(y/cell);
    if(preview){const target=preview.choices.find(p=>p.x===gx&&p.y===gy);if(target)commit(preview.direction,target.stop);else message('点有数字的亮格，就能在那一格坐下。');return;}
    const vx=gx-state.x,vy=gy-state.y;if(vx===0&&vy!==0)direction(vy>0?'D':'U');else if(vy===0&&vx!==0)direction(vx>0?'R':'L');else message('轻扫冰盘，或点下面的方向键。');
  });
  canvas.addEventListener('pointercancel',()=>{pointerStart=null;});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&started&&!dialog.open)pause();});
  window.addEventListener('blur',()=>{if(started&&!dialog.open)pause();});
  function rounded(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
  function line(points,color,width=2){ctx.beginPath();ctx.moveTo(...points[0]);for(const p of points.slice(1))ctx.lineTo(...p);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
  function snack(x,y,c){
    ctx.save();ctx.translate(x,y);ctx.scale(c/100,c/100);
    ctx.fillStyle='#638f7930';ctx.beginPath();ctx.ellipse(0,24,24,7,0,0,Math.PI*2);ctx.fill();
    rounded(-23,-10,46,36,9,'#dc9840','#ac6c37');
    ctx.fillStyle='#fff0bd';ctx.beginPath();ctx.ellipse(0,-8,24,10,0,0,Math.PI*2);ctx.fill();
    rounded(-20,-15,40,12,6,'#b26742');
    ctx.fillStyle='#e78470';ctx.beginPath();ctx.arc(4,-22,8,0,Math.PI*2);ctx.fill();line([[6,-28],[10,-35]],'#548269',3);
    line([[-13,4],[-10,17]],'#f4c973',3);ctx.restore();
  }
  function render(){
    const c=700/level.width;ctx.clearRect(0,0,700,700);ctx.lineWidth=1;
    let display={...state},px=state.x,py=state.y,squash=1;
    if(anim){const t=Math.min(1,anim.elapsed/anim.duration),e=1-Math.pow(1-t,2),distance=e*anim.path.length;
      const [dx,dy]=E.dirs[anim.direction];px=anim.from.x+dx*distance;py=anim.from.y+dy*distance;
      const reached=Math.floor(distance);if(reached>0){display.collapsed=anim.path[reached-1].collapsed;for(const p of anim.path.slice(0,reached)){const idx=level.snacks.findIndex(s=>s.x===p.x&&s.y===p.y);if(idx>=0)display.collected|=1<<idx;}}
      squash=1+Math.sin(t*Math.PI)*.1;
    }
    for(let y=0;y<level.height;y++)for(let x=0;x<level.width;x++){
      const X=x*c,Y=y*c,tile=level.map[y][x];
      if(tile==='#'){
        rounded(X+1,Y+2,c-2,c-2,c*.09,'#598c84');
        rounded(X+3,Y+2,c-6,c-10,c*.085,'#79aaa0');
        rounded(X+6,Y+5,c-12,c-17,c*.075,(x+y)%3===0?'#8ab8ac':'#87b3a8');
        line([[X+12,Y+c*.3],[X+12,Y+11],[X+c*.42,Y+11]],'#b7d6c7',2.5);
        if(x>0&&x<level.width-1&&y>0&&y<level.height-1){ctx.fillStyle='#69978d';ctx.beginPath();ctx.arc(X+c*.72,Y+c*.68,c*.038,0,Math.PI*2);ctx.fill();}
      }else{
        rounded(X+1,Y+1,c-2,c-2,c*.06,(x+y)%2?'#d9eff0':'#e5f4f1','#c1deda');
        line([[X+c*.18,Y+c*.23],[X+c*.37,Y+c*.15]],'#ffffffa0',2);
        const ti=level.thin.findIndex(p=>p.x===x&&p.y===y);
        if(ti>=0){if(display.collapsed&(1<<ti)){
          rounded(X+4,Y+4,c-8,c-8,c*.18,'#2c616b');rounded(X+10,Y+12,c-20,c-24,c*.13,'#234d5b');
          line([[X+c*.36,Y+c*.37],[X+c*.64,Y+c*.63]],'#76aaa8',3);line([[X+c*.64,Y+c*.37],[X+c*.36,Y+c*.63]],'#76aaa8',3);
        }else{
          rounded(X+3,Y+3,c-6,c-6,c*.07,'#b4e0e9','#76b8c9');
          line([[X+c*.62,Y+4],[X+c*.44,Y+c*.36],[X+c*.62,Y+c*.51],[X+c*.35,Y+c*.74],[X+c*.47,Y+c-4]],'#568f9f',2.7);
          line([[X+c*.44,Y+c*.36],[X+c*.17,Y+c*.3]],'#568f9f',2.7);
        }}
      }
    }
    const ex=level.exit.x*c,ey=level.exit.y*c;
    rounded(ex+6,ey+6,c-12,c-12,c*.14,display.collected===level.all?'#78b58c':'#afd0ab','#5b9979');
    ctx.strokeStyle='#edf7d9';ctx.lineWidth=3;ctx.setLineDash([4,4]);ctx.strokeRect(ex+13,ey+13,c-26,c-26);ctx.setLineDash([]);
    ctx.fillStyle='#356c56';ctx.font=`800 ${c*.28}px "Microsoft YaHei UI",sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('出口',ex+c/2,ey+c*.47);
    ctx.font=`700 ${c*.13}px sans-serif`;ctx.fillText(display.collected===level.all?'停在这里':'收齐再停',ex+c/2,ey+c*.72);
    level.snacks.forEach((p,i)=>{if(!(display.collected&(1<<i)))snack((p.x+.5)*c,(p.y+.5)*c,c*.93);});
    if(!anim&&state.status==='playing'){
      const d=preview?.direction||hover;
      if(d){const path=E.trace(level,state,d);line([[(state.x+.5)*c,(state.y+.5)*c],...path.map(p=>[(p.x+.5)*c,(p.y+.5)*c])],'#538d9370',5);
        if(!preview&&path.length){const p=path[path.length-1];ctx.strokeStyle=p.fatal?'#bb6254':'#599692';ctx.lineWidth=3;ctx.beginPath();ctx.arc((p.x+.5)*c,(p.y+.5)*c,c*.21,0,Math.PI*2);ctx.stroke();}
      }
      if(preview)preview.choices.forEach(p=>{
        const X=p.x*c,Y=p.y*c,sel=p.stop===selected;
        rounded(X+5,Y+5,c-10,c-10,c*.13,sel?'#f9bc51cf':'#ffe8afad',sel?'#b37736':'#c69752');
        ctx.fillStyle='#744c32';ctx.font=`900 ${c*.31}px ui-monospace,monospace`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(p.stop),X+c*.5,Y+c*.5);
      });
    }
    if(assetsReady){
      const img=laughTime>0||state.status==='won'?sprites.laugh:sprites.slide;
      const falling=anim?.state.status==='lost'?Math.max(0,(anim.elapsed/anim.duration-.76)/.24):state.status==='lost'?1:0;
      const size=c*1.09*(1-falling*.65),x=(px+.5)*c,y=(py+.53)*c;
      ctx.save();ctx.globalAlpha=1-falling*.7;
      ctx.fillStyle='#487a6d35';ctx.beginPath();ctx.ellipse(x,y+c*.31,c*.34,c*.12,0,0,Math.PI*2);ctx.fill();
      ctx.translate(x,y);const rocking=!reduced&&laughTime>0?Math.sin(clock*30)*.045:0;ctx.rotate(rocking);
      const ratio=img.width/img.height;ctx.drawImage(img,-size*ratio*.5,-size*.56,size*ratio*squash,size/squash);
      ctx.restore();
    }
    confetti.forEach(p=>{ctx.save();ctx.globalAlpha=Math.min(1,p.t);ctx.translate(p.x,p.y);ctx.rotate(p.t*4);ctx.fillStyle=p.color;ctx.fillRect(-4,-4,8,12);ctx.restore();});
  }
  function fixedUpdate(dt){
    if(paused)return;
    clock+=dt;laughTime=Math.max(0,laughTime-dt);
    if(anim&&!dialog.open){anim.elapsed+=dt;if(anim.elapsed>=anim.duration)finishMove();}
    for(let i=confetti.length-1;i>=0;i--){const p=confetti[i];p.t-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=600*dt;if(p.t<=0)confetti.splice(i,1);}
  }
  function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;accumulator+=dt;while(accumulator>=1/120){fixedUpdate(1/120);accumulator-=1/120;}render();requestAnimationFrame(frame);}
  // Read-only inspection hook for reproducible QA; no skip, win or state mutation hooks.
  window.naiwaDebug={snapshot:()=>({level:current+1,state:{...state},history:history.length,paused,animating:!!anim,animationProgress:anim?{elapsed:anim.elapsed,duration:anim.duration}:null,brakeMode,preview:preview?{direction:preview.direction,stops:preview.choices.map(p=>p.stop)}:null,assetsReady,storageOK,hintCount}),version:'1.0.0'};
  refresh();message(normalHint());
  show(`<p class="modal-eyebrow">NAIWA ICE CLUB</p><img class="modal-art" src="assets/naiwa-slide.webp" alt="一脸淡定的坐滑奶蛙"><h2>一滑，就停不下来。</h2><p>收齐点心，停在出口。<br>撞冰块会停，也能用两次「笑到坐地」急刹。</p><span class="pill">8 盘 · 不计时 · 可撤销</span><button class="modal-primary" data-action="start" disabled>正在取出冰盘…</button>`,'welcome');
  requestAnimationFrame(frame);
})();
