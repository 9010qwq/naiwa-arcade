(function (root) {
  'use strict';
  const DT = 1 / 120;
  const CX = 450, CY = 300, HALF = 280, GRAVITY = 820;
  const TYPES = {
    bun: { r: 24, mass: 1, friction: 185, drag: 1.1, bounce: 0.10, lift: 0.96 },
    orange: { r: 21, mass: 0.85, friction: 14, drag: 0.18, bounce: 0.31, lift: 1.04 },
    cup: { r: 23, mass: 1.65, friction: 125, drag: 0.7, bounce: 0.055, lift: 0.88 }
  };
  const STAGES = [
    { title: '第一桌 · 笑着退杯', subtitle: '留下奶油包，错杯送右边', tip: '支点向左，连按几次笑，把错杯送到右口；正品端稳后再大幅侧身。', duration: 32,
      items: [ [0,'bun',true,450], [0,'cup',false,590,'right'], [13,'bun',true,442], [18,'cup',false,510,'right'] ] },
    { title: '第二桌 · 橘子会滚', subtitle: '果皮去左边，正品要端稳', tip: '橘子容易滚动；向右挪一点支点，把错果送进左口。', duration: 32,
      items: [ [0,'cup',true,450], [0,'orange',false,340,'left'], [12,'bun',true,460], [17,'orange',false,380,'left'] ] },
    { title: '第三桌 · 两边都忙', subtitle: '杯子向右，食物向左', tip: '正品橘子也会滚。先端稳，再按错单所在方向轻轻侧身。', duration: 32,
      items: [ [0,'orange',true,445], [0,'cup',false,570,'right'], [11,'cup',true,455], [11,'bun',false,370,'left'], [22,'bun',true,445] ] },
    { title: '第四桌 · 杯子站错边', subtitle: '先让重杯滑过支点，再笑', tip: '左边的错杯也必须去右口。先支点向左，等杯子滑到支点右边。', duration: 32,
      items: [ [0,'bun',true,470], [0,'cup',false,280,'right'], [14,'bun',true,455], [17,'cup',false,525,'right'] ] },
    { title: '第五桌 · 别被连笑抢先', subtitle: '看预告，主动安排这一笑', tip: '憋笑九秒会连抖三次。正品靠近支点，错单远离支点。', duration: 32,
      items: [ [0,'bun',true,450], [0,'orange',false,340,'left'], [0,'cup',false,560,'right'], [12,'cup',true,450], [16,'bun',false,370,'left'], [22,'bun',true,465] ] },
    { title: '最后一桌 · 先送哪一边？', subtitle: '滚果与重杯，需要不同的倾斜', tip: '右侧错果要去左口。小幅左倾先滚果，或先照顾中心正品。', duration: 32,
      items: [ [0,'bun',true,455], [0,'orange',false,560,'left'], [0,'cup',false,655,'right'], [13,'bun',true,455], [16,'orange',false,375,'left'], [16,'cup',false,525,'right'], [24,'cup',true,455] ] }
  ].map((stage, i) => Object.freeze({ ...stage, index: i, duration: 32,
    items: Object.freeze(stage.items.map((v, j) => Object.freeze({ at:v[0], kind:v[1], good:v[2], x:v[3], target:v[4] || null, id:`${i}-${j}` }))) }));

  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const sign = x => x < 0 ? -1 : x > 0 ? 1 : 0;
  function event(s, type, text, x = CX, y = CY) {
    s.events.push({ id: ++s._eventId, type, text, x, y, time:s.time });
    if (s.events.length > 32) s.events.shift();
  }
  function onTray(item, s) {
    const co=Math.cos(s.angle), si=Math.sin(s.angle);
    item.x=CX+item.u*co+item.r*si;
    item.y=CY+item.u*si-item.r*co;
    item.vx=item.vt*co;
    item.vy=item.vt*si;
  }
  function spawn(s, spec) {
    const p=TYPES[spec.kind];
    const item={ id:spec.id, kind:spec.kind, good:spec.good, target:spec.target,
      x:spec.x, y:CY-p.r, vx:0, vy:0, r:p.r, mass:p.mass, grounded:true, hold:0, removed:false,
      u:spec.x-CX, vt:0, rotation:0, resolved:null, bornAt:s.time };
    onTray(item,s); s.items.push(item);
    event(s,'arrival',spec.good?'正品上桌 · 端稳 7 秒':spec.target==='left'?'错单 → 左侧食物口':'错单 → 右侧杯子口',item.x,item.y-35);
  }
  function create(index=0) {
    const stageIndex=clamp(Math.trunc(index)||0,0,STAGES.length-1), stage=STAGES[stageIndex];
    const s={ stageIndex, stage, time:0, status:'playing', angle:0, pivot:450, targetPivot:450,
      items:[], score:0, served:0, sorted:0, mistakes:0, laughMeter:0, cooldown:0,
      events:[], totalGood:stage.items.filter(x=>x.good).length, totalBad:stage.items.filter(x=>!x.good).length,
      burstLeft:0, burstTimer:0, warning:false, resultText:'', tick:0,
      _accumulator:0, _nextSpawn:0, _eventId:0, _laughHeld:false };
    while(s._nextSpawn<stage.items.length && stage.items[s._nextSpawn].at===0) spawn(s,stage.items[s._nextSpawn++]);
    return s;
  }
  function shake(s, automatic) {
    s.cooldown=automatic?Math.max(s.cooldown,0.45):0.9;
    event(s,automatic?'autoLaugh':'laugh',automatic?'憋不住啦！':'哈！离支点越远，飞得越高',s.pivot,355);
    for(const item of s.items) {
      if(item.removed || !item.grounded) continue;
      const p=TYPES[item.kind], co=Math.cos(s.angle), si=Math.sin(s.angle);
      const distance=item.x-s.pivot;
      const leverage=clamp((Math.abs(distance)-35)/285,0,1);
      const tangent=sign(distance)*(35+265*leverage)*leverage + si*185;
      const up=(58+305*leverage)*p.lift;
      item.vx=item.vt*co+tangent*co+up*si;
      item.vy=item.vt*si+tangent*si-up*co;
      item.grounded=false;
      item.y-=0.5;
    }
  }
  function laugh(s) {
    if(s.status!=='playing' || s.cooldown>0.0001 || s.burstLeft>0) return false;
    s.laughMeter=0; s.warning=false; shake(s,false); return true;
  }
  function resolve(s,item,side) {
    if(item.removed) return;
    item.removed=true; item.grounded=false;
    if(!item.good && side===item.target) {
      item.resolved='sorted'; s.sorted++; s.score+=160;
      event(s,'sorted',side==='left'?'食物回收 ✓':'杯子回收 ✓',clamp(item.x,55,845),Math.min(item.y,500));
    } else {
      item.resolved='missed'; s.mistakes++;
      event(s,'mistake',item.good?'正品掉了 · 失误 +1':side?'投错回收口 · 失误 +1':'掉到桌下 · 失误 +1',clamp(item.x,60,840),Math.min(item.y,500));
      if(s.mistakes>=3) { s.status='lost'; s.resultText='这一桌失误 3 次，马上再来。'; event(s,'lost',s.resultText); }
    }
  }
  function ports(s,item) {
    if(item.removed) return;
    if(item.y>260 && item.x<150) resolve(s,item,'left');
    else if(item.y>260 && item.x>750) resolve(s,item,'right');
    else if(item.y>570 || item.x< -100 || item.x>1000) resolve(s,item,null);
  }
  function land(s,item,previousD,wasGrounded=false) {
    if(item.removed) return;
    const co=Math.cos(s.angle), si=Math.sin(s.angle);
    const dx=item.x-CX, dy=item.y-CY, u=dx*co+dy*si, d=dx*si-dy*co;
    const vn=item.vx*si-item.vy*co;
    if(Math.abs(u)>HALF || d>=item.r || (!wasGrounded && previousD<item.r-5)) return;
    item.u=clamp(u,-HALF,HALF);
    item.vt=item.vx*co+item.vy*si;
    const impact=Math.max(0,-vn), rebound=impact*TYPES[item.kind].bounce;
    if(rebound>55 && !wasGrounded) {
      item.x=CX+item.u*co+item.r*si; item.y=CY+item.u*si-item.r*co;
      item.vx=item.vt*co+rebound*si; item.vy=item.vt*si-rebound*co;
      item.grounded=false;
    } else { item.grounded=true; onTray(item,s); }
  }
  function collide(s) {
    const co=Math.cos(s.angle),si=Math.sin(s.angle);
    const active=s.items.filter(x=>!x.removed);
    for(let a=0;a<active.length;a++) for(let b=a+1;b<active.length;b++) {
      const one=active[a],two=active[b],m1=TYPES[one.kind].mass,m2=TYPES[two.kind].mass;
      if(one.grounded && two.grounded) {
        const d=two.u-one.u, min=one.r+two.r-2;
        if(Math.abs(d)>=min) continue;
        const dir=sign(d)||1, overlap=min-Math.abs(d), inv1=1/m1,inv2=1/m2;
        one.u-=dir*overlap*inv1/(inv1+inv2); two.u+=dir*overlap*inv2/(inv1+inv2);
        const speed=(two.vt-one.vt)*dir;
        if(speed<0) { const j=-(1.10)*speed/(inv1+inv2); one.vt-=dir*j*inv1; two.vt+=dir*j*inv2; }
        onTray(one,s);onTray(two,s);
      } else {
        let dx=two.x-one.x,dy=two.y-one.y,d=Math.hypot(dx,dy),min=one.r+two.r-2;
        if(d>=min || d<0.001) continue;
        const nx=dx/d,ny=dy/d, inv1=1/m1,inv2=1/m2,overlap=min-d;
        // A resting item may move along the tray, but cannot be pushed through it.
        const adjust=(item,n,inv)=>{
          const amount=overlap*inv/(inv1+inv2)*n;
          if(item.grounded) { item.u+=amount*(nx*co+ny*si); onTray(item,s); }
          else { item.x+=amount*nx; item.y+=amount*ny; }
        };
        adjust(one,-1,inv1);adjust(two,1,inv2);
        const speed=(two.vx-one.vx)*nx+(two.vy-one.vy)*ny;
        if(speed<0) {
          const j=-1.08*speed/(inv1+inv2);
          one.vx-=j*inv1*nx;one.vy-=j*inv1*ny;two.vx+=j*inv2*nx;two.vy+=j*inv2*ny;
          for(const item of [one,two]) if(item.grounded) { item.vt=item.vx*co+item.vy*si;onTray(item,s); }
        }
      }
    }
  }
  function fixed(s) {
    s.tick++; s.time=s.tick*DT;
    s.cooldown=Math.max(0,s.cooldown-DT);
    const oldAngle=s.angle;
    s.pivot+=clamp(s.targetPivot-s.pivot,-640*DT,640*DT);
    const target=(450-s.pivot)/140*0.24;
    s.angle+=(target-s.angle)*(1-Math.exp(-10*DT));
    while(s._nextSpawn<s.stage.items.length && s.stage.items[s._nextSpawn].at<=s.time+1e-8) spawn(s,s.stage.items[s._nextSpawn++]);
    if(s.burstLeft>0) {
      s.burstTimer-=DT;
      if(s.burstTimer<=0) { shake(s,true);s.burstLeft--;s.burstTimer=0.35; }
    } else {
      s.laughMeter=clamp(s.laughMeter+DT/9,0,1);
      if(s.laughMeter>=7/9 && !s.warning) { s.warning=true;event(s,'warning','快憋不住了 · 连笑倒计时',s.pivot,335); }
      if(s.laughMeter>=1-1e-8) { s.laughMeter=0;s.warning=false;s.burstLeft=2;s.burstTimer=0.35;shake(s,true); }
    }
    const co=Math.cos(s.angle),si=Math.sin(s.angle),oldCo=Math.cos(oldAngle),oldSi=Math.sin(oldAngle);
    for(const item of s.items) {
      if(item.removed) continue;
      const p=TYPES[item.kind];
      if(item.grounded) {
        const force=GRAVITY*si, friction=p.friction*co;
        if(Math.abs(item.vt)<friction*DT && Math.abs(force)<=friction) item.vt=0;
        else {
          const direction=Math.abs(item.vt)>0.01?sign(item.vt):sign(force);
          const before=item.vt;
          item.vt+=(force-friction*direction)*DT;
          if(before!==0 && sign(before)!==sign(item.vt) && Math.abs(force)<friction) item.vt=0;
          item.vt*=Math.exp(-p.drag*DT);
        }
        item.u+=item.vt*DT; item.rotation+=item.vt*DT/item.r;
        onTray(item,s);
        if(Math.abs(item.u)>HALF) item.grounded=false;
      } else {
        const prevD=(item.x-CX)*oldSi-(item.y-CY)*oldCo;
        item.vy+=GRAVITY*DT;item.x+=item.vx*DT;item.y+=item.vy*DT;
        item.rotation+=item.vx*DT/item.r*0.5;
        land(s,item,prevD);
      }
      ports(s,item);
    }
    collide(s);
    for(const item of s.items) {
      if(item.removed) continue;
      // Resolve contact corrections and tray-end departures after item collisions.
      if(item.grounded && Math.abs(item.u)>HALF) item.grounded=false;
      if(!item.grounded) {
        const d=(item.x-CX)*si-(item.y-CY)*co;
        if(d>item.r-5 && d<item.r) land(s,item,item.r+1);
      }
      ports(s,item);
      if(item.good && item.grounded && Math.abs(item.vt)<42 && Math.abs(s.angle)<0.18) {
        item.hold=Math.min(7,item.hold+DT);
        if(item.hold>=7-1e-8) {
          item.removed=true;item.resolved='served';item.grounded=false;s.served++;s.score+=120;
          event(s,'served','端稳啦 · 正品上桌 ✓',item.x,item.y-18);
        }
      }
    }
    if(s.time>=s.stage.duration-1e-8 && s.status==='playing') {
      s.time=s.stage.duration;
      const bad=s.items.some(x=>!x.removed&&!x.good), good=s.items.some(x=>!x.removed&&x.good);
      if(bad||good) { s.status='lost';s.resultText=bad?'还有错单留在托盘上。':'正品还没端稳 7 秒。';event(s,'lost',s.resultText); }
      else { s.status='won';s.score+=(2-s.mistakes)*60+100;s.resultText=s.mistakes===0?'一桌全对，稳得漂亮！':'这一桌完成！';event(s,'won',s.resultText); }
    }
  }
  function step(s,dt,input={}) {
    if(s.status!=='playing' || input.paused || !Number.isFinite(dt) || dt<=0) return s;
    if(Number.isFinite(input.x)) s.targetPivot=clamp(input.x,310,590);
    if(input.laugh && !s._laughHeld) laugh(s);
    s._laughHeld=!!input.laugh;
    s._accumulator+=Math.min(dt,0.5);
    while(s._accumulator>=DT-1e-10 && s.status==='playing') {s._accumulator-=DT;fixed(s);}
    return s;
  }
  function snapshot(s) {
    return {stageIndex:s.stageIndex,time:s.time,status:s.status,angle:s.angle,pivot:s.pivot,
      items:s.items.map(i=>({...i})),score:s.score,served:s.served,sorted:s.sorted,mistakes:s.mistakes,
      laughMeter:s.laughMeter,cooldown:s.cooldown,totalGood:s.totalGood,totalBad:s.totalBad,
      burstLeft:s.burstLeft,warning:s.warning,resultText:s.resultText,events:s.events.map(e=>({...e}))};
  }
  const API={STAGES,create,step,laugh,snapshot,DT,TYPES,TRAY:{x:CX,y:CY,half:HALF}};
  root.TraySim=API;
  if(typeof module!=='undefined' && module.exports) module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
