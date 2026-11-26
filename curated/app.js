import { showMaterial } from "./material-search.js?v=20261126-2";
const main=document.querySelector("#main"),toast=document.querySelector("#toast");
const STORE="zhifa-cpa-economic-law-v2";
let activeIds=new Set();
let manifest,bank=[],view={page:"home",chapter:null,index:0,mode:"all",type:"all",source:"all",difficulty:"all",topic:"all",search:""};
const emptyState={answered:{},favorites:[],caseDrafts:{},caseRatings:{},last:null,dark:false};
let state=load();
function load(){try{return {...emptyState,...JSON.parse(localStorage.getItem(STORE)||"{}")}}catch{return {...emptyState}}}
function save(){localStorage.setItem(STORE,JSON.stringify(state))}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function showToast(msg){toast.textContent=msg;toast.classList.add("show");setTimeout(()=>toast.classList.remove("show"),1600)}
function answered(id){return state.answered[id]}
function stats(){const arr=Object.entries(state.answered).filter(([id])=>activeIds.has(id)).map(([,value])=>value),done=arr.length,correct=arr.filter(x=>x.correct||x.rating==="mastered").length;return{done,correct,rate:done?Math.round(correct/done*100):0}}
function chapterStats(id){const prefix=`ch${id}-`,arr=Object.entries(state.answered).filter(([k])=>k.startsWith(prefix)&&activeIds.has(k)).map(([,v])=>v),done=arr.length,correct=arr.filter(x=>x.correct||x.rating==="mastered").length;return{done,correct,rate:done?Math.round(correct/done*100):0}}
function home(){if(!manifest)return;loadRequest++;view.page="home";const s=stats();main.innerHTML=`<div class="shell"><section class="hero"><div class="hero-main"><div class="eyebrow">2026 · CPA Economic Law</div><h1>把法条，练成判断力。</h1><p>12 章先行题库，包含单选、多选和综合案例。按题型、难度和考点筛选。</p><div class="hero-stats"><div><strong>${manifest.total}</strong><span>已上线题目</span></div><div><strong>${s.done}</strong><span>已经完成</span></div><div><strong>${s.rate}%</strong><span>当前正确率</span></div></div></div><aside class="resume-card"><div><div class="ring" style="--p:${Math.round(s.done/manifest.total*100)}" data-label="${Math.round(s.done/manifest.total*100)}%"></div><h2>${state.last?"继续上次学习":"开始你的第一题"}</h2><p>${state.last?esc(manifest.chapters.find(c=>c.id===state.last.chapter)?.title):"进度自动保存在当前浏览器，无需登录。"}</p></div><button class="primary" id="resume">${state.last?"继续刷题":"从第一章开始"}</button></aside></section><section><div class="section-head"><div><h2>训练方式</h2><p>按你现在最需要解决的问题进入</p></div></div><div class="modes"><button class="mode-card" data-mode="all"><b>章节练习</b><span>按章节顺序系统训练</span></button><button class="mode-card" data-mode="wrong"><b>错题重练</b><span>${Object.entries(state.answered).filter(([id,x])=>activeIds.has(id)&&(x.correct===false||x.rating==="weak")).length} 道待巩固</span></button><button class="mode-card" data-mode="favorite"><b>我的收藏</b><span>${state.favorites.filter(id=>activeIds.has(id)).length} 道已收藏</span></button><button class="mode-card" data-mode="unanswered"><b>只看未做</b><span>${manifest.total-s.done} 道未完成</span></button></div></section><section><div class="section-head"><div><h2>章节目录</h2><p>按章查看已上线题量和规划题量</p></div></div><div class="chapters">${manifest.chapters.map((c,i)=>{const x=chapterStats(c.id),p=Math.round(x.done/c.count*100);return`<button class="chapter-card" data-chapter="${c.id}"><div class="chapter-top"><div><span class="chapter-no">CHAPTER ${String(i+1).padStart(2,"0")}</span><h3>${esc(c.title.replace(/^第.+?章\s*/,""))}</h3></div><b aria-label="已上线 ${c.count} 题，规划 ${c.target} 题">${c.count} / ${c.target}</b></div><div class="progress"><i style="width:${p}%"></i></div><div class="chapter-meta"><span>${x.done}/${c.count} 已完成</span><span>正确率 ${x.rate}%</span></div></button>`}).join("")}</div></section></div>`;

  document.querySelector("#resume").onclick=()=>openChapter(state.last?.chapter||"01",state.last?.mode||"all",state.last?.index||0);
  document.querySelectorAll("[data-chapter]").forEach(b=>b.onclick=()=>openChapter(b.dataset.chapter,"all",0));
  document.querySelectorAll("[data-mode]").forEach(b=>b.onclick=()=>openChapter(state.last?.chapter||"01",b.dataset.mode,0));
}
let loadRequest = 0;
async function openChapter(id, mode="all", idx=0) {
  const request = ++loadRequest;
  main.innerHTML = '<div class="shell"><p role="status">正在加载题目…</p></div>';
  try {
    const response = await fetch(`data/chapter-${id}.json`);
    if (!response.ok) throw Error("chapter download");
    const data = await response.json();
    if (request !== loadRequest) return;
    bank = data.questions;
    view = {...view,page:"practice",chapter:id,index:idx,mode,retryComplete:null,type:"all",source:"all",difficulty:"all",topic:"all",search:""};
    renderPractice();
  } catch {
    if (request !== loadRequest) return;
    main.innerHTML = '<div class="shell"><p role="alert">题目加载失败。</p><button id="retry">重试</button></div>';
    document.querySelector("#retry").onclick=()=>openChapter(id,mode,idx);
  }
}

