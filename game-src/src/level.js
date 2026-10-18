import * as THREE from 'three';
import { wallTex, floorTex, ceilTex, woodTex, metalTex, paperTex, screenTex, signTex, canvasTex, pieceCardTex } from './tex.js';
import { PIECES } from './content.js';

export const W = 34, H = 56, WALL_H = 3;
const ROOM_DEFS = [
  { id:'office',   n:'01', name:'MAIN OFFICE',      sub:'HOME',                    c0:2, r0:2,  c1:13, r1:13, tint:[1.0,.82,.6]  },
  { id:'portfolio',n:'02', name:'PORTFOLIO ROOM',   sub:'PROJECTS',                c0:20,r0:2,  c1:31, r1:13, tint:[.78,.62,1.0] },
  { id:'dev',      n:'03', name:'DEVELOPMENT ROOM', sub:'3D / ASSETS / RIGGING',   c0:2, r0:15, c1:13, r1:26, tint:[.6,.8,1.0]   },
  { id:'design',   n:'04', name:'DESIGN ROOM',      sub:'GDD / SYSTEMS / AI',      c0:20,r0:15, c1:31, r1:26, tint:[.55,1.0,.9]  },
  { id:'safe',     n:'05', name:'SAFE ROOM',        sub:'HIDE. RECOVER.',          c0:6, r0:30, c1:13, r1:37, tint:[1.0,.9,.7]   },
  { id:'archive',  n:'06', name:'ARCHIVE',          sub:'CV / EDUCATION / DEVLOGS',c0:20,r0:28, c1:31, r1:39, tint:[.95,.8,.6]   },
  { id:'contact',  n:'07', name:'CONTACT ROOM',     sub:'FINAL EVALUATION',        c0:12,r0:42, c1:21, r1:52, tint:[.9,.8,.85]   },
  { id:'hall',     n:'',   name:'HALLWAY',          sub:'',                        c0:15,r0:2,  c1:18, r1:40, tint:[.8,.9,.8]    },
];

