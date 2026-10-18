import * as THREE from 'three';
function rnd(seed){ let s=seed; return ()=>{ s=(s*16807)%2147483647; return (s-1)/2147483646; }; }
export function canvasTex(w,h,draw,opts={}){
  const c=document.createElement('canvas'); c.width=w; c.height=h; const g=c.getContext('2d'); draw(g,w,h,rnd(opts.seed||7));
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace;
  t.magFilter=THREE.NearestFilter; t.minFilter=opts.mip?THREE.LinearMipmapLinearFilter:THREE.NearestFilter; t.generateMipmaps=!!opts.mip;
  if(!opts.noRepeat){ t.wrapS=t.wrapT=THREE.RepeatWrapping; }
  return t;
}
function speckle(g,w,h,r,n,a,light){ for(let i=0;i<n;i++){ const v=light?200+r()*55:r()*60; g.fillStyle=`rgba(${v},${v},${v},${r()*a})`; g.fillRect(r()*w,r()*h,1+r()*2,1+r()*2);} }
export function wallTex(){ return canvasTex(128,128,(g,w,h,r)=>{
  g.fillStyle='#8a8a86'; g.fillRect(0,0,w,h); speckle(g,w,h,r,900,0.35,false); speckle(g,w,h,r,500,0.25,true);
  for(let i=0;i<6;i++){ const x=r()*w; const gr=g.createLinearGradient(x,0,x+8,0); gr.addColorStop(0,'rgba(30,25,15,0)'); gr.addColorStop(.5,`rgba(30,25,15,${0.12+r()*0.2})`); gr.addColorStop(1,'rgba(30,25,15,0)'); g.fillStyle=gr; g.fillRect(x,0,8,h*(0.4+r()*0.6)); }
  g.fillStyle='rgba(0,0,0,.35)'; g.fillRect(0,h-14,w,14); g.fillStyle='rgba(0,0,0,.25)'; g.fillRect(0,h-16,w,2);
  g.fillStyle='rgba(0,0,0,.18)'; g.fillRect(0,0,w,3);
}); }
export function floorTex(){ return canvasTex(128,128,(g,w,h,r)=>{
  g.fillStyle='#777'; g.fillRect(0,0,w,h);
  for(let y=0;y<2;y++)for(let x=0;x<2;x++){ const v=100+r()*40|0; g.fillStyle=`rgb(${v},${v},${v-4})`; g.fillRect(x*64+1,y*64+1,62,62); }
  speckle(g,w,h,r,700,0.4,false); g.fillStyle='rgba(0,0,0,.4)'; g.fillRect(0,0,w,1); g.fillRect(0,0,1,h); g.fillRect(63,0,2,h); g.fillRect(0,63,w,2);
  for(let i=0;i<5;i++){ g.fillStyle=`rgba(20,10,5,${0.1+r()*0.2})`; g.beginPath(); g.arc(r()*w,r()*h,6+r()*14,0,7); g.fill(); }
}); }
export function ceilTex(){ return canvasTex(128,128,(g,w,h,r)=>{
  g.fillStyle='#6d6d6a'; g.fillRect(0,0,w,h); speckle(g,w,h,r,500,0.3,false); g.fillStyle='rgba(0,0,0,.45)'; g.fillRect(0,0,w,2); g.fillRect(0,0,2,h); g.fillRect(63,0,2,h);g.fillRect(0,63,w,2);
}); }
export function woodTex(base='#6b4a2e'){ return canvasTex(64,64,(g,w,h,r)=>{
  g.fillStyle=base; g.fillRect(0,0,w,h); for(let i=0;i<h;i+=2){ g.fillStyle=`rgba(0,0,0,${r()*0.25})`; g.fillRect(0,i,w,1);} speckle(g,w,h,r,200,0.3,false); }); }
export function metalTex(base='#5c6268'){ return canvasTex(64,64,(g,w,h,r)=>{
  g.fillStyle=base; g.fillRect(0,0,w,h); speckle(g,w,h,r,300,0.35,false); g.fillStyle='rgba(0,0,0,.35)'; g.fillRect(0,0,w,1); g.fillRect(0,h-1,w,1);}); }
