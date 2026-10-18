import * as THREE from 'three';
import { buildLevel, W, H } from './level.js';
import { Monster } from './monster.js';
import { audio } from './audio.js';
import { pieceCardTex } from './tex.js';
import { PIECES, ROOM_COPY, LINKS } from './content.js';

const $=id=>document.getElementById(id);
const Q=new URLSearchParams(location.search); const DEBUG=Q.has('debug');
const rand=(a,b)=>a+Math.random()*(b-a); const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const G={ state:'menu', calm:false, reduce:false, lockedOnce:false, noLock:false, captures:0, shown:0, visited:new Set(), pieceQ:[], lastStruggle:'', t:0, debug:DEBUG, struggleFails:0, endingDone:false };

// ---------- three ----------
const canvas=$('game');
const renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});
const scene=new THREE.Scene(); scene.background=new THREE.Color(0x050608); scene.fog=new THREE.FogExp2(0x07080b,0.09);
const camera=new THREE.PerspectiveCamera(72,16/9,0.05,60); camera.rotation.order='YXZ'; scene.add(camera);
scene.add(new THREE.AmbientLight(0x4a5070,0.55));
const flash=new THREE.SpotLight(0xfff0d8,60,22,0.55,0.6,1.2); camera.add(flash); const ft=new THREE.Object3D(); ft.position.set(0,0,-1); camera.add(ft); flash.target=ft;
function resize(){ const rw=Math.max(320,Math.round(innerWidth/(innerWidth>1500?3:(innerWidth>900?2.4:2)))); const rh=Math.round(rw*innerHeight/innerWidth);
  renderer.setSize(rw,rh,false); camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize',resize); resize();

const L=buildLevel(scene); const mon=new Monster(scene,L);
const P={x:L.spawn.x,z:L.spawn.z,yaw:Math.PI/2,pitch:0,vx:0,vz:0,bob:0,hidden:false,spot:null,sprinting:false,light:true,stepT:0,eyeY:1.65};
// ---------- UI helpers ----------
const show=(id,v=true)=>{ const e=$(id); if(e) e.hidden=!v; };
let subT=0; function sub(text,ms=3200,who='THE DEVELOPER'){ const s=$('subs'); s.innerHTML=`<b>${who}:</b> ${text}`; s.style.opacity=1; clearTimeout(subT); subT=setTimeout(()=>s.style.opacity=0,ms); }
let toastT=0; function toast(text,ms=3500){ const s=$('toast'); s.textContent=text; s.style.opacity=1; clearTimeout(toastT); toastT=setTimeout(()=>s.style.opacity=0,ms); }
function say(text,{pitch=0.2,rate=0.62}={}){ sub(text); audio.voice(text,pitch,rate); }
function lock(){ if(G.noLock) return; try{ const p=canvas.requestPointerLock(); if(p&&p.catch) p.catch(()=>{G.noLock=true;}); }catch(e){ G.noLock=true; } }
document.addEventListener('pointerlockchange',()=>{ const l=document.pointerLockElement===canvas; if(l) G.lockedOnce=true; else if(G.state==='play'&&G.lockedOnce){ pauseGame(); } });
document.addEventListener('pointerlockerror',()=>{G.noLock=true;});
function pauseGame(){ if(G.state!=='play') return; G.state='pause'; show('pause'); }
$('resume').onclick=()=>{ show('pause',false); G.state='play'; lock(); };

// ---------- panels ----------
let panelClose=null;
function openPanel(title,html,{btn='Close  [E]',onClose=null,wide=false}={}){
  if(G.state==='play'||G.state==='menu'||G.state==='pause'||G.state==='quick') G.prev=G.state; G.state='panel'; try{document.exitPointerLock();}catch(e){}
  $('ptitle').textContent=title; $('pbody').innerHTML=html; $('pclose').textContent=btn; $('pbox').classList.toggle('wide',wide); show('panel'); panelClose=onClose; $('pbody').scrollTop=0; audio.click();
}
function closePanel(){ if(G.state!=='panel') return; show('panel',false); const f=panelClose; panelClose=null; if(G.prev==='menu'){ G.state='menu'; } else { G.state='play'; lock(); } if(f) f(); }
$('pclose').onclick=closePanel;
function pieceHTML(p){ return `<p class="tagline">${p.tag}</p><p class="mono dim">${p.role}${p.tools?` · ${p.tools}`:''}${p.status?` · ${p.status}`:''}</p><p>${p.blurb}</p><p>${p.links.map(l=>`<a class="lnk" target="_blank" rel="noopener" href="${l[1]}">${l[0]} ↗</a>`).join(' ')}</p>`; }
function quickLinks(){ const li=[['CV',LINKS.cv],['Portfolio',LINKS.portfolio],['Devlogs',LINKS.devlogs],['3D portfolio',LINKS.threeD],['Sketchfab',LINKS.sketchfab],['IndieDB',LINKS.indiedb]]; if(LINKS.linkedin) li.push(['LinkedIn',LINKS.linkedin]); if(LINKS.email) li.push(['Email','mailto:'+LINKS.email]);
  return `<p class="dim">No need to survive to see the work:</p><p>${li.map(l=>`<a class="lnk" target="_blank" rel="noopener" href="${l[1]}">${l[0]} ↗</a>`).join(' ')}</p>`; }

// ---------- input ----------
const keys={}; let dragging=false;
addEventListener('keydown',e=>{
  const k=e.code; if(['Space','Tab','ArrowUp','ArrowDown'].includes(k)) e.preventDefault();
  if(k==='F3'){ e.preventDefault(); G.debug=!G.debug; $('debug').hidden=!G.debug; return; }
  if(G.state==='struggle'){ if(k==='Space'||k==='KeyE'||k==='Enter') struggleInput(); return; }
  if(G.state==='panel'){ if(k==='KeyE'||k==='Escape'||k==='Enter'&&!e.target.closest('button')) closePanel(); return; }
  if(G.state==='quick'){ if(k==='KeyQ'||k==='Escape') closePanel(); return; }
  if(G.state!=='play') return;
  keys[k]=true;
  if(k==='KeyE') interact(); if(k==='KeyF'){ P.light=!P.light; audio.click(); } if(k==='Tab') show('mapov'); if(k==='KeyQ') openPanel('QUICK LINKS',quickLinks());
});
addEventListener('keyup',e=>{ keys[e.code]=false; if(e.code==='Tab') show('mapov',false); });
addEventListener('mousemove',e=>{ if(G.state!=='play'||P.hidden&&false) return; const locked=document.pointerLockElement===canvas; if(locked||dragging){ look(e.movementX,e.movementY); } });
canvas.addEventListener('mousedown',()=>{ if(G.state==='play') dragging=true; if(G.state==='struggle') struggleInput(); });
addEventListener('mouseup',()=>dragging=false);
function look(dx,dy){ const s=0.0022; P.yaw-=dx*s; P.pitch=clamp(P.pitch-dy*s,-1.2,1.2); if(P.hidden){ P.yaw=clamp(P.yaw,P.spot.yaw-0.9,P.spot.yaw+0.9); P.pitch=clamp(P.pitch,-0.5,0.5); } }
canvas.addEventListener('click',()=>{ if(G.state==='play'&&document.pointerLockElement!==canvas) lock(); });

// ---------- collision ----------
function collides(x,z,r){ for(let c=Math.floor(x-r);c<=Math.floor(x+r);c++)for(let rr=Math.floor(z-r);rr<=Math.floor(z+r);rr++){ if(!L.solid(c,rr)) continue; const nx=clamp(x,c,c+1),nz=clamp(z,rr,rr+1); if((x-nx)**2+(z-nz)**2<r*r) return true; } return false; }
function moveP(dx,dz){ const r=0.3; if(!collides(P.x+dx,P.z,r)) P.x+=dx; if(!collides(P.x,P.z+dz,r)) P.z+=dz; }

// ---------- objectives / flow ----------
const SEQ=['office','portfolio','dev','design','archive','contact'];
const NEXT_DOOR={office:'portfolio',portfolio:'dev',dev:'design',design:'archive',archive:'contact'};
const ROOMNAME={office:'01 MAIN OFFICE',portfolio:'02 PORTFOLIO ROOM',dev:'03 DEVELOPMENT ROOM',design:'04 DESIGN ROOM',archive:'06 ARCHIVE',contact:'07 CONTACT ROOM'};
function objective(){ if(G.endingDone) return 'Leave the studio.'; const i=SEQ.findIndex(r=>!G.visited.has(r)); if(i<0) return 'Leave.'; if(i===0) return 'Read the terminal in the '+ROOMNAME.office+'.';
  if(i===5) return 'Go to the '+ROOMNAME.contact+' and give your verdict.'; return 'Go to the '+ROOMNAME[SEQ[i]]+' and read its terminal. (05 SAFE ROOM: the Developer cannot enter)'; }
function refreshHUD(){ $('obj').textContent='▸ '+objective(); $('count').textContent=`WORK SHOWN ${G.shown}/${PIECES.length}`; }
function useTerminal(room){
  audio.beep(true); noise(P.x,P.z,16);
  if(room==='contact'){ if(!G.visited.has('archive')) { toast('Read the Archive terminal first.'); return; }
    openPanel('THE INTERVIEW',`<p class="mono">The Developer sits opposite you. He leans in until his screen fills your view.</p><p class="big">"So... what do you think?"</p><p><button class="choice" id="hire">You're hired. Let's go.</button> <button class="choice no" id="nope">I'm afraid it's a no from me.</button></p>`,{btn:'Not yet'}); 
    $('hire').onclick=()=>{ show('panel',false); G.state='play'; endGame(true); }; $('nope').onclick=()=>{ show('panel',false); G.state='play'; endGame(false); }; return; }
  const first=!G.visited.has(room); G.visited.add(room); const copy=ROOM_COPY[room];
  openPanel(copy.title,copy.html,{onClose:()=>{}});
  if(room==='design') document.querySelectorAll('#hfiles .file').forEach(b=>b.onclick=()=>{ audio.click(); const f=b.dataset.f; const t={Threat_Design:'Visibility is a resource. Spend it badly.',AI_State_Machine:'Dormant → Awareness → Presence → Observation → Hunting → Encounter → Release. Capture is the exception.',Sound_Design:'SCRAAAAPE … silence … SCRAAAAPE.',Encounter_Design:'The player must always have something to hide behind.'}; $('hout').textContent= f==='THE_INTERVIEWER'?'Purpose: Demonstrate tension-based horror design through interactive portfolio presentation. (Yes. The monster was a portfolio piece.)':(t[f.replace('.pdf','')]||''); });
  if(first&&NEXT_DOOR[room]){ const d=NEXT_DOOR[room]; setTimeout(()=>{ L.unlock(d); audio.unlock(); toast('DOOR UNLOCKED: '+ROOMNAME[d]); refreshHUD(); },300); }
  refreshHUD();
}
function endGame(hired){
  G.state='end'; try{document.exitPointerLock();}catch(e){}
  if(hired){ G.endingDone=true; L.unlock('exit'); audio.unlock(); $('endt').textContent="YOU'RE HIRED"; $('endb').innerHTML=`<p class="mono">The Developer finally exhales. The studio door opens. You leave together.</p><p>This workshop was a portfolio piece: tension design, AI behaviour, level design, 3D art and UI, all in one interview.</p>${quickLinks().replace('No need to survive to see the work:','Now the real links:')}`; show('reconsider',false); }
  else { show('reconsider',true); audio.snap(); $('endt').textContent='GAME OVER'; $('endb').innerHTML=`<p class="mono">*snap*</p><p>He took it well.</p><p class="dim">(He will accept an appeal.)</p>`; }
  show('end'); }
$('replay').onclick=()=>location.reload();
$('reconsider').onclick=()=>{ show('end',false); G.state='play'; lock(); toast('The Developer is still waiting in the Contact Room.'); };

// ---------- interaction ----------
let cur=null;
function updateInteract(){ cur=null; if(P.hidden){ cur={type:'unhide',label:'Leave locker'}; $('prompt').textContent='[E] Leave locker'; return; }
  const fx=-Math.sin(P.yaw),fz=-Math.cos(P.yaw); let best=1e9;
  for(const it of L.inter){ if(it.type==='door'){ const D=L.door(it.door); if(!D.locked) continue; }
    const dx=it.x-P.x,dz=it.z-P.z,d=Math.hypot(dx,dz); if(d>it.r) continue; const dot=(dx*fx+dz*fz)/(d||1); if(d>1.2&&dot<0.25) continue; if(d<best){ best=d; cur=it; } }
  if(!cur){ $('prompt').textContent=''; return; }
  let label=cur.label; if(cur.type==='door'){ const D=L.door(cur.door); label='LOCKED — '+D.label+'. '+D.hint; }
  $('prompt').textContent=(cur.type==='door'?'':'[E] ')+label;
}
function interact(){ if(!cur) return; audio.click();
  if(cur.type==='terminal') useTerminal(cur.room);
  else if(cur.type==='piece'){ const p=PIECES.find(x=>x.id===cur.pieceId); openPanel(p.title,pieceHTML(p)); }
  else if(cur.type==='locker') enterLocker(cur);
  else if(cur.type==='unhide') leaveLocker();
  else if(cur.type==='door'){ audio.beep(false); }
}
function enterLocker(it){ const seen=dir.enabled&&mon.visible&&L.los(mon.x,mon.z,P.x,P.z)&&mon.dist(P.x,P.z)<14&&(dir.state==='encounter'||dir.state==='hunting');
  P.hidden=true; P.spot={x:it.lx,z:it.lz,yaw:it.face+Math.PI,out:{x:it.x,z:it.z}}; P.x=it.lx; P.z=it.lz; P.yaw=P.spot.yaw; P.pitch=0; $('hideov').hidden=false; audio.thud(0.25);
  dir.hideSeen=seen; dir.lockerPos={x:it.lx,z:it.lz,out:it.x?{x:it.x,z:it.z}:null}; noise(P.x,P.z,7); if(dir.enabled&&dir.state==='encounter'&&!seen){ dir.encLost=true; setState('hunting'); dir.noise={x:it.x,z:it.z}; dir.hideSearch=true; } }
function leaveLocker(){ if(!P.hidden) return; const o=P.spot.out; if(dir.enabled&&mon.visible&&dir.state==='hunting'&&mon.dist(o.x,o.z)<3&&L.los(mon.x,mon.z,o.x,o.z)){ /* stepped out right into him */ }
  P.hidden=false; P.x=o.x; P.z=o.z; $('hideov').hidden=true; dir.hideSearch=false; audio.thud(0.2); noise(P.x,P.z,6); }

// ---------- Horror Director ----------
const dir={ enabled:true, state:'dormant', t:0, dur:35, tension:0, noise:null, loseT:0, lastApproved:-99, log:[], lookT:0, lastLOS:null, dwell:0, hideSearch:false, hideSeen:false, safeT:0, whispered:false };
const TENSION={dormant:.05,awareness:.22,presence:.4,observation:.55,hunting:.6,encounter:1,release:.15,capture:1};
function dlog(s){ dir.log.unshift(`${G.t.toFixed(0)}s ${s}`); dir.log.length=8; }
function noise(x,z,r){ if(!dir.enabled) return; dir.noiseEvt={x,z,r}; if(dir.state==='hunting'||dir.state==='presence'||dir.state==='awareness'){ if(mon.dist(x,z)<r*1.8){ dir.noise={x,z}; if(dir.state!=='hunting'){ if(mon.dist(x,z)<r*1.2) setState('hunting'); } } } }
function cellOK(c,r){ return L.monsterOK(c,r)&&L.reachable(c,r); }
function pickCell(minD,maxD,tries=60,needLOS=false){ for(let i=0;i<tries;i++){ const a=Math.random()*Math.PI*2,d=rand(minD,maxD); const x=P.x+Math.cos(a)*d,z=P.z+Math.sin(a)*d; const c=Math.floor(x),r=Math.floor(z); if(!cellOK(c,r)) continue; if(needLOS&&!L.los(c+.5,r+.5,P.x,P.z)) continue; return [c+.5,r+.5]; } return null; }
function setState(s){ dir.state=s; dir.t=0; dlog('→ '+s.toUpperCase()); dir.loseT=0; dir.dwell=0;
  switch(s){
    case 'dormant': mon.visible=false; { const sp=pickCell(22,40,200); if(sp&&mon.place) mon.place(sp[0],sp[1]); } dir.dur=rand(16,26)*(G.captures>1?0.8:1); break;
    case 'awareness': mon.visible=false; { const g=pickCell(14,24); if(g) mon.goTo(g[0],g[1]); } dir.dur=rand(12,20); break;
    case 'presence': mon.visible=false; { const g=pickCell(8,13); if(g) mon.goTo(g[0],g[1]); } dir.dur=rand(10,16); dir.whispered=false; break;
    case 'observation': { const sp=pickCell(9,20,120,true); if(!sp){ setState('hunting'); return; } mon.place(sp[0],sp[1]); mon.visible=true; mon.tilt=0.45; mon.yaw=Math.atan2(P.x-sp[0],P.z-sp[1]); mon.path=null; dir.lookT=0; dir.dur=10; sub('...',1200,'?'); } break;
    case 'hunting': mon.visible=true; mon.tilt=0; dir.dur=45; if(dir.noise) mon.goTo(dir.noise.x,dir.noise.z); else { const g=pickCell(3,9); if(g) mon.goTo(g[0],g[1]); } break;
    case 'encounter': mon.visible=true; mon.tilt=0; mon.glitch=1.2; dir.dur=999; audio.sting(); dir.lostFor=0; break;
    case 'release': mon.visible=true; mon.tilt=0; { const sp=pickCell(26,40,150); if(sp) mon.goTo(sp[0],sp[1]); } dir.dur=14; if(Math.random()<0.5) say('It can be better, no doubt...'); break;
  }
}
function request(name,okStates,fn){ const ok=okStates.includes(dir.state)&&G.t-dir.lastApproved>6&&!P.hidden&&!L.inSafe(P.x,P.z);
  if(ok){ dir.lastApproved=G.t; dlog('APPROVED '+name); fn(); } else dlog('DENIED   '+name+' ('+(L.inSafe(P.x,P.z)?'safe room':okStates.includes(dir.state)?'cooldown':dir.state)+')'); }
let reqT=8;
function directorRequests(dt){ reqT-=dt; if(reqT>0) return; reqT=rand(7,12); const pick=Math.floor(Math.random()*5);
  const room=L.roomAt(P.x,P.z)||'hall';
  [()=>request('lights flicker ['+room+']',['dormant','awareness','presence','release'],()=>{ L.fixtureFlicker(room,rand(0.8,1.8)); audio.static_(0.08,0.8); }),
   ()=>request('distant door slam',['awareness','presence','hunting'],()=>{ audio.thud(0.5,rand(-1,1)); }),
   ()=>request('monitor static',['dormant','release','awareness'],()=>{ audio.static_(0.12,0.9); for(const s of L.flickerScreens) if(Math.hypot(s.position.x-P.x,s.position.z-P.z)<8) s.material.color.setScalar(2); }),
   ()=>request('whisper from vent',['presence'],()=>{ say('Hi...',{pitch:0.1,rate:0.5}); }),
   ()=>request('creak',['awareness','presence','hunting'],()=>{ audio.creak(0.15,rand(-1,1)); })][pick](); }
const monEvents={ step(m){ const d=m.dist(P.x,P.z); const rel=Math.atan2(m.x-P.x,m.z-P.z); const rx=Math.cos(P.yaw),rz=-Math.sin(P.yaw); const pan=clamp(((m.x-P.x)*rx+(m.z-P.z)*rz)/(d||1),-1,1); let v=0.55*clamp(1-d/24,0,1); if(!L.los(m.x,m.z,P.x,P.z)) v*=0.55; if(v>0.02) audio.heavyStep(v,pan); },
  scrape(m){ const d=m.dist(P.x,P.z); const rx=Math.cos(P.yaw),rz=-Math.sin(P.yaw); const pan=clamp(((m.x-P.x)*rx+(m.z-P.z)*rz)/(d||1),-1,1); let v=0.35*clamp(1-d/26,0,1); if(!L.los(m.x,m.z,P.x,P.z)) v*=0.6; if(v>0.02) audio.scrape(v,pan); } };
function directorUpdate(dt){
  const d=mon.dist(P.x,P.z); const los=L.los(mon.x,mon.z,P.x,P.z); const inSafe=L.inSafe(P.x,P.z);
  dir.t+=dt; directorRequests(dt);
  let speed=0;
  switch(dir.state){
    case 'dormant': if(dir.t>dir.dur) setState('awareness'); break;
    case 'awareness': speed=1.6; if(mon.arrived()){ const g=pickCell(10,22); if(g) mon.goTo(g[0],g[1]); } if(dir.t>dir.dur) setState('presence'); break;
    case 'presence': speed=1.3; if(!dir.whispered&&dir.t>4){ dir.whispered=true; say(Math.random()<0.5?'Hi...':'I need... a joooooobbbbb',{pitch:0.1,rate:0.5}); }
      if(mon.arrived()){ const g=pickCell(7,12); if(g) mon.goTo(g[0],g[1]); } if(dir.t>dir.dur) setState(Math.random()<0.65?'observation':'hunting'); break;
    case 'observation': { mon.visible=true; const fx=-Math.sin(P.yaw),fz=-Math.cos(P.yaw); const dx=mon.x-P.x,dz=mon.z-P.z,dd=Math.hypot(dx,dz); const dot=(dx*fx+dz*fz)/dd;
      mon.yaw=Math.atan2(-dx,-dz); mon.tilt=0.45+Math.sin(G.t*2)*0.08;
      if(dot>0.94&&los&&!P.hidden) dir.lookT+=dt; else dir.lookT=Math.max(0,dir.lookT-dt*0.5);
      if(dir.lookT>0.5){ mon.glitch=0.5; audio.static_(0.25,0.4); mon.visible=false; dlog('player looked: it vanished'); const g=pickCell(5,12); if(g) mon.place(g[0],g[1]); setState('hunting'); dir.noise={x:P.x,z:P.z}; mon.visible=false; break; }
      if(dir.t>dir.dur) setState('hunting'); break; }
    case 'hunting': { mon.visible=true; speed=1.75; const detect=P.light?13:9;
      if(dir.hideSearch&&dir.lockerPos){ const lp=dir.lockerPos; const o=lp.out||lp; if(mon.dist(o.x,o.z)>1.8){ if(mon.arrived()||dir.t%1.5<dt) mon.goTo(o.x,o.z); } else { speed=0; dir.dwell+=dt; mon.tilt=0.4; mon.sad=false; if(dir.dwell>5.5){ if(P.hidden&&(dir.hideSeen||Math.random()<0.18+0.1*G.captures)){ startCapture(true); return; } dir.hideSearch=false; setState('release'); } } break; }
      if(!P.hidden&&!inSafe&&los&&d<detect&&!mon.sad){ setState('encounter'); break; }
      if(mon.arrived()){ const base=dir.noise||{x:P.x,z:P.z}; dir.noise=null; const a=Math.random()*6.28,r=rand(2,7); const x=base.x+Math.cos(a)*r,z=base.z+Math.sin(a)*r; if(cellOK(Math.floor(x),Math.floor(z))) mon.goTo(x,z); else mon.goTo(base.x,base.z); mon.tilt=0.3; }
      else if(dir.noise&&dir.t%2<dt) mon.goTo(dir.noise.x,dir.noise.z);
      if(dir.t>dir.dur) setState('release'); break; }
    case 'encounter': { mon.visible=true; speed=Math.min(3.9,3.2+0.15*G.captures); mon.tilt=0;
      if(inSafe){ // cannot enter
        dir.safeT+=dt; if(dir.safeT>1&&dir.safeT<1.05) mon.glitch=1; if(mon.arrived()&&dir.safeT>4){ dir.safeT=0; setState('release'); } else if(mon.arrived()||dir.t%0.6<dt){ mon.goTo(15.5,33.5+ (Math.random()<0.5?0:1)); } if(dir.safeT>7){ dir.safeT=0; setState('release'); } speed=2.2; break; }
      dir.safeT=0;
      if(P.hidden){ dir.encLost=true; setState('hunting'); dir.noise={x:P.spot.out.x,z:P.spot.out.z}; dir.hideSearch=true; break; }
      if(los){ dir.lostFor=0; dir.lastSeen={x:P.x,z:P.z}; if(dir.t%0.35<dt){ if(!mon.goTo(P.x,P.z)){ /* no path */ } } if(d<1.15){ startCapture(false); return; } }
      else { dir.lostFor+=dt; if(mon.arrived()&&dir.lastSeen) mon.goTo(dir.lastSeen.x,dir.lastSeen.z); if(dir.lostFor>5){ dir.noise=dir.lastSeen||null; setState('hunting'); } }
      break; }
    case 'release': speed=1.9; mon.visible=true; if(mon.arrived()||dir.t>dir.dur){ mon.visible=false; setState('dormant'); dir.dur=rand(14,22); } break;
  }
  mon.update(dt,speed,monEvents);
  if(los&&mon.visible&&d<11&&dir.state!=='release') { dir.hb=(dir.hb||0)-dt; if(dir.hb<=0){ dir.hb=clamp(d/11,0.35,1)*1.1; audio.heartbeat(0.25*(1-d/11)+0.1); } }
  let tt=TENSION[dir.state]; if(mon.visible&&los) tt=Math.max(tt,clamp(1.1-d/16,0,1)); if(inSafe) tt*=0.35;
  dir.tension+=(tt-dir.tension)*Math.min(1,dt*1.2); audio.tension(dir.tension);
}

// ---------- capture ----------
const card={ mesh:null };
function nextPiece(){ if(!G.pieceQ.length){ const rest=PIECES.slice(2).sort(()=>Math.random()-0.5); G.pieceQ=[PIECES[0],PIECES[1],...rest]; if(G.shown>0) G.pieceQ.sort(()=>Math.random()-0.5); } return G.pieceQ.shift(); }
let CAP=null;
function startCapture(){ if(G.state==='capture'||G.state==='struggle') return; if(P.hidden){ P.hidden=false; $('hideov').hidden=true; }
  G.state='capture'; dir.state='capture'; G.captures++; mon.visible=true; mon.path=null; mon.glitch=2; mon.tilt=0; audio.sting(); try{document.exitPointerLock();}catch(e){}
  show('mapov',false); const piece=nextPiece();
  // monster steps up to the player
  const dx=P.x-mon.x,dz=P.z-mon.z,dd=Math.hypot(dx,dz)||1; const tx=P.x-dx/dd*0.95,tz=P.z-dz/dd*0.95; mon.x=tx; mon.z=tz; mon.yaw=Math.atan2(dx,dz);
  const mat=new THREE.MeshBasicMaterial({map:pieceCardTex(piece),transparent:true,depthTest:false}); const m=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.0),mat); m.renderOrder=999; m.visible=false; camera.add(m); card.mesh=m;
  CAP={t:0,piece,yaw0:P.yaw,pitch0:P.pitch,phase:'grab',tyaw:Math.atan2(-(mon.x-P.x),-(mon.z-P.z)),said:false};
  $('flash').style.opacity=1; setTimeout(()=>$('flash').style.opacity=0,120); say('Oh, good. You are here. Look at this. I have been working on it for a while...');
}
function captureUpdate(dt){ const c=CAP; c.t+=dt;
  let da=c.tyaw-P.yaw; while(da>Math.PI)da-=2*Math.PI; while(da<-Math.PI)da+=2*Math.PI; P.yaw+=da*Math.min(1,dt*9); P.pitch+=(0.35-P.pitch)*Math.min(1,dt*6);
  mon.update(dt,0,null); mon.model.userData.armR.s.rotation.x=-1.2+Math.sin(c.t*20)*0.05; mon.model.userData.armL.s.rotation.x=-1.0;
  const m=card.mesh;
  if(c.t>0.45){ m.visible=true; const k=clamp((c.t-0.45)/0.4,0,1); const e=k*k*(3-2*k); m.position.set(0.3*(1-e),-0.3*(1-e),-1.7+(1.25)*e); m.scale.setScalar(0.25+0.65*e); m.rotation.z=(1-e)*0.5; if(k>=1&&!c.slam){ c.slam=true; audio.thud(0.8); c.shake=0.5; $('flash').style.opacity=0.8; setTimeout(()=>$('flash').style.opacity=0,90); } }
  if(c.shake>0){ c.shake-=dt; camera.position.x+=Math.sin(c.t*90)*0.03*c.shake; camera.position.y+=Math.cos(c.t*77)*0.03*c.shake; }
  if(c.t>1.3&&c.phase==='grab'){ c.phase='struggle'; startStruggle(); }
}
// ---------- struggle ----------
let ST=null;
function startStruggle(){ G.state='struggle'; const tier=Math.min(3,G.captures-1); let type=Math.random()<0.5?'mash':'timing'; if(type===G.lastStruggle&&Math.random()<0.6) type=type==='mash'?'timing':'mash'; G.lastStruggle=type;
  ST={type,tier,t:0,done:false}; 
  if(type==='mash'){ ST.need=14+6*tier; ST.p=0; ST.time=Math.max(4,7-0.7*tier); ST.decay=0.12+0.05*tier; $('sthelp').textContent='MASH [SPACE] to break free!'; $('stwin').hidden=true; }
  else { ST.need=2+tier; ST.hits=0; ST.time=9; ST.pos=0; ST.dirn=1; ST.speed=1.3+0.35*tier; ST.w=0.26-0.04*tier; ST.c=rand(0.3,0.7); $('sthelp').textContent='Press [SPACE] when the marker is inside the green zone!'; $('stwin').hidden=false; }
  $('sttitle').textContent=`HE HAS YOU  ·  CAPTURE ${G.captures}`; show('struggle'); stDraw(); }
