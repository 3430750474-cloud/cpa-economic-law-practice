import { readFile } from "node:fs/promises";
import { resolve,dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"../dist/data");
const manifest=JSON.parse(await readFile(resolve(root,"manifest.json"),"utf8"));
const expected={"01":220,"02":420,"03":480,"04":720,"05":360,"06":720,"07":720,"08":520,"09":520,"10":240,"11":300,"12":180};
const ids=new Set(),stems=new Set(),optionSignatures=new Set(),exactOptionUse=new Map();let total=0,originals=0;const errors=[];
for(const ch of manifest.chapters){
  const data=JSON.parse(await readFile(resolve(root,ch.file),"utf8")),qs=data.questions;total+=qs.length;
  if(qs.length!==expected[ch.id])errors.push(`${ch.id}: expected ${expected[ch.id]}, got ${qs.length}`);
  for(const q of qs){
    if(ids.has(q.id))errors.push(`duplicate id ${q.id}`);ids.add(q.id);
    if(stems.has(q.stem))errors.push(`duplicate stem ${q.id}`);stems.add(q.stem);
    for(const k of ["id","chapterId","type","sourceType","source","difficulty","stem","explanation","legalBasis"])if(!q[k])errors.push(`${q.id} missing ${k}`);
    if(q.sourceType==="authorized-original")originals++;
    if(q.type!=="case"){
      if(q.options?.length<4||q.options.length>5)errors.push(`${q.id} invalid option count`);
      if(!q.answer?.length||q.answer.some(a=>!"ABCDE".includes(a)))errors.push(`${q.id} invalid answer`);
      if(q.type==="single"&&q.answer.length!==1)errors.push(`${q.id} single answer count`);
      if(q.type==="multiple"&&q.answer.length<2)errors.push(`${q.id} multiple answer count`);
      const sig=q.options.map(o=>o.text).sort().join("|");if(q.sourceType!=="authorized-original"&&optionSignatures.has(sig))errors.push(`${q.id} repeated option set`);optionSignatures.add(sig);
      for(const o of q.options)exactOptionUse.set(o.text,(exactOptionUse.get(o.text)||0)+1);
    }else if(q.questions?.length<3||q.questions?.length>5)errors.push(`${q.id} case subquestions`);
  }
}
const maxOptionReuse=Math.max(...exactOptionUse.values());
if(total<5000)errors.push(`total below 5000: ${total}`);if(originals<500)errors.push(`authorized originals below 500: ${originals}`);if(maxOptionReuse>12)errors.push(`exact option reused ${maxOptionReuse} times`);
if(errors.length){console.error(errors.slice(0,80).join("\n"));console.error(`Total errors: ${errors.length}`);process.exit(1)}
console.log(`Validated ${total} items; ${originals} authorized originals; ${optionSignatures.size} unique option sets; max exact option reuse ${maxOptionReuse}.`);
