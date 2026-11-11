/* ===== [공유] HTML → HWPX — 원본: school-tool/src/shared/html2hwpx.js =====
   AI가 만든 글(HTML)을 한글 문서 블록으로 옮긴다. 운영업무 도우미의 회의록·결과 홍보 프롬프트가 정한 모양
   (결재란, 제목 상자, 발언자별 대화 .speech, 안건 상자 .agenda-box, 동의 요약 .action-summary, 서명란)도 읽는다.
   모르는 모양은 제목·문단·표·목록으로 옮기고, 못 읽은 부분은 warns에 적는다.
   필요한 것: hwpx_engine.js(ENG), hwpx_parts.js(PR·GAP·RULE·PW·Bk). */
function htmlToBlocks(html){
  const dom = new DOMParser().parseFromString(html, "text/html");
  const B = [], warns = [];
  const txt = el => (el ? el.textContent : "").replace(/ /g, " ").replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();
  /* 굵은 글씨를 살린 글 조각: [{t, b}] — 줄바꿈(<br>, 블록)은 "\n" 조각 */
  const runsOf = (el, bold = false, out = []) => {
    for(const n of el.childNodes){
      if(n.nodeType === 3){ const t = n.nodeValue.replace(/ /g, " ").replace(/\s+/g, " "); if(t) out.push({t, b:bold?1:0}); continue; }
      if(n.nodeType !== 1) continue;
      const tag = n.tagName.toLowerCase();
      if(tag === "br"){ out.push({t:"\n"}); continue; }
      if(tag === "ul" || tag === "ol"){ [...n.children].forEach((li, k) => { out.push({t:"\n"}); out.push({t: tag === "ol" ? `${k+1}. ` : "- ", b:0}); runsOf(li, bold, out); }); out.push({t:"\n"}); continue; }
      if(tag === "style" || tag === "script") continue;
      const blk = /^(div|p|li|tr|h\d)$/.test(tag);
      if(blk) out.push({t:"\n"});
      runsOf(n, bold || tag === "strong" || tag === "b", out);
      if(blk) out.push({t:"\n"});
    }
    return out;
  };
  /* 조각을 줄 단위 문단으로 */
  const lines = runs => { const L = [[]]; runs.forEach(r => { if(r.t === "\n"){ if(L[L.length-1].length) L.push([]); } else L[L.length-1].push(r); }); return L.filter(l => l.some(r => r.t.trim())).map(l => { l[0] = {...l[0], t:l[0].t.replace(/^\s+/, "")}; return l; }); };
  const SZ = 11;
  const para = (runs, o = {}) => B.push(PR(runs.map(r => ({t:r.t, b:r.b})), {sz:SZ, ls:170, ...o}));
  const tableBlock = (t, o = {}) => {
    const rows = [...t.querySelectorAll("tr")].filter(tr => tr.closest("table") === t);
    if(!rows.length) return;
    const cellT = c => lines(runsOf(c)).map(l => l.map(r=>r.t).join("").trim()).join("\n");
    const grid = rows.map(tr => [...tr.children].filter(c => /^(td|th)$/i.test(c.tagName)).map(c => ({t:cellT(c), cs:+c.getAttribute("colspan")||1, rs:+c.getAttribute("rowspan")||1, h:c.tagName==="TH", al: cellT(c).length > 12 ? "l" : "c"})));
    const ncol = Math.max(...grid.map(r => r.reduce((a,c)=>a+c.cs,0)));
    const w = Array(ncol).fill(1);
    grid.forEach(r => { let k = 0; r.forEach(c => { if(c.cs===1) w[k] = Math.max(w[k], Math.min(40, Math.max(...c.t.split("\n").map(x=>x.length)))); k += c.cs; }); });
    // 쪽 경계에 걸리면 나뉘도록 '글자처럼 취급'을 풀어 둔다(사용자 요청)
    B.push(Bk.tbl(w.map(x => Math.max(6, x)), grid, {head: grid[0].every(c=>c.h) ? 1 : 0, rowH:1800, split:true, ...o}));
  };
  const walk = (el) => {
    for(const n of el.children){
      const tag = n.tagName.toLowerCase(), cls = n.classList;
      if(tag === "style" || tag === "script" || tag === "title" || tag === "meta") continue;
      if(cls.contains("page-break")){ B.push(Bk.pb()); continue; }
      if(cls.contains("approval-table")){
        const heads = [...n.querySelectorAll("th")].map(txt).filter(t => !/^결\s*재$/.test(t.replace(/\n/g,"")));
        const all = [[0,0,1+heads.length,0.7],[1,1,1+heads.length,0.7],[2,0,1+heads.length,0.7]], vl = Array.from({length:heads.length+2}, (_,i)=>[i,0,2,0.7]);
        B.push(Bk.form({al:"r", cols:[22, ...heads.map(()=>70)], rows:[{h:20, cells:[{p:[{t:"결", sz:10},{t:"재", sz:10}], rs:2, fill:"#F2F2F2"}, ...heads.map(h=>({t:h, sz:10, fill:"#F2F2F2"}))]}, {h:46, cells:heads.map(()=>({t:"", sz:10}))}], hl:all, vl}), GAP(10));
        continue;
      }
      if(cls.contains("title-box")){
        const badge = n.querySelector(".badge"), title = txt(n.querySelector(".title-text") || n).replace(badge ? txt(badge) : "", "").trim();
        const box = [[0,0,1,1.2],[1,0,1,1.2]];
        B.push(Bk.form({cols:[PW], rows:[{h:34, cells:[{p:[{runs:[{t:title, sz:14, b:1}, ...(badge?[{t:`  [${txt(badge)}]`, sz:9}]:[])]}]}]}], hl:box, vl:box}), GAP(12));
        continue;
      }
      if(cls.contains("speech")){
        const sp = n.querySelector(".speaker"), ct = n.querySelector(".content") || n;
        const who = txt(sp).replace(/\n/g, " ");
        const hang = ENG.em(who + " ") * SZ;
        // 발언 안의 표는 표로 넣고, 나머지는 줄 단위 문단으로
        const segs = []; let buf = document.createElement("div");
        [...ct.childNodes].forEach(c => { if(c === sp) return; if(c.nodeType===1 && (c.tagName==="TABLE" || c.querySelector && c.querySelector("table"))){ segs.push({div:buf}); buf = document.createElement("div"); segs.push({tbl:c.tagName==="TABLE" ? c : c.querySelector("table")}); } else buf.appendChild(c.cloneNode(true)); });
        segs.push({div:buf});
        let first = true;
        segs.forEach(g => {
          if(g.tbl){ if(first){ para([{t:who, b:1}], {prev:4}); first = false; } tableBlock(g.tbl); B.push(GAP(4)); return; }
          lines(runsOf(g.div)).forEach(l => { para(first ? [{t:who + " ", b:1}, ...l] : l, first ? {ind:-hang, prev:4} : {l:hang + (l[0].t.startsWith("- ") ? 8 : 0), ind:0.01}); first = false; });
        });
        if(first) para([{t:who, b:1}], {prev:4});
        continue;
      }
      if(cls.contains("action-summary")){ para([{t:txt(n), b:1}], {l:60, prev:4}); continue; }
      if(cls.contains("agenda-box")){
        const box = [[0,0,1,1.2],[1,0,1,1.2]], ls = lines(runsOf(n));
        B.push(GAP(6), Bk.form({split:true, cols:[PW], rows:[{h:Math.max(30, ls.length*18+10), cells:[{va:"c", m:[4,8,4,8], p:ls.map(l=>({runs:l.map(r=>({t:r.t, b:r.b, sz:SZ})), al:"l", ls:150}))}]}], hl:box, vl:box}), GAP(6));
        continue;
      }
      if(cls.contains("signature-section")){
        // HTML의 표(제목 칸 + 내용 칸)를 한글 표로: 바깥 테두리만 있는 2칸 표
        const rs = [...n.querySelectorAll("tr")].map(tr => [...tr.children].map(txt));
        if(rs.length){
          const k = rs.length, w = 0.7, all2 = [[0,0,2,w],[k,0,2,w]], v2 = [[0,0,k,w],[2,0,k,w]];
          B.push(GAP(16), Bk.form({split:true, cols:[100, PW-100], rows:rs.map(r => ({h:22, cells:[{t:r[0]||"", sz:SZ, b:1, al:"l", m:[2,8,2,10]}, {t:r.slice(1).join(" "), sz:SZ, al:"l", m:[2,10,2,4]}]})), hl:all2, vl:v2}));
        } else {
          const ls = lines(runsOf(n)).map(l => l.map(r=>r.t).join(""));
          const box = [[0,0,1,0.7],[1,0,1,0.7]];
          B.push(GAP(16), Bk.form({cols:[PW], rows:[{h:ls.length*20+16, cells:[{va:"c", m:[6,10,6,10], p:ls.map(t=>({t, sz:SZ, al:"l", ls:160}))}]}], hl:box, vl:box}));
        }
        continue;
      }
      if(tag === "table"){ tableBlock(n); B.push(GAP(6)); continue; }
      if(/^h[1-6]$/.test(tag)){ para([{t:txt(n), b:1}], {sz: tag==="h1"?16:tag==="h2"?14:12.5, al: getComputedAlign(n), prev:6}); continue; }
      if(tag === "ul" || tag === "ol"){ [...n.children].filter(li => li.tagName === "LI").forEach((li, k) => para([{t: tag === "ol" ? `${(+n.getAttribute("start")||1)+k}. ` : "- "}, ...lines(runsOf(li)).flat()], {l:10})); continue; }
      if(tag === "pre"){ txt(n).split("\n").forEach(t => para([{t}], {l:10})); continue; }
      if(tag === "blockquote"){ lines(runsOf(n)).forEach(l => para(l, {l:16})); continue; }
      if(tag === "hr"){ B.push(RULE(0.7)); continue; }
      if(tag === "p" || ((tag === "div" || tag === "section" || tag === "span") && ![...n.children].some(c => /^(div|table|p|ul|ol|h\d|section)$/i.test(c.tagName)))){
        const ind = /padding-left|margin-left/.test(n.getAttribute("style")||"") || n.closest(".agenda-items") ? 14 : 0;
        lines(runsOf(n)).forEach(l => para(l, {al: getComputedAlign(n), l:ind}));
        continue;
      }
      if(n.children.length) walk(n);
      else if(txt(n)) para([{t:txt(n)}]);
    }
  };
  const getComputedAlign = n => { const st = (n.getAttribute("style")||"") + " " + (n.getAttribute("align")||""); return /center/.test(st) ? "c" : /right/.test(st) ? "r" : "l"; };
  walk(dom.body);
  if(!B.length) warns.push("읽을 수 있는 내용이 없습니다. AI가 준 HTML 전체(<!DOCTYPE html>부터 </html>까지)를 넣었는지 확인하세요.");
  const title = txt(dom.querySelector(".title-text") || dom.querySelector("h1") || dom.querySelector("h2") || dom.querySelector("h3") || dom.querySelector("title")) || "문서";
  return {blocks:B, title, warns};
}

