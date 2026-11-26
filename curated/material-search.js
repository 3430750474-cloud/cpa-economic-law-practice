let pages = [];
let materialSource = "manual";
let pdf = null;
let expectedPdfHash = null;
const DEFAULT_INDEX = "data/chapter-07-material-index.json";
const DEFAULT_PDF = "materials/chapter-07.pdf";
const compact = text => String(text??"").normalize("NFKC").replace(/\s+/gu,"");
const safe = text => String(text??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const link = page => pdf && Number.isSafeInteger(page) ? `<a href="${pdf}#page=${page}" target="_blank" rel="noopener">打开 PDF 第 ${page} 页</a>` : "";

const graphemes = new Intl.Segmenter("zh", {granularity:"grapheme"});

function matchOffset(text, term, numbered) {
  if (!numbered) return text.indexOf(term);
  return text.search(new RegExp(term+"(?![0-9])", "u"));
}

function context(text, term, numbered) {
  if (!term) return safe(text);
  let normalized="";
  const spans=[];
  for (const {segment,index} of graphemes.segment(text)) {
    const part=compact(segment);
    normalized+=part;
    for (let i=0;i<part.length;i++) spans.push([index,index+segment.length]);
  }
  const at=matchOffset(normalized,term,numbered);
  if (at<0) return safe(text);
  const [start]=spans[at];
  const [,end]=spans[at+term.length-1];
  return safe(text.slice(Math.max(0,start-80),start))+"<mark>"+safe(text.slice(start,end))+"</mark>"+safe(text.slice(end,end+110));
}

function validatePages(parsed) {
  return Array.isArray(parsed) && parsed.length && parsed.every(row =>
    row && Number.isSafeInteger(row.page) && row.page > 0 && typeof row.text === "string" &&
    typeof row.native === "string" && [row.verified,row.examples,row.headings]
      .every(list => Array.isArray(list) && list.every(item => typeof item === "string"))
  );
}

export async function showMaterial(main, back, pageNumber) {
  if (Number.isSafeInteger(pageNumber) && materialSource === "custom") {
    // Question citations refer to the bundled handout's page numbers.
    if (pdf?.startsWith("blob:")) URL.revokeObjectURL(pdf);
    pages = [];
    pdf = null;
    expectedPdfHash = null;
    materialSource = "manual";
  }
  main.innerHTML = `<div class="shell"><article class="question-card">
    <button class="secondary" id="materialBack">返回</button>
    <h1>讲义原文检索</h1>
    <p>导入讲义索引和对应的原 PDF 后，可以按原句或例题编号检索。检索会统一全半角等兼容字符，并忽略排版空白。</p>
    <div class="material-actions"><a id="materialSource" class="secondary" hidden target="_blank" rel="noopener">打开讲义 PDF</a><button class="secondary" id="materialImport">更换讲义资料</button></div>
    <div class="filters source-picker" id="materialSources" hidden><label>讲义索引<input id="materialIndex" type="file" accept=".json,application/json"></label><label>原讲义 PDF<input id="materialPdf" type="file" accept=".pdf,application/pdf"></label></div>
    <form id="materialForm" class="filters"><label>检索词<input type="search" id="materialTerm" placeholder="输入原句、关键词或经典真题 7"></label>
      <label><input type="checkbox" id="onlyExamples">仅查例题页</label><button class="primary">精确检索</button></form>
    <p id="materialStatus" role="status"></p><section id="materialResults" aria-label="检索结果"></section>
    </article></div>`;
  const field = id => main.querySelector("#"+id);
  field("materialBack").onclick=back;
  field("materialImport").onclick=()=>{
    const picker=field("materialSources");
    picker.hidden=!picker.hidden;
    field("materialImport").textContent=picker.hidden?"更换讲义资料":"收起资料选择";
  };
  const status=field("materialStatus"), output=field("materialResults");
  const sourceLink=field("materialSource");
  let pdfSelection = 0;
  function updatePdfLink() {
    sourceLink.hidden=!pdf;
    if (pdf) sourceLink.href=pdf;
    else sourceLink.removeAttribute("href");
  }
  updatePdfLink();
  function search() {
    output.innerHTML="";
    if (!pages.length) {status.textContent="请选择“更换讲义资料”，导入讲义索引。";return;}
    const term=compact(field("materialTerm").value);
    const examples=field("onlyExamples").checked;
    const numbered=/^(?:经典真题|例题)\d+$/u.test(term);
    if (!term&&!examples&&!pageNumber) {status.textContent="已载入 "+pages.length+" 页。检索会统一全半角等兼容字符，并忽略排版空白。";return;}
    const results=pages.flatMap(page=>{
      if (examples&&!page.examples.length) return [];
      const example=numbered&&page.examples.find(label=>compact(label)===term);
      const source=[...page.verified.map(text=>[text,"已核对摘录"]),[page.native,"PDF 文字层"],[page.text,"OCR"]]
        .find(([text])=>term&&text&&matchOffset(compact(text),term,numbered)>=0);
      if (numbered&&!example || term&&!numbered&&!source || !term&&pageNumber&&page.page!==pageNumber) return [];
      return [{page,text:source?.[0]??(example?null:page.text),label:source?.[1]??(example?"例题索引":"OCR"),example}];
    });
    status.textContent=results.length?"命中 "+results.length+" 页":"未找到完全匹配的内容。";
    if (pdf?.startsWith("blob:") && !expectedPdfHash) status.textContent += " 当前索引未提供 PDF 校验值，请核对页码与原文件。";
    output.innerHTML=results.map(({page,text,label,example})=>`<article class="feedback">
      <h3>PDF 第 ${page.page} 页</h3><small>${safe(page.headings.join(" / "))} · ${safe(label)} ${example?`<mark>${safe(example)}</mark>`:safe(page.examples.join("、"))}</small>
      ${text?`<p class="material-excerpt">${context(text,term,numbered)}</p>`:""}${link(page.page)}
      <details><summary>查看整页识别文本</summary><p class="material-excerpt">${safe(page.text)}</p></details>
      </article>`).join("");
  }
  field("materialIndex").onchange=async e=>{
    const file=e.target.files[0];
    if (!file) return;
    try {
      const parsed=JSON.parse(await file.text());
      const indexPages = Array.isArray(parsed) ? parsed : parsed?.pages;
      const hash = Array.isArray(parsed) ? null : parsed?.pdfSha256;
      if (!validatePages(indexPages) || (hash != null && !/^[a-f0-9]{64}$/i.test(hash))) throw Error();
      pdfSelection++;
      expectedPdfHash = hash?.toLowerCase() ?? null;
      if (pdf?.startsWith("blob:")) URL.revokeObjectURL(pdf);
      pdf=null;
      field("materialPdf").value="";
      pages=indexPages;
      pageNumber=null;
      materialSource="custom";
      updatePdfLink();
      search();
    } catch {status.textContent="这个文件不是有效的讲义索引。";}
  };
  field("materialPdf").onchange=async e=>{
    const file=e.target.files[0];
    if (!file) return;
    if (!pages.length) {
      e.target.value="";
      status.textContent="请先导入与此 PDF 对应的讲义索引。";
      return;
    }
    const selection = ++pdfSelection;
    if (expectedPdfHash) {
      status.textContent="正在核对 PDF 是否与索引匹配…";
      try {
        const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
        if (selection !== pdfSelection) return;
        const actualHash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2,"0")).join("");
        if (actualHash !== expectedPdfHash) throw Error();
      } catch {
        if (selection !== pdfSelection) return;
        e.target.value="";
        status.textContent="无法确认此 PDF 与当前索引匹配，请选择制作索引时使用的原 PDF。";
        return;
      }
    }
    if (pdf?.startsWith("blob:")) URL.revokeObjectURL(pdf);
    pdf=URL.createObjectURL(file);
    updatePdfLink();
    search();
  };
  field("materialForm").onsubmit=e=>{e.preventDefault();pageNumber=null;search();};
  field("onlyExamples").onchange=()=>{pageNumber=null;search();};
  if (pages.length) {search();return;}
  status.textContent="正在检查内置讲义索引…";
  try {
    const response=await fetch(DEFAULT_INDEX);
    if (!response.ok) throw Error();
    const parsed=await response.json();
    if (!validatePages(parsed.pages) || !/^[a-f0-9]{64}$/.test(parsed.pdfSha256)) throw Error();
    if (materialSource==="custom") return;
    pages=parsed.pages;
    pdf=DEFAULT_PDF;
    expectedPdfHash=parsed.pdfSha256;
    materialSource="built-in";
    updatePdfLink();
    status.textContent=`已载入内置第七章讲义 ${pages.length} 页。`;
  } catch {
    status.textContent="内置检索库未载入，请点击“更换讲义资料”选择索引文件。";
  }
  search();
}
