import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

export const sleep = ms => new Promise(r => setTimeout(r, ms));
export const nowIso = () => new Date().toISOString();
export const num = (v, d=0) => Number.isFinite(Number(v)) ? Number(v) : d;
export const bool = (v, d=false) => v === true || String(v).toLowerCase()==='true' ? true : v === false || String(v).toLowerCase()==='false' ? false : d;
export const safe = s => String(s ?? '').trim().replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,120) || 'item';
export const parseSeconds = s => { const m=String(s??'').match(/([0-9]+(?:\.[0-9]+)?)/); return m ? Number(m[1]) : 0; };
export const splitUrls = s => String(s??'').split(/[|\n]+/).map(x=>x.trim()).filter(Boolean);
export const ensureDir = async p => { await fs.mkdir(p,{recursive:true}); return p; };
export const mediaRoot = () => process.env.MEDIA_ROOT || '/data/media';
export const publicUrl = rel => { const base=(process.env.PUBLIC_MEDIA_BASE_URL||'').replace(/\/$/,''); return base ? `${base}/${rel.split(path.sep).map(encodeURIComponent).join('/')}` : rel; };
export async function run(cmd,args,opts={}) { return new Promise((resolve,reject)=>{ const p=spawn(cmd,args,{stdio:['ignore','pipe','pipe'],...opts}); let out='',err=''; p.stdout?.on('data',d=>out+=d); p.stderr?.on('data',d=>err+=d); p.on('error',reject); p.on('close',code=>code===0?resolve({out,err}):reject(new Error(`${cmd} exited ${code}: ${err.slice(-3000)}`))); }); }
export async function probe(file){ const {out}=await run('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_type,width,height,r_frame_rate','-of','json',file]); return JSON.parse(out); }
export function headerMap(headers){ return Object.fromEntries(headers.map((h,i)=>[String(h||'').trim(),i])); }
export function objFromRow(headers,row,rowNumber){ const o={_row:rowNumber}; headers.forEach((h,i)=>o[h]=row[i]??''); return o; }
export function rowFromObj(headers,obj){ return headers.map(h=>obj[h]??''); }
export function escDrawtext(s){ return String(s??'').replace(/\\/g,'\\\\').replace(/:/g,'\\:').replace(/'/g,"\\'").replace(/%/g,'\\%').replace(/\n/g,' '); }
export async function fetchBytes(url){ if(url.startsWith('file://')) return fs.readFile(new URL(url)); if(url.startsWith('/')) return fs.readFile(url); const r=await fetch(url); if(!r.ok) throw new Error(`fetch ${url}: ${r.status}`); return Buffer.from(await r.arrayBuffer()); }
export function mimeFromUrl(url, fallback='image/png'){ const u=String(url).toLowerCase(); if(u.includes('.jpg')||u.includes('.jpeg')) return 'image/jpeg'; if(u.includes('.webp')) return 'image/webp'; if(u.includes('.mp4')) return 'video/mp4'; return fallback; }
