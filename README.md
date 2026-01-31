# YouTube Summary Extension

Get Gemini summaries with a single click from YouTube thumbnails.

YouTube 썸네일에서 한 번의 클릭으로 Gemini 요약을 받아보세요.

## Why?

1. **Reading is faster than watching** - For informational content, reading is much faster than watching
2. **Gemini + YouTube = Google** - Same company, so video data access should be seamless (presumably)

---

1. **영상보다 글이 빠르다** - 정보성 콘텐츠는 읽는 게 보는 것보다 훨씬 빠르다
2. **Gemini + YouTube = Google** - 같은 회사니까 영상 데이터 접근이 가장 원활할 것이다 (추측)

## Usage / 사용법

**English:**
1. Hover over a thumbnail on YouTube Home/Search page
2. Click the summary button in the top-left corner
3. Gemini starts summarizing in a background tab
4. Switch to the Gemini tab when ready to see the result

**한국어:**
1. YouTube 홈/검색 페이지에서 썸네일 위에 마우스를 올린다
2. 왼쪽 상단의 요약 버튼을 클릭한다
3. Gemini가 백그라운드 탭에서 요약을 시작한다
4. 원할 때 Gemini 탭으로 이동해서 결과 확인

## Installation / 설치

**English:**
1. Clone or download this repository
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** in the top right
4. Click **Load unpacked**
5. Select the `youtube-summary-extension` folder

**한국어:**
1. 이 저장소를 클론하거나 다운로드
2. Chrome에서 `chrome://extensions` 열기
3. 우측 상단 **개발자 모드** 활성화
4. **압축해제된 확장 프로그램을 로드합니다** 클릭
5. `youtube-summary-extension` 폴더 선택

## Structure / 구조

```
├── manifest.json   # Chrome Extension Manifest V3
├── background.js   # Opens Gemini tab and sends prompt
├── content.js      # YouTube thumbnail overlay
├── overlay.css     # Overlay button styles
├── popup.html/js   # Extension popup (manual summary)
├── styles.css      # Popup styles
└── _locales/       # i18n translations (en, ko)
```
