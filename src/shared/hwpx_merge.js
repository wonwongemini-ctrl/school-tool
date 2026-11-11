/* ===== [공유] HWPX 합치기 — 원본: school-tool/src/shared/hwpx_merge.js =====
   여러 .hwpx를 하나로 합친다. 파일마다 '구역(section)' 하나씩으로 넣어 원래 쪽 설정(가로·세로)을 지킨다.
   - 글자·문단·테두리·탭·번호·글머리표·스타일·글꼴 목록을 바탕 문서 머리(header.xml)에 덧붙이고 번호(ID)를 다시 매긴다.
   - 그림 등 BinData는 파일마다 이름 앞에 a1_, a2_…를 붙여 겹치지 않게 한다.
   - 편집 용지·여백: 각 파일의 한글 설정을 그대로 둔다(내용이 다음 쪽으로 밀려 빈 쪽이 생기지 않게).
   - 각 파일은 새 쪽에서 시작하고, 파일 끝의 빈 줄은 지워 빈 쪽이 끼지 않게 한다.
   - 원래 쪽번호(쪽 번호 매기기, 머리말·꼬리말의 쪽 번호)는 모두 지우고, opt.pageNum이면 아래 가운데 "- 1 -"를 새로 넣는다.
   - part.no가 있으면 '안건번호' 칸 옆 칸에 번호를 넣는다(fillAgendaNo).
   필요한 것: JSZip, hwpx_engine.js(HWPX_TPL). 쓰는 곳: 운영업무 도우미 안건집, 한글 파일 합치기. */
const MERGE_PAGE = {header:4252, footer:4252, left:4535, right:4535, top:5668, bottom:4252, width:59528, height:84188}; // HWPUNIT (1mm = 283.465)

const HXesc = s => String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const HX = {
  items(hdr, tag){
    const re = new RegExp(`<hh:${tag}\\b([^>]*?)(/>|>([\\s\\S]*?)</hh:${tag}>)`, "g"), out = [];
    let m; while((m = re.exec(hdr))) out.push(m[0]);
    return out;
  },
  idOf: x => +(/\bid="(\d+)"/.exec(x)||[])[1],
  maxId(hdr, tag){ let mx = -1; for(const x of HX.items(hdr, tag)){ const v = HX.idOf(x); if(v > mx) mx = v; } return mx; },
  /* 목록 끝에 붙이고 itemCnt를 늘린다 */
  append(hdr, list, tag, xs){
    if(!xs.length) return hdr;
    if(!hdr.includes(`<hh:${list}`)) {
      return hdr.replace("</hh:refList>", () => `<hh:${list} itemCnt="${xs.length}">${xs.join("")}</hh:${list}></hh:refList>`);
    }
    return hdr.replace(new RegExp(`<hh:${list} itemCnt="(\\d+)"`), (m, n) => `<hh:${list} itemCnt="${+n + xs.length}"`).replace(`</hh:${list}>`, () => xs.join("") + `</hh:${list}>`);
  },
  attr: (x, name, fn) => x.replace(new RegExp(`\\b${name}="(\\d+)"`, "g"), (m, v) => `${name}="${fn(+v)}"`)
};