function filtered(){return bank.filter(q=>{
  const a=answered(q.id),wrong=a&&(a.correct===false||a.rating==="weak");
  if(view.mode==="wrong"&&!wrong&&view.retryComplete!==q.id)return false;if(view.mode==="favorite"&&!state.favorites.includes(q.id))return false;if(view.mode==="unanswered"&&a)return false;
  if(view.type!=="all"&&q.type!==view.type)return false;if(view.source!=="all"&&q.sourceType!==view.source)return false;if(view.difficulty!=="all"&&q.difficulty!==view.difficulty)return false;
  if(view.topic!=="all"&&!q.tags.includes(view.topic))return false;
  if(view.search&&![q.stem,q.material,...q.tags,...(q.options??[]).map(o=>o.text)].some(value=>value?.toLowerCase().includes(view.search.toLowerCase())))return false;return true})
}
function renderPractice(){const list=filtered();if(view.index<0||view.index>=list.length)view.index=Math.max(0,list.length-1);const q=list[view.index],chapter=manifest.chapters.find(c=>c.id===view.chapter);main.innerHTML=`<div class="shell practice-layout"><aside class="sidebar"><button class="back" id="back">← 返回章节</button><h2>${esc(chapter.title)}</h2><div class="filters"><label>题型<select id="type"><option value="all">全部题型</option><option value="single">单选题</option><option value="multiple">多选题</option><option value="case">综合案例</option></select></label><label>题源<select id="source"><option value="all">全部题源</option><option value="authorized-original">历年题回忆</option><option value="original">原创题</option></select></label><label>难度<select id="difficulty"><option value="all">全部难度</option><option>基础</option><option>进阶</option><option>冲刺</option></select></label><label>考点<select id="topic"><option value="all">全部考点</option>${[...new Set(bank.flatMap(q=>q.tags))].sort().map(t=>`<option>${esc(t)}</option>`).join("")}</select></label><label>练习范围<select id="mode"><option value="all">全部</option><option value="unanswered">未做</option><option value="wrong">错题</option><option value="favorite">收藏</option></select></label><label>检索<input id="search" type="search" placeholder="题干、选项或考点" value="${esc(view.search)}"></label></div><div class="mini-stats"><div><b>${list.length}</b><span>当前题目</span></div><div><b>${chapterStats(view.chapter).rate}%</b><span>本章正确率</span></div></div><div class="answer-grid" aria-label="答题卡">${list.map((x,i)=>{const a=answered(x.id),cl=[i===view.index?"current":"",a?"done":"",a&&(a.correct===false||a.rating==="weak")?"wrong":""].join(" ");return`<button class="${cl}" data-jump="${i}" aria-label="第${i+1}题">${i+1}</button>`}).join("")}</div></aside><section>${q?questionCard(q,list):`<div class="question-card empty"><h2>这里还没有题目</h2><p>调整筛选条件或先完成一些题目后再来。</p><button class="secondary" id="clearFilters">清除筛选</button></div>`}</section></div>`;

  document.querySelector("#back").onclick=home;for(const id of ["type","source","difficulty","topic","mode"]){const el=document.querySelector(`#${id}`);el.value=view[id];el.onchange=()=>{view[id]=el.value;view.retryComplete=null;view.index=0;renderPractice()}}
  const search=document.querySelector("#search");
  search.oninput=e=>{
    if(e.isComposing)return;
    const value=e.target.value;
    const cursor=e.target.selectionStart;
    view.search=value.trim();
    view.index=0;
    renderPractice();
    const input=document.querySelector("#search");
    input.value=value;
    input.focus();
    input.setSelectionRange(cursor,cursor);
  };
  search.oncompositionend=e=>search.oninput(e);document.querySelectorAll("[data-jump]").forEach(b=>b.onclick=()=>{const id=list[+b.dataset.jump].id;view.retryComplete=null;view.index=filtered().findIndex(q=>q.id===id);renderPractice()});
  if(!q){document.querySelector("#clearFilters").onclick=()=>{view.type=view.source=view.difficulty=view.topic=view.mode="all";view.search="";renderPractice()};return}wireQuestion(q,list)
}
function questionCard(q,list){const a=view.mode==="wrong"&&view.retryComplete!==q.id?null:answered(q.id),fav=state.favorites.includes(q.id);return`<article class="question-card"><div class="question-meta"><span class="tag type">${q.type==="single"?"单选题":q.type==="multiple"?"多选题":"综合案例"}</span><span class="tag">${q.sourceType==="authorized-original"?"历年题回忆":q.sourceType==="authorized-adapted"?"讲义改编":"原创"}</span><span class="tag">${q.difficulty}</span>${q.tags.map(x=>`<span class="tag">${esc(x)}</span>`).join("")}<span class="source">${esc(q.source)}</span></div><h1 class="question-title">${esc(q.stem)}</h1>${q.type==="case"?caseBody(q,a):choiceBody(q,a)}<div class="question-actions"><div><button class="nav-btn" id="prev" ${view.index===0?"disabled":""}>上一题</button><button class="nav-btn" id="next" ${view.index===list.length-1 && !(view.mode==="wrong"&&view.retryComplete===q.id)?"disabled":""}>${view.index===list.length-1&&view.mode==="wrong"&&view.retryComplete===q.id?"返回错题列表":"下一题"}</button></div><div><button class="nav-btn favorite ${fav?"active":""}" id="favorite">${fav?"★ 已收藏":"☆ 收藏"}</button>${q.type!=="case"&&!a?`<button class="primary" id="submit" disabled>提交答案</button>`:""}</div></div></article>`}
function choiceBody(q,a){return`<div class="answers">${q.options.map(o=>{let cl="";if(a){if(q.answer.includes(o.key))cl="correct";else if(a.choice.includes(o.key))cl="incorrect"}return`<button class="answer ${cl}" data-option="${o.key}" ${a?"disabled":""}><span class="letter">${o.key}</span><span>${esc(o.text)}</span></button>`}).join("")}</div>${a?feedback(q,a.correct):""}`}
function feedback(q,correct){return`<div class="feedback ${correct?"":"bad"}"><h3>${correct?"回答正确":"再看一遍关键规则"}</h3><p><b>正确答案：</b>${q.answer.join("、")}</p><p>${esc(q.explanation)}</p><p class="legal"><b>依据：</b>${esc(q.legalBasis)}</p>${q.citationPage?`<button class="secondary" data-citation="${q.citationPage}">查看讲义原页</button>`:""}</div>`}
function caseBody(q,a){return`<div class="case-material">${esc(q.material)}</div>${q.questions.map((sq,i)=>`<section class="case-question"><h3>${i+1}. ${esc(sq.prompt)}</h3><textarea data-draft="${i}" rows="4" placeholder="先写下你的分析，再查看参考答案">${esc(state.caseDrafts[q.id]?.[i]||"")}</textarea>${a?`<div class="feedback"><h3>参考答案</h3><p>${esc(sq.answer)}</p><b>评分点</b><ul class="score-points">${sq.points.map(p=>`<li>${esc(p)}</li>`).join("")}</ul></div>`:""}</section>`).join("")}${a?`<div class="feedback"><h3>自评掌握程度</h3><div class="self-rate">${[["mastered","已掌握"],["fuzzy","模糊"],["weak","未掌握"]].map(([k,v])=>`<button class="status-btn ${a.rating===k?"active":""}" data-rate="${k}">${v}</button>`).join("")}</div><p class="legal"><b>依据：</b>${esc(q.legalBasis)}</p>${q.citationPage?`<button class="secondary" data-citation="${q.citationPage}">查看讲义原页</button>`:""}</div>`:`<button class="primary" id="reveal">提交并查看答案</button>`}`}
function wireQuestion(q,list){document.querySelector("[data-citation]")?.addEventListener("click",()=>openMaterial(q.citationPage));let selected=[];document.querySelectorAll("[data-option]").forEach(b=>b.onclick=()=>{if(q.type==="single"){selected=[b.dataset.option];document.querySelectorAll("[data-option]").forEach(x=>x.classList.toggle("selected",x===b))}else{const k=b.dataset.option;selected=selected.includes(k)?selected.filter(x=>x!==k):[...selected,k];b.classList.toggle("selected")}document.querySelector("#submit").disabled=!selected.length});
  document.querySelector("#submit")?.addEventListener("click",()=>{const correct=[...selected].sort().join("")===q.answer.slice().sort().join("");state.answered[q.id]={choice:selected,correct,at:Date.now()};view.retryComplete=q.id;state.last={chapter:view.chapter,index:view.index,mode:view.mode};save();renderPractice()});
  document.querySelectorAll("[data-draft]").forEach(t=>t.oninput=()=>{state.caseDrafts[q.id]??={};state.caseDrafts[q.id][t.dataset.draft]=t.value;save()});
  document.querySelector("#reveal")?.addEventListener("click",()=>{state.answered[q.id]={rating:view.mode==="wrong"?"weak":"fuzzy",at:Date.now()};view.retryComplete=q.id;save();renderPractice()});document.querySelectorAll("[data-rate]").forEach(b=>b.onclick=()=>{state.answered[q.id]={rating:b.dataset.rate,at:Date.now()};view.retryComplete=q.id;save();renderPractice()});
  document.querySelector("#favorite").onclick=()=>{state.favorites=state.favorites.includes(q.id)?state.favorites.filter(x=>x!==q.id):[...state.favorites,q.id];save();renderPractice()};
  document.querySelector("#prev").onclick=()=>{view.index--;view.retryComplete=null;renderPractice()};document.querySelector("#next").onclick=()=>{if(!(view.retryComplete&&view.mode==="wrong"&&answered(view.retryComplete)?.correct))view.index++;view.retryComplete=null;state.last={chapter:view.chapter,index:view.index,mode:view.mode};save();renderPractice()};
}
function openMaterial(page) {
  loadRequest++;
  const resumePractice = view.page==="practice";
  view.page="material";
  showMaterial(main,()=>{if(resumePractice){view.page="practice";renderPractice();}else home();},page);
}
document.querySelector("#materialBtn").onclick=()=>openMaterial();
document.querySelector("#brand").onclick=home;document.querySelector("#themeBtn").onclick=()=>{state.dark=!state.dark;save();document.body.classList.toggle("dark",state.dark)};document.querySelector("#resetBtn").onclick=()=>{if(confirm("确定清除全部答题进度、错题、收藏和案例草稿吗？")){state={...emptyState,dark:state.dark};save();home();showToast("学习进度已重置")}};
document.addEventListener("keydown",e=>{if(view.page!=="practice"||e.target.matches("input,textarea,select"))return;if(e.key==="ArrowLeft")document.querySelector("#prev")?.click();if(e.key==="ArrowRight")document.querySelector("#next")?.click()});
try {
  const response=await fetch("data/manifest.json");
  if(!response.ok)throw Error("manifest download");
  manifest=await response.json();
  activeIds=new Set(manifest.questions);
  document.body.classList.toggle("dark",state.dark);
  home();
} catch {
  main.innerHTML='<div class="shell"><p role="alert">题库加载失败，请刷新页面。</p></div>';
}
