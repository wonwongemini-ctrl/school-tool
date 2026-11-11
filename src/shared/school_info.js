/* ===== [공유] 학교 정보 — 원본: school-tool/src/shared/school_info.js =====
   같은 주소(wonwongemini-ctrl.github.io) 아래 도구들이 브라우저 저장 공간 하나를 같이 쓴다.
   한 도구에서 학교명·주소 등을 넣으면 다른 도구(학운위 운영업무 도우미 포함)에서도 바로 쓴다.
   PC에 내려받은 파일로 열면 파일마다 따로 저장된다(브라우저 규칙). */
const SCHOOL_INFO = {
  key: "schooltools_school",
  FIELDS: {name:"학교명", addr:"주소", tel:"전화", fax:"팩스", home:"홈페이지", email:"전자우편"},
  get(){ try{ return JSON.parse(localStorage.getItem(this.key) || "{}") || {}; }catch(e){ return {}; } },
  set(o){
    const cur = this.get(), n = {...cur};
    for(const k in this.FIELDS){ if(o[k] !== undefined) n[k] = String(o[k] || "").trim(); }
    n.at = new Date().toISOString();
    try{ localStorage.setItem(this.key, JSON.stringify(n)); }catch(e){}
    return n;
  }
};
