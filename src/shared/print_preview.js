/* ===== [공유] 인쇄물 미리보기 (자 있음) — 원본: school-tool/src/shared/print_preview.js =====
   한글 편집창처럼 위·왼쪽에 mm 자를 보이고, 바꿀 때마다 깜빡임 없이 바로 다시 그린다.
   const pv = makePreview(host, {onPick(el, i)}); pv.show(html)
   - 인쇄물 쪽은 .sheet 또는 .page. 자의 흰 부분 = 쪽 안에서 실제로 내용이 놓이는 곳(.page는 안쪽 여백 뺀 곳).
   - [쪽 맞춤](기본, 한 쪽이 다 보이게) / [폭 맞춤] / [100%]. 스크롤 위치는 다시 그려도 그대로.
   - onPick: 인쇄물 안 [data-pick] 요소를 누르면 불림(라벨 '이 칸만' 고르기 등). */
function makePreview(host, opt = {}){
  host.classList.add("ppv");
  host.innerHTML = `<div class="ppv-bar"><div class="ppv-zoom" role="group" aria-label="배율"><button type="button" data-z="fit" aria-pressed="true">쪽 맞춤</button><button type="button" data-z="width" aria-pressed="false">폭 맞춤</button><button type="button" data-z="1" aria-pressed="false">100%</button></div><span class="ppv-info"></span></div>
<div class="ppv-grid"><div class="ppv-corner">mm</div><canvas class="ppv-rt"></canvas><canvas class="ppv-rl"></canvas><div class="ppv-view"><div class="ppv-stage"></div></div></div>`;
  const view = host.querySelector(".ppv-view"), stage = host.querySelector(".ppv-stage");
  const rt = host.querySelector(".ppv-rt"), rl = host.querySelector(".ppv-rl"), info = host.querySelector(".ppv-info");
  let zoom = "fit", cur = null, scale = 1, pending = null, seq = 0, mm = 3.7795;
  const PAD = 14;
  host.querySelectorAll("[data-z]").forEach(b => b.onclick = () => { zoom = b.dataset.z; host.querySelectorAll("[data-z]").forEach(x => x.setAttribute("aria-pressed", x === b)); layout(true); });
  function frame(){ const f = document.createElement("iframe"); f.title = "미리보기"; f.setAttribute("tabindex", "-1"); f.className = "ppv-f"; stage.appendChild(f); return f; }
  function sheets(f){ try{ return [...f.contentDocument.querySelectorAll(".sheet, .page")]; }catch(e){ return []; } }
  function layout(keepCenter){
    if(!cur) return;
    const d = cur.contentDocument; if(!d || !d.body) return;
    const sh = sheets(cur); const w0 = sh.length ? Math.max(...sh.map(s => s.offsetWidth)) : d.documentElement.scrollWidth;
    const fw = w0 + PAD*2;
    cur.style.width = fw + "px";
    const fh = d.documentElement.scrollHeight; cur.style.height = fh + "px";
    const old = scale;
    const sh0 = sh.length ? Math.max(...sh.map(s => s.offsetHeight)) + PAD*2 : fw;
    const sw = (view.clientWidth - 2) / fw;
    scale = zoom === "fit" ? Math.min(1.5, sw, (view.clientHeight - 2) / sh0) : zoom === "width" ? Math.min(2, sw) : 1;
    const relY = keepCenter && old ? view.scrollTop / old : null;
    cur.style.transform = `scale(${scale})`;
    stage.style.width = Math.ceil(fw*scale) + "px"; stage.style.height = Math.ceil(fh*scale) + "px";
    if(relY != null) view.scrollTop = relY * scale;
    rulers();
  }
  function box(s){
    // 쪽 안 내용 상자(쪽 기준 px): .page는 padding 안쪽, 그 밖은 자식들을 모두 감싸는 상자
    if(s.classList.contains("page")){ const cs = getComputedStyle(s); return {x0:parseFloat(cs.paddingLeft), y0:parseFloat(cs.paddingTop), x1:s.offsetWidth - parseFloat(cs.paddingRight), y1:s.offsetHeight - parseFloat(cs.paddingBottom)}; }
    const r0 = s.getBoundingClientRect(); let b = null;
    s.querySelectorAll(":scope > *").forEach(c => { if(c.tagName === "SCRIPT") return; const r = c.getBoundingClientRect(); if(!r.width) return;
      const q = {x0:r.left - r0.left, y0:r.top - r0.top, x1:r.right - r0.left, y1:r.bottom - r0.top};
      b = b ? {x0:Math.min(b.x0, q.x0), y0:Math.min(b.y0, q.y0), x1:Math.max(b.x1, q.x1), y1:Math.max(b.y1, q.y1)} : q; });
    return b || {x0:0, y0:0, x1:s.offsetWidth, y1:s.offsetHeight};
  }
  function ruler(cv, len, horiz, start, a, b, wmm){
    const dpr = window.devicePixelRatio || 1, th = 20;
    const W = horiz ? len : th, H = horiz ? th : len;
    cv.width = W*dpr; cv.height = H*dpr; cv.style.width = W + "px"; cv.style.height = H + "px";
    const g = cv.getContext("2d"); g.scale(dpr, dpr);
    g.fillStyle = "#d9dde2"; g.fillRect(0, 0, W, H);
    const pm = mm*scale, P = v => start + v*pm;
    // 쪽 = 연회색, 내용 = 흰색 (한글 자처럼)
    g.fillStyle = "#eef0f2"; horiz ? g.fillRect(P(0), 2, wmm*pm, th-4) : g.fillRect(2, P(0), th-4, wmm*pm);
    g.fillStyle = "#fff"; horiz ? g.fillRect(P(a), 2, (b-a)*pm, th-4) : g.fillRect(2, P(a), th-4, (b-a)*pm);
    g.strokeStyle = "#6b7480"; g.fillStyle = "#3d4651"; g.lineWidth = 1; g.font = "10px sans-serif"; g.textBaseline = "top";
    const step = pm >= 3 ? 1 : pm >= 1.2 ? 2 : 5;
    g.beginPath();
    for(let v = 0; v <= wmm + 0.01; v += step){
      const p = Math.round(P(v)) + 0.5; if(p < -2 || p > len + 2) continue;
      const k = v % 10 === 0 ? 9 : v % 5 === 0 ? 6 : 3;
      if(horiz){ g.moveTo(p, th); g.lineTo(p, th - k); } else { g.moveTo(th, p); g.lineTo(th - k, p); }
      if(v % 10 === 0 && v > 0 && (pm >= 1.6 || v % 20 === 0)){
        const t = String(v);
        if(horiz) g.fillText(t, p + 2, 2); else { g.save(); g.translate(2, p + 2); g.rotate(Math.PI/2); g.translate(0, -9); g.fillText(t, 0, 0); g.restore(); }
      }
    }
    g.stroke();
    g.strokeStyle = "#1f5e74"; g.lineWidth = 1.5; g.beginPath();
    [a, b].forEach(v => { const p = Math.round(P(v)) + 0.5; if(horiz){ g.moveTo(p, 2); g.lineTo(p, th-2); } else { g.moveTo(2, p); g.lineTo(th-2, p); } });
    g.stroke();
  }
  function rulers(){
    if(!cur) return;
    const sh = sheets(cur); if(!sh.length){ rt.width = rl.width = 0; info.textContent = ""; return; }
    // 보이는 쪽: 화면 위쪽 1/3 지점에 걸친 쪽
    const probe = view.scrollTop + view.clientHeight/3;
    let i = sh.findIndex(s => (s.offsetTop + s.offsetHeight)*scale >= probe); if(i < 0) i = sh.length - 1;
    const s = sh[i], bx = box(s);
    const left = stage.offsetLeft + s.offsetLeft*scale - view.scrollLeft, top = stage.offsetTop + s.offsetTop*scale - view.scrollTop;
    const wmm = s.offsetWidth/mm, hmm = s.offsetHeight/mm;
    ruler(rt, view.clientWidth, true, left, bx.x0/mm, bx.x1/mm, wmm);
    ruler(rl, view.clientHeight, false, top, bx.y0/mm, bx.y1/mm, hmm);
    info.textContent = `${i+1} / ${sh.length}쪽 · ${Math.round(wmm)} × ${Math.round(hmm)}mm${zoom !== "1" ? ` · ${Math.round(scale*100)}%` : ""}`;
  }
  view.addEventListener("scroll", () => requestAnimationFrame(rulers));
  new ResizeObserver(() => layout(true)).observe(view);
  function show(html){
    const my = ++seq;
    if(pending) pending.remove();
    const f = pending = frame(); f.style.visibility = "hidden";
    f.onload = () => {
      if(my !== seq){ f.remove(); return; }
      const d = f.contentDocument;
      d.documentElement.style.overflow = "hidden";
      const st = d.createElement("style"); st.textContent = `html,body{background:transparent!important}body{padding:${PAD}px!important;margin:0}.sheet,.page{box-shadow:0 1px 4px rgba(0,0,0,.18)}[data-pick]{cursor:pointer}[data-pick]:hover{outline:2px solid #1f5e74!important}[data-pick].picked{outline:2.5px solid #d4622a!important}`;
      d.head.appendChild(st);
      if(opt.onPick) d.addEventListener("click", e => { const el = e.target.closest("[data-pick]"); if(el) opt.onPick(el, +el.dataset.pick); });
      const top = view.scrollTop, lft = view.scrollLeft;
      const old = cur; cur = f; pending = null;
      const tm = d.createElement("div"); tm.style.cssText = "position:absolute;width:100mm;visibility:hidden"; d.body.appendChild(tm); mm = tm.offsetWidth/100 || 3.7795; tm.remove();
      setTimeout(() => {           // 인쇄물 안 글자 맞춤 스크립트가 끝난 뒤 크기를 잰다
        if(cur !== f) return;
        layout(false); view.scrollTop = top; view.scrollLeft = lft;
        f.style.visibility = "visible"; if(old) old.remove(); rulers();
      }, 30);
    };
    f.srcdoc = html;
  }
  return {show, refresh: () => layout(true)};
}
