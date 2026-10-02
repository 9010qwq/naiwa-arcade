(function () {
  'use strict';
  const C = { ink:'#263c3c', cream:'#fff6dc', coral:'#ed6554', gold:'#ffd057', teal:'#1f7773', blue:'#79b9d5', mint:'#dbeddd' };
  // The original transparent atlas is sampled directly. No replacement vector mascot.
  const SPRITES = [[70,38,478,827],[606,55,590,810],[1257,97,490,766]];
  const GROUPS = ['#dc7951','#348b87','#6f67af'];
  function circle(ctx,x,y,r,fill,stroke,width=2){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke()}}
  function rr(ctx,x,y,w,h,r,fill,stroke,width=2){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke()}}
  function frog(ctx,image,pose,x,y,w,h){if(!image.complete||!image.naturalWidth)return;const s=SPRITES[pose];const scale=Math.min(w/s[2],h/s[3]);const dw=s[2]*scale,dh=s[3]*scale;ctx.drawImage(image,s[0],s[1],s[2],s[3],x+(w-dw)/2,y+(h-dh),dw,dh)}
  function groupMark(ctx,group,x,y,size=3){ctx.fillStyle=GROUPS[group%3];ctx.strokeStyle=GROUPS[group%3];ctx.lineWidth=2;if(group===0){circle(ctx,x,y,size,GROUPS[0])}else if(group===1){ctx.beginPath();ctx.moveTo(x,y-size-1);ctx.lineTo(x+size+1,y);ctx.lineTo(x,y+size+1);ctx.lineTo(x-size-1,y);ctx.closePath();ctx.fill()}else{ctx.beginPath();ctx.moveTo(x-size,y-size);ctx.lineTo(x+size,y+size);ctx.moveTo(x+size,y-size);ctx.lineTo(x-size,y+size);ctx.stroke()}}
  class Renderer {
    constructor(canvas,mascot,image){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.mascot=mascot;this.mc=mascot.getContext('2d');this.image=image;this.fx=[];this.trail=[];this.reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;this.lastPose=-1}
    reset(){this.fx=[];this.trail=[];this.lastPose=-1}
    event(e){if(e.type==='hit'||e.type==='catch'||e.type==='group'){this.fx.push({...e,ttl:e.type==='group'?.85:.45,total:e.type==='group'?.85:.45});if(this.fx.length>24)this.fx.shift()}if(e.type==='shotEnd')this.trail=[]}
    draw(s,angle,dt,paused){const ctx=this.ctx;ctx.clearRect(0,0,480,620);ctx.fillStyle=C.mint;ctx.fillRect(0,0,480,620);
      ctx.strokeStyle='#bed5c3';ctx.lineWidth=1;for(let x=32;x<480;x+=32){for(let y=32;y<620;y+=32){ctx.beginPath();ctx.moveTo(x-2,y);ctx.lineTo(x+2,y);ctx.moveTo(x,y-2);ctx.lineTo(x,y+2);ctx.stroke()}}
      // Rail collision boundaries are x=14 and x=466; the illustration follows them.
      rr(ctx,3,68,10,502,5,'#a2c5b2');rr(ctx,467,68,10,502,5,'#a2c5b2');
      ctx.save();ctx.globalAlpha=.25;ctx.strokeStyle='#679b88';ctx.lineWidth=2;ctx.setLineDash([5,7]);ctx.beginPath();ctx.moveTo(23,564);ctx.lineTo(457,564);ctx.stroke();ctx.restore();
      ctx.font='bold 10px "Microsoft YaHei",sans-serif';ctx.textAlign='center';ctx.fillStyle='#709981';ctx.fillText('接住弹珠 +1',240,551);
      if(s.phase==='ready'&&!paused){const points=PegSim.firstSegment(s,angle);ctx.save();ctx.strokeStyle='#567e72';ctx.lineWidth=2;ctx.setLineDash([3,8]);ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();ctx.setLineDash([]);const end=points[points.length-1];circle(ctx,end.x,end.y,5,null,'#567e72',1.5);ctx.restore()}
      for(const p of s.pegs){ctx.save();if(p.hit)ctx.globalAlpha=.68;circle(ctx,p.x,p.y+3,p.r+1,'#809d8644');if(p.target){circle(ctx,p.x,p.y,p.r+1,p.hit?'#fff9c7':'#ffdf73',p.hit?'#fafde5':GROUPS[p.group],2.4);frog(ctx,this.image,p.hit?1:0,p.x-17,p.y-22,34,39);groupMark(ctx,p.group,p.x,p.y+24,2.6);if(p.hit){ctx.font='bold 11px sans-serif';ctx.fillStyle=C.teal;ctx.textAlign='center';ctx.fillText('✓',p.x+16,p.y-11)}}else{circle(ctx,p.x,p.y,p.r,p.hit?'#cdf2ef':C.blue,'#337883',2);circle(ctx,p.x-3,p.y-3,2.5,'#d7f9ed');}ctx.restore()}
      for(const p of s.pads){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);rr(ctx,-p.length/2,-9,p.length,18,9,p.flipUntil?C.gold:'#ef8871',C.ink,2);ctx.fillStyle=C.ink;circle(ctx,-5,-2,1.3,C.ink);circle(ctx,5,-2,1.3,C.ink);ctx.strokeStyle=C.ink;ctx.lineWidth=1.8;ctx.beginPath();ctx.arc(0,0,5,.2,Math.PI-.2);ctx.stroke();ctx.restore();if(p.flipUntil){ctx.textAlign='center';ctx.font='bold 10px sans-serif';ctx.fillStyle='#a64e34';ctx.fillText('↔ '+Math.max(0,p.flipUntil-s.time).toFixed(1)+'s',p.x,p.y+29)}}
      const bx=PegSim.bucketX(s),bw=PegSim.constants.BUCKET_WIDTH;
      ctx.save();ctx.translate(bx,580);ctx.beginPath();ctx.moveTo(-bw/2,0);ctx.lineTo(-bw/2+8,29);ctx.quadraticCurveTo(0,40,bw/2-8,29);ctx.lineTo(bw/2,0);ctx.fillStyle=C.teal;ctx.fill();ctx.strokeStyle=C.ink;ctx.lineWidth=2.5;ctx.stroke();rr(ctx,-bw/2-2,-1,bw+4,6,3,'#77b3a1',C.ink,2);ctx.fillStyle=C.cream;ctx.font='bold 14px sans-serif';ctx.textAlign='center';ctx.fillText('+1',0,23);ctx.restore();
      const a=angle*Math.PI/180;ctx.save();ctx.translate(240,62);ctx.rotate(-a);rr(ctx,-9,-36,18,31,6,C.coral,C.ink,2.5);rr(ctx,-13,-14,26,10,3,'#f5aa7e',C.ink,2);ctx.restore();
      const pose=s.phase==='lost'?2:s.combo>=3||s.phase==='won'?1:0;frog(ctx,this.image,pose,271,28,34,48);
      if(s.phase==='ready'){circle(ctx,240,62,7,C.cream,C.ink,1.7);circle(ctx,237,59,2,'#fff')}
      if(s.ball){const b=s.ball;if(!paused){this.trail.push({x:b.x,y:b.y});if(this.trail.length>12)this.trail.shift()}if(!this.reduce){this.trail.forEach((p,i)=>circle(ctx,p.x,p.y,2+i/5,'#fff6dc'+Math.round(35+i*11).toString(16).padStart(2,'0')))}circle(ctx,b.x+2,b.y+3,7,'#5d79513d');circle(ctx,b.x,b.y,7,C.cream,C.ink,1.8);circle(ctx,b.x-2,b.y-2,2.5,'white');}
      this.fx=this.fx.filter(f=>f.ttl>0);for(const f of this.fx){if(!paused)f.ttl-=dt;const age=1-f.ttl/f.total;ctx.save();ctx.globalAlpha=Math.max(0,1-age);circle(ctx,f.x,f.y,18+age*24,null,f.type==='catch'?C.teal:'#eea33a',2);if(!this.reduce){for(let i=0;i<6;i++){const an=i*Math.PI/3;circle(ctx,f.x+Math.cos(an)*(18+age*22),f.y+Math.sin(an)*(18+age*22),2.5,C.coral)}}ctx.restore()}
      if(this.lastPose!==pose){this.mc.clearRect(0,0,360,420);frog(this.mc,this.image,pose,9,0,336,412);this.lastPose=pose}
    }
  }
  window.PegRenderer=Renderer;
})();
