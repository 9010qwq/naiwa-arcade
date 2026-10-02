/* Pure deterministic rules. Works in a browser and in Node; no rendering or DOM. */
(function (root) {
  'use strict';
  const dirs = { U:[0,-1], D:[0,1], L:[-1,0], R:[1,0] };
  function parse(data) {
    const height=data.map.length, width=data.map[0].length;
    if (!data.map.every(row=>row.length===width)) throw Error('Map must be rectangular');
    const snacks=[], thin=[]; let start, exit;
    data.map.forEach((row,y)=>[...row].forEach((c,x)=>{
      if(c==='S') start={x,y}; if(c==='E') exit={x,y};
      if(c==='*') snacks.push({x,y}); if(c==='~') thin.push({x,y});
    }));
    if(!start||!exit||thin.length>20||snacks.length>20) throw Error('Invalid map');
    return {...data,width,height,start,exit,snacks,thin,all:(1<<snacks.length)-1};
  }
  function initial(level) { return {...level.start,collected:0,collapsed:0,brakes:level.brakes,moves:0,status:'playing'}; }
  function indexAt(arr,x,y) { return arr.findIndex(p=>p.x===x&&p.y===y); }
  function blocked(level,x,y) { return x<0||y<0||x>=level.width||y>=level.height||level.map[y][x]==='#'; }
  function trace(level,state,direction) {
    if(!dirs[direction]||state.status!=='playing') return [];
    const [dx,dy]=dirs[direction], path=[]; let x=state.x,y=state.y,collapsed=state.collapsed;
    while(!blocked(level,x+dx,y+dy)) {
      const leave=indexAt(level.thin,x,y); if(leave>=0) collapsed|=1<<leave;
      x+=dx; y+=dy;
      const at=indexAt(level.thin,x,y),fatal=at>=0&&!!(collapsed&(1<<at));
      path.push({x,y,fatal,collapsed}); if(fatal) break;
    }
    return path;
  }
  function brakeTargets(level,state,direction) {
    if(state.brakes<=0) return [];
    const path=trace(level,state,direction);
    return path.map((p,i)=>({...p,stop:i+1})).filter((p,i)=>!p.fatal&&i<path.length-1);
  }
  function move(level,state,direction,stop=null) {
    const path=trace(level,state,direction); if(!path.length) return null;
    const braking=stop!==null&&stop!==undefined;
    if(braking&&(!Number.isInteger(stop)||!brakeTargets(level,state,direction).some(p=>p.stop===stop))) return null;
    const used=braking?path.slice(0,stop):path, end=used[used.length-1];
    const next={...state,x:end.x,y:end.y,collapsed:end.collapsed,brakes:state.brakes-(braking?1:0),moves:state.moves+1};
    for(const p of used) { const snack=indexAt(level.snacks,p.x,p.y); if(snack>=0&&!p.fatal) next.collected|=1<<snack; }
    next.status=end.fatal?'lost':next.collected===level.all&&next.x===level.exit.x&&next.y===level.exit.y?'won':'playing';
    return {state:next,path:used,braking,direction};
  }
  function key(s) { return [s.x,s.y,s.collected,s.collapsed,s.brakes].join(','); }
  function solve(level,start=initial(level),limit=180000) {
    if(start.status==='won') return [];
    if(start.status!=='playing') return null;
    const q=[{state:start,parent:-1,action:null}], seen=new Set([key(start)]);
    for(let head=0;head<q.length&&head<limit;head++) {
      const current=q[head];
      for(const direction of Object.keys(dirs)) {
        const stops=[null,...brakeTargets(level,current.state,direction).map(p=>p.stop)];
        for(const stop of stops) {
          const result=move(level,current.state,direction,stop); if(!result||result.state.status==='lost') continue;
          const action={direction,stop}, node={state:result.state,parent:head,action};
          if(result.state.status==='won') {
            const solution=[action]; let cursor=head;
            while(q[cursor].parent>=0) { solution.unshift(q[cursor].action); cursor=q[cursor].parent; }
            return solution;
          }
          const k=key(result.state); if(!seen.has(k)) { seen.add(k);q.push(node); }
        }
      }
    }
    return null;
  }
  root.NaiwaEngine={dirs,parse,initial,trace,brakeTargets,move,key,solve};
  if(typeof module!=='undefined'&&module.exports) module.exports=root.NaiwaEngine;
})(typeof globalThis!=='undefined'?globalThis:this);
