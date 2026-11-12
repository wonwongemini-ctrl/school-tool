/* ===== [공유] 서명부(출석 등록부) — 원본: school-tool/src/shared/sign_sheet.js =====
   o = {title, sub, info:[줄…], head:[칸 제목…], widths:[칸 너비 비율…], rows:[[칸…]…], rowH, foot:[줄…], sign:"간사 홍길동 (서명)"}
   → HWPX 블록 목록. 필요한 것: hwpx_parts.js(P, GAP, Bk). */
function signSheetBlocks(o){
  const B = [];
  B.push(P(o.title || "", {sz:17, b:1, al:"c"}), GAP(4));
  if(o.sub) B.push(P(o.sub, {sz:12, al:"c"}));
  B.push(GAP(16));
  const info = (o.info || []).filter(Boolean);
  info.forEach(t => B.push(P(t, {sz:11.5, ls:190})));
  if(info.length) B.push(GAP(8));
  B.push(Bk.tbl(o.widths, [o.head, ...o.rows], {head:1, rowH:o.rowH || 3400, ...(o.split ? {split:true} : {})}));
  const foot = (o.foot || []).filter(Boolean);
  if(foot.length) B.push(GAP(14), ...foot.map(t => P(t, {sz:12, ls:200})));
  if(o.sign) B.push(GAP(20), P(o.sign, {sz:12.5, al:"r"}));
  return B;
}

/* 등록부(서명부) HTML 인쇄물: signSheetBlocks와 같은 o. 명단이 길면 다음 쪽으로 나눠 표 머리를 다시 찍는다(인쇄물 안 스크립트).
   필요한 것: hwpx_parts.js(esc, docShell). */
function signSheetHtml(o){
  const tot = o.widths.reduce((a, b) => a + b, 0), rowMm = ((o.rowH || 2600) / 100 * 0.3528).toFixed(1);
  const cg = `<colgroup>${o.widths.map(w => `<col style="width:${(w/tot*100).toFixed(2)}%">`).join("")}</colgroup>`;
  const head = `<thead><tr>${o.head.map(h => `<th>${esc(h)}</th>`).join("")}</tr></thead>`;
  const info = (o.info || []).filter(Boolean), foot = (o.foot || []).filter(Boolean);
  const body = `<div class="page"><div class="pin">
<h1>${esc(o.title || "")}</h1>${o.sub ? `<p class="sub">${esc(o.sub)}</p>` : ""}
${info.length ? `<div class="info">${info.map(t => `<p>${esc(t)}</p>`).join("")}</div>` : ""}
<table class="st">${cg}${head}<tbody>${o.rows.map(r => `<tr>${r.map((c, i) => `<td${i === 0 ? ' class="no"' : ""}>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>
<div class="end">${foot.map(t => `<p>${esc(t)}</p>`).join("")}${o.sign ? `<p class="sg">${esc(o.sign)}</p>` : ""}</div>
</div></div>`;
  const css = `
.page{height:297mm;min-height:0;overflow:hidden;padding:20mm 20mm 18mm}
.pin{font-family:"함초롬돋움","HCR Dotum","맑은 고딕","Malgun Gothic","Noto Sans CJK KR",sans-serif}
h1{font-size:17pt;text-align:center;margin:0 0 2mm}
.sub{font-size:12pt;text-align:center;margin:0}
.info{margin:7mm 0 3mm;font-size:11.5pt;line-height:1.9}.info p{margin:0}
table.st{width:100%;border-collapse:collapse;table-layout:fixed;font-size:10pt}
table.st th,table.st td{border:0.35mm solid #000;height:${rowMm}mm;text-align:center;padding:0 1.5mm;overflow:hidden;white-space:nowrap}
table.st th{background:#f2f2f2;font-weight:700}
.end{font-size:12pt;line-height:2;margin-top:5mm}.end p{margin:0}.end .sg{text-align:right;margin-top:6mm}
.pn{position:absolute;left:0;right:0;bottom:8mm;text-align:center;font-size:10pt}`;
  const js = `<script>(function(){
var pages=[document.querySelector(".page")];
function room(pg){var cs=getComputedStyle(pg);return pg.clientHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom);}
for(var k=0;k<60;k++){var pg=pages[pages.length-1],pin=pg.querySelector(".pin");if(pin.offsetHeight<=room(pg)+0.5)break;
 var tb=pin.querySelector("tbody"),end=pin.querySelector(".end");
 var np=document.createElement("div");np.className="page";np.innerHTML='<div class="pin"><table class="st">'+pin.querySelector("table").querySelector("colgroup").outerHTML+pin.querySelector("thead").outerHTML+'<tbody></tbody></table></div>';
 pg.after(np);pages.push(np);var ntb=np.querySelector("tbody"),npin=np.querySelector(".pin");
 if(end){npin.appendChild(end);}
 while(pin.offsetHeight>room(pg)+0.5&&tb.rows.length>1){ntb.insertBefore(tb.rows[tb.rows.length-1],ntb.firstChild);}
 if(!ntb.rows.length){np.querySelector("table").remove();}
}
if(pages.length>1)pages.forEach(function(p,i){var d=document.createElement("div");d.className="pn";d.textContent="- "+(i+1)+" -";p.appendChild(d);});
})();<\/script>`;
  return docShell(o.title || "참석자 등록부", body + js, css);
}
