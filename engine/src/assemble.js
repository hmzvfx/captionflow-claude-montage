import fs from 'node:fs/promises';
import path from 'node:path';
import { ensureDir, run, escDrawtext, fetchBytes, mediaRoot, safe, num, probe } from './util.js';

async function localize(src,dir,name){
  if(!src)return null;
  if(src.startsWith('/') || src.startsWith('file://'))return src.replace(/^file:\/\//,'');
  const b=await fetchBytes(src); const p=path.join(dir,name); await fs.writeFile(p,b); return p;
}
function atempo(speed){ const parts=[]; let s=speed; while(s>2){parts.push('atempo=2');s/=2} while(s<0.5){parts.push('atempo=0.5');s/=0.5} parts.push(`atempo=${s.toFixed(4)}`); return parts.join(','); }
function expectedDuration(timeline){ return timeline.reduce((sum,r)=>{ const a=num(r['Trim in'],0), b=num(r['Trim out'],0), speed=Math.max(0.25,Math.min(4,num(r.Speed,1))); return sum + Math.max(0,b-a)/speed; },0); }

export async function assemble(scriptId,timeline,{width=1080,height=1920,fps=30}){
  const dir=await ensureDir(path.join(mediaRoot(),safe(scriptId),'renders'));
  const work=await ensureDir(path.join(dir,`work-${Date.now()}`));
  const normalized=[];
  try{
    for(let i=0;i<timeline.length;i++){
      const r=timeline[i];
      const src=await localize(r['Source URL'],work,`src-${i}.mp4`);
      if(!src)throw new Error(`Timeline row ${i+1} missing Source URL`);
      const out=path.join(work,`shot-${String(i).padStart(3,'0')}.mp4`);
      const trimIn=Math.max(0,num(r['Trim in'],0));
      const trimOut=Math.max(trimIn,num(r['Trim out'],0));
      const sourceDuration=Math.max(0.04,trimOut-trimIn);
      const speed=Math.max(0.25,Math.min(4,num(r.Speed,1)));
      const gain=num(r['Audio gain dB'],0);
      if(!(trimOut>trimIn))throw new Error(`Timeline row ${i+1} has invalid trim ${r['Trim in']}→${r['Trim out']}`);

      const vf=[
        `trim=start=${trimIn}:duration=${sourceDuration}`,
        'setpts=PTS-STARTPTS',
        `scale=${width}:${height}:force_original_aspect_ratio=increase`,
        `crop=${width}:${height}`,
        `fps=${fps}`,
        `setpts=PTS/${speed}`
      ];
      const text=String(r['Overlay text']||'').trim();
      if(text)vf.push(`drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='${escDrawtext(text)}':fontcolor=white:fontsize=64:borderw=4:bordercolor=black@0.65:x=(w-text_w)/2:y=h*0.80`);
      const af=`atrim=start=${trimIn}:duration=${sourceDuration},asetpts=PTS-STARTPTS,${atempo(speed)},volume=${gain}dB`;
      const sfxCue=String(r.SFX||'').trim();
      const args=['-y','-i',src];
      if(sfxCue){
        const sfx=await localize(sfxCue,work,`sfx-${i}.bin`);
        args.push('-i',sfx,'-filter_complex',`[0:v]${vf.join(',')}[v];[0:a]${af}[a0];[1:a]volume=0.85[a1];[a0][a1]amix=inputs=2:duration=first:dropout_transition=0[a]`,'-map','[v]','-map','[a]');
      } else {
        args.push('-filter_complex',`[0:v]${vf.join(',')}[v];[0:a]${af}[a]`,'-map','[v]','-map','[a]');
      }
      args.push('-c:v','libx264','-preset','veryfast','-crf','18','-c:a','aac','-ar','48000','-ac','2','-movflags','+faststart',out);
      await run('ffmpeg',args);
      normalized.push(out);
    }

    const list=path.join(work,'concat.txt');
    await fs.writeFile(list,normalized.map(p=>`file '${p.replace(/'/g,"'\\''")}'`).join('\n'));
    const bare=path.join(work,'bare.mp4');
    await run('ffmpeg',['-y','-fflags','+genpts','-f','concat','-safe','0','-i',list,'-c:v','libx264','-preset','veryfast','-crf','18','-c:a','aac','-ar','48000','-ac','2','-movflags','+faststart',bare]);
    let finalInput=bare;

    const musicCue=timeline.map(r=>String(r['Music cue']||'').trim()).find(Boolean);
    if(musicCue){
      const music=await localize(musicCue,work,'music.bin');
      const mixed=path.join(work,'mixed.mp4');
      await run('ffmpeg',['-y','-i',bare,'-stream_loop','-1','-i',music,'-filter_complex','[1:a]volume=0.16[m];[0:a][m]amix=inputs=2:duration=first:dropout_transition=2[a]','-map','0:v','-map','[a]','-c:v','copy','-c:a','aac','-shortest','-movflags','+faststart',mixed]);
      finalInput=mixed;
    }

    const expected=expectedDuration(timeline);
    const renderedProbe=await probe(finalInput);
    const actual=num(renderedProbe.format?.duration,0);
    const tolerance=Math.max(0.20,expected*0.03);
    if(!actual || Math.abs(actual-expected)>tolerance)throw new Error(`Master duration mismatch: expected ${expected.toFixed(3)}s, got ${actual.toFixed(3)}s (tolerance ${tolerance.toFixed(3)}s)`);

    const version=Date.now();
    const master=path.join(dir,`master-${version}.mp4`);
    await fs.copyFile(finalInput,master);
    const thumb=path.join(dir,`thumb-${version}.jpg`);
    await run('ffmpeg',['-y','-ss',String(Math.min(0.2,Math.max(0,actual/4))),'-i',master,'-frames:v','1','-q:v','2',thumb]);
    return {master,thumb,duration:actual,expectedDuration:expected};
  } finally {
    await fs.rm(work,{recursive:true,force:true});
  }
}
