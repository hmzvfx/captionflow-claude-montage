import fs from 'node:fs/promises';
import path from 'node:path';
import { ensureDir, run, probe } from './util.js';
import { assemble } from './assemble.js';
import { routePlan, deriveVideoPrompt } from './worker.js';

function assert(condition,message){ if(!condition)throw new Error(message); }
function routerTests(){
  const cfg={DEFAULT_RESOLUTION:'720p',DEFAULT_VEO_DURATION:4,VEO_LITE_MODEL:'lite',VEO_FAST_MODEL:'fast',VEO_STANDARD_MODEL:'standard'};
  const plan={'Generation mode':'AUTO','Model target':'AUTO',Resolution:'720p','Generation duration':'AUTO','Script ID':'T','Scène':1,Plan:1,'Prompt Nano Banana Pro':'A studio close-up','Action / Composition':'subject turns to camera','Angle caméra':'medium close-up',Focale:'50mm','Continuité à verrouiller':'same wardrobe','Transition vidéo prévue':'hard cut'};
  let r=routePlan(plan,[],cfg); assert(r.mode==='T2V'&&r.model==='VEO_LITE'&&r.duration===4,'T2V route failed');
  const first={Role:'FIRST_FRAME',URL:'/first.png'}; r=routePlan(plan,[first],cfg); assert(r.mode==='I2V'&&r.model==='VEO_LITE','I2V route failed');
  const last={Role:'LAST_FRAME',URL:'/last.png'}; r=routePlan(plan,[first,last],cfg); assert(r.mode==='INTERPOLATION','interpolation route failed');
  const ref={Role:'CHARACTER_REFERENCE',URL:'/ref.png'}; r=routePlan(plan,[ref],cfg); assert(r.mode==='REF'&&r.model==='VEO_FAST'&&r.duration===8,'reference route failed');
  const ext={Role:'EXTEND_SOURCE',URL:'/clip.mp4'}; r=routePlan({...plan,Resolution:'1080p'},[ext],cfg); assert(r.mode==='EXTEND'&&r.model==='VEO_FAST'&&r.resolution==='720p'&&r.duration===8,'extension route failed');
  const prompt=deriveVideoPrompt(plan); assert(prompt.includes('VIDEO MOTION:')&&prompt.includes('CAMERA:'),'prompt derivation failed');
}

async function main(){
  routerTests();
  const root=await ensureDir('/tmp/captionflow-self-test'); process.env.MEDIA_ROOT=root; process.env.PUBLIC_MEDIA_BASE_URL='';
  const a=path.join(root,'a.mp4'),b=path.join(root,'b.mp4'),m=path.join(root,'music.wav');
  await run('ffmpeg',['-y','-f','lavfi','-i','color=c=black:s=720x1280:r=24:d=1.5','-f','lavfi','-i','sine=frequency=440:duration=1.5','-shortest','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac',a]);
  await run('ffmpeg',['-y','-f','lavfi','-i','color=c=gray:s=720x1280:r=24:d=1.5','-f','lavfi','-i','sine=frequency=550:duration=1.5','-shortest','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac',b]);
  await run('ffmpeg',['-y','-f','lavfi','-i','sine=frequency=160:duration=4',m]);
  const out=await assemble('SELFTEST',[{'Source URL':a,'Trim in':0,'Trim out':1.2,Speed:1,'Overlay text':'CAPTIONFLOW','Audio gain dB':-2,'Music cue':m,'SFX':m},{'Source URL':b,'Trim in':0.1,'Trim out':1.3,Speed:1.1,'Overlay text':'READY','Audio gain dB':-2,'Music cue':''}],{width:1080,height:1920,fps:30});
  const p=await probe(out.master); const video=p.streams?.find(s=>s.codec_type==='video');
  assert(video?.width===1080&&video?.height===1920,`Bad output ${video?.width}x${video?.height}`);
  await fs.access(out.thumb);
  console.log(JSON.stringify({ok:true,router:true,master:out.master,thumbnail:out.thumb,duration:p.format?.duration},null,2));
}
main().catch(e=>{console.error(e);process.exit(1)});
