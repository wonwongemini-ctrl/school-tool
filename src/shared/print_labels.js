/* ===== [공유] 라벨·견출지 인쇄물 — 원본: school-tool/src/shared/print_labels.js =====
   A4 HTML 인쇄물을 만든다(브라우저 인쇄 → 실제 크기). 필요한 것: hwpx_parts.js(esc, docShell). */
/* 견출지(인덱스) 인쇄물: sets = [[칸 글자…], …] 한 묶음이 한 부(새 줄에서 시작). o = {w, h(mm), title}
   한 칸 = 위아래 두 면. 윗면은 180° 돌려 인쇄하고 가운데 점선을 접어 가장자리에 붙인다. */
function indexTabsHtml(sets, o = {}){
  const w = Math.max(8, +o.w||13), h = Math.max(5, +o.h||9);
  const cols = Math.max(1, Math.floor(190 / w)), rowH = h*2, usable = 277;
  const RED = "2px";   // 빨간 선 두께(상자·띠 공통)
  // 줄 만들기: 한 부를 cols칸씩 나눔
  const rows = [];
  sets.forEach(set=>{ for(let i=0;i<set.length;i+=cols) rows.push(set.slice(i,i+cols)); });
  const pages = []; let cur = [], used = 0;
  rows.forEach(r=>{ if(used + rowH > usable && cur.length){ pages.push(cur); cur=[]; used=0; } cur.push(r); used += rowH; });
  if(cur.length) pages.push(cur);
  const fs = t => Math.min(h*0.34, (w*0.68)/Math.max(2, [...t].length*0.95)).toFixed(2);
  const cell = t => `<div class="c"><div class="hf top"><span style="font-size:${fs(t)}mm">${esc(t)}</span></div><div class="hf"><span style="font-size:${fs(t)}mm">${esc(t)}</span></div></div>`;
  const body = pages.map(p=>`<div class="sheet">${p.map(r=>`<div class="r">${r.map(cell).join("")}</div>`).join("")}</div>`).join("")
    || `<div class="sheet"><p style="font-size:13pt">${esc(o.empty || "인덱스 개수와 출력 부수를 입력하세요.")}</p></div>`;
  const css = `
@page{size:A4;margin:0}
html,body{background:#E9ECEF}
.sheet{width:210mm;height:297mm;padding:10mm;margin:0 auto 6mm;background:#fff;overflow:hidden;break-after:page}
.sheet:last-child{break-after:auto}
.r{display:flex}
/* 자르는 선: 1px 회색. 이웃 칸과 겹쳐(-1px) 줄 사이·칸 사이가 한 선이 되게 함 */
.c{width:${w}mm;height:${rowH}mm;border:1px solid #BBB;margin:0 -1px -1px 0;display:flex;flex-direction:column}
.hf{flex:1;position:relative;display:flex;align-items:center;justify-content:center;padding-bottom:${(h*0.2).toFixed(2)}mm}
/* 견출지 모양: 접는 선 쪽에 빨간 테두리 상자, 바깥 끝에 빨간 띠 (윗면은 180° 돌아가 있어 같은 모양이 뒤집혀 보임)
   빨간 선 두께는 모두 RED 하나로 맞춘다. 브라우저가 테두리를 1px 단위로 반올림하므로 mm가 아닌 정수 px로 쓰고,
   띠도 배경(height)이 아닌 테두리로 그려 상자 선과 똑같은 굵기가 되게 한다. 2px ≈ 0.53mm */
.hf::before{content:"";position:absolute;left:0.7mm;right:0.7mm;top:0.7mm;bottom:${(h*0.2+0.5).toFixed(2)}mm;border:${RED} solid #D42020}
.hf::after{content:"";position:absolute;left:0.7mm;right:0.7mm;bottom:${(h*0.06).toFixed(2)}mm;height:0;border-top:${RED} solid #D42020}
.hf.top{transform:rotate(180deg);border-top:0.2mm dashed #999}
.hf span{position:relative;font-family:"맑은 고딕","Malgun Gothic","Noto Sans CJK KR",sans-serif;font-weight:700;white-space:nowrap;line-height:1}
@media print{html,body{background:#fff}.sheet{margin:0}}`;
  return docShell(o.title || "인덱스", body, css).replace(".page + .page{break-before:page}","");
}
/* 라벨지 인쇄물: items = [{top, role, name, child} | {free:"한 줄 글"}],
   o = {cols, rows, w, h, mt, ml, gx, gy(mm), start(시작 칸, 1부터), frame(테두리 상자), title, empty} */
