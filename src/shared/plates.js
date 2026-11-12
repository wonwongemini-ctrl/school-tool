/* ===== [공유] 명패 — 원본: school-tool/src/shared/plates.js =====
   한 줄에 한 명: "직위 이름", "기관|직위|이름", 한 글자씩 띄운 제목("위 원 장"). 앞·뒤 두 장을 붙여 A4에 한 벌씩.
   필요한 것: hwpx_parts.js(esc, docShell). */
function plateLayout(w,h){
  // 앞·뒤 두 장을 붙여 세로로 쌓는다(가운데 칼선 1개). 프린터 여백 5mm를 남긴다.
  const fit = (pw,ph) => w <= pw-10 && 2*h <= ph-10;
  if(fit(210,297)) return {orient:"portrait", pw:210, ph:297};
  if(fit(297,210)) return {orient:"landscape", pw:297, ph:210};
  return null;
}
function parsePlates(text, org){
  return text.split("\n").map(l=>l.trim()).filter(Boolean).map(l=>{
    if(l.includes("|")){
      const p = l.split("|").map(x=>x.trim());
      if(p.length>=3) return {org: org===""?"":p[0], pos:p[1], name:p.slice(2).join(" ").replace(/\s+/g,"")};
      return {org, pos:p[0], name:(p[1]||"").replace(/\s+/g,"")};
    }
    const t = l.split(/\s+/);
    if(t.every(x=>x.length===1)) return {org, pos:"", name:"", title:t.join("")};
    // "직위 이름"으로 보는 경우: 마지막 낱말이 2~4글자 한글 이름이고, 앞부분이 직위처럼 끝날 때(…장, …위원, …교사, …관 등)
    const last = t[t.length-1], head = t.slice(0,-1).join(" "), headJ = head.replace(/\s+/g,"");
    const isName = t.length>=2 && /^[가-힣]{2,4}$/.test(last);
    const isRole = /(장|감|위원|교사|사서|관|대표|위원장|회장|간사|실장|과장|팀장|주무관|원|사)$/.test(headJ) && !/(학교|초등학교|중학교|고등학교|학교운영위원회|위원회|도서관|교육청|교육지원청)$/.test(headJ);
    if(isName && isRole) return {org, pos:head, name:last};
    return {org, pos:"", name:"", title:l.replace(/\s+/g," ")};
  });
}
/* 명패 꾸밈 그림(SVG 글). style: garland|flower|line|plain(빈 글). 한글 파일용 그림을 그릴 때도 씀 */
function plateDecoSvg(w, h, style){
  const tri = ["#A3C9C0","#6FA79C","#7B93BD","#A096C0"];
  const garland = (()=>{ const n = Math.max(8, Math.round((w-30)/9)); const step=(w-30)/n; let p="";
    for(let i=0;i<n;i++){ const x=15+i*step; p+=`<polygon points="${x.toFixed(2)},3.6 ${(x+step*0.92).toFixed(2)},3.6 ${(x+step*0.46).toFixed(2)},${(3.6+step*0.62).toFixed(2)}" fill="${tri[i%4]}"/>`; }
    return `<svg class="deco" viewBox="0 0 ${w} ${h}" width="${w}mm" height="${h}mm" preserveAspectRatio="none"><rect x="1.4" y="1.4" width="${w-2.8}" height="${h-2.8}" rx="4" ry="4" fill="none" stroke="#D4CBC3" stroke-width="2.2"/>${p}</svg>`; })();
  const line = `<svg class="deco" viewBox="0 0 ${w} ${h}" width="${w}mm" height="${h}mm" preserveAspectRatio="none"><rect x="4" y="4" width="${w-8}" height="${h-8}" fill="none" stroke="#C9A96E" stroke-width="0.6"/><rect x="5.5" y="5.5" width="${w-11}" height="${h-11}" fill="none" stroke="#C9A96E" stroke-width="0.25"/></svg>`;
  const flower = (()=>{
    const sz = Math.min(h*0.62, w*0.3);
    const cl = (s) => {
      const petal = (cx,cy,k,rot) => { let g=""; for(let a=0;a<360;a+=60) g+=`<ellipse cx="${(s*0.075*k).toFixed(2)}" cy="0" rx="${(s*0.085*k).toFixed(2)}" ry="${(s*0.03*k).toFixed(2)}" transform="rotate(${a})" fill="#F3B07C" opacity=".92"/>`;
        return `<g transform="translate(${(s*cx).toFixed(2)},${(s*cy).toFixed(2)}) rotate(${rot})">${g}<circle r="${(s*0.022*k).toFixed(2)}" fill="#DE7A3C"/><circle cx="${(s*0.05*k).toFixed(2)}" cy="${(s*0.02*k).toFixed(2)}" r="${(s*0.008*k).toFixed(2)}" fill="#B8572A"/><circle cx="${(-s*0.03*k).toFixed(2)}" cy="${(s*0.045*k).toFixed(2)}" r="${(s*0.008*k).toFixed(2)}" fill="#B8572A"/></g>`; };
      const leaf = (cx,cy,rx,ry,rot,c) => `<ellipse cx="${(s*cx).toFixed(2)}" cy="${(s*cy).toFixed(2)}" rx="${(s*rx).toFixed(2)}" ry="${(s*ry).toFixed(2)}" transform="rotate(${rot} ${(s*cx).toFixed(2)} ${(s*cy).toFixed(2)})" fill="${c}" opacity=".88"/>`;
      return `<path d="M0 ${(s*0.62).toFixed(2)} Q ${(s*0.22).toFixed(2)} ${(s*0.3).toFixed(2)} ${(s*0.62).toFixed(2)} ${(s*0.04).toFixed(2)}" stroke="#7E9463" stroke-width="${(s*0.012).toFixed(2)}" fill="none"/>`
        + leaf(0.14,0.44,0.22,0.055,-62,"#86AA74") + leaf(0.3,0.2,0.26,0.06,-28,"#5F8C57") + leaf(0.5,0.07,0.17,0.04,-10,"#A9C49A")
        + leaf(0.07,0.2,0.13,0.035,-80,"#B5CBA6") + `<ellipse cx="${(s*0.58).toFixed(2)}" cy="${(s*0.2).toFixed(2)}" rx="${(s*0.05).toFixed(2)}" ry="${(s*0.02).toFixed(2)}" transform="rotate(-35 ${(s*0.58).toFixed(2)} ${(s*0.2).toFixed(2)})" fill="#F6CBA3"/>`
        + petal(0.36,0.25,1,15);
    };
    const c = cl(sz);
    return `<svg class="deco" viewBox="0 0 ${w} ${h}" width="${w}mm" height="${h}mm" preserveAspectRatio="none"><rect x="${(w*0.025).toFixed(2)}" y="${(h*0.07).toFixed(2)}" width="${(w*0.95).toFixed(2)}" height="${(h*0.86).toFixed(2)}" rx="1.5" fill="none" stroke="#E9C995" stroke-width="0.35"/>`
      + `<g transform="translate(0,0)">${c}</g>`
      + `<g transform="translate(${w},0) scale(-1,1)">${c}</g>`
      + `<g transform="translate(0,${h}) scale(1,-1)">${c}</g>`
      + `<g transform="translate(${w},${h}) scale(-1,-1)">${c}</g></svg>`;
  })();
  return style==="garland" ? garland : style==="flower" ? flower : style==="line" ? line : "";
}
/* 명패 인쇄물(HTML): plates = parsePlates(글, 기관명) 결과 또는 [{org, pos, posSub, name, note, title}](parseRoster),
   posSub·note는 직위·이름 바로 뒤에 작은 글씨(괄호째), o = {w, h(mm), style: garland|flower|line|plain|image, flip, font: serif|sans, org, bgSrc} */