function stDraw(){ const s=ST; const prog=s.type==='mash'?s.p:s.hits/s.need; $('stbar').style.width=(prog*100)+'%'; $('sttime').style.width=(clamp(1-s.t/s.time,0,1)*100)+'%';
  if(s.type==='timing'){ $('stwin').firstElementChild.style.left=((s.c-s.w/2)*100)+'%'; $('stwin').firstElementChild.style.width=(s.w*100)+'%'; $('stmark').style.left=(s.pos*100)+'%'; } }
function struggleInput(){ if(!ST||ST.done) return; audio.click();
  if(ST.type==='mash'){ ST.p=Math.min(1,ST.p+1/ST.need); if(ST.p>=1) endStruggle(true); }
  else { if(Math.abs(ST.pos-ST.c)<ST.w/2){ ST.hits++; ST.c=rand(0.2,0.8); audio.beep(true); if(ST.hits>=ST.need) endStruggle(true); } else { ST.t+=1.2; audio.beep(false); } } stDraw(); }
function struggleUpdate(dt){ if(!ST||ST.done) return; ST.t+=dt;
  if(ST.type==='mash') ST.p=Math.max(0,ST.p-ST.decay*dt); else { ST.pos+=ST.dirn*ST.speed*dt; if(ST.pos>1){ ST.pos=1; ST.dirn=-1; } if(ST.pos<0){ ST.pos=0; ST.dirn=1; } }
  if(ST.t>=ST.time) endStruggle(false); stDraw(); if(card.mesh) { card.mesh.position.x=Math.sin(G.t*40)*0.01; card.mesh.position.y=Math.cos(G.t*33)*0.01; } }
