/* Fear Index page: live Fear Index simulator (rules from the Quest 1 design document) + page helpers */
(function(){
  "use strict";
  var $=function(s,r){return (r||document).querySelector(s)};
  var $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};

  /* ---------- reveal + lightbox ---------- */
  var rv=$$(".reveal");
  if("IntersectionObserver" in window){
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target);}})},{threshold:.1});
    rv.forEach(function(el){io.observe(el)});
  } else rv.forEach(function(el){el.classList.add("in")});
  var lb=$("#lightbox"), lbi=lb&&$("img",lb);
  document.addEventListener("click",function(e){
    var z=e.target.closest&&e.target.closest(".zoomable");
    if(z&&lb){ lbi.src=z.currentSrc||z.src; lbi.alt=z.alt||""; lb.hidden=false; }
    else if(lb&&!lb.hidden&&e.target.closest("#lightbox")) lb.hidden=true;
  });
  addEventListener("keydown",function(e){ if(e.key==="Escape"&&lb&&!lb.hidden) lb.hidden=true; });

  /* ---------- file:// fallbacks for embeds (YouTube refuses to play without a referrer) ---------- */
  if(location.protocol==="file:"){
    var yt=$("#gateVideo");
    if(yt) yt.outerHTML='<a class="video-fallback" href="https://youtu.be/Ee-gn7syQFM" target="_blank" rel="noopener"><span>▶</span> Watch the gates video on YouTube<small>(it plays inline once this page is on your website)</small></a>';
  }
  var pdf=$("#pdf-frame");
  if(pdf) pdf.addEventListener("error",function(){ pdf.outerHTML='<div class="pdf-fallback"><p>Couldn\'t load the PDF preview.</p><a class="btn btn-primary" href="../Documents/Horror Tension System.pdf" target="_blank" rel="noopener">Open the PDF</a></div>'; });

  /* ================= FEAR INDEX SIM ================= */
  var STATES=[
    {name:"CALM",     cls:"s0", z:"Observes from afar. Hides and peeks.",              env:"Normal lighting.",      aud:"Soft ambience."},
    {name:"SUSPICION",cls:"s1", z:"Brief appearances. Partial silhouettes.",           env:"Slight flickers.",      aud:"Distant footsteps, skittering."},
    {name:"AGITATED", cls:"s2", z:"Blocks paths. Glowing eyes.",                       env:"Shadow movement.",      aud:"Whispering, chiming."},
    {name:"PANIC",    cls:"s3", z:"Rushes the player (non-lethal).",                   env:"Major flickers.",       aud:"Loud spike."}
  ];
  function stateOf(fi){ return fi<25?0:fi<50?1:fi<75?2:3; }
  var DT=0.2; /* the Fear Index updates every 0.2 seconds */

  function Sim(){ this.reset(); }
  Sim.prototype.reset=function(){ this.fi=10; this.t=0; this.f={}; this.retreat=0; this.panicT=0; this.quiet=99; this.series=[[0,10]]; this.log=[]; this.rushes=0; this.lastLog=""; this.nextSample=1; };
  Sim.prototype.say=function(m){ this.log.unshift(m); if(this.log.length>6) this.log.pop(); this.lastLog=m; };
  Sim.prototype.add=function(v,why){ this.fi=Math.max(0,Math.min(100,this.fi+v)); if(why) this.say((v>0?"+":"")+v+"  "+why); };
  Sim.prototype.noise=function(){ this.quiet=0; this.add(20,"loud noise"); };
  Sim.prototype.artifact=function(){ this.quiet=0; this.add(5,"artifact rotated (+5, she hears it)"); };
  Sim.prototype.hide=function(){ if(this.f.look){ this.say("can't hide while staring at her"); return false; } this.add(-15,"hid successfully"); return true; };
  Sim.prototype.step=function(){
    var f=this.f, d=0, dt=DT;
    this.quiet+=dt;
    var m=function(x){ return x===true?1:(+x||0); };
    if(f.run){ d+=2*m(f.run); this.quiet=Math.min(this.quiet,1.5); }
    if(f.light) d+=1*m(f.light);
    if(f.dark) d+=3/5*m(f.dark);
    if(f.look&&this.retreat<=0) d+=15/3*m(f.look);
    if(f.safeLight&&!f.run) d-=1*m(f.safeLight);
    if(f.silence&&!f.run&&this.quiet>3) d-=5/10*m(f.silence);
    if(f.safe) d-=3*m(f.safe);
    if(this.retreat>0){ d-=0.8; this.retreat-=dt; if(this.retreat<=0) this.say("Zinnia is back, watching from afar"); }
    this.fi=Math.max(0,Math.min(100,this.fi+d*dt));
    if(this.fi>=75&&this.retreat<=0) this.panicT+=dt; else this.panicT=Math.max(0,this.panicT-dt);
    if(this.retreat<=0&&(this.panicT>=4||this.fi>=100)){ this.rushes++; this.retreat=25; this.panicT=0; this.say("Zinnia rushes you (non-lethal) and retreats for ~25s"); this.rushFlash=1; }
    this.t+=dt;
    while(this.t>=this.nextSample){ this.series.push([this.nextSample,Math.round(this.fi*10)/10]); this.nextSample++; }
  };

  /* ---- scripted archetypes: what each kind of player tends to do ---- */
  function ph(t,arr){ for(var i=0;i<arr.length;i++) if(t<arr[i][0]) return arr[i][1]; return arr[arr.length-1][1]; }
  var PRESETS={
    careful:{ label:"Careful", color:"#f0a63a", flags:function(t){ return ph(t,[[25,{dark:.27}],[50,{dark:.87}],[75,{dark:1,light:.12}],[100,{dark:1,light:.2}],[999,{dark:1,light:.05}]]); }, events:[] },
    between:{ label:"In-between", color:"#c98a6a", flags:function(t){ return ph(t,[[25,{dark:.73}],[50,{dark:1,light:.1}],[75,{dark:1,light:.3,run:.05}],[100,{dark:1,light:.4,run:.22}],[999,{safeLight:1,silence:.6}]]); }, events:[[100,"hide"]] },
    reckless:{ label:"Reckless", color:"#c23b4a", flags:function(t){ return ph(t,[[25,{run:.8}],[40,{run:.5}],[59,{run:1}],[80,{safe:1}],[100,{run:.6}],[999,{run:.75}]]); }, events:[[50,"noise"]] }
  };
  function runPreset(name,sim){
    var p=PRESETS[name]; sim=sim||new Sim(); var ei=0, ev=p.events.slice();
    while(sim.t<120){ sim.f=p.flags(sim.t); while(ev.length&&ev[0][0]<=sim.t){ var e=ev.shift(); if(e[1]==="noise") sim.noise(); else if(e[1]==="hide") sim.hide(); } sim.step(); }
    return sim.series;
  }
  window.FISim={Sim:Sim,runPreset:runPreset,PRESETS:PRESETS};

  /* ---------- UI ---------- */
  var root=$("#fiSim"); if(!root) return;
  var sim=new Sim(), speed=1, preset=null, presetEv=[], ghosts={};
  var gauge=$("#fiMarker"), num=$("#fiNum"), stName=$("#fiState"), zTxt=$("#fiZ"), envTxt=$("#fiEnv"), audTxt=$("#fiAud"), logEl=$("#fiLog"), note=$("#fiNote");
  var flagBtns=$$("[data-flag]",root), instBtns=$$("[data-inst]",root);

  function setFlag(k,on){ sim.f[k]=on; flagBtns.forEach(function(b){ if(b.dataset.flag===k) b.classList.toggle("is-on",!!on); }); }
  flagBtns.forEach(function(b){ b.addEventListener("click",function(){ if(preset) return; setFlag(b.dataset.flag,!sim.f[b.dataset.flag]); }); });
  instBtns.forEach(function(b){ b.addEventListener("click",function(){ if(preset) return; var k=b.dataset.inst; if(k==="noise") sim.noise(); else if(k==="artifact") sim.artifact(); else if(k==="hide") sim.hide(); }); });
  $("#fiReset").addEventListener("click",function(){ stopPreset(); sim.reset(); flagBtns.forEach(function(b){b.classList.remove("is-on")}); drawChart(); });
  $$("[data-preset]",root).forEach(function(b){ b.addEventListener("click",function(){ startPreset(b.dataset.preset); }); });
  $("#fiAll").addEventListener("click",function(){ ["careful","between","reckless"].forEach(function(n){ ghosts[n]=runPreset(n); }); stopPreset(); sim.reset(); note.textContent="All three archetypes, simulated with the rules above. Compare the shapes."; drawChart(); });

  function startPreset(n){ sim.reset(); preset=n; presetEv=PRESETS[n].events.slice(); speed=8; flagBtns.forEach(function(b){b.classList.remove("is-on")}); root.classList.add("running");
    $$("[data-preset]",root).forEach(function(b){b.classList.toggle("is-on",b.dataset.preset===n)}); note.textContent="Simulating a "+PRESETS[n].label.toLowerCase()+" player over 120 seconds (8x speed)…"; }
  function stopPreset(){ if(preset&&sim.t>=120) ghosts[preset]=sim.series.slice(); preset=null; speed=1; root.classList.remove("running"); $$("[data-preset]",root).forEach(function(b){b.classList.remove("is-on")}); }

  /* ---- chart ---- */
  var cc=$("#fiChart"), cg=cc.getContext("2d");
  function drawChart(){
    var W=cc.width,H=cc.height,pl=34,pb=20,pt=8,pr=8,iw=W-pl-pr,ih=H-pt-pb; cg.clearRect(0,0,W,H);
    var zones=[["#2c6a5e",0,25],["#6a5a2a",25,50],["#7a3f2a",50,75],["#7a1f3a",75,100]];
    zones.forEach(function(z){ cg.fillStyle=z[0]; cg.globalAlpha=.22; cg.fillRect(pl,pt+ih*(1-z[2]/100),iw,ih*(z[2]-z[1])/100); }); cg.globalAlpha=1;
    cg.strokeStyle="rgba(255,255,255,.2)"; cg.fillStyle="#9a8fb0"; cg.font="10px monospace"; cg.lineWidth=1;
    [0,25,50,75,100].forEach(function(v){ var y=pt+ih*(1-v/100); cg.beginPath(); cg.moveTo(pl,y); cg.lineTo(W-pr,y); cg.stroke(); cg.fillText(v,6,y+3); });
    [0,30,60,90,120].forEach(function(v){ var x=pl+iw*v/120; cg.fillText(v+"s",x-8,H-5); });
    function line(s,c,w,a){ if(!s||s.length<2) return; cg.strokeStyle=c; cg.lineWidth=w; cg.globalAlpha=a; cg.beginPath(); s.forEach(function(p,i){ var x=pl+iw*Math.min(120,p[0])/120,y=pt+ih*(1-p[1]/100); i?cg.lineTo(x,y):cg.moveTo(x,y); }); cg.stroke(); cg.globalAlpha=1; }
    Object.keys(ghosts).forEach(function(k){ line(ghosts[k],PRESETS[k].color,2,preset===k?.35:1); });
    line(sim.series,preset?PRESETS[preset].color:"#ff7ac6",3,1);
    var lx=pl+iw*Math.min(120,sim.t)/120, ly=pt+ih*(1-sim.fi/100); cg.fillStyle="#fff"; cg.fillRect(lx-3,ly-3,6,6);
    var lg=$("#fiLegend"); if(lg&&!lg.dataset.done){ lg.dataset.done=1; lg.innerHTML=Object.keys(PRESETS).map(function(k){ return '<span><i style="background:'+PRESETS[k].color+'"></i>'+PRESETS[k].label+'</span>'; }).join(""); }
  }

  /* ---- Zinnia stage ---- */
  var sc=$("#fiStage"), sg=sc.getContext("2d"), tAnim=0;
  function stage(dt){
    tAnim+=dt; var W=sc.width,H=sc.height, st=stateOf(sim.fi), ret=sim.retreat>0;
    sg.fillStyle="#07040c"; sg.fillRect(0,0,W,H);
    var dim=1; if(st===1&&Math.random()<.05) dim=.6; if(st===3&&Math.random()<.3) dim=.25+Math.random()*.5; if(sim.rushFlash>0){ dim=1.6; sim.rushFlash-=dt*2; }
    /* corridor */
    sg.fillStyle="rgba(70,50,95,"+(.9*Math.min(1,dim))+")"; sg.beginPath(); sg.moveTo(0,0); sg.lineTo(W*.32,H*.28); sg.lineTo(W*.32,H*.78); sg.lineTo(0,H); sg.fill();
    sg.beginPath(); sg.moveTo(W,0); sg.lineTo(W*.68,H*.28); sg.lineTo(W*.68,H*.78); sg.lineTo(W,H); sg.fill();
    sg.fillStyle="rgba(40,28,60,"+Math.min(1,dim)+")"; sg.beginPath(); sg.moveTo(0,H); sg.lineTo(W*.32,H*.78); sg.lineTo(W*.68,H*.78); sg.lineTo(W,H); sg.fill();
    sg.fillStyle="rgba(10,6,18,1)"; sg.fillRect(W*.32,H*.28,W*.36,H*.5);
    /* gate arch */
    sg.strokeStyle="rgba(120,230,215,"+(.8*Math.min(1,dim))+")"; sg.lineWidth=3; sg.strokeRect(W*.4,H*.34,W*.2,H*.44); sg.fillStyle="rgba(120,230,215,.8)"; sg.font="bold 12px monospace"; sg.fillText("23",W*.49,H*.31);
    if(st===2){ sg.fillStyle="rgba(0,0,0,.5)"; for(var i=0;i<3;i++){ var sx=(Math.sin(tAnim*.8+i*2.1)*.5+.5)*W; sg.fillRect(sx,H*.3,26,H*.55); } }
    /* Zinnia: position/size by state */
    var cfg=[{x:.9,y:.7,s:.35,a:.55},{x:.78,y:.7,s:.55,a:.7},{x:.5,y:.68,s:.8,a:.95},{x:.5,y:.8,s:1.5,a:1}][st];
    var tx=cfg.x*W+Math.sin(tAnim*(st===3?9:1.3))*(st===3?4:2), ty=cfg.y*H+Math.sin(tAnim*2)*2, s=cfg.s, a=cfg.a;
    if(ret){ a*=.35; tx=W*1.05; }
    drawZinnia(sg,tx,ty,s,a,st>=2&&!ret,st===1);
    /* retreat label */
    if(ret){ sg.fillStyle="#9fe8dc"; sg.font="11px monospace"; sg.fillText("zinnia retreats ("+Math.ceil(sim.retreat)+"s)",8,H-8); }
    /* scanline vignette */
    sg.fillStyle="rgba(0,0,0,.18)"; for(var y=0;y<H;y+=3) sg.fillRect(0,y,W,1);
  }
  function drawZinnia(g,x,y,s,a,glow,silhouette){
    g.save(); g.translate(x,y); g.scale(s,s); g.globalAlpha=a;
    var body=silhouette?"#2a1a33":"#e66dbb";
    g.fillStyle=body; g.beginPath(); g.ellipse(0,-20,34,18,0,0,7); g.fill();
    g.fillStyle=silhouette?"#2a1a33":"#ff9bd6"; g.beginPath(); g.moveTo(-10,-34); g.lineTo(0,-62); g.lineTo(10,-34); g.fill(); g.beginPath(); g.moveTo(8,-36); g.lineTo(26,-58); g.lineTo(26,-30); g.fill(); /* fins */
    g.strokeStyle=body; g.lineWidth=4; g.lineCap="round";
    for(var i=0;i<4;i++){ g.beginPath(); var bx=-26+i*10; g.moveTo(bx,-8); g.quadraticCurveTo(bx+Math.sin(tAnim*3+i)*8,10,bx-8+Math.sin(tAnim*2+i)*10,28); g.stroke(); }
    if(!silhouette){ g.fillStyle="#7af7e4"; g.shadowColor="#4de8d2"; g.shadowBlur=glow?18:4; g.beginPath(); g.arc(14,-24,5,0,7); g.arc(28,-22,4,0,7); g.fill(); g.shadowBlur=0; }
    g.restore();
  }

  /* ---- main loop ---- */
  var last=performance.now(), acc=0;
  function ui(){
    var st=stateOf(sim.fi), S=STATES[st];
    num.textContent=Math.round(sim.fi); gauge.style.left=sim.fi+"%"; stName.textContent=S.name; root.dataset.state=st;
    zTxt.textContent=sim.retreat>0?"Retreating. Watching from far away.":S.z; envTxt.textContent=S.env; audTxt.textContent=S.aud;
    logEl.innerHTML=sim.log.map(function(l){return "<li>"+l.replace(/</g,"&lt;")+"</li>"}).join("");
    $$("#fiTable tbody tr").forEach(function(r,i){ r.classList.toggle("cur",i===st); });
  }
  function frame(now){
    var dt=Math.min(.1,(now-last)/1000); last=now; acc+=dt*speed;
    while(acc>=DT){ acc-=DT;
      if(preset){ var p=PRESETS[preset]; sim.f=p.flags(sim.t); while(presetEv.length&&presetEv[0][0]<=sim.t){ var e=presetEv.shift(); if(e[1]==="noise") sim.noise(); else sim.hide(); }
        if(sim.t>=120){ var nm=preset; ghosts[nm]=sim.series.slice(); note.textContent=PRESETS[nm].label+" run finished. Final Fear Index "+Math.round(sim.fi)+". Run another, or press Reset to play it yourself."; preset=null; speed=1; root.classList.remove("running"); $$("[data-preset]",root).forEach(function(b){b.classList.remove("is-on")}); drawChart(); break; } }
      sim.step(); }
    ui(); stage(dt); if(!frame.c||++frame.c%3===0) drawChart(); frame.c=(frame.c||0);
    requestAnimationFrame(frame);
  }
  drawChart(); requestAnimationFrame(frame);
})();
