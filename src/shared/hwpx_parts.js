/* ===== [공유] 문서 공통 부품 — 원본: school-tool/src/shared/hwpx_parts.js =====
   HTML 인쇄물 틀(docShell)과 HWPX 블록 줄임말(P·PR·GAP·RULE·MEMO).
   본문 폭: A4에서 좌우 여백 20mm를 뺀 약 481.9pt. 글꼴 f:0 = 함초롬돋움, f:1 = 함초롬바탕.
   필요한 것: hwpx_engine.js(ENG). */
function esc(s){ return String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
const DOC_FONT = `"함초롬돋움","HCR Dotum","굴림",Gulim,"맑은 고딕","Malgun Gothic","Noto Sans CJK KR",sans-serif`;
function docShell(title, body, extraCss=""){
  const gen = typeof APP !== "undefined" ? `${APP.name} v${APP.version}` : "학교 업무 도구";
  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8"><meta name="generator" content="${gen}"><title>${esc(title)}</title>
<style>
@page{size:A4;margin:0}
*{box-sizing:border-box}
html,body{margin:0;background:#E9ECEF}
body{font-family:${DOC_FONT};color:#000;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:210mm;min-height:297mm;padding:24mm 22mm 20mm;margin:0 auto 8mm;background:#fff;position:relative}
.page + .page{break-before:page}
@media print{html,body{background:#fff}body{padding:0}.page{margin:0;min-height:296mm}}
${extraCss}
</style></head><body>
${body}
</body></html>`;
}
const Bk = ENG.B;
const PW = 481.9;
/* 크기 지정 문단 줄임: P("글", {sz, b, al, l, ind, prev, ls, f}) */
const P = (t, o = {}) => Bk.pp({t, sz:12, f:0, al:"l", ls:160, ...o});
const PR = (runs, o = {}) => Bk.pp({runs:runs.map(r => typeof r === "string" ? {t:r} : r), sz:12, f:0, al:"l", ls:160, ...o});
const GAP = (h = 6) => Bk.pp({t:"", sz:h, ls:100});
/* 가로줄: 두께(pt) */
const RULE = (w = 1.5, type = "SOLID") => Bk.form({cols:[PW], rows:[{h:3, cells:[{t:"", sz:2}]}], hl:[[0,0,1,w,type]]});
/* 메모 줄(점선) */
const MEMO = (n = 1) => Bk.form({cols:[PW-12], al:"r", rows:Array.from({length:n}, ()=>({h:20, cells:[{t:"", sz:9}]})), hl:Array.from({length:n}, (_, i)=>[i+1,0,1,0.4,"DOT"])});