function plateSheetHtml(plates, o = {}){
  const w = Math.max(50, +o.w||250), h = Math.max(30, +o.h||85);
  const style = o.style || "garland", flip = !!o.flip;
  const org = o.org || "";
  const lay = plateLayout(w,h) || {orient: w>h*2 ? "landscape":"portrait", pw: w>200?297:210, ph: w>200?210:297};
  const nameFont = o.font==="sans" ? `"함초롬돋움","HCR Dotum","맑은 고딕","Malgun Gothic","Noto Sans CJK KR",sans-serif` : `"함초롬바탕","HCR Batang","바탕",Batang,"Noto Serif CJK KR","Noto Serif KR",serif`;
  const bg = style==="image" && o.bgSrc ? {src:o.bgSrc} : null;
  const deco = style==="image" ? (bg ? `<img class="deco" alt="" src="${bg.src}" style="width:100%;height:100%;object-fit:fill">` : plateDecoSvg(w, h, "flower"))
             : plateDecoSvg(w, h, style);
  const card = (p, back) => {
    const orgH = (style==="garland" ? Math.min(h*0.105, (w*0.84)/Math.max(8, [...p.org].length)) : Math.min(h*0.085, (w*((style==="flower"||style==="image")?0.55:0.8))/Math.max(8, [...p.org].length))).toFixed(2), posH = (h*0.17).toFixed(2), nmH = (h*0.44).toFixed(2), ttH = (h*0.46).toFixed(2);
    const hasOrg = !!p.org;
    const flw = style==="flower" || style==="image";
    const rowTop = hasOrg ? 0.27 : (style==="garland" ? 0.13 : flw ? 0.1 : 0.08);
    const rowBot = flw ? 0.1 : 0.07;
    const orgCss = style==="garland" ? `left:${(w*0.08).toFixed(1)}mm;top:${(h*0.17).toFixed(1)}mm;color:#2E5E9A;font-weight:800;font-family:"맑은 고딕","Malgun Gothic","Noto Sans CJK KR",sans-serif`
                 : `left:0;right:0;text-align:center;top:${(h*0.12).toFixed(1)}mm;font-family:${nameFont}`;
    const body = p.title
      ? `<div class="row" style="top:${(h*rowTop).toFixed(1)}mm;bottom:${(h*rowBot).toFixed(1)}mm"><span class="ln"><span class="nm title${[...p.title.replace(/\s/g,"")].length>4?" long":""}" style="font-size:${ttH}mm">${esc(p.title)}</span></span></div>`
      : `<div class="row" style="top:${(h*rowTop).toFixed(1)}mm;bottom:${(h*rowBot).toFixed(1)}mm"><span class="ln">${p.pos?`<span class="pos" style="font-size:${posH}mm">${esc(p.pos)}${p.posSub?`<small class="sub">(${esc(p.posSub)})</small>`:""}</span>`:""}<span class="nm" style="font-size:${nmH}mm">${esc(p.name)}${p.note?`<small class="sub">(${esc(p.note)})</small>`:""}</span></span></div>`;
    return `<div class="card${!back&&flip?" flip":""}${flip?(back?" fold-top":" fold-bottom"):""}">${deco}${hasOrg?`<div class="org" style="font-size:${orgH}mm;${orgCss}">${esc(p.org)}</div>`:""}${body}</div>`;
  };
  const pages = plates.map(p=>`<div class="sheet"><div class="pair">${card(p,false)}${card(p,true)}</div></div>`).join("") || `<div class="sheet"><p style="font-size:14pt">명패 목록이 비어 있습니다.</p></div>`;
  const css = `
@page{size:A4 ${lay.orient};margin:0}
html,body{background:#E9ECEF}
.sheet{width:${lay.pw}mm;height:${lay.ph}mm;margin:0 auto 6mm;background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden;break-after:page}
.sheet:last-child{break-after:auto}
.pair{display:flex;flex-direction:column}
.card{position:relative;width:${w}mm;height:${h}mm;overflow:hidden;background:#fff}
.card::after{content:"";position:absolute;inset:0;border:0.2mm solid #AAA;pointer-events:none;z-index:5}
.card.flip{transform:rotate(180deg)}
.card.fold-top::after{border-top:0.3mm dashed #888}
.card.fold-bottom::after{border-top:none}
.deco{position:absolute;inset:0}
.org{position:absolute;white-space:nowrap;line-height:1}
.row{position:absolute;left:${(w*((style==="flower"||style==="image")?0.15:0.06)).toFixed(1)}mm;right:${(w*((style==="flower"||style==="image")?0.15:0.06)).toFixed(1)}mm;top:${(h*0.27).toFixed(1)}mm;bottom:${(h*0.07).toFixed(1)}mm;display:flex;align-items:center;justify-content:center;white-space:nowrap;line-height:1.1;overflow:hidden}
.ln{display:flex;align-items:baseline;gap:${(w*0.035).toFixed(1)}mm}
.pos{font-family:${nameFont};flex:none}
.nm{font-family:${nameFont};font-weight:700;letter-spacing:.32em;margin-right:-.32em;flex:none}
.nm.title{letter-spacing:.45em;margin-right:-.45em}
.sub{font-size:.45em;font-weight:400;letter-spacing:0;margin-left:.2em}
.nm .sub{margin-left:-.1em}
.nm.title.long{letter-spacing:.06em;margin-right:-.06em}
@media print{html,body{background:#fff}.sheet{margin:0}}`;
  const fitJs = `<script>(function(){document.querySelectorAll(".row").forEach(function(r){var k=0,l=r.querySelector(".ln");while((l.scrollWidth>r.clientWidth+1||l.scrollHeight>r.clientHeight+1)&&k<40){r.querySelectorAll(".pos,.nm").forEach(function(e){e.style.fontSize=(parseFloat(getComputedStyle(e).fontSize)*0.95)+"px";});k++;}});})();<\/script>`;
  return docShell(`명패_${org}`, pages + fitJs, css).replace(".page + .page{break-before:page}","");
}