$('stskip').onclick=()=>endStruggle(true,true);
function endStruggle(ok,skipped){ if(!ST||ST.done) return; ST.done=true; show('struggle',false); const piece=CAP.piece;
  if(ok) say(skipped?'Take your time.':'Hm. You are strong. You will be back.'); else say('Oh... lights out. Do not worry. I will keep showing you.');
  G.shown=Math.min(PIECES.length,G.shown+1); refreshHUD();
  const showPanel=()=>{ G.state='panel'; $('ptitle').textContent=piece.title; $('pbody').innerHTML=(ok?'':'<p class="mono dim">You were knocked out. ')+(ok?'':'You wake up somewhere safer.</p>')+pieceHTML(piece); $('pclose').textContent='Wake up  [E]'; $('pbox').classList.remove('wide'); show('panel'); panelClose=()=>respawn(); G.prev='play'; };
  if(!ok){ $('fade').style.opacity=1; setTimeout(showPanel,900); } else showPanel(); }
function respawn(){ camera.remove(card.mesh); card.mesh=null; CAP=null; ST=null; G.state='play'; P.x=L.safeSpawn.x; P.z=L.safeSpawn.z; P.yaw=0; P.pitch=-0.9; P.vx=P.vz=0; P.wake=2.2; show('panel',false);
  $('fade').style.opacity=1; setTimeout(()=>$('fade').style.opacity=0,200); mon.visible=false; mon.sad=false; dir.noise=null; dir.hideSearch=false; dir.hb=0; setState('dormant'); dir.dur=rand(26,34); lock(); toast('You wake up in the SAFE ROOM. Nothing in here bites.',4500); }

