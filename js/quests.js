/* Horror Quests page: scroll "reality" shift, PS1 pixelation, flip posters, lantern + breath demos */
(function(){
  "use strict";
  var $=function(s,r){return (r||document).querySelector(s)};
  var $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
  var reduce=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- warm hall -> cold reality as you scroll ---------- */
  var root=document.documentElement, ticking=false;
  function setReal(){
    var max=Math.max(1,document.documentElement.scrollHeight-innerHeight);
    var p=Math.min(1,Math.max(0,scrollY/max));
    root.style.setProperty("--real",(Math.min(1,p*1.25)).toFixed(3));
    ticking=false;
  }
  addEventListener("scroll",function(){ if(!ticking){ticking=true;requestAnimationFrame(setReal);} },{passive:true});
  addEventListener("resize",setReal); setReal();

  /* ---------- reveal on scroll ---------- */
  var rv=$$(".reveal");
  if("IntersectionObserver" in window){
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target);}})},{threshold:.12});
    rv.forEach(function(el){io.observe(el)});
  } else rv.forEach(function(el){el.classList.add("in")});

  /* ---------- PS1 pixelation (low-res canvas + 15-bit colour) ---------- */
  var ps1On=true, pixed=[];
  function pixelate(img){
    if(!img.naturalWidth) return;
    var w=Math.min(256,img.naturalWidth), h=Math.round(w*img.naturalHeight/img.naturalWidth);
    var c=document.createElement("canvas"); c.width=w; c.height=h; c.className="ps1c"+(img.classList.contains("zoomable")?" zoomable":"");
    c.dataset.full=img.currentSrc||img.src; c.setAttribute("role","img"); c.setAttribute("aria-label",img.alt||"");
    var g=c.getContext("2d"); g.imageSmoothingEnabled=true; g.drawImage(img,0,0,w,h);
    try{ var d=g.getImageData(0,0,w,h), a=d.data; for(var i=0;i<a.length;i+=4){a[i]&=0xF8;a[i+1]&=0xF8;a[i+2]&=0xF8;} g.putImageData(d,0,0); }catch(e){}
    img.parentNode.insertBefore(c,img.nextSibling); pixed.push({img:img,c:c}); apply(pixed[pixed.length-1]);
  }
  function apply(p){ p.img.style.display=ps1On?"none":""; p.c.style.display=ps1On?"":"none"; }
  function setPS1(on){ ps1On=on; pixed.forEach(apply); var b=$("#resToggle"); if(b){b.setAttribute("aria-pressed",on);b.textContent="PS1 look: "+(on?"ON":"OFF");} }
  $$("img.ps1").forEach(function(img){ if(img.complete) pixelate(img); else img.addEventListener("load",function(){pixelate(img)},{once:true}); });
  var rt=$("#resToggle"); if(rt) rt.addEventListener("click",function(){setPS1(!ps1On)});

  /* ---------- hero: guild hall <-> the quest ---------- */
  var shot=$("#heroShot"), ht=$("#heroToggle");
  if(shot&&ht){
    ht.addEventListener("click",function(){
      var quest=shot.dataset.mode!=="quest"; shot.dataset.mode=quest?"quest":"hall";
      ht.setAttribute("aria-pressed",quest); ht.textContent=quest?"◂ Return to the guild hall":"Embark on the quest ▸";
      $("#heroCap").textContent=quest?"The quest. It is worse than the paper said, and the light is going.":"The guild hall. Warm. Safe. She is smiling, and the board is full of work.";
      $("#heroHud").textContent=quest?"UNSAFE":"SAFE";
      $(".hud.tl",shot).textContent=quest?"THE FIELD":"GUILD HALL";
    });
  }

  /* ---------- posters flip ---------- */
  $$(".poster").forEach(function(p){
    function flip(){ var on=p.classList.toggle("flipped"); p.setAttribute("aria-pressed",on); }
    p.addEventListener("click",flip);
    p.addEventListener("keydown",function(e){ if(e.key==="Enter"||e.key===" "){e.preventDefault();flip();} });
  });

  /* ---------- lightbox ---------- */
  var lb=$("#lightbox"), lbi=lb&&$("img",lb);
  document.addEventListener("click",function(e){
    var z=e.target.closest&&e.target.closest(".zoomable");
    if(z&&lb){ lbi.src=z.dataset.full||z.currentSrc||z.src; lbi.alt=z.getAttribute("alt")||z.getAttribute("aria-label")||""; lb.hidden=false; }
    else if(lb&&!lb.hidden&&e.target.closest("#lightbox")){ lb.hidden=true; }
  });
  addEventListener("keydown",function(e){ if(e.key==="Escape"&&lb&&!lb.hidden) lb.hidden=true; });

  /* ---------- PDF fallback ---------- */
  var pdf=$("#pdf-frame");
  if(pdf) pdf.addEventListener("error",function(){
    pdf.outerHTML='<div class="pdf-fallback"><p>Couldn\'t load the PDF preview. You can still open it:</p><a class="btn btn-primary" href="../Documents/ND_HorrorQuestlineDesign.pdf" target="_blank" rel="noopener">Open PDF</a></div>';
  });

  /* ---------- Lantern demo ---------- */
  (function(){
    var cv=$("#lanternCanvas"); if(!cv) return; var g=cv.getContext("2d");
    var W=cv.width,H=cv.height, oil=100, flame=2, over=$("#lanternOver");
    var RATE={1:.9,2:1.9,3:4.2}, RAD={1:34,2:62,3:98};
    var trees=[[30,120,34],[84,90,26],[210,100,38],[270,140,30],[150,60,22],[300,70,28]];
    function scene(){
      g.fillStyle="#0e1a12"; g.fillRect(0,0,W,H);
      g.fillStyle="#2a2a22"; g.beginPath(); g.moveTo(130,H); g.lineTo(190,H); g.lineTo(168,70); g.lineTo(152,70); g.fill();
      g.fillStyle="#08100a"; trees.forEach(function(t){ g.beginPath(); g.moveTo(t[0],t[1]-t[2]); g.lineTo(t[0]-t[2]/2,t[1]); g.lineTo(t[0]+t[2]/2,t[1]); g.fill(); g.fillRect(t[0]-2,t[1],4,10); });
      g.fillStyle="#d6d6c4"; g.fillRect(276,58,6,18); g.fillStyle="#000"; g.fillRect(277,62,1,1); g.fillRect(280,62,1,1); /* something out there */
      g.fillStyle="#c9b88a"; g.fillRect(155,170,10,8); /* oil flask */
    }
    var last=performance.now(), acc=0;
    function tick(now){
      var dt=Math.min(.1,(now-last)/1000); last=now;
      if(oil>0){ oil=Math.max(0,oil-RATE[flame]*dt); }
      var f=oil/100, r=oil>0?(RAD[flame]*(.35+.65*f)+(Math.random()*2.5)):0;
      scene();
      var grad=g.createRadialGradient(160,118,0,160,118,Math.max(1,r));
      grad.addColorStop(0,"rgba(0,0,0,0)"); grad.addColorStop(.55,"rgba(0,0,0,.25)"); grad.addColorStop(1,"rgba(0,0,0,.985)");
      g.fillStyle=oil>0?grad:"#000"; g.fillRect(0,0,W,H);
      if(oil>0){ g.fillStyle="#ffcf6a"; g.fillRect(158,116,4,6); }
      var pct=Math.round(oil);
      $("#oilFill").style.width=pct+"%"; $("#oilTxt").textContent=pct+"%";
      $("#oilFill").style.background=pct<25?"#c0392b":"#ffb23e";
      over.hidden=oil>0;
      acc+=dt; if(acc>.3){ acc=0; var secs=Math.round(oil/RATE[flame]);
        $("#lanternRead").textContent=oil>0?("At this flame, about "+secs+"s of light left. "+(flame===3?"You can see far, but not for long.":flame===1?"You see almost nothing, but you will last.":"A fair trade between seeing and surviving.")):"Out of oil. Whatever was waiting just outside the light is no longer outside."; }
      requestAnimationFrame(tick);
    }
    $$("[data-flame]",$("#lanternDemo")).forEach(function(b){ b.addEventListener("click",function(){ flame=+b.dataset.flame; $$("[data-flame]",$("#lanternDemo")).forEach(function(x){x.classList.toggle("is-on",x===b)}); }); });
    $("#oilReset").addEventListener("click",function(){oil=100});
    requestAnimationFrame(tick);
  })();

  /* ---------- Breath demo ---------- */
  (function(){
    var btn=$("#holdBtn"); if(!btn) return;
    var breath=100, hear=0, holding=false, heldFor=0, reset=0, caught=false;
    var ring=$("#noiseRing"), eye=$("#itEye"), read=$("#breathRead");
    function down(){ if(caught) return; holding=true; heldFor=0; btn.classList.add("is-on"); }
    function up(){ if(!holding) return; holding=false; btn.classList.remove("is-on"); if(heldFor>.8){ hear=Math.min(100,hear+Math.min(34,heldFor*7)); read.textContent="You let go and gasp. The longer you held, the louder."; } }
    btn.addEventListener("pointerdown",function(e){e.preventDefault();down()});
    ["pointerup","pointerleave","pointercancel"].forEach(function(ev){btn.addEventListener(ev,up)});
    btn.addEventListener("keydown",function(e){ if((e.key===" "||e.key==="Enter")&&!e.repeat){e.preventDefault();down();} });
    btn.addEventListener("keyup",function(e){ if(e.key===" "||e.key==="Enter"){e.preventDefault();up();} });
    var last=performance.now();
    function tick(now){
      var dt=Math.min(.1,(now-last)/1000); last=now;
      if(caught){ reset-=dt; if(reset<=0){ caught=false; hear=0; breath=100; eye.classList.remove("alert"); read.textContent="It lost interest. For now. Try again."; } }
      else if(holding){ heldFor+=dt; breath=Math.max(0,breath-100/6*dt); hear=Math.max(0,hear-26*dt);
        if(breath<=0){ holding=false; btn.classList.remove("is-on"); hear=Math.min(100,hear+48); read.textContent="Your lungs give out. You gasp, and it heard."; } else read.textContent="Holding. You're silent, but your breath is running out."; }
      else { breath=Math.min(100,breath+34*dt); hear=hear<58?Math.min(58,hear+13*dt):Math.max(58,hear-6*dt); if(hear>=58&&!/gasp|lungs|lost/.test(read.textContent)) read.textContent="Breathing normally is noisy. It is listening."; }
      if(hear>=100&&!caught){ caught=true; reset=2.6; eye.classList.add("alert"); read.textContent="It turned around."; }
      $("#breathFill").style.width=Math.round(breath)+"%"; $("#breathTxt").textContent=Math.round(breath)+"%";
      $("#hearFill").style.width=Math.round(hear)+"%"; $("#hearTxt").textContent=Math.round(hear)+"%";
      var s=holding?.55:(1.05+hear/100*1.6); ring.style.transform="scale("+s.toFixed(2)+")"; ring.style.opacity=holding?.2:.5;
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  })();
})();