async function mergeHwpx(parts, opt = {}){
  /* parts: [{data: ArrayBuffer|Blob, cover?:bool, no?:"2026-25", pageStart?:1}]  opt: {title, pageNum:true} */
  let hdr = HWPX_TPL.files["Contents/header.xml"];
  const files = [], sections = [], bins = [];
  const LANGS = ["HANGUL","LATIN","HANJA","JAPANESE","OTHER","SYMBOL","USER"];
  const warns = [];
  for(let pi = 0; pi < parts.length; pi++){
    const part = parts[pi], pre = `a${pi+1}_`;
    const zip = await JSZip.loadAsync(part.data);
    const names = Object.keys(zip.files).filter(n => !zip.files[n].dir);
    const ph = await zip.file("Contents/header.xml").async("string");
    if(names.some(n => /masterpage/i.test(n))) warns.push(`${part.label||pi+1}: 바탕쪽이 있는 문서는 바탕쪽이 빠질 수 있습니다`);
    /* --- 글꼴: 언어별로 이름이 같으면 같은 번호, 없으면 덧붙임 --- */
    const fontMap = {};
    for(const lang of LANGS){
      fontMap[lang] = {};
      const re = new RegExp(`<hh:fontface lang="${lang}"[^>]*>([\\s\\S]*?)</hh:fontface>`);
      const src = (re.exec(ph)||[])[1] || "", dstM = re.exec(hdr); if(!dstM) continue;
      let dst = dstM[1]; const add = [];
      let next = HX.items(dst, "font").length;
      for(const f of HX.items(src, "font")){
        const face = (/face="([^"]*)"/.exec(f)||[])[1], id = HX.idOf(f);
        const hit = HX.items(dst, "font").find(g => (/face="([^"]*)"/.exec(g)||[])[1] === face);
        if(hit) fontMap[lang][id] = HX.idOf(hit);
        else { fontMap[lang][id] = next; add.push(f.replace(/\bid="\d+"/, `id="${next}"`)); next++; }
      }
      if(add.length){
        dst += add.join("");
        hdr = hdr.replace(re, m => m.replace(/fontCnt="\d+"/, `fontCnt="${next}"`).replace(/>[\s\S]*<\/hh:fontface>$/, () => `>${dst}</hh:fontface>`));
      }
    }
    /* --- 목록별 번호 옮기기 --- */
    /* 새 번호 = 바탕 문서의 마지막 번호 + 1부터 빈자리 없이 이어지게 (테두리·번호 목록은 1부터, 글자·문단 모양은 0부터 시작한다.
       한글은 목록을 순서대로 읽으므로 번호가 건너뛰면 다른 칸의 모양이 붙는다) */
    const off = {};
    for(const t of ["borderFill","charPr","tabPr","numbering","bullet","paraPr"]){
      const ids = HX.items(ph, t).map(HX.idOf), mn = ids.length ? Math.min(...ids) : 0;
      off[t] = HX.maxId(hdr, t) + 1 - mn;
      if(HX.maxId(hdr, t) < 0) off[t] = (t==="borderFill"||t==="numbering"||t==="bullet" ? 1 : 0) - mn;
    }
    const mapBy = (t, v) => off[t] + v;
    const bf = v => mapBy("borderFill", v), cp = v => v >= 4294967295 ? v : mapBy("charPr", v);
    const fix = {
      borderFill: x => x.replace(/\bid="(\d+)"/, (m,v)=>`id="${bf(+v)}"`),
      charPr: x => {
        x = x.replace(/\bid="(\d+)"/, (m,v)=>`id="${cp(+v)}"`);
        x = HX.attr(x, "borderFillIDRef", bf);
        return x.replace(/<hh:fontRef ([^>]*)\/>/, (m, a) => "<hh:fontRef " + a.replace(/(\w+)="(\d+)"/g, (mm, k, v) => { const L = k.toUpperCase(); return `${k}="${fontMap[L] && fontMap[L][+v] != null ? fontMap[L][+v] : 0}"`; }) + "/>");
      },
      tabPr: x => x.replace(/\bid="(\d+)"/, (m,v)=>`id="${mapBy("tabPr", +v)}"`),
      numbering: x => HX.attr(x.replace(/\bid="(\d+)"/, (m,v)=>`id="${mapBy("numbering", +v)}"`), "charPrIDRef", cp),
      bullet: x => HX.attr(x.replace(/\bid="(\d+)"/, (m,v)=>`id="${mapBy("bullet", +v)}"`), "charPrIDRef", cp),
      paraPr: x => {
        x = x.replace(/\bid="(\d+)"/, (m,v)=>`id="${mapBy("paraPr", +v)}"`);
        x = HX.attr(x, "tabPrIDRef", v => mapBy("tabPr", v));
        x = HX.attr(x, "borderFillIDRef", bf);
        return x.replace(/<hh:heading type="(\w+)" idRef="(\d+)"/g, (m, ty, v) => ty==="NONE" ? m : `<hh:heading type="${ty}" idRef="${ty==="BULLET" ? mapBy("bullet", +v) : mapBy("numbering", +v)}"`);
      }
    };
    const LIST = {borderFill:"borderFills", charPr:"charProperties", tabPr:"tabProperties", numbering:"numberings", bullet:"bullets", paraPr:"paraProperties"};
    for(const t of Object.keys(LIST)) hdr = HX.append(hdr, LIST[t], t, HX.items(ph, t).map(fix[t]));
    /* 스타일: 이름이 같으면 바탕 문서의 스타일을 쓰고, 없으면 덧붙임 */
    const styleMap = {}; const baseStyles = HX.items(hdr, "style"); let sNext = HX.maxId(hdr, "style") + 1; const addS = [];
    for(const st of HX.items(ph, "style")){
      const nm = (/\bname="([^"]*)"/.exec(st)||[])[1], id = HX.idOf(st);
      const hit = baseStyles.find(b => (/\bname="([^"]*)"/.exec(b)||[])[1] === nm);
      if(hit) styleMap[id] = HX.idOf(hit); else { styleMap[id] = sNext++; }
    }
    for(const st of HX.items(ph, "style")){
      const id = HX.idOf(st); if(baseStyles.some(b => HX.idOf(b) === styleMap[id])) continue;
      let x = st.replace(/\bid="(\d+)"/, `id="${styleMap[id]}"`);
      x = HX.attr(x, "paraPrIDRef", v => mapBy("paraPr", v)); x = HX.attr(x, "charPrIDRef", cp); x = HX.attr(x, "nextStyleIDRef", v => styleMap[v] ?? 0);
      addS.push(x);
    }
    hdr = HX.append(hdr, "styles", "style", addS);

    /* --- 그림 등 BinData --- */
    const hpf = zip.file("Contents/content.hpf") ? await zip.file("Contents/content.hpf").async("string") : "";
    const binMap = {};
    for(const m of hpf.matchAll(/<opf:item ([^>]*?)\/>/g)){
      const a = m[1], id = (/\bid="([^"]+)"/.exec(a)||[])[1], href = (/href="([^"]+)"/.exec(a)||[])[1];
      if(!id || !href || !/^BinData\//.test(href)) continue;
      const nid = pre + id, nhref = href.replace(/^BinData\//, `BinData/${pre}`);
      binMap[id] = nid;
      const f = zip.file(href); if(f) files.push([nhref, await f.async("uint8array")]);
      bins.push(`<opf:item ${a.replace(/\bid="[^"]+"/, `id="${nid}"`).replace(/href="[^"]+"/, `href="${nhref}"`)}/>`);
    }
    /* --- 구역 --- */
    const secNames = names.filter(n => /^Contents\/section\d+\.xml$/.test(n)).sort((x, y) => +x.match(/(\d+)\.xml/)[1] - +y.match(/(\d+)\.xml/)[1]);
    for(let si = 0; si < secNames.length; si++){
      let s = await zip.file(secNames[si]).async("string");
      if(part.no && si===0){ const r = fillAgendaNo(s, part.no); s = r.xml; if(!r.ok) warns.push(`${part.label||part.no}: '안건번호' 칸을 찾지 못해 번호를 넣지 못했습니다`); }
      s = HX.attr(s, "charPrIDRef", cp);
      s = HX.attr(s, "paraPrIDRef", v => mapBy("paraPr", v));
      s = HX.attr(s, "borderFillIDRef", bf);
      s = HX.attr(s, "styleIDRef", v => styleMap[v] ?? 0);
      s = HX.attr(s, "outlineShapeIDRef", v => mapBy("numbering", v));
      s = s.replace(/binaryItemIDRef="([^"]+)"/g, (m, v) => `binaryItemIDRef="${binMap[v] || v}"`);
      s = s.replace(/memoShapeIDRef="\d+"/g, 'memoShapeIDRef="0"');
      s = normalizeSection(s, {pageNum: opt.pageNum !== false && !part.cover, pageStart: si===0 ? part.pageStart : null});
      sections.push(s);
    }
  }
  /* --- 꾸러미 만들기 --- */
  hdr = hdr.replace(/secCnt="\d+"/, `secCnt="${sections.length}"`);
  let hpf = HWPX_TPL.files["Contents/content.hpf"]
    .replace(/<opf:title\/>|<opf:title>[^<]*<\/opf:title>/, () => `<opf:title>${HXesc(opt.title||"")}</opf:title>`).replace(/synthetic-fixture-author/g, (typeof APP!=="undefined" ? APP.name : "학교 업무 도구"));
  const secItems = sections.map((_, i) => `<opf:item id="section${i}" href="Contents/section${i}.xml" media-type="application/xml"/>`).join("");
  hpf = hpf.replace(/<opf:item id="section0"[^>]*\/>/, () => secItems + bins.join(""))
           .replace(/<opf:itemref idref="section0"[^>]*\/>/, () => sections.map((_, i) => `<opf:itemref idref="section${i}" linear="yes"/>`).join(""));
  const zip = new JSZip();
  zip.file("mimetype", "application/hwp+zip", {compression:"STORE"});
  const NF = {createFolders:false};
  for(const [n, v] of Object.entries(HWPX_TPL.files)){
    if(n === "Contents/header.xml") zip.file(n, hdr, NF);
    else if(n === "Contents/content.hpf") zip.file(n, hpf, NF);
    else zip.file(n, v, NF);
  }
  sections.forEach((s, i) => zip.file(`Contents/section${i}.xml`, s, NF));
  files.forEach(([n, v]) => zip.file(n, v, NF));
  zip.file("Preview/PrvText.txt", opt.title || "", NF);
  const blob = await zip.generateAsync({type:"blob", mimeType:"application/hwp+zip", compression:"DEFLATE"});
  return {blob, warns};
}

