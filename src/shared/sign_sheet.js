/* ===== [공유] 서명부(출석 등록부) — 원본: school-tool/src/shared/sign_sheet.js =====
   o = {title, sub, info:[줄…], head:[칸 제목…], widths:[칸 너비 비율…], rows:[[칸…]…], rowH, foot:[줄…], sign:"간사 홍길동 (서명)"}
   → HWPX 블록 목록. 필요한 것: hwpx_parts.js(P, GAP, Bk). */
function signSheetBlocks(o){
  const B = [];
  B.push(P(o.title || "", {sz:17, b:1, al:"c"}), GAP(4));
  if(o.sub) B.push(P(o.sub, {sz:12, al:"c"}));
  B.push(GAP(16));
  const info = (o.info || []).filter(Boolean);
  info.forEach(t => B.push(P(t, {sz:11.5, ls:190})));
  if(info.length) B.push(GAP(8));
  B.push(Bk.tbl(o.widths, [o.head, ...o.rows], {head:1, rowH:o.rowH || 3400, ...(o.split ? {split:true} : {})}));
  const foot = (o.foot || []).filter(Boolean);
  if(foot.length) B.push(GAP(14), ...foot.map(t => P(t, {sz:12, ls:200})));
  if(o.sign) B.push(GAP(20), P(o.sign, {sz:12.5, al:"r"}));
  return B;
}
