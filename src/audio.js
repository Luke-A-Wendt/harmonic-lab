(function(){
  'use strict';const H=window.HL,T=H.T;
  class Engine{
    constructor(){this.context=null;this.master=null;this.analyser=null;this.micAnalyser=null;this.stream=null;this.active=new Set();this.volume=1;this.microphoneGeneration=0;this.analysisSettings={enabled:true,cutoff:70,hum:0};this.analysisChains=[];}
    async ensure(){
      if(!this.context){
        const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw new Error('Web Audio is not supported in this browser.');
        this.context=new AC();
        this.bus=this.context.createGain();this.analyser=this.context.createAnalyser();this.analyser.fftSize=8192;this.analyser.smoothingTimeConstant=.55;
        this.master=this.context.createGain();this.master.gain.value=this.volume;
        this.limiter=this.context.createDynamicsCompressor();this.limiter.threshold.value=-8;this.limiter.ratio.value=12;
        this.bus.connect(this.analyser);this.analyser.connect(this.master);this.master.connect(this.limiter);this.limiter.connect(this.context.destination);
        this.synthAnalysis=this.analysisChain(this.bus);this.tunerAnalyser=this.synthAnalysis.analyser;
      }
      if(this.context.state!=='running')await this.context.resume();return this.context;
    }
    analysisChain(source){
      const ctx=this.context,raw=ctx.createAnalyser();raw.fftSize=8192;raw.smoothingTimeConstant=.15;
      source.connect(raw);const qs=T.tuner.lowcutQ,filters=qs.map(q=>{const f=ctx.createBiquadFilter();f.type='highpass';f.Q.value=20*Math.log10(q);return f});
      const notch=ctx.createBiquadFilter();notch.Q.value=30;
      let last=raw;for(const f of [...filters,notch]){last.connect(f);last=f;}
      const analyser=ctx.createAnalyser();analyser.fftSize=8192;analyser.smoothingTimeConstant=.15;last.connect(analyser);
      const silent=ctx.createGain();silent.gain.value=0;analyser.connect(silent);silent.connect(ctx.destination);
      const chain={source,raw,filters,notch,analyser,silent};this.analysisChains.push(chain);this.configureAnalysis(this.analysisSettings);return chain;
    }
    configureAnalysis(settings){
      this.analysisSettings={...this.analysisSettings,...settings};if(!this.context)return;
      const {enabled,cutoff,hum}=this.analysisSettings,t=this.context.currentTime;
      for(const chain of this.analysisChains){
        chain.filters.forEach((f,i)=>{f.type=enabled?'highpass':'allpass';f.Q.value=enabled?20*Math.log10(T.tuner.lowcutQ[i]):1;f.frequency.setTargetAtTime(enabled?cutoff:0,t,.015);});
        chain.notch.type=hum?'notch':'allpass';chain.notch.frequency.value=hum||0;
      }
    }
    disposeChain(chain){if(!chain)return;try{chain.source.disconnect(chain.raw)}catch{};for(const node of [chain.raw,...chain.filters,chain.notch,chain.analyser,chain.silent])try{node.disconnect()}catch{};this.analysisChains=this.analysisChains.filter(c=>c!==chain);}
    setVolume(value){this.volume=Math.max(0,Math.min(1,Number(value)));if(this.master)this.master.gain.setTargetAtTime(this.volume,this.context.currentTime,.02);}
    schedule(ns,{when,duration=.9,timbre='sine',group='manual',strongSecond=false,sustain=false}={}) {
      if(!this.context) throw new Error('Audio has not been initialized.');
      const ctx=this.context, time=Math.max(ctx.currentTime,when??ctx.currentTime), voices=[];
      ns.forEach(n=>{
        const f=T.frequency(n); if(f<15||f>=ctx.sampleRate*.45) return;
        const osc=ctx.createOscillator(), gain=ctx.createGain(); osc.frequency.value=f;
        if(timbre==='pluck'||strongSecond) {
          const real=new Float32Array(17),imag=new Float32Array(17);
          for(let h=1;h<17;h++) if(h*f<ctx.sampleRate*.45) imag[h]=strongSecond?(h===1?.18:h===2?1:1/(h*h)):1/(h**1.45);
          osc.setPeriodicWave(ctx.createPeriodicWave(real,imag));
        } else osc.type='sine';
        const amp=.34/Math.max(1,Math.sqrt(ns.length)), d=Math.max(.08,duration), end=time+d;
        gain.gain.setValueAtTime(.00001,time);
        gain.gain.exponentialRampToValueAtTime(amp,time+.012);
        if(!sustain) gain.gain.exponentialRampToValueAtTime(.00001,end+.12);
        osc.connect(gain); gain.connect(this.bus);
        const entry={osc,gain,group,start:time,amp,sustain,released:false,end:sustain?Infinity:end+.15};
        this.active.add(entry);
        osc.onended=()=>{try{osc.disconnect();gain.disconnect();}catch{} this.active.delete(entry)};
        osc.start(time); if(!sustain) osc.stop(end+.15); voices.push(entry);
      });
      const manual=[...this.active].filter(v=>v.group==='manual');
      while(manual.length>36) {const v=manual.shift();try{v.osc.stop()}catch{}}
      return voices;
    }
    release(voices,{immediate=false}={}) {
      if(!this.context) return;
      const now=this.context.currentTime;
      for(const voice of voices) {
        if(voice.released||!this.active.has(voice)) continue;
        voice.released=true;
        // Brief taps still have a clear attack. A held note keeps a steady level until release.
        const at=immediate?now:Math.max(now,voice.start+.12);
        const param=voice.gain.gain;
        try {
          if(typeof param.cancelAndHoldAtTime==='function') param.cancelAndHoldAtTime(at);
          else {param.cancelScheduledValues(at);param.setValueAtTime(voice.sustain?voice.amp:Math.max(.00001,param.value),at);}
          param.setTargetAtTime(.00001,at,immediate?.006:.026);
          voice.end=at+(immediate?.04:.17);voice.osc.stop(voice.end);
        } catch {}
      }
    }
    async play(ns,options={}) {await this.ensure();return this.schedule(ns,options)}
    stop(group) {
      if(!this.context) return;
      const t=this.context.currentTime;
      for(const v of this.active) if(!group||v.group===group) {
        v.released=true;
        try {v.gain.gain.cancelScheduledValues(t);v.gain.gain.setTargetAtTime(.00001,t,.005);v.osc.stop(t+.035)} catch {}
      }
    }
    cancelMicRequest(){++this.microphoneGeneration;}
    async startMic(){
      const generation=++this.microphoneGeneration;await this.ensure();
      if(generation!==this.microphoneGeneration)return false;
      if(!navigator.mediaDevices?.getUserMedia)throw new Error('Microphone access requires HTTPS or localhost.');
      const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false},video:false});
      if(generation!==this.microphoneGeneration){stream.getTracks().forEach(t=>t.stop());return false;}
      if(this.stream)this.stream.getTracks().forEach(t=>t.stop());
      this.disposeChain(this.micAnalysis);this.stream=stream;this.micSource=this.context.createMediaStreamSource(stream);this.micAnalysis=this.analysisChain(this.micSource);this.micAnalyser=this.micAnalysis.analyser;return true;
    }
    stopMic(){++this.microphoneGeneration;if(this.stream)this.stream.getTracks().forEach(t=>t.stop());this.stream=null;this.disposeChain(this.micAnalysis);this.micAnalysis=null;this.micSource?.disconnect();this.micSource=null;this.micAnalyser=null;}
  }
  H.audio=new Engine();
})();
