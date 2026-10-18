import * as THREE from 'three';
import { faceTex } from './tex.js';
import { W, H } from './level.js';

const L3=(c)=>new THREE.MeshLambertMaterial({color:c});

export function buildMonsterModel(){
  const root=new THREE.Group(); const body=new THREE.Group(); root.add(body);
  const flesh=L3(0x7a625c), dark=L3(0x2a2224), raw=L3(0x7a2b2b), wire=L3(0x111111), bone=L3(0xb8b0a0);
  const faces={calm:faceTex('calm'),glitch:faceTex('glitch'),sad:faceTex('sad')};
  // torso (hunched)
  const torso=new THREE.Group(); torso.position.set(0,1.25,0); torso.rotation.x=0.4; body.add(torso);
  const t=new THREE.Mesh(new THREE.BoxGeometry(0.62,1.0,0.36),flesh); t.position.y=0.4; torso.add(t);
  for(const [x,y,w,h] of [[-0.12,0.55,0.25,0.3],[0.15,0.2,0.2,0.35],[0,0.8,0.3,0.15]]){ const p=new THREE.Mesh(new THREE.BoxGeometry(w,h,0.02),raw); p.position.set(x,y,0.19); torso.add(p); }
  // head: CRT
  const head=new THREE.Group(); head.position.set(0,1.05,0.1); torso.add(head);
  const hb=new THREE.Mesh(new THREE.BoxGeometry(0.58,0.52,0.45),L3(0x3b3a38)); head.add(hb);
  const hback=new THREE.Mesh(new THREE.BoxGeometry(0.4,0.36,0.3),L3(0x2c2b2a)); hback.position.z=-0.35; head.add(hback);
  const screen=new THREE.Mesh(new THREE.PlaneGeometry(0.46,0.4),new THREE.MeshBasicMaterial({map:faces.calm})); screen.position.z=0.23; head.add(screen);
  // arms (long, drag past knees)
  const mkArm=(side)=>{ const s=new THREE.Group(); s.position.set(side*0.4,0.78,0); torso.add(s);
    const up=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.85,0.1),flesh); up.position.y=-0.42; s.add(up);
    const el=new THREE.Group(); el.position.y=-0.85; s.add(el);
    const lo=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.85,0.08),flesh); lo.position.y=-0.42; el.add(lo);
    const hand=new THREE.Group(); hand.position.y=-0.86; el.add(hand);
    const palm=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.14,0.05),bone); hand.add(palm);
    for(let i=-1;i<=1;i++){ const f=new THREE.Mesh(new THREE.BoxGeometry(0.018,0.3,0.018),bone); f.position.set(i*0.04,-0.2,0); hand.add(f); }
    const cab=new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.012,0.9,4),wire); cab.position.set(0.05,-0.42,0.06); el.add(cab);
    return {s,el,hand}; };
  const armL=mkArm(-1), armR=mkArm(1);
  // pipe weapon in right hand
  const pipe=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,1.6,6),L3(0x555a60)); pipe.position.set(0,-0.3,0.05); pipe.rotation.x=1.15; armR.hand.add(pipe);
  // legs
  const mkLeg=(side)=>{ const l=new THREE.Group(); l.position.set(side*0.2,1.05,0); body.add(l);
    const th=new THREE.Mesh(new THREE.BoxGeometry(0.17,0.55,0.17),flesh); th.position.y=-0.27; l.add(th);
    const sh=new THREE.Group(); sh.position.y=-0.55; l.add(sh); const lo=new THREE.Mesh(new THREE.BoxGeometry(0.13,0.55,0.13),dark); lo.position.y=-0.27; sh.add(lo);
    const ft=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.07,0.34),dark); ft.position.set(0,-0.55,0.08); sh.add(ft); return {l,sh}; };
  const legL=mkLeg(-1), legR=mkLeg(1);
  // cables
  const cables=[]; for(let i=0;i<5;i++){ const c=new THREE.Mesh(new THREE.CylinderGeometry(0.014,0.014,1.1,4),wire); c.position.set((i-2)*0.1,0.5,-0.2); c.rotation.x=0.4+i*0.05; torso.add(c); cables.push(c); }
  root.userData={body,torso,head,screen,faces,armL,armR,legL,legR,cables,pipe};
  return root;
}

