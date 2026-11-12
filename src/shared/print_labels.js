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
/* 라벨지 인쇄물: items = [{top, role, roleSub, name, child, bg} | {free:"한 줄 글", bg}],
   o = {cols, rows, w, h, mt, ml, gx, gy(mm), start(시작 칸, 1부터), frame(모든 라벨 테두리 상자; 칸의 it.frame이 있으면 그 칸만), title, empty, bg(모든 라벨 배경 그림), bgFit('fill' 칸에 맞게 늘림(기본) | 'cover' 비율 그대로 잘라 채움), pick(true면 칸마다 data-pick), picked:[번호…]}
   bg: 그림 주소(data URL). 칸의 it.bg가 있으면 그 칸은 it.bg, 없으면 o.bg. */
function labelSheetHtml(items, o = {}){
  const N = k => +o[k];
  const cols = Math.max(1, N("cols")||2), rows = Math.max(1, N("rows")||7);
  const w = N("w")||99.1, h = N("h")||38.1, mt = N("mt")||0, ml = N("ml")||0, gx = N("gx")||0, gy = N("gy")||0;
  const per = cols*rows, start = Math.min(per, Math.max(1, N("start")||1)) - 1;
  const frame = !!o.frame;
  const slots = [...Array(start).fill(null), ...items.map(x => x && ({...x}))];
  const pages = []; for(let i=0;i<slots.length;i+=per) pages.push(slots.slice(i,i+per));
  const lab = (it, k) => {
    const r = Math.floor(k/cols), c = k%cols;
    const pos = `left:${(ml + c*(w+gx)).toFixed(2)}mm;top:${(mt + r*(h+gy)).toFixed(2)}mm`;
    if(!it) return `<div class="lb empty" style="${pos}"${o.pick ? ` data-pick="${k - start}" data-slot="${k}"` : ""}></div>`;
    const i = slots.indexOf(it) - start;
    const inner = it.free
      ? `<div class="free">${esc(it.free)}</div>`
      : `${it.top ? `<div class="t">${esc(it.top)}</div>` : ""}<div class="m"><span class="ro">${esc(it.role)}${it.roleSub ? `<small>(${esc(it.roleSub)})</small>` : ""}</span> <b>${esc(it.name)}</b> 님${it.child?` <span class="ch">(${esc(it.child)})</span>`:""}</div>`;
    const bg = it.bg || o.bg;
    const fr = frame || !!it.frame;
    return `<div class="lb${fr&&!bg?" bg":""}${(o.picked||[]).includes(i)?" picked":""}" style="${pos}"${o.pick ? ` data-pick="${i}"` : ""}>${bg ? `<img class="lbg" alt="" src="${bg}">` : ""}<div class="in${fr?" fr":""}">${inner}</div></div>`;
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
.lbg{position:absolute;inset:0;width:100%;height:100%;object-fit:${o.bgFit === "cover" ? "cover" : "fill"}}
.lbg ~ .in.fr{background:transparent}
.in{position:relative}
.ro small,.ch{font-size:.8em}
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

/* 라벨지 HWPX: 라벨 한 칸 = 표 한 칸(칸 사이·줄 사이는 빈 칸). 쪽 여백 = 라벨지 위·왼쪽 여백.
   돌려주는 값 {blocks, page}: ENG.hwpx(blocks, 제목, {page, noFill:true, bins}).
   배경 그림: o.binOf(그림 주소) → 그림 id('image1')를 주면 그 칸의 배경(칸 크기에 맞추어)으로 넣는다. 그림 파일은 bins로 함께. */
function labelHwpx(items, o = {}){
  const N = k => +o[k], pt = mm => mm * 2.8346;
  const cols = Math.max(1, N("cols")||2), rows = Math.max(1, N("rows")||7);
  const w = N("w")||99.1, h = N("h")||38.1, mt = N("mt")||0, ml = N("ml")||0, gx = N("gx")||0, gy = N("gy")||0;
  const per = cols*rows, start = Math.min(per, Math.max(1, N("start")||1)) - 1;
  const slots = [...Array(start).fill(null), ...items]; const pages = []; for(let i=0;i<slots.length;i+=per) pages.push(slots.slice(i,i+per));
  const colW = []; for(let c=0;c<cols;c++){ colW.push(pt(w)); if(c<cols-1 && gx>0) colW.push(pt(gx)); }
  const tSz = +(pt(Math.min(3.4, h*0.09))).toFixed(1), mSz = +(pt(Math.min(5.2, h*0.135))).toFixed(1), fSz = +(pt(Math.min(7, h*0.17))).toFixed(1);
  const fr = o.frame ? [[0.6]] : null;
  const cell = it => {
    if(!it) return {t:"", sz:6};
    const bgId = (it.bg || o.bg) && o.binOf ? o.binOf(it.bg || o.bg) : null, fill = bgId ? {fill:{img:bgId}} : {};
    if(it.free) return {p:[{t:it.free, sz:fSz, b:1, al:"c"}], m:[0, 6, 0, 6], ...fill};
    const runs = [{t:(it.role||"") + (it.roleSub ? `(${it.roleSub})` : "") + " ", sz:mSz}, {t:it.name, sz:+(mSz*1.35).toFixed(1), b:1}, {t:" 님", sz:mSz}];
    if(it.child) runs.push({t:` (${it.child})`, sz:+(mSz*0.8).toFixed(1)});
    return {p:[...(it.top ? [{t:it.top, sz:tSz, al:"l", ls:130}] : []), {runs, al:"r", ls:130}], m:[0, 10, 0, 10], ...fill};
  };
  const blocks = [];
  pages.forEach((pg, pi) => {
    const R = [];
    for(let r=0;r<rows;r++){
      const cells = []; for(let c=0;c<cols;c++){ cells.push(cell(pg[r*cols+c])); if(c<cols-1 && gx>0) cells.push({t:"", sz:4}); }
      R.push({h:pt(h), cells}); if(r<rows-1 && gy>0) R.push({h:pt(gy), cells:colW.map(() => ({t:"", sz:4}))});
    }
    // 테두리: 모든 라벨(o.frame) 또는 그 칸만(it.frame) — 칸 둘레 네 변
    const hl = [], vl = [], ci = c => gx > 0 ? c*2 : c, ri = r => gy > 0 ? r*2 : r;
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){ const it = pg[r*cols+c]; if(!it || !(o.frame || it.frame)) continue;
      hl.push([ri(r), ci(c), ci(c)+1, 0.6], [ri(r)+1, ci(c), ci(c)+1, 0.6]); vl.push([ci(c), ri(r), ri(r)+1, 0.6], [ci(c)+1, ri(r), ri(r)+1, 0.6]); }
    if(pi) blocks.push(ENG.B.pb());
    blocks.push(ENG.B.form({cols:colW, rows:R, al:"l", hl, vl}));
  });
  return {blocks, page:{top:Math.max(0, mt), header:0, footer:0, bottom:0, left:Math.max(0, ml), right:0}};
}