function labelSheetHtml(items, o = {}){
  const N = k => +o[k];
  const cols = Math.max(1, N("cols")||2), rows = Math.max(1, N("rows")||7);
  const w = N("w")||99.1, h = N("h")||38.1, mt = N("mt")||0, ml = N("ml")||0, gx = N("gx")||0, gy = N("gy")||0;
  const per = cols*rows, start = Math.min(per, Math.max(1, N("start")||1)) - 1;
  const frame = !!o.frame;
  const slots = [...Array(start).fill(null), ...items];
  const pages = []; for(let i=0;i<slots.length;i+=per) pages.push(slots.slice(i,i+per));
  const lab = (it, k) => {
    const r = Math.floor(k/cols), c = k%cols;
    const pos = `left:${(ml + c*(w+gx)).toFixed(2)}mm;top:${(mt + r*(h+gy)).toFixed(2)}mm`;
    if(!it) return `<div class="lb empty" style="${pos}"></div>`;
    const inner = it.free
      ? `<div class="free">${esc(it.free)}</div>`
      : `<div class="t">${esc(it.top)}</div><div class="m"><span class="ro">${esc(it.role)}</span> <b>${esc(it.name)}</b> 님${it.child?` <span class="ch">(${esc(it.child)})</span>`:""}</div>`;
    return `<div class="lb${frame?" bg":""}" style="${pos}"><div class="in${frame?" fr":""}">${inner}</div></div>`;
  };
  const body = pages.map(p=>`<div class="sheet">${p.map(lab).join("")}</div>`).join("")
    || `<div class="sheet"><p style="padding:20mm;font-size:13pt">${esc(o.empty || "라벨에 넣을 내용을 입력하세요.")}</p></div>`;
  const css = `
@page{size:A4;margin:0}
html,body{background:#E9ECEF}
.sheet{position:relative;width:210mm;height:297mm;margin:0 auto 6mm;background:#fff;overflow:hidden;break-after:page}
.sheet:last-child{break-after:auto}
.lb{position:absolute;width:${w}mm;height:${h}mm;outline:0.15mm dotted #CCC;display:flex}
.lb.bg{background:#F1F1F1}
.lb.empty{outline-color:#EEE}
.in{flex:1;margin:${Math.min(3, h*0.08).toFixed(1)}mm;padding:0 ${Math.min(5, w*0.05).toFixed(1)}mm;display:flex;flex-direction:column;justify-content:center;font-family:"맑은 고딕","Malgun Gothic","Noto Sans CJK KR",sans-serif;overflow:hidden}
.in.fr{border:0.6mm solid #000;background:#fff}
.t{font-size:${Math.min(3.4, h*0.09).toFixed(2)}mm;margin-bottom:${(h*0.04).toFixed(2)}mm}
.m{font-size:${Math.min(5.2, h*0.135).toFixed(2)}mm;white-space:nowrap;text-align:right;padding-right:${Math.min(4, w*0.04).toFixed(1)}mm}
.t{text-align:left}
.m b{font-size:1.35em;letter-spacing:.05em}
.free{font-size:${Math.min(7, h*0.17).toFixed(2)}mm;font-weight:700;text-align:center;word-break:keep-all}
@media print{html,body{background:#fff}.sheet{margin:0}.lb{outline:none}}`;
  const fit = `<script>document.querySelectorAll(".m").forEach(function(m){var k=0;while(m.scrollWidth>m.clientWidth+1&&k<30){m.style.fontSize=(parseFloat(getComputedStyle(m).fontSize)*0.94)+"px";k++;}});<\/script>`;
  return docShell(o.title || "라벨", body + fit, css).replace(".page + .page{break-before:page}","");
}