/* 서식 없는 글(AI 답을 글자만 복사한 경우 등) → 간단한 HTML. 마크다운 표시(#, -, 1., **굵게**, | 표 |)를 읽는다 */
function plainToHtml(text){
  const e = t => esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  const L = String(text||"").replace(/\r/g, "").split("\n"), out = [];
  for(let i = 0; i < L.length; i++){
    const l = L[i];
    if(!l.trim()){ continue; }
    let m;
    if((m = /^(#{1,6})\s+(.*)$/.exec(l))){ const n = Math.min(3, m[1].length); out.push(`<h${n}>${e(m[2])}</h${n}>`); continue; }
    if(/^\s*\|.*\|\s*$/.test(l)){
      const rows = []; while(i < L.length && /^\s*\|.*\|\s*$/.test(L[i])){ if(!/^\s*\|[\s:|-]+\|\s*$/.test(L[i])) rows.push(L[i].trim().slice(1, -1).split("|").map(c => c.trim())); i++; } i--;
      out.push(`<table>${rows.map((r, k) => `<tr>${r.map(c => k === 0 ? `<th>${e(c)}</th>` : `<td>${e(c)}</td>`).join("")}</tr>`).join("")}</table>`); continue;
    }
    if(/^\s*[-*•]\s+/.test(l)){ const items = []; while(i < L.length && /^\s*[-*•]\s+/.test(L[i])){ items.push(`<li>${e(L[i].replace(/^\s*[-*•]\s+/, ""))}</li>`); i++; } i--; out.push(`<ul>${items.join("")}</ul>`); continue; }
    if(/^\s*\d+[.)]\s+/.test(l)){ const items = []; const st = +/\d+/.exec(l)[0]; while(i < L.length && /^\s*\d+[.)]\s+/.test(L[i])){ items.push(`<li>${e(L[i].replace(/^\s*\d+[.)]\s+/, ""))}</li>`); i++; } i--; out.push(`<ol start="${st}">${items.join("")}</ol>`); continue; }
    if(/^\s*(---+|\*\*\*+)\s*$/.test(l)){ out.push("<hr>"); continue; }
    out.push(`<p>${e(l)}</p>`);
  }
  return `<!DOCTYPE html><html><body>${out.join("\n")}</body></html>`;
}
/* 문서 틀: 기본 | 가정통신문 | 내부 보고. info = {school, date, dept} */
const HTML_FRAMES = {basic:"기본", letter:"가정통신문", report:"내부 보고"};
function frameBlocks(frame, r, info = {}){
  const school = info.school || "", date = info.date || "";
  if(frame === "letter"){
    return [P("가 정 통 신 문", {sz:22, b:1, al:"c"}), ...(school ? [P(school, {sz:12, al:"c"})] : []), GAP(4), RULE(1.5), GAP(10),
      ...r.blocks, GAP(18), ...(date ? [P(date, {sz:13, al:"c"})] : []), GAP(10), P(school ? `${school}장` : "학교장", {sz:17, b:1, al:"c"})];
  }
  if(frame === "report"){
    return [P(r.title || "보고", {sz:17, b:1, al:"c"}), GAP(4), P([date, info.dept].filter(Boolean).join("  "), {sz:11, al:"r"}), RULE(0.7), GAP(8), ...r.blocks];
  }
  return r.blocks;
}
/* HTML(또는 서식 없는 글) → {blob, title, warns}. opt: {frame, info, page, pageNum} */
async function htmlToHwpx(src, opt = {}){
  const html = /<\w+[^>]*>/.test(src) ? src : plainToHtml(src);
  const r = htmlToBlocks(html);
  if(opt.frame && opt.frame !== "basic"){
    const firstH = r.blocks.length && opt.frame === "report" ? 1 : 0;   // 내부 보고: 첫 제목은 틀의 제목으로 씀
    if(firstH && /^<h1|^<h2/i.test(html.replace(/^[\s\S]*?<body[^>]*>\s*/i, ""))) r.blocks.shift();
  }
  const blocks = frameBlocks(opt.frame || "basic", r, opt.info);
  const blob = await ENG.hwpx(blocks, r.title, {noFill:true, pageNum: opt.pageNum !== false, ...(opt.page ? {page:opt.page} : {})});
  return {blob, title:r.title, warns:r.warns};
}