/* 쪽번호 정리 + 끝의 빈 문단 지우기 (용지·여백은 각 파일의 한글 설정 그대로 둔다 — 사용자 결정) */
function normalizeSection(s, o){
  // 홀수 쪽 시작 등으로 빈 쪽이 끼지 않게: 구역은 바로 다음 쪽에서 시작
  s = s.replace(/(<hp:startNum [^>]*?)pageStartsOn="\w+"/, '$1pageStartsOn="BOTH"');
  s = trimTailParas(s);
  // 원래 쪽번호 지우기: 쪽 번호 매기기, 쪽 번호 감추기, 머리말·꼬리말 안의 쪽 번호
  s = s.replace(/<hp:pageNum\b[^>]*\/>/g, "").replace(/<hp:pageHiding\b[^>]*\/>/g, "");
  s = s.replace(/<hp:autoNum\b[^>]*numType="(?:PAGE|TOTAL_PAGE)"[^>]*?(?:\/>|>[\s\S]*?<\/hp:autoNum>)/g, "");
  s = s.replace(/<hp:ctrl>\s*<\/hp:ctrl>/g, "");
  s = s.replace(/(<hp:startNum [^>]*?)page="\d+"/, `$1page="${o.pageStart || 0}"`);
  s = s.replace(/hideFirstPageNum="\d"/, 'hideFirstPageNum="0"');
  if(o.pageNum) s = s.replace("</hp:secPr>", '</hp:secPr><hp:ctrl><hp:pageNum pos="BOTTOM_CENTER" formatType="DIGIT" sideChar="-"/></hp:ctrl>');
  return s;
}