// ---------- map ----------
function drawMap(){ const c=$('mapc'),g=c.getContext('2d'),s=10; g.fillStyle='#041018'; g.fillRect(0,0,c.width,c.height);
  for(let r=0;r<H;r++)for(let q=0;q<W;q++){ if(!L.wallSolid(q,r)||(L.roomAt(q+.5,r+.5))){ const id=L.roomAt(q+.5,r+.5); if(id){ g.fillStyle=id==='safe'?'#7a5a1a':G.visited.has(id)?'#1f6a8a':'#12384d'; g.fillRect(q*s,r*s,s,s); } } }
  for(const D of L.doors){ g.fillStyle=D.locked?'#ff3a2a':'#3aff7a'; for(const [q,r] of D.cells) g.fillRect(q*s+1,r*s+1,s-2,s-2); }
  g.fillStyle='#9fe8ff'; g.font='10px monospace'; for(const rd of L.rooms){ if(rd.id==='hall') continue; g.fillText((rd.n+' '+rd.name).slice(0,18),rd.c0*s+4,rd.r0*s+12); }
  g.fillStyle='#fff'; g.beginPath(); g.arc(P.x*s,P.z*s,4,0,7); g.fill(); g.strokeStyle='#fff'; g.beginPath(); g.moveTo(P.x*s,P.z*s); g.lineTo(P.x*s-Math.sin(P.yaw)*12,P.z*s-Math.cos(P.yaw)*12); g.stroke();
  if(G.debug){ g.fillStyle='#f33'; g.beginPath(); g.arc(mon.x*s,mon.z*s,5,0,7); g.fill(); if(mon.path){ g.strokeStyle='#f55'; g.beginPath(); mon.path.forEach((p,i)=>i?g.lineTo(p[0]*s,p[1]*s):g.moveTo(p[0]*s,p[1]*s)); g.stroke(); } } }

