# robot-surgery-ai

로봇수술 테마 스타트업 랜딩페이지 — **Lumenara Surgical** (가상의 로봇수술 기업) 영문 홈페이지

히어로 섹션에는 **Blender로 직접 모델링·조명·애니메이션·렌더링한 "로봇 보조 개복수술(open laparotomy)" 장면**이 들어갑니다. 절개된 복부 안에서 손목 관절이 달린 로봇 기구 3개가 RCM(원격 운동 중심점)을 축으로 움직이고, 니들 드라이버가 장 문합부에 연속 봉합을 하는 모습을 미세한 움직임까지 사실적으로 표현했습니다. 장면 전체를 외부 에셋 없이 Python 코드로 절차적(procedural)으로 만들었습니다.

> ⚠️ 콘셉트 웹사이트입니다. Lumenara는 가상의 회사이며, 제품명·사양·임상 수치는 모두 예시(illustrative)입니다. 실제 임상 데이터가 아닙니다.

---

## 목차

1. [미리보기 / 배포](#1-미리보기--배포)
2. [프로젝트 구조](#2-프로젝트-구조)
3. [페이지 구성](#3-페이지-구성)
4. [인터랙션 & 프런트엔드 기술](#4-인터랙션--프런트엔드-기술)
5. [Blender 수술 장면](#5-blender-수술-장면)
6. [렌더링 & 영상 인코딩 방법](#6-렌더링--영상-인코딩-방법)
7. [로컬 실행](#7-로컬-실행)
8. [Vercel 배포](#8-vercel-배포)
9. [디자인 시스템](#9-디자인-시스템)
10. [접근성 · 반응형 · 성능](#10-접근성--반응형--성능)
11. [현재 상태 & 향후 작업](#11-현재-상태--향후-작업)
12. [크레딧 / 고지](#12-크레딧--고지)

---

## 1. 미리보기 / 배포

| 구분 | 위치 |
|---|---|
| 호스팅 미리보기 (Claude Artifact) | https://claude.ai/artifact/JbP5KekEEfGqXyF725QAWs (비공개 링크, 소유자가 Share 메뉴에서 공유 필요) |
| Vercel (프로덕션) | https://robot-surgery-ai.vercel.app/ (`main` 브랜치 기준, [8장](#8-vercel-배포) 참고) |
| 로컬 | `python3 -m http.server 8000` → http://localhost:8000 |

---

## 2. 프로젝트 구조

메뉴마다 **개별 페이지(개별 URL)** 를 가지는 멀티 페이지 정적 사이트입니다.

| URL | 파일 | 소스 |
|---|---|---|
| `/` | `index.html` | `src/pages/home.html` |
| `/platform/` | `platform/index.html` | `src/pages/platform.html` |
| `/technology/` | `technology/index.html` | `src/pages/technology.html` |
| `/specialties/` | `specialties/index.html` | `src/pages/specialties.html` |
| `/outcomes/` | `outcomes/index.html` | `src/pages/outcomes.html` |
| `/training/` | `training/index.html` | `src/pages/training.html` |
| `/company/` | `company/index.html` | `src/pages/company.html` |
| `/press/` | `press/index.html` | `src/pages/press.html` (보도자료 목록 자동 생성) |
| `/press/<slug>/` | `press/<slug>/index.html` | `src/pages/press/<slug>.html` (보도자료 1건) |
| `/demo/` | `demo/index.html` | `src/pages/demo.html` |
| (없는 주소) | `404.html` | `src/pages/404.html` |

```
robot-surgery-ai/
├── index.html, */index.html, 404.html   # 빌드 결과물 (직접 수정하지 말고 src/를 수정)
├── src/pages/*.html                # 페이지별 본문 소스 (맨 위 주석에 제목·설명·히어로 문구)
├── tools/build_site.py             # 공통 레이아웃(head·헤더·푸터·서브 히어로·다음 페이지)을 입혀 페이지 생성
├── vercel.json                     # Vercel 설정 (cleanUrls, trailingSlash, 에셋 캐시)
├── assets/
│   ├── css/style.css               # 전체 스타일
│   ├── js/main.js                  # 인터랙션 (페이지에 해당 요소가 있을 때만 동작)
│   ├── img/favicon.svg
│   └── media/                      # Blender 렌더 결과물 (hero-poster.jpg, macro.jpg, hero.mp4/webm)
└── blender/
    ├── build_surgical_scene.py     # Blender 장면 절차 생성 + 렌더
    └── encode_hero.sh              # PNG 시퀀스 → 웹 영상/포스터
```

### 보도자료 추가 방법

`src/pages/press/<slug>.html` 파일을 만들고 맨 위 주석에 `title`, `heading`, `lead`, `category`, `date`, `date_iso`(정렬용), `image`를 적은 뒤 `python3 tools/build_site.py`를 실행하면 `/press/<slug>/` 페이지가 생기고 목록·관련 보도자료에 자동으로 추가됩니다.

### 페이지 빌드

```bash
python3 tools/build_site.py
```

- 공통 헤더/푸터/`<head>`는 `tools/build_site.py`에 한 번만 정의되어 모든 페이지에 똑같이 들어갑니다.
- 현재 페이지 메뉴에는 `aria-current="page"`가 자동으로 붙어 밑줄로 표시됩니다.
- 서브 페이지에는 페이지 히어로(브레드크럼, 제목, 소개문, Blender 렌더 배경)와 하단 **다음 페이지 / 데모 신청** 링크가 자동으로 붙습니다.
- 링크·에셋 경로는 상대 경로(`../assets/...`)로 생성되므로 Vercel, GitHub Pages(하위 경로), 로컬 서버 어디서나 동작합니다.
- 빌드 결과물(HTML)도 저장소에 커밋합니다. Vercel은 별도 빌드 없이 그대로 배포합니다.

---

## 3. 페이지 구성

| 페이지 | 내용 |
|---|---|
| **공통 헤더** | 로고, 메뉴(Platform · Technology · Specialties · Outcomes · Training · Company), "Request a demo". 현재 페이지 표시, 스크롤 시 블러 배경, 1080px 이하 햄버거 메뉴 |
| **홈 `/`** | Blender 렌더 히어로 + 서전 콘솔 HUD, 핵심 사양 4개, 각 페이지로 가는 소개 타일 6개, 데모 신청 CTA |
| **Platform `/platform/`** | 시스템 3요소(Arc Console / Patient Cart / Vision Tower), MicroWrist 기구 섹션(`#microwrist`, 접사 렌더 + 사양표) |
| **Technology `/technology/`** | 인터랙티브 "Motion engine" 데모 + 기술 6가지 |
| **Specialties `/specialties/`** | 진료과 탭 5개와 대표 술식 |
| **Outcomes `/outcomes/`** | 측정 항목(환자·외과의·병원) + 성과 지표 4개 (**예시 수치**, 각주 명시) |
| **Training `/training/`** | 4단계 교육 과정 |
| **Company `/company/`** | 회사 이야기, 주요 수치, 최신 소식(`#news`) |
| **Press `/press/`** | 보도자료 목록(최신순 자동 정렬)과 미디어 자료. 개별 보도자료: ① Arc 2 출시(제품) ② 모션 엔진(기술·경쟁력) ③ 서울 트레이닝 센터(생태계) |
| **Demo `/demo/`** | 데모 신청 폼 (프런트엔드 검증만, 서버 전송 없음) |
| **404** | 없는 주소 안내 페이지 |
| **공통 푸터** | 사이트맵, 저작권, 가상 회사 고지, Blender 렌더 출처 |

---

## 4. 인터랙션 & 프런트엔드 기술

모든 인터랙션은 `assets/js/main.js` 하나에 들어 있습니다 (의존성 없는 바닐라 JS).

### 4.1 히어로 몰입 효과
- **패럴랙스**: 마우스 위치에 따라 배경 영상이 반대 방향으로 미세하게 이동하고, 스크롤하면 영상이 천천히 내려가며 약간 확대됨.
- **등장 애니메이션**: 영상이 블러 + 확대 상태에서 선명해지고, 헤드라인이 줄 단위로 아래에서 올라옴.
- **필름 그레인 + 스캔라인**: SVG 노이즈를 오버레이해 수술 모니터 화면 같은 질감을 줌.
- **비네팅 그라데이션**: 왼쪽은 텍스트 가독성을 위해 어둡게, 오른쪽은 수술 장면이 드러나도록 처리.
- **화면 밖 정지**: IntersectionObserver로 히어로가 화면 밖에 있으면 영상을 일시정지해 CPU/배터리를 아낌.

### 4.2 서전 콘솔 HUD
- 팁 힘, 손목 각도, 정밀도 수치가 사인파 조합으로 실시간 변함(약 180 ms 간격 갱신).
- **조준 레티클이 렌더 영상 속 니들 드라이버 끝을 따라감**: 영상이 `object-fit: cover`로 잘려 보이므로, 화면 크기에 맞춰 영상 좌표(정규화 0~1)를 화면 픽셀로 바꾸는 `framePoint()` 함수를 구현함. 또 영상의 4초 루프(`video.currentTime`)에 맞춰 레티클이 기구의 미세 동작과 같은 주기로 움직임.

### 4.3 Motion engine 데모 (떨림 필터 · 모션 스케일링)
`<canvas>` 위에서 동작하는 체험형 데모입니다.
- **주황색 선** = 외과의 손 입력: 마우스/터치 위치에 8~12 Hz 생리적 떨림(서로 다른 주파수 사인파 합성)을 더함.
- **파란색 선** = 로봇 기구 끝 출력: 손 입력을 중심 기준 `1/scale`로 축소(모션 스케일링)한 뒤, 지수이동평균(EMA) 저역통과 필터로 떨림을 제거함. 필터 강도 Off/Low/High/Max에 따라 α = 1 / 0.35 / 0.12 / 0.05.
- 입력이 없으면 봉합 동작 같은 8자 궤적으로 자동 시연함.
- 손 떨림 vs 기구 끝 떨림을 mm 단위로 실시간 표시함(데모용 환산: 1 px ≈ 0.1 mm).
- 캔버스가 화면에 보일 때만 애니메이션 루프가 돌아감.

### 4.4 기타
- 스크롤 등장 애니메이션(`.reveal`) + 숫자 카운트업(`data-count`, 소수점 자릿수는 `data-decimals`)
- 카드 마우스 추적 스포트라이트(CSS 변수 `--mx`, `--my`)
- 접근성을 갖춘 탭(`role="tablist"`, `aria-selected`, 화살표 키 이동)
- 폼 검증: 필수 항목·이메일 형식을 확인하고 `aria-invalid`와 상태 메시지(`aria-live`)로 안내

---

## 5. Blender 수술 장면

`blender/build_surgical_scene.py` 한 파일이 장면 생성부터 렌더링까지 모두 처리합니다. 단위는 **실제 미터(m)** 기준이라 피사계 심도와 피하산란(SSS)이 물리적으로 맞습니다.

### 5.1 해부학 / 수술 필드
| 요소 | 구현 방법 |
|---|---|
| **피부** | 포비돈-아이오딘(베타딘)으로 소독된 주황갈색 피부. 노이즈로 색 얼룩, 미세 범프로 모공 질감, 약한 SSS |
| **절개창 벽** | 타원 링을 겹겹이 쌓아 만든 메시. 깊이에 따라 피부(0~3 mm) → **피하지방**(노란 소엽 구조, 보로노이 텍스처) → **복직근**(근섬유 방향 웨이브 텍스처) 머티리얼로 바뀜. 노이즈로 울퉁불퉁한 단면 표현 |
| **소장 루프** | 베지어 커브를 메시로 변환한 뒤 노이즈 변위로 주름과 연동 운동 같은 부풂을 만듦. 젖은 장막 표현을 위해 SSS + 클리어코트(광택) + 혈관 패턴(왜곡 웨이브) + 혈흔 마스크 적용 |
| **장간막 지방** | 변위된 이코스피어 덩어리 14개를 무작위 배치 |
| **문합부** | 서로 맞닿은 두 장 끝(입술 모양 튜브)과 그 위를 가로지르는 **보라색 연속 봉합사**(Vicryl 색상) |
| **봉합 바늘 & 실** | 3/8원 곡침이 니들 드라이버 조(jaw)에 물려 있음. 실은 바늘 꼬리에서 조직 진입점까지 처지며 이어지고, 매 프레임 바늘 위치를 따라 NURBS 제어점을 다시 계산해 키프레임함 |
| **견인기** | Balfour 스타일 스테인리스 블레이드 2개 + 프레임 봉. 이방성(anisotropic) 브러시드 금속 |
| **거즈 / 드레이프** | 혈흔이 묻은 랩 스펀지, 주름진 파란 부직포 수술포(시닌 효과) |

### 5.2 수술 로봇
- **RCM(원격 운동 중심) 구조**: 각 기구의 루트 Empty가 RCM 지점에 고정됨. 매 프레임 "RCM → 기구 끝" 방향으로 쿼터니언 회전하고, 삽입 깊이만큼 샤프트를 밀어 넣음. 실제 수술 로봇처럼 절개부(포트)를 지렛목으로 피벗하며 움직임.
- **기구 3종**: 니들 드라이버(바늘을 쥐고 손목을 굴려 조직을 관통), Cadiere 그래스퍼(문합부 가장자리를 잡고 조가 미세하게 개폐), Maryland 바이폴라(봉합선 장력 유지, 휘어진 조).
- **EndoWrist형 손목**: 근위 링크 → 핀 → 클레비스 → 핀 → 조 2개의 계층 구조로, 피치/요/롤과 조 개폐를 각각 애니메이션함. 케이블 4가닥까지 모델링.
- **기구 구동부**: 흰색 하우징, 파란 LED 스트립, 멸균 어댑터, 스파(레일), 관절 링(LED), 화면 밖으로 이어지는 로봇 팔 링크.

### 5.3 애니메이션
- **96프레임 / 24 fps = 4초, 완벽한 무한 루프**: 모든 움직임이 `t = 2π·(f−1)/96`의 사인/코사인 함수라서 마지막 프레임이 첫 프레임과 자연스럽게 이어짐.
- 기구 끝 이동 진폭은 1~3 mm 수준으로, "미세 수술"을 강조하는 아주 작은 움직임.
- 카메라도 1~6 mm 범위에서 핸드헬드처럼 미세하게 흔들림.

### 5.4 카메라 · 조명 · 렌더
| 항목 | 설정 |
|---|---|
| 카메라 `hero` | 50 mm, f/3.2, 오른쪽 구도(shift_x −0.07, 왼쪽에 텍스트 공간 확보), 문합부에 초점 |
| 카메라 `macro` | 85 mm, f/3.5, 니들 드라이버와 바늘 접사 |
| 조명 | 집중형 수술등 2개(스팟, 약 4500 K, 부드러운 그림자), 모니터 쪽 푸른 림 라이트, 약한 필(fill), 어두운 수술실 월드 |
| 엔진 | Cycles (CPU), 적응형 샘플링, OpenImageDenoise 디노이즈, Burley SSS, 바운스 최적화, Persistent Data |
| 컬러 | AgX + Medium High Contrast 룩 |
| 출력 | still 1920×1080 @ 96 spp · anim 1280×720 @ 20 spp · preview 960×540 @ 24 spp |
| 렌더 시간 (4코어 CPU 기준) | preview 약 45초, still 약 10분, 루프 프레임당 약 65초 (전체 약 1시간 45분) |

---

## 6. 렌더링 & 영상 인코딩 방법

### 6.1 준비
Blender를 Python 모듈로 설치하는 방법(별도 GUI 설치 불필요):

```bash
python3.13 -m venv bvenv
./bvenv/bin/pip install bpy==5.2.3
```

또는 Blender 5.x가 설치되어 있다면:

```bash
blender -b -P blender/build_surgical_scene.py -- --mode preview --out render
```

### 6.2 스크립트 옵션
| 옵션 | 값 | 설명 |
|---|---|---|
| `--mode` | `preview` / `still` / `anim` | 미리보기 / 고화질 정지 이미지 / 루프 애니메이션 |
| `--view` | `hero` / `macro` | 카메라 프리셋 |
| `--frame` | 정수 | preview·still에서 렌더할 프레임 |
| `--start`, `--end` | 정수 | anim 렌더 범위 (이미 있는 프레임은 건너뛰므로 중단 후 이어서 렌더 가능) |
| `--samples` | 정수 | 샘플 수 직접 지정 |
| `--out` | 경로 | 출력 폴더 |
| `--save-blend` | 경로 | 생성된 장면을 `.blend` 파일로 저장 (Blender GUI에서 열어보기용) |

### 6.3 실행 예시

```bash
# 1) 빠른 구도 확인
./bvenv/bin/python blender/build_surgical_scene.py --mode preview --view hero --out render

# 2) 히어로 포스터 / 접사 이미지
./bvenv/bin/python blender/build_surgical_scene.py --mode still --view hero  --frame 30 --out render
./bvenv/bin/python blender/build_surgical_scene.py --mode still --view macro --frame 30 --out render

# 3) 96프레임 루프
./bvenv/bin/python blender/build_surgical_scene.py --mode anim --view hero --out render/frames

# 4) 웹용 인코딩 → assets/media/ 에 hero.mp4, hero.webm, hero-poster.jpg, macro.jpg 생성
blender/encode_hero.sh render/frames render/still_hero_030.png render/still_macro_030.png

# (선택) .blend 파일로 저장해서 Blender에서 열어보기
./bvenv/bin/python blender/build_surgical_scene.py --mode preview --save-blend render/surgery.blend --out render
```

`encode_hero.sh`는 H.264(`crf 22`, `+faststart`로 바로 재생)와 VP9(`crf 34`) 두 형식을 만듭니다. 브라우저는 `<video>`의 `<source>` 순서대로 WebM을 먼저 쓰고, 지원하지 않으면 MP4를 씁니다.

---

## 7. 로컬 실행

```bash
git clone https://github.com/moonsookim-ai/robot-surgery-ai.git
cd robot-surgery-ai
python3 -m http.server 8000
# http://localhost:8000 접속
```

폴더형 URL(`/platform/`)을 쓰므로 `file://`로 직접 열기보다 로컬 서버로 확인하는 것을 권장합니다.

---

## 8. Vercel 배포

이 저장소는 Vercel과 GitHub로 연동되어 있습니다 (프로젝트 `robot-surgery-ai`).

| 브랜치 | 배포 종류 | 주소 |
|---|---|---|
| `main` | **프로덕션** | https://robot-surgery-ai.vercel.app/ |
| 그 외 브랜치 / PR | 프리뷰 | PR에 vercel[bot]이 남기는 Preview 링크 (기본적으로 Vercel 로그인 보호가 걸려 있음) |

**Vercel 프로젝트 설정 (정적 사이트)**

- Framework Preset: **Other**
- Build Command: 비움 (빌드 없음)
- Output Directory: 비움 또는 `.` (루트의 HTML을 그대로 서비스)
- `vercel.json`: `cleanUrls`, `trailingSlash`(모든 페이지를 `/platform/` 형태로 통일), `/assets/` 캐시 헤더
- Install Command: 비움

**주의:** 프로덕션 주소는 `main` 브랜치만 반영합니다. 작업 브랜치에만 코드가 있으면 프로덕션 주소에서 `404: NOT_FOUND`가 납니다. PR을 `main`에 머지하면 자동으로 재배포됩니다.

정적 사이트라 Netlify, Cloudflare Pages, GitHub Pages 등에서도 빌드 설정 없이 루트 폴더를 그대로 배포하면 됩니다.

---

## 회사소개서 (docx · pptx · pdf)

| 파일 | 용도 |
|---|---|
| `assets/docs/Lumenara_Company_Profile.pdf` | 웹사이트에 첨부된 회사소개서 PDF (28장, pptx에서 변환). Company 페이지 `#profile`, 홈 CTA, 모든 페이지 푸터에서 다운로드 |
| `docs/company-profile/Lumenara_Company_Profile.pptx` | 회사소개서 발표본 (16:9, 28장, 섹션·레이아웃 기반으로 PowerPoint에서 바로 편집 가능) |
| `docs/company-profile/Lumenara_Company_Profile.docx` | 회사소개서 문서본 (A4, 19쪽) |
| `docs/company-profile/build_pptx.js`, `build_docx.js` | 생성 스크립트 (pptxgenjs, docx) |

- 표지와 MicroWrist 이미지는 Blender 렌더(`assets/media/`)를 사용합니다.
- `[To be provided]` 로 표시된 항목(CEO 이름, 규제 현황, 시장 규모, 특허 수, 서비스 응답 시간, 매출 구성, 연락처)은 외부 배포 전에 실제 정보로 채워야 합니다.
- 성과 지표·2026년 이전 연혁·경쟁 비교는 예시이며 문서 안에 그렇게 표시되어 있습니다.
- PDF를 다시 만들려면: pptx 수정 → `soffice --headless --convert-to pdf` → `assets/docs/`에 덮어쓰기.

---

## 9. 디자인 시스템

| 토큰 | 값 | 용도 |
|---|---|---|
| `--bg` / `--bg-2` / `--bg-3` | `#05090d` / `#0a1118` / `#0f1922` | 수술실 조명이 꺼진 듯한 짙은 네이비 블랙 배경 |
| `--text` / `--muted` / `--dim` | `#e9f1f7` / `#9aaab8` / `#66788a` | 본문 및 보조 텍스트 |
| `--accent` | `#3fb6ff` | 로봇 관절 LED에서 따온 시안 블루 (렌더 속 LED와 같은 색) |
| `--warm` | `#ffb37a` | 데모의 "사람 손" 궤적 |
| 폰트 | Manrope (본문·제목), JetBrains Mono (HUD·라벨·수치) | 의료기기 UI 느낌 |

---

## 10. 접근성 · 반응형 · 성능

- **반응형**: 1080px(태블릿), 720px(모바일) 브레이크포인트. 390px 폭에서 가로 스크롤이 없는 것을 확인함. 모바일에서는 HUD 패널과 레티클을 숨기고, 아래쪽 그라데이션으로 텍스트 가독성을 확보함.
- **`prefers-reduced-motion`**: 영상 자동재생과 패럴랙스를 끄고 모든 애니메이션을 즉시 완료 처리함. 등장 애니메이션 요소도 처음부터 보이게 함.
- **키보드**: 본문 바로가기 링크, 포커스 링(`:focus-visible`), 탭 화살표 키 이동, Esc로 모바일 메뉴 닫기.
- **스크린리더**: 장식용 HUD·영상은 `aria-hidden`, 이미지에 대체 텍스트, 폼 상태 메시지는 `aria-live`.
- **성능**: 포스터 이미지 preload, 영상 `+faststart`, 화면 밖에서 영상과 캔버스 일시정지, 접사 이미지 lazy-load.

---

## 11. 현재 상태 & 향후 작업

- [x] 영문 랜딩페이지 전체 섹션 및 인터랙션
- [x] Blender 절차 생성 장면 + 히어로 포스터 / 접사 렌더
- [x] 데스크톱(1440×900) · 모바일(390×844) 스크린샷 검증
- [x] 히어로 4초 루프 영상(`hero.mp4` 545KB, `hero.webm` 314KB): Blender Cycles 1280×720, 96프레임/24fps, 끊김 없는 반복 재생
- [ ] PR을 `main`에 머지해 Vercel 프로덕션(https://robot-surgery-ai.vercel.app/)에 반영
- [ ] 데모 신청 폼 백엔드 연동 (현재는 프런트엔드 검증만)

---

## 12. 크레딧 / 고지

- 3D 장면: [Blender](https://www.blender.org/) 5.2 LTS (Cycles)로 코드에서 절차적으로 생성. 외부 3D 모델·텍스처·스톡 이미지는 사용하지 않음.
- 폰트: Manrope, JetBrains Mono (Google Fonts, SIL Open Font License)
- **Lumenara Surgical, Arc, MicroWrist는 가상의 이름**이며, 페이지의 사양·성과 수치는 예시입니다. 실제 의료기기나 임상 결과를 나타내지 않습니다.
