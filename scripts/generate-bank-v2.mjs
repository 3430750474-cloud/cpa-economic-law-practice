import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const project=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const out=resolve(project,"dist/data");
const rawSeeds=JSON.parse(await readFile(resolve(project,"lib/authorized-questions.json"),"utf8"));
const seedStems=new Set(),seedOptionSets=new Set();
const seeds=rawSeeds.filter(x=>{const stemKey=`${x.chapterId}|${x.stem}`,optionKey=`${x.chapterId}|${x.options.map(o=>o.text).sort().join("|")}`;if(seedStems.has(stemKey)||seedOptionSets.has(optionKey))return false;seedStems.add(stemKey);seedOptionSets.add(optionKey);return true});
const chapters=[
  ["01","第一章 法律基本原理",220,0.04],["02","第二章 基本民事法律制度",420,0.09],
  ["03","第三章 物权法律制度",480,0.10],["04","第四章 合同法律制度",720,0.14],
  ["05","第五章 合伙企业法律制度",360,0.07],["06","第六章 公司法律制度",720,0.14],
  ["07","第七章 证券法律制度",720,0.14],["08","第八章 企业破产法律制度",520,0.12],
  ["09","第九章 票据与支付结算法律制度",520,0.12],["10","第十章 企业国有资产法律制度",240,0.05],
  ["11","第十一章 反垄断法律制度",300,0.07],["12","第十二章 涉外经济法律制度",180,0.04]
];
const legalBasis={"01":"2026年考试大纲：法律基本原理","02":"《民法典》总则编","03":"《民法典》物权编","04":"《民法典》合同编","05":"《合伙企业法》","06":"2023年修订《公司法》及配套规定","07":"《证券法》及证券发行、交易规则","08":"《企业破产法》及相关司法解释","09":"《票据法》及支付结算规则","10":"《企业国有资产法》及国有资产交易规则","11":"《反垄断法》及配套规定","12":"外商投资、对外贸易与外汇管理法律制度"};
const chapterTags={"01":["法律渊源","法律规范","法律关系","法治思想"],"02":["法律行为","意思表示","代理","诉讼时效"],"03":["物权变动","所有权","担保物权","善意取得"],"04":["合同订立","合同履行","合同担保","违约责任","典型合同"],"05":["普通合伙","有限合伙","入伙退伙","事务执行"],"06":["股东出资","公司治理","股权股份","董监高责任","合并清算"],"07":["证券发行","信息披露","上市公司收购","证券欺诈","公司债券"],"08":["破产受理","债务人财产","债权申报","重整和解","破产清算"],"09":["票据行为","票据权利","票据抗辩","追索权","支付结算"],"10":["产权登记","资产评估","产权交易","国资监管"],"11":["垄断协议","支配地位","经营者集中","行政性垄断"],"12":["外商投资","对外贸易","贸易救济","外汇管理"]};
const leads=["注册会计师在审阅交易文件时","公司法务部门复核业务安排时","项目组讨论相关法律风险时","当事人就争议事项咨询时","人民法院审理相关纠纷时","管理层评估交易方案时","投资者核查公开资料时","债权人主张权利时"];
const difficulties=["基础","进阶","冲刺"];
const letters="ABCDE";
const clean=s=>s.replace(/经典真题\d+·(?:单选题|多选题)/g,"").replace(/（\s*）/g,"（ ）").replace(/\s+/g," ").trim();
const coreStem=s=>{
  let x=clean(s).replace(/^根据[^，。]{2,35}(?:规定|制度)[，,]?/,"").replace(/^下列关于/,"").replace(/^关于/,"");
  x=x.replace(/[，,。；]?下列(?:各项中|主体中|情形中|关于)?.*?(?:正确|错误|属于|不属于|可以|不得|应当).*?(?:的是|的有)（ *）[。．]?$/u,"").replace(/（ *）[。．]?$/u,"").trim();
  return x.length>=4?x.slice(0,220):clean(s).slice(0,220);
};
function hash(s){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function rotate(a,n){return a.map((_,i)=>a[(i+n)%a.length])}
function shuffle(a,seed){const x=[...a];let n=hash(seed);for(let i=x.length-1;i>0;i--){n=(Math.imul(n,1664525)+1013904223)>>>0;const j=n%(i+1);[x[i],x[j]]=[x[j],x[i]]}return x}
function tagFor(ch,i){const x=chapterTags[ch];return x[i%x.length]}
function normalizeOriginal(seed,chapter,index){
  const options=seed.options.slice(0,5);return{...seed,id:`ch${chapter}-o-${String(index+1).padStart(3,"0")}`,chapterId:chapter,sourceType:"authorized-original",source:`${seed.source}${seed.year?`（${seed.year}年）`:""}`,difficulty:index%5===0?"进阶":"基础",tags:[tagFor(chapter,index)],stem:clean(seed.stem),options,legalBasis:legalBasis[chapter]};
}
function assertionsFor(seed,seedIndex){
  const prompt=clean(seed.stem),topic=coreStem(seed.stem),correct=new Set(seed.answer);
  return seed.options.slice(0,5).flatMap((o,oi)=>[
    {correct:correct.has(o.key),text:`【独立事项】${prompt} 项目组选择：${clean(o.text)}`,topic,explanation:seed.explanation,seedIndex,optionIndex:oi},
    {correct:correct.has(o.key),text:`【复核结论】针对“${prompt}”，项目组判断为：${clean(o.text)}`,topic,explanation:seed.explanation,seedIndex,optionIndex:oi},
    {correct:correct.has(o.key),text:`【法律判断】题设为“${prompt}”，对应结论是：${clean(o.text)}`,topic,explanation:seed.explanation,seedIndex,optionIndex:oi},
    {correct:correct.has(o.key),text:`【事项判断】${prompt} 法务人员提出：${clean(o.text)}`,topic,explanation:seed.explanation,seedIndex,optionIndex:oi},
    {correct:correct.has(o.key),text:`【审查意见】围绕“${prompt}”，审查人员认为：${clean(o.text)}`,topic,explanation:seed.explanation,seedIndex,optionIndex:oi}
  ]);
}
function pickUnique(pool,start,count,usedTexts,usedSeeds){const result=[];for(let k=0;k<pool.length*3&&result.length<count;k++){const a=pool[(start+k*7)%pool.length];if(!usedTexts.has(a.text)&&!usedSeeds.has(a.seedIndex)&&!result.some(x=>x.text===a.text)){result.push(a);usedTexts.add(a.text);usedSeeds.add(a.seedIndex)}}return result}
function buildChoice(ch,idx,type,pools,optionUse,signatureSet){
  const multi=type==="multiple",needCorrect=multi?(idx%3===0?3:2):1,needWrong=4-needCorrect;
  let salt=0,chosen,signature;
  do{
    const used=new Set(),usedSeeds=new Set();const cs=pickUnique(pools.correct,idx*11+salt,needCorrect,used,usedSeeds);const ws=pickUnique(pools.wrong,idx*13+salt*3,needWrong,used,usedSeeds);chosen=shuffle([...cs,...ws],`${ch}-${idx}-${salt}`);signature=chosen.map(x=>x.text).sort().join("|");salt++;
  }while(signatureSet.has(signature)&&salt<100);
  signatureSet.add(signature);chosen.forEach(x=>optionUse.set(x.text,(optionUse.get(x.text)||0)+1));
  const lead=leads[idx%leads.length],tag=tagFor(ch,idx),scenario=["形成了以下判断","记录了以下结论","提出了以下处理意见","列示了以下风险提示"][Math.floor(idx/leads.length)%4];
  const options=chosen.map((x,i)=>({key:letters[i],text:x.text}));const answer=chosen.map((x,i)=>x.correct?letters[i]:null).filter(Boolean);
  const correctReasons=chosen.filter(x=>x.correct).map(x=>x.explanation).filter(Boolean);
  const topics=[...new Set(chosen.map(x=>x.topic))].filter(Boolean).slice(0,2),serial=String(idx+1).padStart(3,"0");
  return{id:`ch${ch}-${multi?"m":"s"}-${String(idx+1).padStart(4,"0")}`,chapterId:ch,type,sourceType:"original",source:"依据2026年考试大纲与授权历年题原创",year:2026,difficulty:difficulties[idx%3],tags:[tag,...topics],stem:`${lead}，完成第${serial}组${multi?"多项":"单项"}独立事项的复核并${scenario}，重点考查“${tag}”。根据现行经济法律制度，下列说法${multi?"正确的有":"正确的是"}（ ）。`,options,answer,explanation:`本题采用CPA经济法常见的独立事项分项判断方式。每个选项应单独审查，重点识别主体、程序、期限和法律效果。${correctReasons.slice(0,2).join(" ")}`,legalBasis:legalBasis[ch]};
}
function caseFact(stem){
  let x=clean(stem),facts=x.replace(/根据[^。]{0,80}规定[\s\S]*$/u,"").trim();
  if(facts.length>=25)x=facts;
  x=x.replace(/[，,。；]?下列(?:各项中|主体中|情形中)?.*?(?:正确|错误|属于|不属于|可以|不得|应当).*?(?:的是|的有)（ *）[。．]?$/u,"").trim();
  return x.length>=25?x:clean(stem);
}
function buildCase(ch,idx,seedsForChapter){
  const narrativeSeeds=seedsForChapter.filter(s=>!/^(根据|下列|关于)/.test(clean(s.stem))&&/(公司|企业|银行|股东|债权人|债务人|甲|乙|赵某|王某|张某|李某)/.test(s.stem));
  const caseSeeds=narrativeSeeds.filter(s=>s.stem.length>55),usable=caseSeeds.length>=4?caseSeeds:narrativeSeeds.length>=4?narrativeSeeds:seedsForChapter;
  const selected=Array.from({length:4},(_,i)=>usable[(idx*4+i)%usable.length]);
  const companies=["甲公司","乙公司","丙公司","丁公司","戊公司","A公司","B公司","华新公司"];
  const claims=selected.map((s,i)=>{const option=s.options[(idx+i)%s.options.length];return{seed:s,option,correct:s.answer.includes(option.key)}});
  const matters=claims.map((x,i)=>`事项${i+1}：${caseFact(x.seed.stem)}。${companies[(idx+i)%companies.length]}据此主张：“${clean(x.option.text)}”。`).join("\n");
  const questions=claims.map((x,i)=>({prompt:`事项${i+1}中${companies[(idx+i)%companies.length]}的主张是否成立？请说明理由。`,answer:`${x.correct?"成立":"不成立"}。${x.seed.explanation}`,points:["明确回答成立或不成立","写出对应制度的构成要件或法律效果","结合事项事实解释，不能只给结论"]}));
  return{id:`ch${ch}-c-${String(idx+1).padStart(3,"0")}`,chapterId:ch,type:"case",sourceType:"original",source:"依据授权历年题重组的原创综合案例",year:2026,difficulty:idx%4===0?"冲刺":"进阶",tags:[tagFor(ch,idx),tagFor(ch,idx+1)],stem:`第${ch}章综合案例：${companies[idx%companies.length]}第${idx+1}组专项法律风险复核`,material:`2026年，某会计师事务所在为客户提供专项法律风险复核时发现以下事项。各事项相互独立；除题目另有说明外，当事人均为善意，相关文件真实。\n${matters}`,questions,explanation:"本题模拟CPA经济法案例分析题的多事项结构。每问应先作结论，再写法律依据，最后结合题目事实进行涵摄。",legalBasis:legalBasis[ch]};
}

await mkdir(out,{recursive:true});
const manifest={version:"2026.10.21-v2",total:0,methodology:"按2026年中注协大纲能力等级、授权历年题密度和案例考查频率分配",chapters:[]};
const globalIds=new Set();const optionUse=new Map();
for(const [ch,title,target,caseRatio] of chapters){
  const source=seeds.filter(x=>x.chapterId===ch);if(!source.length)throw new Error(`No seeds for ${ch}`);
  const originals=source.map((x,i)=>normalizeOriginal(x,ch,i));
  const caseCount=Math.max(8,Math.round(target*caseRatio));const remaining=target-originals.length-caseCount;
  const multiCount=Math.round(remaining*0.36),singleCount=remaining-multiCount;
  const assertions=source.flatMap(assertionsFor),pools={correct:assertions.filter(x=>x.correct),wrong:assertions.filter(x=>!x.correct)};
  if(pools.correct.length<3||pools.wrong.length<3)throw new Error(`Insufficient assertions ${ch}`);
  const signatures=new Set();const singles=Array.from({length:singleCount},(_,i)=>buildChoice(ch,i,"single",pools,optionUse,signatures));
  const multiples=Array.from({length:multiCount},(_,i)=>buildChoice(ch,i,"multiple",pools,optionUse,signatures));
  const cases=Array.from({length:caseCount},(_,i)=>buildCase(ch,i,source));
  const questions=[...originals,...singles,...multiples,...cases];questions.forEach(q=>{if(globalIds.has(q.id))throw new Error(`Duplicate ${q.id}`);globalIds.add(q.id)});
  const counts={authorizedOriginal:originals.length,single:questions.filter(x=>x.type==="single").length,multiple:questions.filter(x=>x.type==="multiple").length,case:cases.length};
  const chapter={id:ch,title,count:questions.length,file:`chapter-${ch}.json`,weight:Number((target/5400).toFixed(4)),types:counts};manifest.chapters.push(chapter);manifest.total+=questions.length;
  await writeFile(resolve(out,chapter.file),JSON.stringify({chapter,questions}),"utf8");
}
manifest.quality={authorizedOriginals:seeds.length,maxExactOptionReuse:Math.max(...optionUse.values()),uniqueGeneratedOptionTexts:optionUse.size};
await writeFile(resolve(out,"manifest.json"),JSON.stringify(manifest,null,2),"utf8");
console.log(`Generated ${manifest.total} items from ${seeds.length} authorized questions. Max exact option reuse: ${manifest.quality.maxExactOptionReuse}.`);