// ---------- noise overlay ----------
const nc=$('noise'),ng=nc.getContext('2d'); let nT=0; function drawNoise(dt){ nT-=dt; if(nT>0) return; nT=0.07; const im=ng.createImageData(96,54); for(let i=0;i<im.data.length;i+=4){ const v=Math.random()*255; im.data[i]=im.data[i+1]=im.data[i+2]=v; im.data[i+3]=255; } ng.putImageData(im,0,0); }

// ---------- main loop ----------
const clock=new THREE.Clock(); let bobT=0;
function frame(){ requestAnimationFrame(frame); const dt=Math.min(0.05,clock.getDelta()); G.t+=dt;
  if(G.state==='play'){
    // look with arrows
    if(keys.ArrowLeft) P.yaw+=dt*1.8; if(keys.ArrowRight) P.yaw-=dt*1.8; if(keys.ArrowUp) P.pitch=clamp(P.pitch+dt*1.2,-1.2,1.2); if(keys.ArrowDown) P.pitch=clamp(P.pitch-dt*1.2,-1.2,1.2);
    if(P.wake>0){ P.wake-=dt; P.pitch+= (0-P.pitch)*Math.min(1,dt*1.8); }
    if(!P.hidden){ let ix=0,iz=0; if(keys.KeyW) iz-=1; if(keys.KeyS) iz+=1; if(keys.KeyA) ix-=1; if(keys.KeyD) ix+=1; const l=Math.hypot(ix,iz); if(l){ ix/=l; iz/=l; }
      P.sprinting=!!(keys.ShiftLeft||keys.ShiftRight)&&l>0; const sp=P.sprinting?4.1:2.4; const c=Math.cos(P.yaw),s=Math.sin(P.yaw);
      const tx=(ix*c+iz*s)*sp, tz=(-ix*s+iz*c)*sp; P.vx+=(tx-P.vx)*Math.min(1,dt*10); P.vz+=(tz-P.vz)*Math.min(1,dt*10); moveP(P.vx*dt,P.vz*dt);
      const spd=Math.hypot(P.vx,P.vz); P.stepT+=spd*dt; if(P.stepT>(P.sprinting?1.5:1.9)){ P.stepT=0; audio.step(P.sprinting?0.22:0.12); if(P.sprinting) noise(P.x,P.z,14); else noise(P.x,P.z,4); } bobT+=spd*dt*2.2; P.bob=Math.sin(bobT)*0.035*(spd>0.3?1:0); }
    if(dir.enabled) directorUpdate(dt); else mon.visible=false;
    updateInteract(); L.updateLights(P.x,P.z);
    if(!$('mapov').hidden) drawMap();
    if(G.state==='play') G.zoneRoom=L.roomAt(P.x,P.z);
  } else if(G.state==='capture'){ captureUpdate(dt); L.updateLights(P.x,P.z); }
  else if(G.state==='struggle'){ captureUpdate(dt); struggleUpdate(dt); L.updateLights(P.x,P.z); }
  L.update(dt,G.t);
  camera.position.set(P.x,P.eyeY+(P.hidden?-0.1:0)+P.bob,P.z); camera.rotation.set(P.pitch,P.yaw,0);
  if(G.state==='capture'||G.state==='struggle'){ if(CAP&&CAP.shake>0){ camera.position.x+=Math.sin(G.t*90)*0.03*CAP.shake; } }
  // flashlight
  flash.intensity=P.light&&G.state!=='capture'&&G.state!=='struggle'?(60*(G.reduce?1:(Math.random()<0.02+dir.tension*0.05?0.2:1))):0;
  const dark=G.state==='menu'; renderer.render(scene,camera);
  if(!G.reduce) drawNoise(dt);
  $('vig').style.opacity=0.55+dir.tension*0.35;
  if(G.debug&&G.state!=='menu') $('debug').textContent=`STATE ${dir.state.toUpperCase()}  t=${dir.t.toFixed(1)}/${dir.dur.toFixed(0)}  tension ${dir.tension.toFixed(2)}\nmonster ${mon.x.toFixed(1)},${mon.z.toFixed(1)} d=${mon.dist(P.x,P.z).toFixed(1)} vis=${mon.visible}\ncaptures ${G.captures}  room ${L.roomAt(P.x,P.z)}  noise ${dir.noise?'yes':'no'}\n`+dir.log.join('\n');
}

// ---------- start ----------
function startGame(calm){
  audio.init(); G.calm=calm; dir.enabled=!calm; G.state='play'; show('menu',false); show('hud'); $('debug').hidden=!G.debug; refreshHUD();
  if(calm){ mon.visible=false; toast('CALM TOUR — the Developer is off. Take your time.',4500); } else { setState('dormant'); dir.dur=35; toast('Find the terminal. Listen.',4000); }
  lock();
}
$('play').onclick=()=>startGame(false); $('calm').onclick=()=>startGame(true);
$('quicklinks').onclick=()=>{ G.prev='menu'; G.state='menu'; openPanel('QUICK LINKS',quickLinks()); };
$('opt-reduce').onchange=e=>{ G.reduce=e.target.checked; $('noise').style.display=G.reduce?'none':''; document.body.classList.toggle('reduce',G.reduce); };
$('opt-voice').onchange=e=>audio.setVoice(e.target.checked);
$('opt-sound').onchange=e=>audio.setMuted(!e.target.checked);
resize(); frame();
window.__g={G,dir,mon,P,L,setState,startCapture,struggleInput,endStruggle,useTerminal,get ST(){return ST;},get CAP(){return CAP;},closePanel,interact,THREE,camera,scene};
