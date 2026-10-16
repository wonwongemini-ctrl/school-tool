# 학교 업무 도구

## HWP → HWPX 변환 (`hwp2hwpx.html`)

한글 프로그램 없이 옛 한글 파일(.hwp)을 새 형식(.hwpx)으로 바꿉니다.

- 파일은 인터넷으로 올라가지 않습니다. 브라우저 안에서 파이썬(Pyodide)이 돌아가며 변환합니다.
- 파일을 끌어다 놓으면 됩니다. 폴더째 넣을 수 있고, 여러 개는 zip으로 한꺼번에 받습니다.
- 크롬·엣지에서는 폴더를 고르면 원본 옆에 .hwpx를 바로 저장할 수 있습니다.
- HTML 파일 하나로 동작합니다. GitHub Pages 주소로 열어도 되고, PC에 저장한 파일을 열어도 됩니다.
- 처음 열 때만 변환 엔진을 공개 CDN(jsdelivr, 안 되면 unpkg)에서 내려받습니다.

### 변환 범위

| 그대로 옮겨짐 | 변환 불가 |
|---|---|
| 글자 모양·문단, 표, 그림, 도형, 글상자, 머리말·꼬리말, 바탕쪽, 쪽 번호, 각주·미주, 수식, 숨은 설명, 누름틀, 하이퍼링크, 책갈피, 덧말, 글자 겹치기, 새 번호 지정, 양식 개체 | 배포용 문서, 암호 문서, HWP 3.0 이하 |

시험 결과: 시험 문서 84개를 모두 정상 HWPX로 바꿨고, 원작 Java hwp2hwpx의 결과와 요소 단위로 대조해 같게 맞췄습니다. 남은 차이는 원작의 버그(표 뒤 글자가 표 안으로 들어감, 그림 설명 줄바꿈이 두 번 들어감)이고, 이 부분은 원본 문서 쪽이 맞도록 두었습니다.

### 버전

`hwp2hwpx.html`은 늘 최신판입니다(허브 바로가기는 이 파일을 엽니다). 지난 판은 `versions/` 폴더에 `hwp2hwpx_v버전.html` 이름으로 보관합니다. 지금 쓰는 판은 화면 맨 위와 맨 아래에 표시됩니다.

| 버전 | 날짜 | 바뀐 점 |
|---|---|---|
| v2.0 | 2026-10-16 | 원작(Java hwp2hwpx)과 같은 방식으로 다시 만듦: 원본에 없던 취소선이 생기던 문제, 빈 줄 크기·표 칸 여백·단 나누기 문제(가정통신문이 몇 줄 아래에서 시작하던 현상) 수정. 그림·도형·글상자·양식 개체·바탕쪽, 누름틀·하이퍼링크·책갈피가 기능 그대로 옮겨짐 |
| v1.0 | 2026-10-16 | 첫 판: 브라우저 안 변환, 폴더·여러 파일 변환, zip 내려받기, 배포용·암호 문서 안내 |

새 판을 올릴 때: ① 지금 `hwp2hwpx.html`을 `versions/hwp2hwpx_v이전버전.html`로 복사해 두고 ② 새 파일로 `hwp2hwpx.html`을 바꾼 뒤 ③ 위 표에 한 줄 추가합니다.

### GitHub Pages에 올리기

1. GitHub에서 새 저장소를 만듭니다(예: `school-tools`). **Public**으로 만들어야 무료로 Pages를 쓸 수 있습니다.
2. 저장소 화면에서 **Add file → Upload files**를 누르고 `hwp2hwpx.html`, `README.md`, `versions` 폴더를 끌어다 놓은 뒤 **Commit changes**를 누릅니다.
3. **Settings → Pages**에서 *Source*를 `Deploy from a branch`로, *Branch*를 `main`, `/ (root)`로 고르고 **Save**를 누릅니다.
4. 1~2분 뒤 다음 주소로 열립니다.
   `https://<GitHub아이디>.github.io/school-tools/hwp2hwpx.html`

> ⚠️ `예원초_업무·내선·위치_찾기.html`은 **올리지 마세요.** 와이파이·사이트 계정 비밀번호가 들어 있어서, 공개 저장소에 올리면 누구나 볼 수 있습니다.

### 사용한 공개 소프트웨어

- [pyhwpxlib](https://github.com/ratiertm/hwpx-skill) 0.18.3 (Eunmi Lee). PolyForm Noncommercial 1.0.0이 적용되며, 학교의 교육·비영리 사용은 허용 범위입니다. 변환 핵심 파일은 Apache-2.0입니다.
- 원작: [hwp2hwpx](https://github.com/neolord0/hwp2hwpx), [hwplib](https://github.com/neolord0/hwplib) (neolord0, Apache-2.0)
- [olefile](https://github.com/decalage2/olefile) 0.47 (BSD), [Pyodide](https://pyodide.org) 0.29.5 (MPL-2.0)
- 이 페이지를 위해 `hwp2hwpx.py`를 고쳤습니다. 고친 내용은 문서 정보·본문·그림/도형/양식·바탕쪽 변환을 원작(Java hwp2hwpx)과 같게 다시 옮김, 취소선·밑줄 해석 수정, 각주·미주·숨은 설명·수식 변환 추가, 배포용·암호 문서 안내, XML에 쓸 수 없는 제어 문자 제거입니다. 변경 고지는 파일 머리에 있습니다. 라이선스 전문은 HTML 안 변환 엔진 묶음의 `licenses/` 폴더에 들어 있습니다.
