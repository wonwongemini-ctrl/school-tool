/* ===== [공유] 거꾸로 면이 있는 인쇄물의 한글 파일(명패·견출지) — 원본: school-tool/src/shared/upside_hwpx.js =====
   한글은 돌린 글상자의 글자를 돌리지 않는다(상자만 돎). 그래서 접어서 세우는 '윗면'은
   이 PC의 글꼴로 거꾸로 그린 그림으로 넣고, 아랫면은 꾸밈 그림 + 글상자(한글에서 고칠 수 있음)로 넣는다.
   필요한 것: hwpx_engine.js(ENG), hwpx_parts.js(P, PR), JSZip, plates.js(plateDecoSvg).
   - plateHwpx(plates, o): o = plateSheetHtml과 같은 {w, h, style, flip, font, bgSrc}
   - indexHwpx(sets, o): o = indexTabsHtml과 같은 {w, h} */
const UPS = (() => {
  const HU = mm => Math.round(mm * 7200 / 25.4), PT = mm => mm / 0.3528;
  const FONT = {1:`"함초롬바탕","HCR Batang","바탕",Batang,serif`, 0:`"함초롬돋움","HCR Dotum","돋움",Dotum,sans-serif`};
  const I = `e1="1" e2="0" e3="0" e4="0" e5="1" e6="0"`;
  const xesc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const place = (w, h) => `<hp:offset x="0" y="0"/><hp:orgSz width="${w}" height="${h}"/><hp:curSz width="${w}" height="${h}"/><hp:flip horizontal="0" vertical="0"/><hp:rotationInfo angle="0" centerX="${Math.round(w/2)}" centerY="${Math.round(h/2)}" rotateimage="1"/><hp:renderingInfo><hc:transMatrix ${I}/><hc:scaMatrix ${I}/><hc:rotMatrix ${I}/></hp:renderingInfo>`;
  const pos = (x, y, w, h) => `<hp:sz width="${w}" widthRelTo="ABSOLUTE" height="${h}" heightRelTo="ABSOLUTE" protect="0"/><hp:pos treatAsChar="0" affectLSpacing="0" flowWithText="0" allowOverlap="1" holdAnchorAndSO="0" vertRelTo="PAPER" horzRelTo="PAPER" vertAlign="TOP" horzAlign="LEFT" vertOffset="${y}" horzOffset="${x}"/><hp:outMargin left="0" right="0" top="0" bottom="0"/>`;
  const fit = (n, max) => Math.max(1, Math.min(Math.round(n), max));

  /* 쪽마다 도형을 놓은 한글 파일. pages = [[도형…]…]
     도형: {k:'rect', x,y,w,h(mm), runs:[{t, sz(pt), b, f, sp}] 또는 paras:[{runs, al:'l'|'c'|'r'}], va:'CENTER'|'TOP', line:'#999'|null, lineW(mm), dash, m:[왼,오,위,아래](mm)}
           {k:'pic', x,y,w,h(mm), canvas, behind(글 뒤로)} — 같은 canvas는 그림 파일 하나로 */
  async function shapesHwpx(pages, opt = {}){
    const styles = new Map(), key = r => [r.sz, r.b ? 1 : 0, r.f || 0, r.sp || 0].join("|");
    const parasOf = s => s.paras || (s.runs ? [{runs:s.runs, al:"c"}] : []);
    pages.flat().forEach(s => parasOf(s).flatMap(q => q.runs).forEach(r => { const k = key(r); if(!styles.has(k)) styles.set(k, {mk:`§S${styles.size}§`, r}); }));
    const blocks = [];
    pages.forEach((pg, i) => {
      if(i) blocks.push(ENG.B.pb());
      const runs = [{t:`§P${i}§`, sz:6}]; if(i === 0) styles.forEach(v => runs.push({t:v.mk, sz:v.r.sz, b:v.r.b, f:v.r.f || 0, sp:v.r.sp || 0}));
      blocks.push(PR(runs, {al:"c", ls:100}));
      if(i === 0) ["l", "r"].forEach(a => blocks.push(PR([{t:`§A${a}§`, sz:6}], {al:a, ls:100})));
    });
    const land = !!opt.landscape;
    const blob = await ENG.hwpx(blocks, opt.title || "", {noFill:true, page:{top:3, header:0, footer:0, bottom:3, left:3, right:3}});
    const zip = await JSZip.loadAsync(blob);
    let sec = await zip.file("Contents/section0.xml").async("string");
    if(land) sec = sec.replace('landscape="WIDELY"', 'landscape="NARROWLY"');
    const cpOf = new Map();
    styles.forEach((v, k) => { const m = sec.match(new RegExp(`<hp:run charPrIDRef="(\\d+)"><hp:t>${v.mk}</hp:t></hp:run>`)); cpOf.set(k, m ? m[1] : "0"); });
    const ppOf = mk => { const m = sec.match(new RegExp(`<hp:p id="\\d+" paraPrIDRef="(\\d+)"[^>]*><hp:run charPrIDRef="\\d+"><hp:t>${mk}</hp:t>`)); return m ? m[1] : null; };
    const PC = ppOf("§P0§") || "0", PA = {c:PC, l:ppOf("§Al§") || PC, r:ppOf("§Ar§") || PC};
    sec = sec.replace(/<hp:p id="\d+" paraPrIDRef="\d+"[^>]*><hp:run charPrIDRef="\d+"><hp:t>§A[lr]§<\/hp:t><\/hp:run><\/hp:p>/g, "");
    let id = 2000, nb = 0; const bins = [], binOf = new Map();
    const shape = async s => {
      const w = HU(s.w), h = HU(s.h), i = ++id;
      if(s.k === "pic"){
        let bid = binOf.get(s.canvas);
        if(!bid){ const bl = await new Promise(r => s.canvas.toBlob(r, "image/png")); bid = `image${++nb}`; bins.push({id:bid, data:new Uint8Array(await bl.arrayBuffer())}); binOf.set(s.canvas, bid); }
        const dw = s.canvas.width*75, dh = s.canvas.height*75;
        return `<hp:pic id="${i}" zOrder="${i}" numberingType="PICTURE" textWrap="${s.behind ? "BEHIND_TEXT" : "IN_FRONT_OF_TEXT"}" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" href="" groupLevel="0" instid="${i+5000}" reverse="0">${place(w, h)}<hc:img binaryItemIDRef="${bid}" bright="0" contrast="0" effect="REAL_PIC" alpha="0"/>`
          + `<hp:imgRect><hc:pt0 x="0" y="0"/><hc:pt1 x="${w}" y="0"/><hc:pt2 x="${w}" y="${h}"/><hc:pt3 x="0" y="${h}"/></hp:imgRect><hp:imgClip left="0" right="${dw}" top="0" bottom="${dh}"/><hp:inMargin left="0" right="0" top="0" bottom="0"/><hp:imgDim dimwidth="${dw}" dimheight="${dh}"/><hp:effects/>${pos(HU(s.x), HU(s.y), w, h)}<hp:shapeComment>${s.alt || "그림입니다."}</hp:shapeComment></hp:pic>`;
      }
      const paras = parasOf(s).map(q => `<hp:p id="0" paraPrIDRef="${PA[q.al || "c"]}" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">${q.runs.map(r => `<hp:run charPrIDRef="${cpOf.get(key(r))}"><hp:t>${xesc(r.t)}</hp:t></hp:run>`).join("") || "<hp:run charPrIDRef=\"0\"><hp:t/></hp:run>"}</hp:p>`).join("") || `<hp:p id="0" paraPrIDRef="${PC}" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0"><hp:run charPrIDRef="0"><hp:t/></hp:run></hp:p>`;
      const on = !!s.line, mg = (s.m || [0, 0, 0, 0]).map(HU);
      return `<hp:rect id="${i}" zOrder="${i}" numberingType="PICTURE" textWrap="IN_FRONT_OF_TEXT" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" href="" groupLevel="0" instid="${i+5000}" ratio="0">${place(w, h)}`
        + `<hp:lineShape color="${s.line || "#000000"}" width="${on ? HU(s.lineW || 0.2) : 0}" style="${on ? (s.dash ? "DASH" : "SOLID") : "NONE"}" endCap="FLAT" headStyle="NORMAL" tailStyle="NORMAL" headfill="1" tailfill="1" headSz="MEDIUM_MEDIUM" tailSz="MEDIUM_MEDIUM" outlineStyle="NORMAL" alpha="0"/><hp:shadow type="NONE" color="#B2B2B2" offsetX="0" offsetY="0" alpha="0"/>`
        + `<hp:drawText lastWidth="${w}" name="" editable="0"><hp:subList id="" textDirection="HORIZONTAL" lineWrap="SQUEEZE" vertAlign="${s.va || "CENTER"}" linkListIDRef="0" linkListNextIDRef="0" textWidth="0" textHeight="0" hasTextRef="0" hasNumRef="0">${paras}</hp:subList><hp:textMargin left="${mg[0]}" right="${mg[1]}" top="${mg[2]}" bottom="${mg[3]}"/></hp:drawText>`
        + `<hc:pt0 x="0" y="0"/><hc:pt1 x="${w}" y="0"/><hc:pt2 x="${w}" y="${h}"/><hc:pt3 x="0" y="${h}"/>${pos(HU(s.x), HU(s.y), w, h)}<hp:shapeComment>글상자</hp:shapeComment></hp:rect>`;
    };
    for(let i = 0; i < pages.length; i++){
      let xml = ""; for(const s of pages[i]) xml += await shape(s);
      sec = sec.replace(new RegExp(`(<hp:run charPrIDRef="\\d+">)<hp:t>§P${i}§</hp:t></hp:run>`), `$1${xml}<hp:t/></hp:run>`);
    }
    sec = sec.replace(/<hp:run charPrIDRef="\d+"><hp:t>§S\d+§<\/hp:t><\/hp:run>/g, "");
    zip.file("Contents/section0.xml", sec, {createFolders:false});
    bins.forEach(b => zip.file(`BinData/${b.id}.png`, b.data, {createFolders:false}));
    let hpf = await zip.file("Contents/content.hpf").async("string");
    hpf = hpf.replace("</opf:manifest>", bins.map(b => `<opf:item id="${b.id}" href="BinData/${b.id}.png" media-type="image/png" isEmbeded="1"/>`).join("") + "</opf:manifest>");
    zip.file("Contents/content.hpf", hpf, {createFolders:false});
    Object.keys(zip.files).filter(n => n.endsWith("/")).forEach(n => zip.remove(n));
    zip.file("mimetype", "application/hwp+zip", {compression:"STORE", createFolders:false});
    return zip.generateAsync({type:"blob", mimeType:"application/hwp+zip", compression:"DEFLATE"});
  }

  /* 캔버스에 줄 하나(여러 조각, 아래 기준선 맞춤)를 그리거나 너비만 잼. seg = {t, mm(글자 크기), b, f, ls(자간 em)} */
  const segFont = (s, k) => `${s.b ? "bold " : ""}${s.mm*k}px ${FONT[s.f || 0]}`;
  function lineWidth(g, segs, k){ let w = 0; segs.forEach(s => { g.font = segFont(s, k); g.letterSpacing = `${(s.ls || 0)*s.mm*k}px`; w += g.measureText(s.t).width - (s.ls ? s.ls*s.mm*k : 0) + (s.gap || 0)*k; }); g.letterSpacing = "0px"; return w; }
  function drawLine(g, segs, k, cx, base){ let x = cx - lineWidth(g, segs, k)/2; segs.forEach(s => { g.font = segFont(s, k); g.letterSpacing = `${(s.ls || 0)*s.mm*k}px`; g.fillText(s.t, x, base); x += g.measureText(s.t).width - (s.ls ? s.ls*s.mm*k : 0) + (s.gap || 0)*k; }); g.letterSpacing = "0px"; }
  const loadImg = src => new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = src; });
  async function decoImage(w, h, style, bgSrc){
    if(style === "image" && bgSrc) return loadImg(bgSrc);
    const svg = plateDecoSvg(w, h, style === "image" ? "flower" : style); if(!svg) return null;
    return loadImg("data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg.replace('<svg class="deco"', '<svg xmlns="http://www.w3.org/2000/svg"')));
  }

  /* 명패 한 장의 글 배치(mm·pt). plateSheetHtml의 card()와 같은 비율 */
  function plateLayoutOf(p, w, h, style, font){
    const flw = style === "flower" || style === "image", f = font === "sans" ? 0 : 1, hasOrg = !!p.org;
    const rowTop = hasOrg ? 0.27 : (style === "garland" ? 0.13 : flw ? 0.1 : 0.08), rowBot = flw ? 0.1 : 0.07, side = w*(flw ? 0.15 : 0.06);
    const orgMm = style === "garland" ? Math.min(h*0.105, (w*0.84)/Math.max(8, [...p.org||""].length)) : Math.min(h*0.085, (w*(flw ? 0.55 : 0.8))/Math.max(8, [...p.org||""].length));
    const row = {x:side, y:h*rowTop, w:w - 2*side, h:h*(1 - rowTop - rowBot)};
    let segs;
    if(p.title){ const long = [...p.title.replace(/\s/g, "")].length > 4; segs = [{t:p.title, mm:h*0.46, b:1, f, ls:long ? 0.06 : 0.45}]; }
    else {
      segs = [];
      if(p.pos){ segs.push({t:p.pos, mm:h*0.17, f}); if(p.posSub) segs.push({t:`(${p.posSub})`, mm:h*0.17*0.45, f}); segs[segs.length-1].gap = w*0.035; }
      segs.push({t:p.name, mm:h*0.44, b:1, f, ls:0.32}); if(p.note) segs.push({t:`(${p.note})`, mm:h*0.44*0.45, f});
    }
    const org = hasOrg ? {t:p.org, mm:orgMm, f:style === "garland" ? 0 : f, b:style === "garland" ? 1 : 0, garland:style === "garland", x:style === "garland" ? w*0.08 : 0, y:style === "garland" ? h*0.17 : h*0.12} : null;
    return {row, segs, org};
  }
  /* 글이 칸을 넘으면 줄임(인쇄물과 같은 0.95배씩) */
  function shrink(g, L, k){ let n = 0; const H = () => Math.max(...L.segs.map(s => s.mm))*1.1;
    while((lineWidth(g, L.segs, k) > L.row.w*k + 1 || H() > L.row.h + 0.01) && n < 40){ L.segs.forEach(s => { s.mm *= 0.95; if(s.gap) s.gap *= 1; }); n++; } }

  async function plateCanvas(p, o, k, withText, upside){
    const w = +o.w, h = +o.h, c = document.createElement("canvas"); c.width = Math.round(w*k); c.height = Math.round(h*k);
    const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
    if(upside){ g.translate(c.width, c.height); g.rotate(Math.PI); }
    const im = await decoImage(w, h, o.style, o.bgSrc); if(im) g.drawImage(im, 0, 0, c.width, c.height);
    g.strokeStyle = "#AAAAAA"; g.lineWidth = Math.max(1, 0.2*k); g.strokeRect(0, 0, c.width, c.height);
    if(withText){
      const L = plateLayoutOf(p, w, h, o.style, o.font); shrink(g, L, k);
      g.fillStyle = "#000"; g.textBaseline = "alphabetic";
      const big = Math.max(...L.segs.map(s => s.mm));
      drawLine(g, L.segs, k, (L.row.x + L.row.w/2)*k, (L.row.y + L.row.h/2 + big*0.36)*k);
      if(L.org){ g.font = segFont(L.org, k); g.textBaseline = "top";
        if(L.org.garland){ g.textAlign = "left"; g.fillText(L.org.t, L.org.x*k, L.org.y*k); } else { g.textAlign = "center"; g.fillText(L.org.t, w/2*k, L.org.y*k); } g.textAlign = "left"; }
    }
    return c;
  }
  async function plateHwpx(plates, o = {}){
    const w = Math.max(50, +o.w || 250), h = Math.max(30, +o.h || 85), flip = !!o.flip, O = {...o, w, h, style:o.style || "garland"};
    const lay = plateLayout(w, h) || {orient: w > h*2 ? "landscape" : "portrait", pw: w > 200 ? 297 : 210, ph: w > 200 ? 210 : 297};
    const pw = lay.orient === "landscape" ? 297 : 210, ph = lay.orient === "landscape" ? 210 : 297;
    const X = (pw - w)/2, Y0 = (ph - (flip ? 2*h : h))/2, k = 6;   // 약 150dpi
    const meas = document.createElement("canvas").getContext("2d");
    const pages = [], base = await plateCanvas({}, O, k, false, false);   // 아랫장 꾸밈은 모두 같음 → 그림 하나
    for(const p of plates){
      const S = [], Yb = flip ? Y0 + h : Y0;
      if(flip) S.push({k:"pic", x:X, y:Y0, w, h, canvas:await plateCanvas(p, O, k, true, true), alt:"윗장(거꾸로) 그림"});
      // 아랫장: 꾸밈 그림 + 고칠 수 있는 글상자
      S.push({k:"pic", x:X, y:Yb, w, h, canvas:base, alt:"명패 바탕 그림", behind:true});
      const L = plateLayoutOf(p, w, h, O.style, O.font); shrink(meas, L, k);
      S.push({k:"rect", x:X + L.row.x, y:Yb + L.row.y, w:L.row.w, h:L.row.h, line:null,
        runs:L.segs.flatMap(s => { const r = [{t:s.t, sz:+PT(s.mm).toFixed(1), b:s.b, f:s.f, sp:s.ls ? Math.round(s.ls*100) : 0}]; if(s.gap) r.push({t:" ", sz:+PT(s.gap*2.2).toFixed(1), f:s.f}); return r; })});
      if(L.org){ meas.font = segFont(L.org, k); const ow = L.org.garland ? meas.measureText(L.org.t).width/k + 2 : w;   // 깃발 모양은 왼쪽 맞춤 → 글 너비만큼의 상자
        S.push({k:"rect", x:X + (L.org.garland ? L.org.x - 1 : 0), y:Yb + L.org.y - 0.6, w:ow, h:L.org.mm*1.4, line:null, va:"TOP", runs:[{t:L.org.t, sz:+PT(L.org.mm).toFixed(1), b:L.org.b, f:L.org.f}]}); }
      pages.push(S);
    }
    return shapesHwpx(pages.length ? pages : [[]], {title:"명패", landscape:lay.orient === "landscape"});
  }

  /* 견출지: indexTabsHtml과 같은 배치. 윗면 = 거꾸로 그림, 아랫면 = 빨간 틀 그림 + 글상자 */
  function tabCanvas(t, w, h, k, upside){
    const c = document.createElement("canvas"); c.width = Math.round(w*k); c.height = Math.round(h*k);
    const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
    if(upside){ g.translate(c.width, c.height); g.rotate(Math.PI); }
    const red = 0.53*k, pad = 0.7*k, bot = h*0.2*k;
    g.strokeStyle = "#D42020"; g.lineWidth = red; g.strokeRect(pad + red/2, pad + red/2, c.width - 2*pad - red, c.height - pad - bot - 0.5*k - red);
    g.beginPath(); g.moveTo(pad, c.height - h*0.06*k - red/2); g.lineTo(c.width - pad, c.height - h*0.06*k - red/2); g.stroke();
    g.strokeStyle = "#BBBBBB"; g.lineWidth = Math.max(1, 0.26*k); g.strokeRect(0, 0, c.width, c.height);
    if(upside && t != null){ const mm = Math.min(h*0.34, (w*0.68)/Math.max(2, [...t].length*0.95));
      g.fillStyle = "#000"; g.font = `bold ${mm*k}px ${FONT[0]}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(t, c.width/2, (h - h*0.2)/2*k); }
    return c;
  }
  async function indexHwpx(sets, o = {}){
    const w = Math.max(8, +o.w || 13), h = Math.max(5, +o.h || 9), cols = Math.max(1, Math.floor(190 / w)), rowH = h*2, k = 12;
    const rows = []; sets.forEach(set => { for(let i = 0; i < set.length; i += cols) rows.push(set.slice(i, i + cols)); });
    const pages = []; let cur = [], used = 0;
    rows.forEach(r => { if(used + rowH > 277 && cur.length){ pages.push(cur); cur = []; used = 0; } cur.push(r); used += rowH; }); if(cur.length) pages.push(cur);
    const frame = tabCanvas(null, w, h, k, false), out = [];
    pages.forEach(pg => { const S = [];
      pg.forEach((r, ri) => r.forEach((t, ci) => { const x = 10 + ci*w, y = 10 + ri*rowH, mm = Math.min(h*0.34, (w*0.68)/Math.max(2, [...t].length*0.95));
        S.push({k:"pic", x, y, w, h, canvas:tabCanvas(t, w, h, k, true), alt:"윗면(거꾸로)"});
        S.push({k:"pic", x, y:y + h, w, h, canvas:frame, alt:"견출지 틀"});
        S.push({k:"rect", x, y:y + h, w, h:h*0.8, line:null, runs:[{t, sz:+PT(mm).toFixed(1), b:1, f:0}]}); }));
      out.push(S); });
    return shapesHwpx(out.length ? out : [[]], {title:"견출지"});
  }
  /* 라벨지: labelSheetHtml과 같은 배치. 칸마다 [배경 그림(글 뒤로)] + [글상자(테두리)]. 배경 그림은 o.bgFit대로(기본: 칸에 맞게 늘림) */
  async function labelHwpx(items, o = {}){
    const N = q => +o[q], cols = Math.max(1, N("cols")||2), rows = Math.max(1, N("rows")||7);
    const w = N("w")||99.1, h = N("h")||38.1, mt = N("mt")||0, ml = N("ml")||0, gx = N("gx")||0, gy = N("gy")||0;
    const per = cols*rows, start = Math.min(per, Math.max(1, N("start")||1)) - 1;
    const slots = [...Array(start).fill(null), ...items], sheets = []; for(let i = 0; i < slots.length; i += per) sheets.push(slots.slice(i, i + per));
    const k = 6, cache = new Map();
    const bgCanvas = async src => { if(cache.has(src)) return cache.get(src); const im = await loadImg(src), c = document.createElement("canvas"); c.width = Math.round(w*k); c.height = Math.round(h*k);
      const g = c.getContext("2d");
      if(o.bgFit === "cover"){ const sc = Math.max(c.width / im.naturalWidth, c.height / im.naturalHeight), dw = im.naturalWidth*sc, dh = im.naturalHeight*sc; g.drawImage(im, (c.width - dw)/2, (c.height - dh)/2, dw, dh); }
      else g.drawImage(im, 0, 0, c.width, c.height);   // 칸에 맞게 늘림(기본): 테두리 꽃 그림처럼 네 귀퉁이가 다 보이게
      cache.set(src, c); return c; };
    const inM = Math.min(3, h*0.08), padX = Math.min(5, w*0.05), tMm = Math.min(3.4, h*0.09), mMm0 = Math.min(5.2, h*0.135), padR = Math.min(4, w*0.04), fMm = Math.min(7, h*0.17);
    const meas = document.createElement("canvas").getContext("2d"), F = `"함초롬돋움","HCR Dotum",sans-serif`;
    const pages = [];
    for(const sh of sheets){ const S = [];
      for(let kk = 0; kk < sh.length; kk++){ const it = sh[kk]; if(!it) continue;
        const r = Math.floor(kk/cols), c = kk%cols, x = ml + c*(w + gx), y = mt + r*(h + gy), bg = it.bg || o.bg, fr = !!(o.frame || it.frame);
        if(bg) S.push({k:"pic", x, y, w, h, canvas:await bgCanvas(bg), behind:true, alt:"라벨 배경 그림"});
        let paras;
        if(it.free) paras = [{al:"c", runs:[{t:it.free, sz:+PT(fMm).toFixed(1), b:1, f:0}]}];
        else {
          // 가운데 줄이 넘치면 0.94배씩 줄임(인쇄물과 같음)
          let mm = mMm0; const line = m => [[`${it.role || ""}`, m, 0], [it.roleSub ? `(${it.roleSub})` : "", m*0.8, 0], [" ", m, 0], [it.name, m*1.35, 1], [" 님", m, 0], [it.child ? ` (${it.child})` : "", m*0.8, 0]];
          const width = m => line(m).reduce((a, [t, z, b]) => { meas.font = `${b ? "bold " : ""}${z}px ${F}`; return a + meas.measureText(t).width; }, 0);
          const avail = w - 2*inM - 2*padX - padR; let n = 0; while(width(mm) > avail && n < 30){ mm *= 0.94; n++; }
          paras = [];
          if(it.top) paras.push({al:"l", runs:[{t:it.top, sz:+PT(tMm).toFixed(1), f:0}]});
          paras.push({al:"r", runs:line(mm).filter(([t]) => t).map(([t, z, b]) => ({t, sz:+PT(z).toFixed(1), b, f:0}))});
        }
        S.push({k:"rect", x:x + inM, y:y + inM, w:w - 2*inM, h:h - 2*inM, paras, line:fr ? "#000000" : null, lineW:0.6, m:[padX, padX + (it.free ? 0 : padR), 0, 0]});
      }
      pages.push(S); }
    return shapesHwpx(pages.length ? pages : [[]], {title:"라벨"});
  }
  return {shapesHwpx, plateHwpx, indexHwpx, labelHwpx};
})();
