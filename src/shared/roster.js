/* ===== [공유] 명단 읽기 — 원본: school-tool/src/shared/roster.js =====
   명패·라벨·서명부가 같은 규칙으로 명단을 읽는다.
   - 한 줄에 한 사람. 칸 나누기: 탭(엑셀 복사) 또는 쉼표(,). 칸이 없으면 띄어쓰기.
   - 괄호 "(…)"는 바로 앞 낱말의 보조(작은 글씨). 괄호를 빼고 보면: 맨 끝 = 이름, 바로 앞 = 직위, 그보다 앞 = 소속.
     이름의 보조 → note(라벨: 이름 옆 작은 글씨, 서명부: 비고), 직위의 보조 → posSub, 소속의 보조는 소속 글에 괄호째 붙임.
   - 한 글자씩 띄운 줄("위 원 장")은 제목(큰 글자 한 줄).
   - 첫 줄이 머리글(성명·이름 / 직위·직책 / 소속·부서 / 비고)이면 칸 순서와 상관없이 그대로 읽고, 머리글 줄은 뺀다.
   parseRoster(글, {roles:[칸마다 'org'|'pos'|'name'|'note'|'skip']})
     → {rows:[{org,pos,posSub,name,note,title}], mode:'cells'|'spaces', ncol, roles, header} */