export function paperTex(){ return canvasTex(64,64,(g,w,h,r)=>{ g.fillStyle='#bdb59a'; g.fillRect(0,0,w,h); speckle(g,w,h,r,100,0.3,false); }); }
export function screenTex(lines,color='#53ffd0',bg='#02130f',w=256,h=160){
  return canvasTex(w,h,(g,W,H,r)=>{ g.fillStyle=bg; g.fillRect(0,0,W,H); g.fillStyle=color; g.font='bold 14px monospace'; g.textBaseline='top';
    lines.forEach((l,i)=>g.fillText(l,10,10+i*18)); g.fillStyle='rgba(0,0,0,.25)'; for(let y=0;y<H;y+=3) g.fillRect(0,y,W,1); },{noRepeat:true});
}
export function signTex(text,sub,color='#e8e2d0'){
  return canvasTex(256,64,(g,w,h)=>{ g.fillStyle='#14110e'; g.fillRect(0,0,w,h); g.strokeStyle=color; g.lineWidth=3; g.strokeRect(3,3,w-6,h-6);
    g.fillStyle=color; g.font='bold 24px monospace'; g.textAlign='center'; g.fillText(text,w/2,32); g.font='12px monospace'; g.globalAlpha=.7; g.fillText(sub||'',w/2,52); },{noRepeat:true});
}
export function faceTex(kind){
  return canvasTex(128,128,(g,w,h,r)=>{
    g.fillStyle=kind==='glitch'?'#0b1d1a':'#061411'; g.fillRect(0,0,w,h);
    g.fillStyle='#7dffe6'; const dy=kind==='glitch'?6:0;
    g.fillRect(34,46+dy,14,14); g.fillRect(82,46-dy,14,14);
    if(kind==='sad'){ g.fillRect(44,92,40,4); g.fillRect(40,98,6,4); g.fillRect(82,98,6,4);} else g.fillRect(44,92,40,4);
    if(kind==='glitch'){ for(let i=0;i<8;i++){ g.fillStyle=`rgba(125,255,230,${.3+r()*.5})`; g.fillRect(0,r()*h,w,2+r()*6); g.fillStyle=`rgba(0,0,0,.6)`; g.fillRect(r()*w,r()*h,30+r()*50,3);} }
    g.fillStyle='rgba(0,0,0,.3)'; for(let y=0;y<h;y+=3) g.fillRect(0,y,w,1);
  },{noRepeat:true});
}
export function pieceCardTex(p,img){
  return canvasTex(512,320,(g,w,h,r)=>{
    g.fillStyle='#0b0a10'; g.fillRect(0,0,w,h);
    const gr=g.createLinearGradient(0,0,w,h); gr.addColorStop(0,`hsl(${p.hue},70%,22%)`); gr.addColorStop(1,`hsl(${(p.hue+60)%360},60%,8%)`); g.fillStyle=gr; g.fillRect(10,10,w-20,h-20);
    g.strokeStyle=`hsl(${p.hue},90%,65%)`; g.lineWidth=4; g.strokeRect(10,10,w-20,h-20);
    g.strokeStyle=`hsla(${p.hue},90%,70%,.18)`; g.lineWidth=1; for(let i=0;i<14;i++){ g.beginPath(); g.moveTo(r()*w,0); g.lineTo(r()*w,h); g.stroke(); }
    g.fillStyle=`hsl(${p.hue},90%,75%)`; g.font='bold 18px monospace'; g.fillText(p.tag,32,52);
    g.fillStyle='#fff'; g.font='bold 40px monospace';
    const words=p.title.split(' '); let line='',y=120; for(const wd of words){ const t=line?line+' '+wd:wd; if(g.measureText(t).width>w-70){ g.fillText(line,32,y); y+=48; line=wd; } else line=t; } g.fillText(line,32,y);
    g.fillStyle='rgba(255,255,255,.6)'; g.font='16px monospace'; g.fillText('UNI FAS — '+(p.role||'').slice(0,42),32,h-34);
    if(img){ try{ g.globalAlpha=.9; g.drawImage(img,w-190,h-190,160,160); g.globalAlpha=1; }catch(e){} }
  },{noRepeat:true});
}
