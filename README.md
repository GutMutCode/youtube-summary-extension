# YouTube Summary Extension

YouTube 썸네일에서 한 번의 클릭으로 Gemini 요약을 받아보세요.

## Why?

1. **영상보다 글이 빠르다** - 정보성 콘텐츠는 읽는 게 보는 것보다 훨씬 빠르다
2. **Gemini + YouTube = Google** - 같은 회사니까 영상 데이터 접근이 가장 원활할 것이다 (추측)

## 사용법

1. YouTube 홈/검색 페이지에서 썸네일 위에 마우스를 올린다
2. 왼쪽 상단의 요약 버튼을 클릭한다
3. Gemini가 백그라운드 탭에서 요약을 시작한다
4. 원할 때 Gemini 탭으로 이동해서 결과 확인

## 설치

1. 이 저장소를 클론하거나 다운로드
2. Chrome에서 `chrome://extensions` 열기
3. 우측 상단 **개발자 모드** 활성화
4. **압축해제된 확장 프로그램을 로드합니다** 클릭
5. `youtube-summary-extension` 폴더 선택

## 구조

```
├── manifest.json   # Chrome Extension Manifest V3
├── background.js   # Gemini 탭 열기 및 프롬프트 전송
├── content.js      # YouTube 썸네일 오버레이
├── overlay.css     # 오버레이 버튼 스타일
├── popup.html/js   # 확장 프로그램 팝업 (수동 요약용)
└── styles.css      # 팝업 스타일
```
