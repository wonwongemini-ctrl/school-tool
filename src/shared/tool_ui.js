/* ===== [공유] 한글 도구 모음 화면 부품 — 원본: school-tool/src/shared/tool_ui.js =====
   $(id), toast(글), save(blob, 이름), schoolChip(자리 id): 머리의 '학교 정보' 표시와 고치기 창(SCHOOL_INFO). */
const $ = id => document.getElementById(id);
function toast(msg){
  let t = $("toast"); if(!t){ t = document.createElement("div"); t.id = "toast"; t.className = "toast"; t.setAttribute("role","status"); document.body.appendChild(t); }
  t.textContent = msg; t.classList.add("show"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 2600);
}
function save(blob, name){
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
const ymdDot = (d = new Date()) => `${d.getFullYear()}. ${d.getMonth()+1}. ${d.getDate()}.`;
function schoolChip(hostId, onChange){
  const host = $(hostId); if(!host) return;
  const draw = () => {
    const s = SCHOOL_INFO.get();
    host.innerHTML = `<span class="schoolchip">🏫 학교 정보: ${s.name ? `<b>${esc(s.name)}</b>` : "아직 없음"} <span>(다른 도구에서 넣은 정보를 같이 씁니다)</span> <button type="button">${s.name ? "바꾸기" : "넣기"}</button></span>`;
    host.querySelector("button").onclick = open;
  };
  const open = () => {
    const s = SCHOOL_INFO.get(), dl = document.createElement("dialog"); dl.className = "sd";
    dl.innerHTML = `<h2>학교 정보</h2><p class="hint" style="margin:0 0 10px">이 컴퓨터 브라우저에만 저장됩니다. 같은 주소의 다른 도구(학운위 운영업무 도우미 등)도 이 정보를 씁니다.</p>
<div class="grid">${Object.entries(SCHOOL_INFO.FIELDS).map(([k, l]) => `<label class="f ${k==="addr"?"wide":""}"><span>${l}</span><input data-k="${k}" value="${esc(s[k]||"")}"></label>`).join("")}</div>
<div class="acts"><button type="button" class="btn primary" data-ok>저장</button><button type="button" class="btn" data-no>닫기</button></div>`;
    document.body.appendChild(dl); dl.showModal();
    dl.querySelector("[data-no]").onclick = () => { dl.close(); dl.remove(); };
    dl.querySelector("[data-ok]").onclick = () => { const o = {}; dl.querySelectorAll("[data-k]").forEach(i => o[i.dataset.k] = i.value); SCHOOL_INFO.set(o); dl.close(); dl.remove(); draw(); if(onChange) onChange(); toast("학교 정보를 저장했습니다"); };
  };
  draw();
  window.addEventListener("storage", e => { if(e.key === SCHOOL_INFO.key){ draw(); if(onChange) onChange(); } });
}
/* 끌어다 놓기 칸 연결: el, 파일 입력, onFiles(파일 배열) */
function wireDrop(el, input, onFiles){
  ["dragenter","dragover"].forEach(t => el.addEventListener(t, e => { e.preventDefault(); el.classList.add("over"); }));
  ["dragleave","drop"].forEach(t => el.addEventListener(t, e => { e.preventDefault(); if(t === "drop" || !el.contains(e.relatedTarget)) el.classList.remove("over"); }));
  el.addEventListener("drop", e => { if(e.dataTransfer.files.length) onFiles([...e.dataTransfer.files]); });
  document.addEventListener("dragover", e => e.preventDefault()); document.addEventListener("drop", e => e.preventDefault());
  input.addEventListener("change", () => { if(input.files.length) onFiles([...input.files]); input.value = ""; });
}
/* HTML 인쇄물 미리보기(iframe) */
function showHtmlPreview(host, html){ host.innerHTML = `<div class="pv"><iframe title="미리보기"></iframe></div>`; host.querySelector("iframe").srcdoc = html; }
async function showHwpxPreview(host, blob){ host.innerHTML = `<div class="pv"><div class="rp">${await ENG.previewHwpx(blob)}</div></div>`; ENG.fitSqueeze(host); }
