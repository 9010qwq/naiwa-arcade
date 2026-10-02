(function (root) {
  'use strict';
  const C = { ink:'#483424', cream:'#fff6df', green:'#4d7d5a', red:'#b25d43', blue:'#5b8090' };
  const assets = {};
  function loadAssets() {
    return Promise.all(['steady','laugh'].map(name => new Promise(resolve => {
      const img = new Image(); img.onload=()=>{assets[name]=img;resolve(true);};img.onerror=()=>resolve(false);
      img.src='assets/naiwa-'+name+'.png';
    })));
  }
  function round(ctx,x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
  function text(ctx,t,x,y,size=18,color=C.ink,align='center',weight='normal'){ctx.fillStyle=color;ctx.font=`${weight} ${size}px "Microsoft YaHei",sans-serif`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(t,x,y);}
  function ellipse(ctx,x,y,rx,ry,fill){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();}
  function background(ctx,s) {
    ctx.fillStyle='#f1e6cc';ctx.fillRect(0,0,900,620);
    const wall=ctx.createLinearGradient(0,0,0,430);wall.addColorStop(0,'#f8edce');wall.addColorStop(1,'#e8d1aa');ctx.fillStyle=wall;ctx.fillRect(0,0,900,470);
    ctx.fillStyle='#e6cfaa';for(let x=0;x<900;x+=90)ctx.fillRect(x,0,1,457);
    // Simple restaurant architecture keeps the active tray unobstructed.
    round(ctx,326,-44,248,125,110,'#e8d6b4');round(ctx,344,-51,212,116,95,'#fdf7e8');
    text(ctx,'奶 蛙 小 馆',450,25,23,'#95734f','center','bold');text(ctx,'PLEASE KEEP IT TOGETHER',450,54,10,'#aa8b63');
    ctx.strokeStyle='#c4a777';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(120,0);ctx.lineTo(120,45);ctx.moveTo(780,0);ctx.lineTo(780,45);ctx.stroke();
    ellipse(ctx,120,55,41,14,'#d2ae73');ellipse(ctx,780,55,41,14,'#d2ae73');ellipse(ctx,120,64,22,5,'#fff2bb');ellipse(ctx,780,64,22,5,'#fff2bb');
    ctx.fillStyle='#dbc39c';ctx.fillRect(0,465,900,155);ctx.fillStyle='#e5d0ad';ctx.fillRect(0,465,900,13);
    for(let x=-200;x<1000;x+=120){ctx.strokeStyle='#ccb18888';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,620);ctx.lineTo(x+110,478);ctx.stroke();}
    ctx.strokeStyle='#ccb18877';ctx.beginPath();ctx.moveTo(0,540);ctx.lineTo(900,540);ctx.moveTo(0,595);ctx.lineTo(900,595);ctx.stroke();
    bin(ctx,15,267,'left');bin(ctx,755,267,'right');
    const p=s.pivot||450;
    ellipse(ctx,p,578,113,20,'#8c68462c');
    let activeLaugh=s.events.some(e=>(e.type==='laugh'||e.type==='autoLaugh') && (s.time-(e.time||0))<.65);
    if(s.cooldown>.4)activeLaugh=true;
    const img=assets[activeLaugh?'laugh':'steady']||assets.steady;
    const wobble=activeLaugh ? Math.sin(s.time*55)*3:0;
    if(img){ctx.save();ctx.translate(p,582);ctx.rotate(wobble*.004);ctx.drawImage(img,-95,-273,190,285);ctx.restore();}
    // The brass support connects the raised palms with the tray contact point.
    const py=300+(p-450)*Math.tan(s.angle||0);
    ctx.strokeStyle='#7b5b35';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(p-82,372);ctx.lineTo(p,py+12);ctx.lineTo(p+82,372);ctx.stroke();
    ellipse(ctx,p,py+9,14,9,'#c79a50');
    if(activeLaugh){text(ctx,'哈',p+125,380,26,'#b96e29','center','bold');text(ctx,'哈！',p-129,417,22,'#b96e29','center','bold');}
  }
  function bin(ctx,x,y,side){const left=side==='left',color=left?C.red:C.blue;
    ctx.fillStyle='#ad8f68';ctx.fillRect(x+19,y+110,12,465-y-110);ctx.fillRect(x+104,y+110,12,465-y-110);
    round(ctx,x+4,y+15,126,114,12,left?'#d7a17d':'#b1c4c4','#9a7c54');
    round(ctx,x-1,y-7,138,31,13,color);ellipse(ctx,x+68,y+3,56,7,left?'#744f36':'#405b5e');
    round(ctx,x+15,y+43,105,51,5,'#fff4dc');text(ctx,left?'← 厨余':'退杯 →',x+68,y+63,21,color,'center','bold');text(ctx,left?'面包 / 橘子':'杯子专用',x+68,y+83,13,'#8c7354');
  }
  function tray(ctx,s){ctx.save();ctx.translate(450,300);ctx.rotate(s.angle||0);
    ctx.shadowColor='#6d4a2633';ctx.shadowBlur=14;ctx.shadowOffsetY=10;
    round(ctx,-285,0,570,20,9,'#95704c','#6e4d33');ctx.shadowColor='transparent';
    round(ctx,-285,-7,570,11,5,'#fdf7e6','#ac8a5c');
    round(ctx,-48,-7,96,6,2,'#a8b78b');
    ctx.setLineDash([7,8]);ctx.strokeStyle='#b69c7566';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-220,-12);ctx.lineTo(220,-12);ctx.stroke();ctx.setLineDash([]);
    ctx.restore();
    const objects=s.items.filter(i=>!i.removed && i.grounded);const sum=objects.reduce((v,i)=>v+(i.mass||1),0);
    const center=sum?objects.reduce((v,i)=>v+i.x*(i.mass||1),0)/sum:450;
    const centerY=300+(center-450)*Math.tan(s.angle||0);
    ellipse(ctx,center,centerY-2,6,6,'#4e7952');
  }
  function food(ctx,i,s) {ctx.save();ctx.translate(i.x,i.y);if(i.grounded)ctx.rotate(s.angle||0);else ctx.rotate((i.x-450)*.008);
    const r=i.r||25;ctx.shadowColor='#684b2625';ctx.shadowBlur=7;ctx.shadowOffsetY=5;
    if(i.kind==='cup'){
      ctx.lineWidth=7;ctx.strokeStyle='#f6edd5';ctx.beginPath();ctx.arc(r*.7,0,r*.48,-Math.PI/2,Math.PI/2);ctx.stroke();
      round(ctx,-r*.7,-r*.7,r*1.4,r*1.55,7,'#f4f2dc','#8c9990');ellipse(ctx,0,-r*.65,r*.7,r*.2,'#819887');ellipse(ctx,0,-r*.65,r*.55,r*.12,'#6b4a30');ctx.shadowColor='transparent';ctx.fillStyle='#93ada0';ctx.fillRect(-r*.7,r*.2,r*1.4,6);
    } else if(i.kind==='orange'){
      const grad=ctx.createRadialGradient(-r*.3,-r*.3,1,0,0,r);grad.addColorStop(0,'#ffd569');grad.addColorStop(1,'#e68830');ellipse(ctx,0,0,r,r,grad);ctx.shadowColor='transparent';ctx.strokeStyle='#bf6c28';ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.stroke();ctx.save();ctx.rotate(-.5);ellipse(ctx,r*.2,-r*.94,r*.4,r*.13,'#638148');ctx.restore();
      for(let k=0;k<8;k++){const a=k*2.4;ellipse(ctx,Math.cos(a)*r*.7,Math.sin(a)*r*.6,1.1,1.1,'#c57b354d');}
    } else {
      const grad=ctx.createLinearGradient(0,-r,0,r);grad.addColorStop(0,'#fae4a8');grad.addColorStop(1,'#ca8951');ellipse(ctx,0,0,r*1.18,r*.82,grad);ctx.shadowColor='transparent';ctx.strokeStyle='#ac7347';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,0,r*1.18,r*.82,0,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='#fff0c4';ctx.lineWidth=4;[-.45,0,.45].forEach(a=>{ctx.beginPath();ctx.moveTo(r*a-3,-r*.48);ctx.lineTo(r*a+3,r*.08);ctx.stroke();});
    }
    ctx.restore();
    const color=i.good?C.green:(i.target==='left'?C.red:C.blue),badge=i.good?'正品':(i.target==='left'?'← 厨余':'退杯 →');
    const y=i.y-(i.r||25)-24;round(ctx,i.x-38,y-12,76,25,6,color);text(ctx,badge,i.x,y+1,15,'#fff8e6','center','bold');
    if(i.good){round(ctx,i.x-27,y-24,54,5,2,'#d1d7b4');round(ctx,i.x-27,y-24,54*Math.min(1,(i.hold||0)/7),5,2,'#5a855c');}
  }
  function render(canvas,s,options={}){const ctx=canvas.getContext('2d');ctx.clearRect(0,0,900,620);background(ctx,s);tray(ctx,s);s.items.filter(i=>!i.removed).forEach(i=>food(ctx,i,s));
    const events=s.events||[];events.forEach(e=>{const age=s.time-(e.time??s.time);if(age<0||age>1.4||e.type==='laugh')return;if(!['sorted','served','mistake'].includes(e.type))return;text(ctx,e.type==='served'?'✓ 已上桌':e.type==='sorted'?'✓ 回收成功':'× 失误',Math.max(100,Math.min(800,e.x||450)),(e.y||200)-age*28,20,e.type==='mistake'?C.red:C.green,'center','bold');});
    if(s.laughMeter>.77){round(ctx,315,92,270,43,12,'#fff2d9','#ce8b46');text(ctx,`要憋不住了… ${Math.max(1,Math.ceil((1-s.laughMeter)*9))}`,450,114,20,'#b85a31','center','bold');}
    if(options.preview){text(ctx,'稳住正品',326,162,19,'#58704b','center','bold');text(ctx,'错单送到箭头那边',654,150,18,'#7b6e56');}
  }
  root.TrayRender={loadAssets,render};
})(window);
