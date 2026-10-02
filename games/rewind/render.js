(function(root){
  'use strict';
  const PALETTE={paper:'#dcd0b9',floor:'#e9ddc6',ink:'#283138',red:'#b8503f',green:'#8cae99',gold:'#d6ad58'};
  const mix=(a,b,t)=>a+(b-a)*t;
  const ease=t=>1-Math.pow(1-t,3);
  function createRenderer(canvas,assets){
    const ctx=canvas.getContext('2d'); let W=900,H=570,layout=null;const spriteCache={};
    function sprite(name){if(spriteCache[name])return spriteCache[name];const img=assets[name];if(!img?.complete||!img.naturalWidth)return null;const small=document.createElement('canvas');small.width=256;small.height=384;small.getContext('2d').drawImage(img,0,0,small.width,small.height);spriteCache[name]=small;return small;}
    const text=(s,x,y,size,color,align='center')=>{ctx.font=`600 ${size}px "Microsoft YaHei",sans-serif`;ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(s,x,y);};
    const round=(x,y,w,h,r,fill,stroke)=>{ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.4;ctx.stroke();}};
    function resize(){const r=canvas.getBoundingClientRect();if(!Number.isFinite(r.width)||!Number.isFinite(r.height)||r.width<=0||r.height<=0)return false;const d=Math.min(root.devicePixelRatio||1,2);W=900;H=900*r.height/r.width;if(canvas.width!==Math.round(r.width*d)||canvas.height!==Math.round(r.height*d)){canvas.width=Math.round(r.width*d);canvas.height=Math.round(r.height*d);}ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);return true;}
    function point(p){return {x:layout.x+(p.x+.5)*layout.s,y:layout.y+(p.y+.5)*layout.s};}
    function drawBackdrop(){
      const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#232f34');g.addColorStop(1,'#53615e');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      ctx.fillStyle='#b7aa8c12';ctx.beginPath();ctx.moveTo(W*.38,0);ctx.lineTo(W*.07,H);ctx.lineTo(W*.93,H);ctx.lineTo(W*.62,0);ctx.fill();
      ctx.fillStyle='#1f2627';ctx.fillRect(0,H-23,W,23);ctx.strokeStyle='#92968122';ctx.lineWidth=1;for(let x=0;x<W;x+=90){ctx.beginPath();ctx.moveTo(x,H-21);ctx.lineTo(x+4,H);ctx.stroke();}
      for(const side of [0,1]){ctx.save();if(side){ctx.translate(W,0);ctx.scale(-1,1);}ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(123,0);ctx.bezierCurveTo(109,H*.22,77,H*.56,24,H*.68);ctx.lineTo(0,H*.84);ctx.closePath();ctx.fillStyle='#773a36';ctx.fill();for(let x=10;x<110;x+=21){ctx.beginPath();ctx.moveTo(x,0);ctx.quadraticCurveTo(x*.65,H*.4,11,H*.71);ctx.strokeStyle=x%2?'#9c4e4129':'#3e292d35';ctx.lineWidth=8;ctx.stroke();}ctx.restore();}
      ctx.fillStyle='#172126';ctx.fillRect(0,0,W,11);ctx.fillStyle='#b6b8a63d';ctx.font='10px monospace';ctx.textAlign='left';ctx.fillText('SP  •  PAPER STAGE',27,H-9);ctx.textAlign='right';ctx.fillText('NAIWA / REWIND',W-27,H-9);
    }
    function drawFloor(s,t){
      const size=layout.s;
      // Warm paper tiles and dark raised scenery have distinct collision silhouettes.
      for(let y=0;y<s.height;y++)for(let x=0;x<s.width;x++){
        const p=point({x,y}); const tile=s.level.map[y][x];
        if(tile==='#'){
          const neighbors=[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>s.level.map[y+dy]?.[x+dx]&&s.level.map[y+dy][x+dx]!=='#');
          if(neighbors){round(p.x-size*.47,p.y-size*.39,size*.94,size*.87,3,'#19252a');round(p.x-size*.47,p.y-size*.48,size*.94,size*.83,3,'#566562','#758078');ctx.strokeStyle='#283a3b';ctx.beginPath();ctx.moveTo(p.x-size*.34,p.y-size*.3);ctx.lineTo(p.x+size*.31,p.y-size*.28);ctx.stroke();}
          continue;
        }
        round(p.x-size*.49+3,p.y-size*.48+5,size*.98,size*.96,2,'#1a252859');
        round(p.x-size*.49,p.y-size*.48,size*.98,size*.96,2,(x+y)%2?'#e0d4bd':'#e7dac1','#bdb196');
        ctx.strokeStyle='#b3a38b30';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(p.x-size*.33,p.y+size*.24);ctx.lineTo(p.x+size*.28,p.y+size*.21);ctx.stroke();
        if(tile==='S'){round(p.x-size*.35,p.y-size*.32,size*.7,size*.64,3,'#8cae9970','#668776');text('◀◀',p.x,p.y,size*.21,'#376550');text('原点',p.x,p.y+size*.33,size*.115,'#3b6456');}
        if(tile==='E'){
          const ready=RewindEngine.getObjectives(s).placed===s.goals.length;
          round(p.x-size*.34,p.y-size*.37,size*.68,size*.67,4,ready?'#ca6950':'#bc9980','#946652');
          ctx.strokeStyle='#f5dfb2';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p.x-size*.15,p.y-size*.22);ctx.lineTo(p.x+size*.15,p.y-size*.22);ctx.lineTo(p.x+size*.15,p.y+size*.15);ctx.stroke();text(ready?'↗':'·',p.x,p.y,size*.4,'#ffe7bd');text('出口',p.x,p.y+size*.34,size*.13,'#834d36');
        }
        if(tile==='o'||tile==='*'){
          const filled=s.crates.some(c=>c.x===x&&c.y===y);ctx.beginPath();ctx.arc(p.x,p.y,size*.32,0,Math.PI*2);ctx.setLineDash([5,4]);ctx.lineWidth=2.6;ctx.strokeStyle=filled?'#497b57':'#a78642';ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#d5ab4233';ctx.fill();text('＋',p.x,p.y,size*.25,'#a78642');
        }
        if(tile==='X'){ctx.fillStyle='#1a272d';ctx.beginPath();ctx.ellipse(p.x,p.y+size*.04,size*.42,size*.36,0,0,Math.PI*2);ctx.fill();ctx.lineWidth=3;ctx.strokeStyle='#bfa471';ctx.stroke();text('×',p.x,p.y,size*.3,'#697069');}
      }
    }
    function drawPath(s,visual){
      const path=visual?.type==='rewind'?visual.path:s.history;if(path.length<2)return;
      ctx.save();ctx.beginPath();path.forEach((p,i)=>{const q=point(p);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y);});ctx.strokeStyle=visual?.type==='rewind'?'#89e4caa0':'#497c6655';ctx.lineWidth=3;ctx.setLineDash([3,8]);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#5b88766b';path.forEach(p=>{const q=point(p);ctx.beginPath();ctx.arc(q.x,q.y,2,0,Math.PI*2);ctx.fill();});ctx.restore();
    }
    function drawCrate(c,i,s,visual){
      let pos=c;let isMoving=false;
      if(visual?.type==='push'&&visual.index===i){const f=ease(Math.min(1,visual.elapsed/visual.duration));pos={x:mix(visual.from.x,visual.to.x,f),y:mix(visual.from.y,visual.to.y,f)};isMoving=true;}
      const p=point(pos),z=layout.s, goal=s.goals.some(g=>g.x===c.x&&g.y===c.y);
      ctx.save();ctx.translate(p.x,p.y);if(isMoving)ctx.rotate(Math.sin(visual.elapsed*24)*.025);round(-z*.34+3,-z*.33+7,z*.7,z*.65,3,'#3a342c50');round(-z*.36,-z*.37,z*.72,z*.67,4,goal?'#b4c391':'#c79960',goal?'#567047':'#87623e');
      ctx.fillStyle=goal?'#92a870':'#b4814c';ctx.fillRect(-z*.33,z*.2,z*.66,z*.1);ctx.strokeStyle=goal?'#6d8758':'#976d42';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-z*.26,-z*.27);ctx.lineTo(z*.26,z*.2);ctx.moveTo(z*.26,-z*.27);ctx.lineTo(-z*.26,z*.2);ctx.stroke();round(-z*.13,-z*.16,z*.26,z*.22,1,goal?'#e5e4b4':'#eed7a5');text(goal?'✓':String(i+1),0,-z*.05,z*.17,goal?'#496d47':'#75542e');ctx.restore();
    }
    function drawPlayer(s,visual,t){
      let p={...s.player};let ghost=false;let shrink=1;
      if(visual?.type==='move'){let f=ease(Math.min(1,visual.elapsed/visual.duration));p.x=mix(visual.from.x,visual.to.x,f);p.y=mix(visual.from.y,visual.to.y,f);if(visual.fail)shrink=1-f*.6;}
      if(visual?.type==='rewind'){
        ghost=true;const f=Math.min(.99999,visual.elapsed/visual.duration)*(visual.path.length-1),a=Math.floor(f),frac=f-a;
        const pa=visual.path[a],pb=visual.path[Math.min(a+1,visual.path.length-1)];p.x=mix(pa.x,pb.x,frac);p.y=mix(pa.y,pb.y,frac);
        for(let i=a+1;i<Math.min(a+4,visual.path.length);i++){const trail=point(visual.path[i]);ctx.fillStyle=`rgba(157,226,198,${.1+(3-(i-a))*.04})`;ctx.beginPath();ctx.ellipse(trail.x,trail.y,layout.s*.22,layout.s*.32,0,0,7);ctx.fill();}
      }
      const q=point(p),z=layout.s;
      ctx.save();ctx.translate(q.x,q.y);ctx.scale(shrink,shrink);ctx.fillStyle=ghost?'#98e0c666':'#30382b38';ctx.beginPath();ctx.ellipse(0,z*.24,z*.3,z*.13,0,0,Math.PI*2);ctx.fill();
      const laughing=visual?.type==='push'||visual?.type==='laugh';let image=sprite(laughing?'laugh':'idle');
      if(ghost)ctx.globalAlpha=.64;
      const squish=laughing?Math.sin(visual.elapsed*30)*.04:0;
      if(s.player.dir==='right')ctx.scale(-1,1);ctx.scale(1+squish,1-squish);
      if(image)ctx.drawImage(image,-z*.41,-z*.96,z*.82,z*1.23);
      ctx.restore();
      if(!ghost&&s.status==='playing'){
        const d=RewindEngine.DIRS[s.player.dir],ax=q.x+d.x*z*.41,ay=q.y+d.y*z*.41;
        ctx.save();ctx.translate(ax,ay);ctx.rotate(({right:0,down:Math.PI/2,left:Math.PI,up:-Math.PI/2})[s.player.dir]);ctx.beginPath();ctx.moveTo(8,0);ctx.lineTo(-4,-5);ctx.lineTo(-4,5);ctx.closePath();ctx.fillStyle='#344f43';ctx.fill();ctx.restore();
      }
      if(laughing){
        const d=RewindEngine.DIRS[s.player.dir];const fade=1-Math.min(1,visual.elapsed/visual.duration);ctx.save();ctx.translate(q.x+d.x*z*.3,q.y+d.y*z*.3);ctx.rotate(({right:0,down:Math.PI/2,left:Math.PI,up:-Math.PI/2})[s.player.dir]);ctx.strokeStyle=`rgba(248,216,135,${fade})`;ctx.lineWidth=3;for(let r=0;r<3;r++){ctx.beginPath();ctx.arc(0,0,z*(.35+r*.17+visual.elapsed*.4),-.6,.6);ctx.stroke();}ctx.restore();
      }
    }
    function render(state,visual,t=0){if(!resize())return;ctx.clearRect(0,0,W,H);drawBackdrop();if(!state)return;const s=Math.min(108,(W-190)/state.width,(H-65)/state.height);if(s<=0)return;layout={s,x:(W-s*state.width)/2,y:(H-20-s*state.height)/2};drawFloor(state,t);drawPath(state,visual);
      // Draw all props before the hero so the rewinding ghost remains readable through a blocked tile.
      state.crates.forEach((c,i)=>drawCrate(c,i,state,visual));drawPlayer(state,visual,t);
      if(visual?.type==='rewind'){ctx.fillStyle='#acd5b612';ctx.fillRect(0,0,W,H);ctx.fillStyle='#d5f7df18';for(let y=(t*110)%26;y<H;y+=26)ctx.fillRect(0,y,W,2);}
    }
    function hit(clientX,clientY){if(!layout)return null;const r=canvas.getBoundingClientRect();const x=(clientX-r.left)*W/r.width,y=(clientY-r.top)*H/r.height;return {x:Math.floor((x-layout.x)/layout.s),y:Math.floor((y-layout.y)/layout.s)};}
    return {render,hit,getLayout:()=>layout};
  }
  root.RewindRenderer={createRenderer};
})(globalThis);