// ---------- A* ----------
export function astar(level,sx,sz,gx,gz,maxIter=4000){
  const sc=sx|0,sr=sz|0,gc=gx|0,gr=gz|0; if(!level.monsterOK(gc,gr)) return null;
  const idx=(c,r)=>r*W+c; const g=new Float32Array(W*H).fill(1e9), from=new Int32Array(W*H).fill(-1), closed=new Uint8Array(W*H);
  const open=[[sc,sr,0]]; g[idx(sc,sr)]=0; let it=0;
  const hfn=(c,r)=>{ const dx=Math.abs(c-gc),dz=Math.abs(r-gr); return Math.max(dx,dz)+0.414*Math.min(dx,dz); };
  const f=new Map(); f.set(idx(sc,sr),hfn(sc,sr));
  while(open.length&&it++<maxIter){
    let bi=0; for(let i=1;i<open.length;i++) if(f.get(idx(open[i][0],open[i][1]))<f.get(idx(open[bi][0],open[bi][1]))) bi=i;
    const [c,r]=open.splice(bi,1)[0]; const ci=idx(c,r); if(closed[ci]) continue; closed[ci]=1;
    if(c===gc&&r===gr){ const path=[]; let k=ci; while(k!==-1){ path.push([(k%W)+0.5,Math.floor(k/W)+0.5]); k=from[k]; } return path.reverse(); }
    for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){ if(!dx&&!dz) continue; const nc=c+dx,nr=r+dz;
      if(!level.monsterOK(nc,nr)) continue; if(dx&&dz&&(!level.monsterOK(c+dx,r)||!level.monsterOK(c,r+dz))) continue;
      const ni=idx(nc,nr); if(closed[ni]) continue; const ng=g[ci]+(dx&&dz?1.414:1); if(ng<g[ni]){ g[ni]=ng; from[ni]=ci; f.set(ni,ng+hfn(nc,nr)); open.push([nc,nr,ng]); } }
  }
  return null;
}

export class Monster{
  constructor(scene,level){
    this.level=level; this.model=buildMonsterModel(); scene.add(this.model); this.model.visible=false;
    this.x=17; this.z=36; this.yaw=0; this.path=null; this.pi=0; this.speed=0; this.phase=0; this.moving=false;
    this.repath=0; this.stepSide=0; this.scrapeT=0; this.glitch=0; this.tilt=0; this.visible=false; this.goal=null; this.stuck=0;
  }
  place(x,z){ this.x=x; this.z=z; this.path=null; this.model.position.set(x,0,z); }
  goTo(gx,gz){ const p=astar(this.level,this.x,this.z,gx,gz); this.path=p; this.pi=1; this.goal=[gx,gz]; return !!p; }
  pathLen(gx,gz){ const p=astar(this.level,this.x,this.z,gx,gz); if(!p) return Infinity; let s=0; for(let i=1;i<p.length;i++) s+=Math.hypot(p[i][0]-p[i-1][0],p[i][1]-p[i-1][1]); return s; }
  arrived(){ return !this.path||this.pi>=this.path.length; }
  update(dt,speed,events){
    this.moving=false; this.speed=speed;
    if(this.path&&this.pi<this.path.length&&speed>0){
      let [tx,tz]=this.path[this.pi]; let dx=tx-this.x,dz=tz-this.z,d=Math.hypot(dx,dz);
      if(d<0.25){ this.pi++; } else {
        const st=Math.min(d,speed*dt); this.x+=dx/d*st; this.z+=dz/d*st; this.moving=true;
        const ty=Math.atan2(dx,dz); let da=ty-this.yaw; while(da>Math.PI)da-=2*Math.PI; while(da<-Math.PI)da+=2*Math.PI; this.yaw+=da*Math.min(1,dt*5);
      }
    }
    const u=this.model.userData;
    if(this.moving){ const prev=this.phase; this.phase+=dt*speed*2.3; if(Math.floor(this.phase/Math.PI)!==Math.floor(prev/Math.PI)) events&&events.step(this); this.scrapeT+=dt; if(this.scrapeT>2.6){ this.scrapeT=0; events&&events.scrape(this);} }
    const sw=Math.sin(this.phase)*(this.moving?1:0); const k=Math.min(1,speed/3);
    u.legL.l.rotation.x=sw*0.5*(0.5+k); u.legR.l.rotation.x=-sw*0.5*(0.5+k); u.legL.sh.rotation.x=Math.max(0,-sw)*0.6; u.legR.sh.rotation.x=Math.max(0,sw)*0.6;
    u.armL.s.rotation.x=-sw*0.2; u.armR.s.rotation.x=sw*0.2+0.15; u.armL.s.rotation.z=0.08; u.armR.s.rotation.z=-0.08;
    u.body.position.y=Math.abs(Math.cos(this.phase))*0.04*(this.moving?1:0);
    u.torso.rotation.x=0.4+Math.sin(performance.now()/900)*0.03;
    u.head.rotation.z+=(this.tilt-u.head.rotation.z)*Math.min(1,dt*4);
    this.glitch=Math.max(0,this.glitch-dt);
    const gl=this.glitch>0&&Math.random()<0.5; u.screen.material.map=gl?u.faces.glitch:(this.sad?u.faces.sad:u.faces.calm); u.screen.material.needsUpdate=true;
    u.screen.material.color.setScalar(gl?1.4:1);
    this.model.position.set(this.x,0,this.z); this.model.rotation.y=this.yaw; this.model.visible=this.visible;
  }
  dist(px,pz){ return Math.hypot(px-this.x,pz-this.z); }
}