/* 구역 끝의 빈 문단(글자·표·그림 없는 줄, 쪽 나누기만 있는 줄)을 지운다 — 다음 파일 앞에 빈 쪽이 생기지 않게 */
function trimTailParas(s){
  const top = [], re = /<hp:p\b[^>]*?(\/>|>)|<\/hp:p>/g; let m, depth = 0, start = -1;
  while((m = re.exec(s))){
    if(m[0].startsWith("</")){ depth--; if(depth===0) top.push([start, m.index + m[0].length]); }
    else if(m[1]==="/>"){ if(depth===0) top.push([m.index, m.index + m[0].length]); }
    else { if(depth===0) start = m.index; depth++; }
  }
  const OBJ = /<hp:(tbl|pic|rect|ellipse|line|container|ole|equation|textart|polygon|curve|arc|connectLine|chart|video)\b/;
  const empty = x => !OBJ.test(x) && !/<hp:secPr\b/.test(x) && ![...x.matchAll(/<hp:t>([^<]*)<\/hp:t>/g)].some(a => a[1].trim());
  let cut = 0;
  while(top.length > 1 && empty(s.slice(...top[top.length-1]))){ const [a, b] = top.pop(); s = s.slice(0, a) + s.slice(b); cut++; }
  return s;
}

/* 안건 파일의 '안건번호' 칸 다음 칸에 번호를 넣는다 */
function fillAgendaNo(xml, no){
  const re = /<hp:tc\b[\s\S]*?<\/hp:tc>/g; let m, prev = null;
  const textOf = x => [...x.matchAll(/<hp:t>([^<]*)<\/hp:t>/g)].map(a => a[1]).join("").replace(/\s/g, "");
  while((m = re.exec(xml))){
    if(prev && textOf(prev.x) === "안건번호"){
      let cell = m[0], done = false;
      cell = cell.replace(/<hp:t>[^<]*<\/hp:t>|<hp:t\/>/g, t => { if(done) return "<hp:t/>"; done = true; return `<hp:t>${HXesc(no)}</hp:t>`; });
      if(!done) cell = cell.replace(/<hp:run ([^>]*?)\/>/, (r, a) => { done = true; return `<hp:run ${a}><hp:t>${HXesc(no)}</hp:t></hp:run>`; });
      if(!done) cell = cell.replace(/(<hp:run [^>]*>)/, (r) => { done = true; return `${r}<hp:t>${HXesc(no)}</hp:t>`; });
      cell = cell.replace(/<hp:linesegarray>[\s\S]*?<\/hp:linesegarray>/g, "");
      return {xml: xml.slice(0, m.index) + cell + xml.slice(m.index + m[0].length), ok: done};
    }
    prev = {x: m[0]};
  }
  return {xml, ok:false};
}