export function buildLevel(scene){
  const L = { W, H, rooms:ROOM_DEFS, doors:[], inter:[], fixtures:[], spinners:[], flickerScreens:[], pieceFrames:{} };
  const grid = new Uint8Array(W*H), roomGrid = new Array(W*H).fill(null), prop = new Uint8Array(W*H), noMon = new Uint8Array(W*H);
  const idx=(c,r)=>r*W+c;
  for(const d of ROOM_DEFS) for(let r=d.r0;r<=d.r1;r++) for(let c=d.c0;c<=d.c1;c++){ grid[idx(c,r)]=1; roomGrid[idx(c,r)]=d.id; }
  // doors
  const mkDoor=(id,cells,orient,locked,label,hint)=>{ const D={id,cells,orient,locked,open:locked?0:1,label,hint,mesh:null,led:null}; L.doors.push(D); for(const [c,r] of cells){ grid[idx(c,r)]=1; roomGrid[idx(c,r)]='hall'; } return D; };
  mkDoor('office',[[14,7],[14,8]],'v',false,'01 MAIN OFFICE','');
  mkDoor('portfolio',[[19,7],[19,8]],'v',true,'02 PORTFOLIO ROOM','Read the terminal in the Main Office.');
  mkDoor('dev',[[14,20],[14,21]],'v',true,'03 DEVELOPMENT ROOM','Read the terminal in the Portfolio Room.');
  mkDoor('design',[[19,20],[19,21]],'v',true,'04 DESIGN ROOM','Read the terminal in the Development Room.');
  mkDoor('safe',[[14,33],[14,34]],'v',false,'05 SAFE ROOM','');
  mkDoor('archive',[[19,33],[19,34]],'v',true,'06 ARCHIVE','Read the terminal in the Design Room.');
  mkDoor('contact',[[16,41],[17,41]],'h',true,'07 CONTACT ROOM','Read the CV terminal in the Archive.');
  mkDoor('exit',[[16,53],[17,53]],'h',true,'EXIT','Finish the interview.');
  L.door = id => L.doors.find(d=>d.id===id);
  for(let r=30;r<=37;r++) for(let c=6;c<=13;c++) noMon[idx(c,r)]=1; noMon[idx(14,33)]=noMon[idx(14,34)]=1;
  const doorAt=(c,r)=>{ for(const D of L.doors) for(const k of D.cells) if(k[0]===c&&k[1]===r) return D; return null; };
  L.solid=(c,r)=>{ if(c<0||r<0||c>=W||r>=H) return true; const i=idx(c,r); if(!grid[i]||prop[i]) return true; const D=doorAt(c,r); return !!(D&&D.locked); };
  L.wallSolid=(c,r)=>{ if(c<0||r<0||c>=W||r>=H) return true; const i=idx(c,r); if(!grid[i]) return true; const D=doorAt(c,r); return !!(D&&D.locked); };
  L.monsterOK=(c,r)=>!L.solid(c,r)&&!noMon[idx(c,r)];
  L.inSafe=(x,z)=>{ const c=x|0,r=z|0; return c>=0&&r>=0&&c<W&&r<H&&!!noMon[idx(c,r)]; };
  L.roomAt=(x,z)=>{ const c=Math.floor(x),r=Math.floor(z); if(c<0||r<0||c>=W||r>=H) return null; return roomGrid[idx(c,r)]; };
  L.roomDef=id=>ROOM_DEFS.find(d=>d.id===id);
  L.los=(x0,z0,x1,z1)=>{ const dx=x1-x0,dz=z1-z0,n=Math.ceil(Math.hypot(dx,dz)/0.25); for(let i=1;i<n;i++){ const t=i/n; if(L.wallSolid(Math.floor(x0+dx*t),Math.floor(z0+dz*t))) return false; } return true; };

  // ---------- materials ----------
  const tex = { wall:wallTex(), floor:floorTex(), ceil:ceilTex(), wood:woodTex(), dark:woodTex('#3b2a1c'), metal:metalTex(), paper:paperTex() };
  const M = {
    wall:new THREE.MeshLambertMaterial({map:tex.wall,vertexColors:true}),
    floor:new THREE.MeshLambertMaterial({map:tex.floor,vertexColors:true}),
    ceil:new THREE.MeshLambertMaterial({map:tex.ceil,vertexColors:true}),
    wood:new THREE.MeshLambertMaterial({map:tex.wood}), dark:new THREE.MeshLambertMaterial({map:tex.dark}),
    metal:new THREE.MeshLambertMaterial({map:tex.metal}), paper:new THREE.MeshLambertMaterial({map:tex.paper}),
    black:new THREE.MeshLambertMaterial({color:0x151515}), cloth:new THREE.MeshLambertMaterial({color:0x5a3b3b}),
    green:new THREE.MeshLambertMaterial({color:0x2f4a3a}), white:new THREE.MeshLambertMaterial({color:0xcfcfcf}),
    fix:new THREE.MeshBasicMaterial({color:0xfff2d0}),
  };
  L.mats=M;

  // ---------- mesher ----------
  const mk=()=>({p:[],n:[],u:[],c:[],i:[]});
  const B={wall:mk(),floor:mk(),ceil:mk()};
  const quad=(b,v,nrm,uvs,cols)=>{ const o=b.p.length/3; for(let k=0;k<4;k++){ b.p.push(...v[k]); b.n.push(...nrm); b.u.push(...uvs[k]); b.c.push(...cols[k]); } b.i.push(o,o+1,o+2,o,o+2,o+3); };
  let seed=11; const rnd=()=>{ seed=(seed*16807)%2147483647; return (seed-1)/2147483646; };
  for(let r=0;r<H;r++) for(let c=0;c<W;c++){
    if(!grid[idx(c,r)]) continue;
    const rd=ROOM_DEFS.find(d=>d.id===roomGrid[idx(c,r)]); const t=rd.tint; const v=0.92+rnd()*0.12;
    const col=(s)=>[t[0]*v*s,t[1]*v*s,t[2]*v*s];
    const Hh=WALL_H;
    quad(B.floor,[[c,0,r+1],[c+1,0,r+1],[c+1,0,r],[c,0,r]],[0,1,0],[[c/2,(r+1)/2],[(c+1)/2,(r+1)/2],[(c+1)/2,r/2],[c/2,r/2]],[col(1),col(1),col(1),col(1)]);
    quad(B.ceil,[[c,Hh,r],[c+1,Hh,r],[c+1,Hh,r+1],[c,Hh,r+1]],[0,-1,0],[[c/2,r/2],[(c+1)/2,r/2],[(c+1)/2,(r+1)/2],[c/2,(r+1)/2]],[col(.8),col(.8),col(.8),col(.8)]);
    const wq=(v4,nrm,u0,u1)=>quad(B.wall,v4,nrm,[[u0/2,0],[u1/2,0],[u1/2,Hh/2],[u0/2,Hh/2]],[col(.75),col(.75),col(1),col(1)]);
    if(L.wallSolid(c,r-1)) wq([[c,0,r],[c+1,0,r],[c+1,Hh,r],[c,Hh,r]],[0,0,1],c,c+1);
    if(L.wallSolid(c,r+1)) wq([[c+1,0,r+1],[c,0,r+1],[c,Hh,r+1],[c+1,Hh,r+1]],[0,0,-1],c,c+1);
    if(L.wallSolid(c-1,r)) wq([[c,0,r+1],[c,0,r],[c,Hh,r],[c,Hh,r+1]],[1,0,0],r,r+1);
    if(L.wallSolid(c+1,r)) wq([[c+1,0,r],[c+1,0,r+1],[c+1,Hh,r+1],[c+1,Hh,r]],[-1,0,0],r,r+1);
  }
  // wall quads at locked doors would exist (wallSolid true for locked) - doors get their own mesh and the door cells are walls-flanked; handled by door mesh below.
  for(const k of ['wall','floor','ceil']){ const b=B[k]; const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(b.p,3)); g.setAttribute('normal',new THREE.Float32BufferAttribute(b.n,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(b.u,2)); g.setAttribute('color',new THREE.Float32BufferAttribute(b.c,3)); g.setIndex(b.i);
    const m=new THREE.Mesh(g,M[k]); scene.add(m); }

  // ---------- helpers ----------
  const add=(m)=>{ scene.add(m); return m; };
  const box=(cx,cy,cz,w,h,d,mat,o={})=>{ const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat); m.position.set(cx,cy,cz); if(o.ry) m.rotation.y=o.ry; add(m);
    if(o.block!==false){ for(let r=Math.floor(cz-d/2+0.5);r<Math.floor(cz+d/2+0.5);r++) for(let c=Math.floor(cx-w/2+0.5);c<Math.floor(cx+w/2+0.5);c++) if(c>=0&&r>=0&&c<W&&r<H&&grid[idx(c,r)]) prop[idx(c,r)]=1; }
    return m; };
  const plane=(map,w,h,x,y,z,ry,basic=true,tint=0xffffff)=>{ const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h), basic?new THREE.MeshBasicMaterial({map,color:tint}):new THREE.MeshLambertMaterial({map})); m.position.set(x,y,z); m.rotation.y=ry; add(m); return m; };
  const FACE={ '+z':0, '-z':Math.PI, '+x':Math.PI/2, '-x':-Math.PI/2 };
  const sign=(text,sub,x,y,z,face,w=1.8)=>plane(signTex(text,sub),w,w/4,x,y,z,FACE[face]);
  const fixture=(x,z,color=0xfff2d0,intensity=1,room='')=>{ const m=new THREE.Mesh(new THREE.BoxGeometry(0.9,0.06,0.3),new THREE.MeshBasicMaterial({color})); m.position.set(x,WALL_H-0.04,z); add(m);
    L.fixtures.push({x,y:WALL_H-0.5,z,color:new THREE.Color(color),base:intensity,k:1,mesh:m,flick:0,room}); };
  const terminal=(x,z,face,room,label='Read the terminal')=>{ // desk + monitor
    const ang = FACE[face]; const dx=Math.sin(ang), dz=Math.cos(ang);
    const scr=screenTex(['UNI FAS DEV','> '+room.toUpperCase(),'','_ press E'],'#53ffd0');
    const mon=new THREE.Group(); mon.position.set(x,0.95,z); mon.rotation.y=ang;
    const body=new THREE.Mesh(new THREE.BoxGeometry(0.8,0.6,0.35),M.black); mon.add(body);
    const face_=new THREE.Mesh(new THREE.PlaneGeometry(0.7,0.5),new THREE.MeshBasicMaterial({map:scr})); face_.position.z=0.18; mon.add(face_);
    const stand=new THREE.Mesh(new THREE.BoxGeometry(0.15,0.3,0.15),M.black); stand.position.y=-0.4; mon.add(stand);
    add(mon); L.flickerScreens.push(face_);
    L.inter.push({id:'term_'+room,type:'terminal',room,x:x+dx*1.0,z:z+dz*1.0,r:2.0,label});
    return mon; };
  const locker=(x,z,face,room)=>{ const m=box(x,1.0,z,0.9,2.0,0.9,M.green); const ang=FACE[face];
    const slits=canvasTex(32,64,(g,w,h)=>{ g.fillStyle='#233a2c'; g.fillRect(0,0,w,h); g.fillStyle='#000'; for(let i=0;i<5;i++) g.fillRect(6,10+i*4,20,2); },{noRepeat:true});
    const s=plane(slits,0.8,1.9,x+Math.sin(ang)*0.46,1.0,z+Math.cos(ang)*0.46,ang,false); L.inter.push({id:'locker_'+room,type:'locker',room,x:x+Math.sin(ang)*1.0,z:z+Math.cos(ang)*1.0,r:1.6,label:'Hide in locker',lx:x,lz:z,face:ang});
    m.userData.locker=true; return m; };
  const frame=(pid,x,y,z,face)=>{ const p=PIECES.find(q=>q.id===pid); const ang=FACE[face]; const nx=Math.sin(ang), nz=Math.cos(ang);
    const fm=new THREE.Mesh(new THREE.BoxGeometry(1.8,1.2,0.08),M.black); fm.position.set(x,y,z); fm.rotation.y=ang; add(fm);
    const img=plane(pieceCardTex(p),1.65,1.05,x+nx*0.05,y,z+nz*0.05,ang,true,0xd8d8d8);
    L.pieceFrames[pid]=img;
    L.inter.push({id:'frame_'+pid,type:'piece',pieceId:pid,x:x+nx*1.2,z:z+nz*1.2,r:1.8,label:'Inspect — '+p.title}); };
  const doorSigns=()=>{ const s=(t,sub,x,y,z,f)=>sign(t,sub,x,y,z,f,1.6);
    s('02 PORTFOLIO','PROJECTS',18.98,2.35,8,'-x'); s('01 MAIN OFFICE','HOME',15.02,2.35,8,'+x');
    s('03 DEVELOPMENT','3D / RIGGING',15.02,2.35,21,'+x'); s('04 DESIGN','GDD / SYSTEMS',18.98,2.35,21,'-x');
    s('05 SAFE ROOM','HIDE. RECOVER.',15.02,2.35,34,'+x'); s('06 ARCHIVE','CV / DEVLOGS',18.98,2.35,34,'-x');
    s('07 CONTACT','FINAL EVALUATION',17,2.35,40.98,'-z');
    sign('SEALED ENTRANCE','NO WAY BACK',17,2.0,2.02,'+z',2.2);
    sign('EXIT','NOT YET',17,2.35,52.98,'-z',1.6);
  }; doorSigns();
  // room name signs inside rooms (above each door, facing in)
  sign('01 MAIN OFFICE','HOME',13.98,2.45,8,'-x',2); sign('02 PORTFOLIO ROOM','PROJECTS',20.02,2.45,8,'+x',2);
  sign('03 DEVELOPMENT ROOM','3D / ASSETS / RIGGING',13.98,2.45,21,'-x',2.2); sign('04 DESIGN ROOM','GDD / SYSTEMS / AI',20.02,2.45,21,'+x',2.2);
  sign('05 SAFE ROOM','RECOVER',13.98,2.45,34,'-x',2); sign('06 ARCHIVE','CV / DEVLOGS',20.02,2.45,34,'+x',2);

  // ---------- OFFICE ----------
  box(5,1.1,2.5,3,2.2,0.8,M.dark); box(9,1.1,2.5,3,2.2,0.8,M.dark); box(12.3,1.1,2.5,1.2,2.2,0.8,M.dark);
  box(2.9,0.4,8,1.2,0.8,3,M.wood); terminal(2.7,8,'+x','office'); box(4.4,0.3,8.6,0.5,0.6,0.5,M.cloth,{block:false});
  box(8,0.4,12.5,5,0.8,1.2,M.wood);
  for(let i=0;i<3;i++){ const s=screenTex([['UNI FAS DEV','philosophy:','tension > jumpscares','','the monster is'],['UNRELIABLE','REALITY','objects ask','the Director','decides'],['HORROR DIR.','state: Presence','tension 0.4','_']][i]);
    const mon=new THREE.Mesh(new THREE.BoxGeometry(0.9,0.62,0.3),M.black); mon.position.set(6.4+i*1.6,1.1,12.7); add(mon);
    const f=new THREE.Mesh(new THREE.PlaneGeometry(0.8,0.52),new THREE.MeshBasicMaterial({map:s})); f.position.set(6.4+i*1.6,1.1,12.54); f.rotation.y=Math.PI; add(f); L.flickerScreens.push(f); }
  locker(13.4,3.1,'-x','office');
  box(7,0.25,7.5,1.6,0.5,0.7,M.wood); // low table
  sign('UNI FAS WORKSHOP','SAME STUDIO. DIFFERENT PERSPECTIVES.',8,2.3,13.98,'-z',3);
  fixture(8,5.5,0xffd9a0,1,'office'); fixture(8,10.5,0xffd9a0,1,'office');

  // ---------- HALL ----------
  box(15.6,0.35,12,0.5,0.7,2,M.wood); box(18.4,0.4,26,0.5,0.8,0.8,M.metal);
  for(const z of [5,13,21,29,37]) fixture(17,z,0xd8f2dc,1,'hall');

  // ---------- PORTFOLIO ----------
  frame('ur',23.5,1.6,2.05,'+z'); frame('btq',27,1.6,2.05,'+z'); frame('hq',30.5,1.6,2.05,'+z');
  frame('ols',31.95,1.6,5.5,'-x'); frame('oup',31.95,1.6,10,'-x');
  box(26,0.4,13,3,0.8,1,M.wood); terminal(26,12.9,'-z','portfolio'); box(26,0.25,7.5,2.2,0.5,0.7,M.dark);
  locker(31.4,13.2,'-z','portfolio');
  fixture(26,5.5,0xd0b4ff,1,'portfolio'); fixture(26,10.5,0xd0b4ff,1,'portfolio');

  // ---------- DEV ----------
  const ped=(x,z,mkObj,pid)=>{ box(x,0.5,z,1.0,1.0,1.0,M.dark); const o=mkObj(); o.position.set(x,1.5,z); add(o); L.spinners.push(o);
    const p=PIECES.find(q=>q.id===pid); L.inter.push({id:'ped_'+pid,type:'piece',pieceId:pid,x,z:z+1.5,r:1.9,label:'Inspect — '+p.title}); };
  const lam=(c)=>new THREE.MeshLambertMaterial({color:c});
  ped(4,17.2,()=>{ const g=new THREE.Group(); const a=new THREE.Mesh(new THREE.TorusGeometry(0.35,0.12,6,10),lam(0xc9a040)); g.add(a); const b=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.9,0.3),lam(0x8a6a20)); g.add(b); return g; },'rm');
  ped(7.5,17.2,()=>{ const g=new THREE.Group(); const a=new THREE.Mesh(new THREE.SphereGeometry(0.35,8,6),lam(0x7a3fe0)); a.position.y=-0.1; g.add(a); const b=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.1,0.4,6),lam(0xb9a0ff)); b.position.y=0.4; g.add(b); return g; },'wl');
  ped(11,17.2,()=>{ const g=new THREE.Group(); const a=new THREE.Mesh(new THREE.CylinderGeometry(0.25,0.25,0.8,10),lam(0xe8e8e8)); g.add(a); const b=new THREE.Mesh(new THREE.CylinderGeometry(0.26,0.26,0.3,10),lam(0x3acb6a)); g.add(b); const c=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,0.15,8),lam(0x222222)); c.position.y=0.48; g.add(c); return g; },'pb');
  ped(2.9,22.5,()=>{ const g=new THREE.Group(); const a=new THREE.Mesh(new THREE.BoxGeometry(0.7,0.55,0.4),lam(0x303a40)); a.position.y=0.15; g.add(a); const s=new THREE.Mesh(new THREE.PlaneGeometry(0.6,0.4),new THREE.MeshBasicMaterial({color:0x53ffd0})); s.position.set(0,0.15,0.21); g.add(s); return g; },'dc');
  box(8,0.4,26.2,3,0.8,1,M.wood); terminal(8,26.1,'-z','dev'); locker(13.4,16.2,'-x','dev'); box(12.6,0.3,22,0.8,0.6,2,M.metal);
  fixture(8,19,0xbcd8ff,1,'dev'); fixture(8,24,0xbcd8ff,1,'dev');

  // ---------- DESIGN ----------
  const states=['1 DORMANT','2 AWARENESS','3 PRESENCE','4 OBSERVATION','5 HUNTING','6 ENCOUNTER','7 RELEASE','8 CAPTURE'];
  const wb=canvasTex(512,256,(g,w,h)=>{ g.fillStyle='#e9e9e2'; g.fillRect(0,0,w,h); g.fillStyle='#223'; g.font='bold 18px monospace'; g.fillText('THE INTERVIEWER — AI STATE MACHINE',14,28);
    g.font='bold 13px monospace'; g.strokeStyle='#a22'; g.lineWidth=2;
    states.forEach((s,i)=>{ const x=20+(i%4)*122, y=70+Math.floor(i/4)*90; g.strokeRect(x,y,108,44); g.fillStyle=i===7?'#a22':'#223'; g.fillText(s,x+7,y+27); if(i%4<3||i===3){ g.beginPath(); g.moveTo(x+108,y+22); g.lineTo(x+122,y+22); g.stroke(); } });
    g.fillStyle='#a22'; g.font='12px monospace'; g.fillText('if player looks at it: it disappears.',14,226); g.fillText('hide -> silence -> "okay, I\'m safe" -> repeat',14,244); },{noRepeat:true});
  box(26,1.8,15.06,4.2,2.2,0.1,M.white,{block:false}); plane(wb,4,2,26,1.8,15.13,0,true,0x9a9a9a);
  const wb2=canvasTex(512,256,(g,w,h)=>{ g.fillStyle='#e9e9e2'; g.fillRect(0,0,w,h); g.fillStyle='#223'; g.font='bold 18px monospace'; g.fillText('STRUGGLE ESCALATION GRID',14,28); g.font='14px monospace';
    ['CAPTURE 1  low      short sequence','CAPTURE 2  medium   faster / tighter','CAPTURE 3  high     longer / smaller window','CAPTURE 4+ very high mixed, minimal window'].forEach((t,i)=>g.fillText(t,14,70+i*34));
    g.fillStyle='#a22'; g.fillText('mash  OR  precision timing  (random)',14,226); },{noRepeat:true});
  plane(wb2,3,1.5,31.95,1.8,21,-Math.PI/2,true);
  box(26,0.4,26.2,3,0.8,1,M.wood); terminal(26,26.1,'-z','design'); locker(31.4,16.2,'-z','design');
  box(26,0.45,20.5,1.4,0.9,1.4,M.dark); const cube=new THREE.Mesh(new THREE.BoxGeometry(0.4,0.4,0.4),lam(0x53ffd0)); cube.position.set(26,1.2,20.5); add(cube); L.spinners.push(cube);
  L.inter.push({id:'proto',type:'piece',pieceId:'ur',x:26,z:22,r:1.9,label:'Inspect — Unreliable Reality prototype'});
  fixture(26,18.5,0x9ffff0,1,'design'); fixture(26,24,0x9ffff0,1,'design');

  // ---------- SAFE ----------
  box(8.2,0.3,36.4,2.4,0.6,1.2,M.cloth); box(11.6,0.3,31.2,1.6,0.6,0.7,M.wood);
  const rug=new THREE.Mesh(new THREE.PlaneGeometry(3,2),new THREE.MeshLambertMaterial({color:0x7a3b2a})); rug.rotation.x=-Math.PI/2; rug.position.set(9.5,0.02,33.5); add(rug);
  sign('SAFE','NOTHING IN HERE BITES',7.02,2.2,33.5,'+x',1.8);
  fixture(10,33.5,0xffb060,1.2,'safe');

  // ---------- ARCHIVE ----------
  for(let i=0;i<6;i++) box(22.6+i*1.5,0.95,30.3,1.1,1.9,0.7,M.metal);
  for(let i=0;i<4;i++) box(22.6+i*1.5,0.95,37.2,1.1,1.9,0.7,M.metal);
  box(31.5,0.4,34,1.2,0.8,3,M.wood); terminal(31.3,34,'-x','archive','Read the CV terminal'); locker(31.4,38.4,'-x','archive');
  box(27,0.25,34,1.8,0.5,1,M.paper,{block:false});
  const cert=canvasTex(128,96,(g,w,h)=>{ g.fillStyle='#d8cfa8'; g.fillRect(0,0,w,h); g.strokeStyle='#6a5a2a'; g.lineWidth=3; g.strokeRect(5,5,w-10,h-10); g.fillStyle='#4a3a1a'; g.font='bold 12px monospace'; g.textAlign='center'; g.fillText('CERTIFICATE',w/2,32); g.font='9px monospace'; g.fillText('of "getting better"',w/2,50); g.fillText('FRANCISCO',w/2,70); },{noRepeat:true});
  for(let i=0;i<3;i++) plane(cert,0.9,0.7,22.5+i*3.4,2.2,28.02,0,true,0xcccccc);
  fixture(25,31.5,0xffd9a0,0.9,'archive'); fixture(27,36.5,0xffd9a0,0.9,'archive');

  // ---------- CONTACT ----------
  box(17,0.4,47.5,3.4,0.8,1.3,M.wood); terminal(17,47.9,'-z','contact','Sit down. The interview.');
  box(17,0.3,45.6,0.7,0.6,0.7,M.cloth,{block:false}); box(17,0.3,49.4,0.7,0.6,0.7,M.cloth,{block:false});
  fixture(17,47.5,0xd7e6ff,0.9,'contact');

  // ---------- doors ----------
  for(const D of L.doors){ const xs=D.cells.map(c=>c[0]),zs=D.cells.map(c=>c[1]); const x0=Math.min(...xs),x1=Math.max(...xs)+1,z0=Math.min(...zs),z1=Math.max(...zs)+1;
    const w=D.orient==='v'?0.3:(x1-x0), d=D.orient==='v'?(z1-z0):0.3;
    const g=new THREE.Group(); g.position.set((x0+x1)/2,WALL_H/2,(z0+z1)/2);
    const slab=new THREE.Mesh(new THREE.BoxGeometry(w,WALL_H,d),M.metal); g.add(slab);
    const led=new THREE.Mesh(new THREE.BoxGeometry(D.orient==='v'?0.34:0.2,0.12,D.orient==='v'?0.2:0.34),new THREE.MeshBasicMaterial({color:D.locked?0xff2a1a:0x2aff6a})); led.position.y=0.3; g.add(led);
    D.mesh=g; D.led=led; D.baseY=WALL_H/2; g.position.y=D.locked?D.baseY:D.baseY+WALL_H+0.01; scene.add(g);
    if(D.locked&&D.id!=='exit') L.inter.push({id:'door_'+D.id,type:'door',door:D.id,x:(x0+x1)/2,z:(z0+z1)/2,r:2.2,label:''});
  }
  L.reach=new Uint8Array(W*H);
  L.recompute=()=>{ L.reach.fill(0); const st=[[17,10]]; while(st.length){ const [c,r]=st.pop(); if(c<0||r<0||c>=W||r>=H||L.reach[r*W+c]||!L.monsterOK(c,r)) continue; L.reach[r*W+c]=1; st.push([c+1,r],[c-1,r],[c,r+1],[c,r-1]); } };
  L.reachable=(c,r)=>c>=0&&r>=0&&c<W&&r<H&&!!L.reach[r*W+c];
  L.unlock=(id)=>{ const D=L.door(id); if(!D||!D.locked) return; D.locked=false; D.led.material.color.set(0x2aff6a); L.recompute(); };
  L.updateDoors=(dt)=>{ for(const D of L.doors){ const target=D.locked?0:1; D.open+=(target-D.open)*Math.min(1,dt*2.2); D.mesh.position.y=D.baseY+D.open*(WALL_H+0.02); } };
  L.fixtureFlicker=(room,dur)=>{ for(const f of L.fixtures) if(!room||f.room===room) f.flick=Math.max(f.flick,dur); };
  L.recompute();
  L.spawn={x:8,z:9.5,yaw:0};
  L.safeSpawn={x:9.5,z:33.5};
  L.update=(dt,t)=>{ L.updateDoors(dt); for(const s of L.spinners){ s.rotation.y+=dt*0.9; }
    for(const f of L.fixtures){ if(f.flick>0){ f.flick-=dt; f.k=Math.random()<0.5?0.1:1; if(f.flick<=0) f.k=1; } f.mesh.material.color.copy(f.color).multiplyScalar(0.35+0.65*f.k); }
    L.frameT=(L.frameT||0)+dt; if(L.frameT>0.15){ L.frameT=0; for(const s of L.flickerScreens) s.material.color.setScalar(0.85+Math.random()*0.15); } };
  // light pool
  L.pool=[]; for(let i=0;i<4;i++){ const l=new THREE.PointLight(0xffffff,0,13,1.4); scene.add(l); L.pool.push(l); }
  L.updateLights=(px,pz)=>{ const arr=L.fixtures.map(f=>({f,d:(f.x-px)**2+(f.z-pz)**2})).sort((a,b)=>a.d-b.d);
    for(let i=0;i<4;i++){ const f=arr[i].f; const l=L.pool[i]; l.position.set(f.x,f.y,f.z); l.color.copy(f.color); l.intensity=f.base*f.k*22; } };
  return L;
}
