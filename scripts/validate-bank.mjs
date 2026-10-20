import { readFile } from "node:fs/promises";
import { resolve,dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"../dist/data");
const manifest=JSON.parse(await readFile(resolve(root,"manifest.json"),"utf8"));
const ids=new Set(); let total=0; const errors=[];
for(const ch of manifest.chapters){
  const data=JSON.parse(await readFile(resolve(root,ch.file),"utf8")); const q=data.questions; total+=q.length;
  const counts={single:0,multiple:0,case:0};
  for(const x of q){
    counts[x.type]++; if(ids.has(x.id))errors.push(`duplicate ${x.id}`); ids.add(x.id);
    for(const k of ["id","chapterId","type","sourceType","source","difficulty","stem","explanation","legalBasis"])if(!x[k])errors.push(`${x.id} missing ${k}`);
    if(x.type!=="case"){
      if(x.options?.length!==4)errors.push(`${x.id} options`);
      if(!x.answer?.length||x.answer.some(a=>!"ABCD".includes(a)))errors.push(`${x.id} answer`);
      if(x.type==="single"&&x.answer.length!==1)errors.push(`${x.id} single answer count`);
      if(x.type==="multiple"&&x.answer.length<2)errors.push(`${x.id} multiple answer count`);
    }else if(x.questions?.length<3||x.questions?.length>5)errors.push(`${x.id} case subquestions`);
  }
  if(q.length!==200||counts.single!==120||counts.multiple!==60||counts.case!==20)errors.push(`${ch.id} counts ${JSON.stringify(counts)}`);
}
if(total!==2400)errors.push(`total ${total}`);
if(errors.length){console.error(errors.join("\n"));process.exit(1)}
console.log(`Validated ${total} items: 12 chapters × (120 single + 60 multiple + 20 cases).`);
