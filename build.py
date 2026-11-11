#!/usr/bin/env python3
"""한글 도구 모음(school-tool) 빌드: src/tools/<도구>/page.html → 맨 위 폴더의 <도구>.html (HTML 한 파일)

- page.html 안에서 한 줄 전체가 /*__SHARED:파일__*/ 이면 src/shared/파일 내용으로,
  /*__VENDOR:파일__*/ 이면 src/vendor/파일 내용으로 바꾼다.
- src/shared/ 가 공유 코드의 원본이다. 학교운영위원회 운영업무 도우미는
  `python3 build.py --shared <school-tool>/src/shared` 로 이 폴더를 가져가 쓴다.
- 판을 올릴 때: 지금 <도구>.html 을 versions/<도구>_v이전판.html 로 복사해 두고 빌드한 뒤 README 표에 한 줄 추가.

사용법: python3 build.py            (모든 도구)
        python3 build.py 도구이름   (하나만)
"""
import os, re, sys, glob
ROOT = os.path.dirname(os.path.abspath(__file__))
def read(p):
    with open(p, encoding="utf-8") as f: return f.read()
def build(tool):
    src = read(os.path.join(ROOT, "src", "tools", tool, "page.html"))
    def sub(line):
        m = re.fullmatch(r"\s*/\*__(SHARED|VENDOR):([\w.-]+)__\*/\s*", line)
        if not m: return line
        txt = read(os.path.join(ROOT, "src", "shared" if m.group(1) == "SHARED" else "vendor", m.group(2))).rstrip("\n")
        if m.group(2).endswith(".js") and "</script" in txt.lower():
            raise SystemExit(f"오류: {m.group(2)} 안에 </script 글자가 있습니다.")
        return txt
    out = "\n".join(sub(l) for l in src.split("\n"))
    dst = os.path.join(ROOT, f"{tool}.html")
    with open(dst, "w", encoding="utf-8") as f: f.write(out)
    print(f"{tool}.html ({len(out.encode('utf-8'))//1024} KB)")
tools = sys.argv[1:] or sorted(os.path.basename(os.path.dirname(p)) for p in glob.glob(os.path.join(ROOT, "src", "tools", "*", "page.html")))
for t in tools: build(t)