const ROSTER_ROLE = {org:"소속", pos:"직위", name:"이름", note:"덧붙임", skip:"안 씀"};
const ROSTER_HEAD = [
  ["name", /^(성\s*명|이\s*름|성함|위원명|강사명|참석자)$/],
  ["pos",  /^(직\s*위|직\s*책|직\s*급|직\s*명|구\s*분|역\s*할)$/],
  ["org",  /^(소\s*속|부\s*서|기\s*관|학\s*교|소속\s*기관|학\s*년\s*반?|반)$/],
  ["note", /^(비\s*고|자\s*녀|메\s*모)$/],
];
function rosterCells(line){
  if(line.includes("\t")) return line.split("\t").map(x => x.trim());
  if(line.includes(",")) return line.split(",").map(x => x.trim());
  return null;
}
function rosterHeadRole(cell){ for(const [k, re] of ROSTER_HEAD) if(re.test(cell)) return k; return null; }
function rosterDefaultRoles(n){
  // 맨 끝 = 이름, 바로 앞 = 직위, 그 앞 = 소속
  return Array.from({length:n}, (_, i) => i === n-1 ? "name" : i === n-2 ? "pos" : "org");
}
/* 글 → 낱말 목록 [{w, sub}]: 괄호 안은 바로 앞 낱말의 sub */
function rosterWords(str){
  const out = []; let i = 0; str = String(str || "");
  while(i < str.length){
    const ch = str[i];
    if(ch === "(" || ch === "（"){
      let d = 1, j = i + 1; while(j < str.length && d){ if(str[j] === "(" || str[j] === "（") d++; else if(str[j] === ")" || str[j] === "）") d--; j++; }
      const inner = str.slice(i + 1, d ? j : j - 1).trim();
      if(out.length) out[out.length-1].sub = out[out.length-1].sub ? `${out[out.length-1].sub} ${inner}` : inner;
      else out.push({w:"", sub:inner});
      i = j; continue;
    }
    if(/\s/.test(ch)){ i++; continue; }
    let j = i; while(j < str.length && !/[\s(（]/.test(str[j])) j++;
    out.push({w:str.slice(i, j), sub:""}); i = j;
  }
  return out;
}
const rosterJoin = ws => ws.map(x => x.w + (x.sub ? `(${x.sub})` : "")).join(" ");
function rosterNote(s){ const ws = rosterWords(s); if(!ws.length) return ["", ""]; const last = ws[ws.length-1]; return [ws.slice(0, -1).map(x => x.w + (x.sub ? `(${x.sub})` : "")).concat(last.w).join(" ").trim(), last.sub]; }
function rosterIsTitle(t){ const w = t.split(/\s+/).filter(Boolean); return w.length >= 2 && w.every(x => [...x].length === 1); }
function parseRoster(text, opt = {}){
  const lines = String(text || "").replace(/\r/g, "").split("\n").filter(l => l.trim());
  const out = {rows:[], mode:"spaces", ncol:0, roles:null, header:false};
  if(!lines.length) return out;
  const cellLines = lines.map(rosterCells);
  const isCells = cellLines.some(Boolean);
  if(isCells){
    out.mode = "cells";
    let rows = cellLines.map((c, i) => c || [lines[i].trim()]);
    // 괄호만 있는 칸은 바로 앞 칸의 보조로 (그 칸은 비움)
    rows = rows.map(r => { const o = []; r.forEach(v => { if(/^[(（].*[)）]$/.test(v) && o.some(Boolean)){ let k = o.length - 1; while(k > 0 && !o[k]) k--; o[k] = `${o[k]} ${v}`; } else o.push(v); }); return o; });
    rows = rows.map(r => { r = r.slice(); while(r.length > 1 && !r[r.length-1]) r.pop(); return r; });
    out.ncol = Math.max(...rows.map(r => r.length));
    const hr = rows[0].map(rosterHeadRole);
    if(hr.includes("name")){ out.header = true; out.roles = rows[0].map((c, i) => hr[i] || "skip"); rows = rows.slice(1); }
    if(opt.roles && opt.roles.length === out.ncol) out.roles = opt.roles.slice();
    if(!out.roles) out.roles = rosterDefaultRoles(out.ncol);
    rows.forEach(r => {
      if(r.length === 1 && out.ncol > 1){ out.rows.push(rosterSpaces(r[0])); return; }   // 칸 없이 쓴 줄은 띄어쓰기 규칙
      // 칸 수가 적은 줄은 오른쪽(이름) 기준으로 맞춘다
      const pad = out.header ? r : Array(Math.max(0, out.ncol - r.length)).fill("").concat(r);
      const p = {org:"", pos:"", posSub:"", name:"", note:"", title:""};
      pad.forEach((v, i) => { const k = out.roles[i]; if(!k || k === "skip" || !v) return; p[k] = p[k] ? `${p[k]} ${v}` : v; });
      if(p.name){ const [n, nt] = rosterNote(p.name); p.name = n; if(nt) p.note = p.note ? `${nt} ${p.note}` : nt; }
      if(p.pos){ const [n, nt] = rosterNote(p.pos); p.pos = n; p.posSub = nt; }
      if(!p.name && !p.pos && !p.org) return;
      if(p.name && !p.pos && !p.org && rosterIsTitle(p.name)){ p.title = p.name.replace(/\s+/g, ""); p.name = ""; }
      out.rows.push(p);
    });
  } else {
    lines.forEach(l => out.rows.push(rosterSpaces(l)));
  }
  return out;
}
function rosterSpaces(line){
  const p = {org:"", pos:"", posSub:"", name:"", note:"", title:""};
  const ws = rosterWords(line.trim());
  if(ws.every(x => !x.sub) && rosterIsTitle(line.trim())){ p.title = line.replace(/\s+/g, ""); return p; }
  const nm = ws.pop(); if(nm){ p.name = nm.w; p.note = nm.sub; }
  const ps = ws.pop(); if(ps){ p.pos = ps.w; p.posSub = ps.sub; }
  p.org = rosterJoin(ws);
  return p;
}
/* 괄호 없이 쓴 것 같은 줄 찾기: 직위 자리에 이름 같은 말(한글 2~4자, 직위 끝말 아님)이 있고 앞에 글이 더 있을 때 */
function rosterSuspect(p){
  if(!p.pos || !p.org || p.posSub) return false;
  return /\d/.test(p.pos) || (/^[가-힣]{2,4}$/.test(p.pos) && !/(장|감|사|원|관|위원|교사|대표|간사|직|님|부|모|생|실|과|팀)$/.test(p.pos));
}
/* 엑셀 파일 → 탭으로 나눈 글 (SheetJS가 있어야 함) */
async function rosterFromFile(file){
  if(/\.(txt|csv|tsv)$/i.test(file.name)){
    const t = await file.text();
    return /\.csv$/i.test(file.name) ? t.split(/\r?\n/).map(l => l.split(",").join("\t")).join("\n") : t;
  }
  if(typeof XLSX === "undefined") await new Promise((ok, no) => { const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"; s.onload = ok; s.onerror = () => no(new Error("엑셀 읽기 도구를 불러오지 못했어요(인터넷 확인)")); document.head.appendChild(s); });
  const wb = XLSX.read(await file.arrayBuffer(), {type:"array"});
  const ws = wb.Sheets[wb.SheetNames[0]];
  const aoa = XLSX.utils.sheet_to_json(ws, {header:1, raw:false, defval:""});
  // 머리글 위의 제목 줄(칸 하나만 찬 줄)은 건너뛴다
  let s = 0; while(s < aoa.length - 1 && aoa[s].filter(v => String(v).trim()).length <= 1) s++;
  return aoa.slice(s).map(r => r.map(v => String(v).replace(/\s*\n\s*/g, " ").trim()).join("\t")).filter(l => l.replace(/\t/g, "").trim()).join("\n");
}
