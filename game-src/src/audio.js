// Procedural WebAudio — no asset files needed
let ctx=null, master=null, drone=null, noiseBuf=null, muted=false, voiceOn=true;
export const audio = {
  init(){
    if(ctx) { if(ctx.state==='suspended') ctx.resume(); return; }
    try{
      ctx=new (window.AudioContext||window.webkitAudioContext)();
      master=ctx.createGain(); master.gain.value=muted?0:0.8; master.connect(ctx.destination);
      noiseBuf=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);
      const d=noiseBuf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
      // drone
      const g=ctx.createGain(); g.gain.value=0.0;
      const f=ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=180;
      const o1=ctx.createOscillator(); o1.type='sawtooth'; o1.frequency.value=41;
      const o2=ctx.createOscillator(); o2.type='sine'; o2.frequency.value=55.7;
      const o3=ctx.createOscillator(); o3.type='triangle'; o3.frequency.value=82.3;
      const og=ctx.createGain(); og.gain.value=0.0; // dissonance layer
      o1.connect(f); o2.connect(f); o3.connect(og); og.connect(f); f.connect(g); g.connect(master);
      o1.start(); o2.start(); o3.start();
      drone={g,f,og,o3};
    }catch(e){ ctx=null; }
  },
  setMuted(m){ muted=m; if(master) master.gain.value=m?0:0.8; },
  setVoice(v){ voiceOn=v; },
  tension(t){ if(!drone) return; const n=ctx.currentTime;
    drone.g.gain.setTargetAtTime(0.05+t*0.16,n,0.8);
    drone.f.frequency.setTargetAtTime(150+t*420,n,0.8);
    drone.og.gain.setTargetAtTime(Math.max(0,t-0.4)*0.6,n,0.8);
    drone.o3.frequency.setTargetAtTime(82.3+t*9,n,1.5); },
  _noise(dur,type,f0,f1,vol,pan=0,q=1){
    if(!ctx) return; const n=ctx.currentTime;
    const s=ctx.createBufferSource(); s.buffer=noiseBuf; s.loop=true;
    const f=ctx.createBiquadFilter(); f.type=type; f.Q.value=q; f.frequency.setValueAtTime(f0,n); f.frequency.exponentialRampToValueAtTime(Math.max(20,f1),n+dur);
    const g=ctx.createGain(); g.gain.setValueAtTime(0,n); g.gain.linearRampToValueAtTime(vol,n+Math.min(0.06,dur/4)); g.gain.exponentialRampToValueAtTime(0.0008,n+dur);
    let last=g; if(ctx.createStereoPanner){ const p=ctx.createStereoPanner(); p.pan.value=Math.max(-1,Math.min(1,pan)); g.connect(p); last=p; }
    s.connect(f); f.connect(g); last.connect(master); s.start(n,Math.random()); s.stop(n+dur+0.05);
  },
  _tone(freq,dur,type,vol,pan=0,slide=0){
    if(!ctx) return; const n=ctx.currentTime; const o=ctx.createOscillator(); o.type=type; o.frequency.setValueAtTime(freq,n);
    if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(20,freq*slide),n+dur);
    const g=ctx.createGain(); g.gain.setValueAtTime(vol,n); g.gain.exponentialRampToValueAtTime(0.0008,n+dur);
    let last=g; if(ctx.createStereoPanner){ const p=ctx.createStereoPanner(); p.pan.value=pan; g.connect(p); last=p; }
    o.connect(g); last.connect(master); o.start(n); o.stop(n+dur+0.05);
  },
  step(vol=0.2,pan=0){ this._noise(0.12,'lowpass',500,120,vol,pan,0.7); },
  heavyStep(vol=0.5,pan=0){ this._noise(0.28,'lowpass',260,50,vol,pan,0.9); this._tone(55,0.25,'sine',vol*0.8,pan,0.6); },
  scrape(vol=0.3,pan=0){ this._noise(1.6,'bandpass',900,2600,vol,pan,4); },
  click(){ this._tone(900,0.05,'square',0.05); },
  beep(ok=true){ this._tone(ok?660:180,0.12,'square',0.07); if(ok) setTimeout(()=>this._tone(990,0.14,'square',0.07),110); },
  unlock(){ this._tone(220,0.25,'sawtooth',0.07,0,0.5); setTimeout(()=>this._noise(0.5,'lowpass',300,80,0.25),150); },
  thud(vol=0.4,pan=0){ this._noise(0.4,'lowpass',200,40,vol,pan,1); this._tone(48,0.4,'sine',vol,pan,0.5); },
  creak(vol=0.12,pan=0){ this._tone(180,0.9,'sawtooth',vol,pan,0.55); },
  static_(vol=0.12,dur=0.6){ this._noise(dur,'highpass',2000,6000,vol,0,0.5); },
  sting(){ this._noise(0.9,'bandpass',3000,300,0.5,0,1); this._tone(110,0.9,'sawtooth',0.3,0,0.3); this._tone(117,0.9,'sawtooth',0.3,0,0.3); this.thud(0.6); },
  heartbeat(vol=0.35){ this._tone(62,0.16,'sine',vol,0,0.6); setTimeout(()=>this._tone(55,0.2,'sine',vol*0.8,0,0.6),170); },
  snap(){ this._noise(0.08,'highpass',3000,5000,0.8); this._tone(300,0.12,'square',0.3,0,0.2); },
  voice(text,pitch=0.2,rate=0.65){
    if(!voiceOn||muted) return;
    try{ const s=window.speechSynthesis; if(!s) return; s.cancel(); const u=new SpeechSynthesisUtterance(text); u.pitch=pitch; u.rate=rate; u.volume=0.9; s.speak(u);}catch(e){}
  },
};
