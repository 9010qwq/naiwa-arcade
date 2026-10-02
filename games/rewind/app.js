(function(){
  'use strict';
  const E=RewindEngine,levels=RewindLevels,$=id=>document.getElementById(id);
  const SAVE_KEY='naiwa-rewind-progress-v1';
  const INPUT={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',s:'down',a:'left',d:'right',' ':'laugh',z:'rewind',r:'reset'};
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let progress={completed:[]},storageOK=true;
  try{const raw=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');if(raw&&Array.isArray(raw.completed))progress.completed=[...new Set(raw.completed.filter(n=>Number.isInteger(n)&&n>=1&&n<=5))];}catch(_){storageOK=false;}
  let state=null,current=0,started=false,ready=false,paused=false,visual=null,modal=null,activeTime=0,elapsed=0,accumulator=0,previous=0,returnFocus=null;
  const assets={idle:new Image(),laugh:new Image()};
  const renderer=RewindRenderer.createRenderer($('stage'),assets);
  const controls=[...document.querySelectorAll('[data-action]')];
  // Dialogs belong to the viewport so the help remains reachable on short stages.
  document.body.appendChild($('dialog'));

  function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify({version:1,completed:progress.completed}));}catch(_){storageOK=false;}}
  function firstUnfinished(){const i=levels.findIndex(l=>!progress.completed.includes(l.id));return i<0?0:i;}
  function setMessage(message){if(message)$('narration').textContent=message;}
  function updateNav(){
    $('levelNav').replaceChildren();
    levels.forEach((l,i)=>{const b=document.createElement('button');b.textContent=`0${i+1} 幕`;b.disabled=!started||i>0&&!progress.completed.includes(i);b.className=(started&&i===current?'current ':'')+(progress.completed.includes(i+1)?'complete':'');b.setAttribute('aria-label',`第${i+1}幕：${l.title}${progress.completed.includes(i+1)?'，已完成':''}`);if(started&&i===current)b.setAttribute('aria-current','step');b.addEventListener('click',()=>loadLevel(i));$('levelNav').append(b);});
  }
  function update(){
    const busy=!started||!ready||paused||!!modal||!!visual||state?.status!=='playing';
    controls.forEach(b=>{b.disabled=b.dataset.action==='reset'?!started:busy||(b.dataset.action==='rewind'&&state.history.length<=1);});
    $('pauseButton').disabled=!started||!ready||state?.status!=='playing'||!!modal&&modal.kind!=='pause';
    $('hintButton').disabled=!started||!!modal||!!visual||state?.status!=='playing';
    $('helpButton').disabled=!ready;
    $('pauseButton').textContent=paused?'▶':'Ⅱ';$('pauseButton').setAttribute('aria-label',paused?'继续游戏':'暂停游戏');
    if(!state)return;
    const o=E.getObjectives(state);
    $('objective').textContent=o.placed===o.total?`箱子 ${o.placed}/${o.total} 就位 · 走到出口`:`箱子 ${o.placed}/${o.total} 就位 · 再去出口`;
    $('routeCount').textContent=String(Math.max(0,state.history.length-1)).padStart(2,'0');
    $('recordLabel').textContent=paused?'PAUSE':visual?.type==='rewind'?'◀◀ REW':state.status==='won'?'CUT ✓':state.status==='failed'?'RETAKE':'● REC';
    $('rewindLabel').hidden=visual?.type!=='rewind';
    $('stage').setAttribute('aria-label',`第${current+1}幕，奶蛙在第${state.player.x+1}列第${state.player.y+1}行，面朝${{up:'上',down:'下',left:'左',right:'右'}[state.player.dir]}。箱子${o.placed}/${o.total}就位。`);
  }
  function closeDialog(){modal=null;paused=false;$('dialog').hidden=true;update();if(returnFocus?.isConnected&&!returnFocus.disabled)returnFocus.focus({preventScroll:true});else $('stage').focus({preventScroll:true});}
  function showDialog(kind,label,title,body,buttons){
    returnFocus=document.activeElement;modal={kind};paused=true;$('dialogLabel').textContent=label;$('dialogTitle').textContent=title;$('dialogBody').innerHTML=body;$('dialogActions').replaceChildren();
    buttons.forEach((b,i)=>{const button=document.createElement('button');button.textContent=b.label;button.className=i===0?'primary-button':'secondary-button';button.addEventListener('click',b.onClick);$('dialogActions').append(button);});
    $('dialog').hidden=false;update();$('dialogActions').firstElementChild?.focus({preventScroll:true});
  }
  function loadLevel(index){
    current=index;state=E.createState(levels[index]);started=true;paused=false;visual=null;modal=null;activeTime=0;accumulator=0;
    $('intro').hidden=true;$('dialog').hidden=true;$('stageNumber').textContent=`第 0${index+1} 幕`;$('stageTitle').textContent=levels[index].title;
    setMessage(index===0?'先向右，再向下走进小房间。朝箱子笑，把它推到虚线圈。':levels[index].subtitle);
    updateNav();update();$('stage').focus({preventScroll:true});
  }
  function finish(){
    if(state.status==='won'){
      if(!progress.completed.includes(current+1)){progress.completed.push(current+1);save();}updateNav();
      const stats=`<div class="stat"><span><b>${state.moves}</b>步行</span><span><b>${state.laughs}</b>次推箱</span><span><b>${state.rewinds}</b>次倒放</span></div>`;
      const body=(current===4?'<p>五幕全部完成。脚步撤回了，箱子安顿好了。</p>':'<p>箱子留在目标，奶蛙顺利退场。</p>')+stats+(!storageOK?'<p>当前浏览器无法保存进度；本次游玩仍可继续。</p>':'');
      showDialog('won',current===4?'END OF TAPE / 05':'TAKE COMPLETE',current===4?'这笑，收工了。':'这一幕，过了。',body,[
        {label:current===4?'从第一幕再玩':'下一幕 →',onClick:()=>loadLevel(current===4?0:current+1)},
        {label:'重玩这一幕',onClick:()=>loadLevel(current)}]);
    }else if(state.status==='failed'){
      showDialog('failed','RETAKE',state.failureReason==='pit'?'掉下去了。':'箱子卡住了。',`<p>${state.failureReason==='pit'?'黑洞不是路。':'箱子进了没有目标的墙角，笑也推不出来。'}<br>整场重拍，会把奶蛙和箱子一起复原。</p>`,[{label:'↺ 重拍这一幕',onClick:()=>loadLevel(current)},{label:'看一点提示',onClick:()=>{loadLevel(current);setMessage(levels[current].hint);}}]);
    }
  }
  function act(action){
    if(!ready||!started)return;
    if(action==='reset'){loadLevel(current);setMessage('重拍：奶蛙、箱子都回到开场。');return;}
    if(paused||modal||visual||state.status!=='playing')return;
    const event=E.act(state,action);const kind=event.actionType||event.type;
    setMessage(event.message);
    if(kind==='move')visual={...event,type:'move',elapsed:0,duration:reduced?.1:.17,fail:event.type==='failed'};
    else if(kind==='push')visual={...event,type:'push',elapsed:0,duration:reduced?.18:.4};
    else if(kind==='rewind')visual={...event,type:'rewind',elapsed:0,duration:reduced?.55:Math.min(2.4,.36+event.path.length*.09)};
    else if(kind==='empty-laugh')visual={type:'laugh',elapsed:0,duration:reduced?.15:.4};
    if(kind==='rewind')setMessage('倒放的是奶蛙。看，箱子完全没动。');
    if(kind==='move'&&state.player.x===state.exit.x&&state.player.y===state.exit.y&&state.status==='playing')setMessage('出口在这里。先让所有箱子进入虚线圈。');
    update();$('stage').focus({preventScroll:true});
    if(!visual&&state.status!=='playing')finish();
  }
  function pause(){
    if(!started||state.status!=='playing')return;
    if(modal?.kind==='pause'){closeDialog();return;}if(modal)return;
    showDialog('pause','PAUSED','录像暂停',`<p>奶蛙和倒放进度都停在这里。</p>`,[{label:'继续播放',onClick:closeDialog},{label:'整场重拍',onClick:()=>loadLevel(current)}]);
  }
  function help(){
    if(modal)return;
    showDialog('help','HOW TO PLAY','三个动作，一条规则',`<ol><li>方向键 / WASD 或方向按钮移动。碰到箱子只转身。</li><li>朝着紧挨的箱子按空格或「笑」，推动一格。</li><li>按 Z 或「倒放」，沿刚走的路回原点。</li></ol><p class="rule-highlight">倒放只带回奶蛙，箱子保持原位。<br>R / 整场重拍：奶蛙和箱子一起复原。</p><p>所有箱子进虚线圈，再走到出口。绿色原点只供奶蛙站立。黑洞会让这一幕失败。</p>`,[{label:'知道了',onClick:closeDialog}]);
  }
  controls.forEach(b=>b.addEventListener('click',()=>act(b.dataset.action)));
  $('startButton').addEventListener('click',()=>loadLevel(firstUnfinished()));
  $('pauseButton').addEventListener('click',pause);$('helpButton').addEventListener('click',help);
  $('hintButton').addEventListener('click',()=>setMessage(levels[current].hint));
  $('stage').addEventListener('pointerdown',event=>{
    if(!state||!started||modal)return;const p=renderer.hit(event.clientX,event.clientY);if(!p)return;
    const dx=p.x-state.player.x,dy=p.y-state.player.y;
    if(Math.abs(dx)+Math.abs(dy)===1)act(dx===1?'right':dx===-1?'left':dy===1?'down':'up');
    else if(dx===0&&dy===0)act('laugh');
  });
  document.addEventListener('keydown',event=>{
    if(event.ctrlKey||event.metaKey||event.altKey)return;
    if(modal&&event.key==='Tab'){
      const focus=[...$('dialog').querySelectorAll('button')].filter(e=>!e.disabled);const first=focus[0],last=focus[focus.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}return;
    }
    if(event.key==='Escape'){event.preventDefault();if(modal?.kind==='help')closeDialog();else pause();return;}
    if(event.key===' '&&event.target.closest('button,a,input,select,textarea'))return;
    const action=INPUT[event.key]||INPUT[event.key.toLowerCase()];if(!action||!started)return;
    event.preventDefault();if(event.repeat&&['laugh','rewind','reset'].includes(action))return;act(action);
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&started&&!modal&&state.status==='playing')pause();});
  window.addEventListener('blur',()=>{if(started&&!modal&&state?.status==='playing')pause();});

  // Rules are discrete. Animation and active clock advance in fixed 1/60 s steps.
  function step(dt){if(!started||paused||modal)return;activeTime+=dt;elapsed+=dt;if(visual){visual.elapsed+=dt;if(visual.elapsed>=visual.duration){const was=visual.type;visual=null;if(was==='rewind'){const o=E.getObjectives(state);setMessage(o.placed===o.total?'人回到了原点，箱子还在。走向出口。':'人回到了原点，箱子还在。换个位置继续推。');}update();if(state.status!=='playing')finish();}}}
  function frame(now){if(!previous)previous=now;accumulator+=Math.min(.1,(now-previous)/1000);previous=now;while(accumulator>=1/60){step(1/60);accumulator-=1/60;}renderer.render(state,visual,elapsed);requestAnimationFrame(frame);}
  updateNav();update();requestAnimationFrame(frame);
  Promise.all(Object.entries(assets).map(([name,img])=>new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error(name));img.src=`assets/naiwa-${name}.png`;}))).then(()=>{
    ready=true;$('startButton').disabled=false;$('startButton').textContent=progress.completed.length&&progress.completed.length<5?`继续第 ${firstUnfinished()+1} 幕 →`:'开始第一幕 →';update();
  }).catch(()=>{$('loadMessage').textContent='角色图片加载失败，请确认 assets 文件夹完整后刷新。';});
  // Read-only diagnostics for repeatable verification; there is no level-skip API.
  window.RewindDebug=Object.freeze({snapshot:()=>({state:state?JSON.parse(JSON.stringify(state)):null,current,started,ready,paused,visual:visual?JSON.parse(JSON.stringify(visual)):null,modal:modal?.kind||null,activeTime,storageOK,progress:JSON.parse(JSON.stringify(progress))}),layout:()=>renderer.getLayout()});
})();
