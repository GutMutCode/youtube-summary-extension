document.addEventListener('DOMContentLoaded', async () => {
  const loadingEl = document.getElementById('loading');
  const errorEl = document.getElementById('error');
  const videoInfoEl = document.getElementById('video-info');
  const notYoutubeEl = document.getElementById('not-youtube');
  const summarizeBtn = document.getElementById('summarize-btn');

  let extractedData = null;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab.url?.includes('youtube.com/watch')) {
    notYoutubeEl.classList.remove('hidden');
    return;
  }

  loadingEl.classList.remove('hidden');

  try {
    const basicInfo = await chrome.tabs.sendMessage(tab.id, { action: 'getBasicInfo' });
    
    document.querySelector('.video-title').textContent = basicInfo.title;
    
    const chaptersList = document.querySelector('.chapters-list');
    const noChaptersEl = document.querySelector('.no-chapters');
    
    if (basicInfo.chapters && basicInfo.chapters.length > 0) {
      basicInfo.chapters.forEach(chapter => {
        const li = document.createElement('li');
        li.innerHTML = `<span class="chapter-time">${chapter.time}</span> ${chapter.title}`;
        chaptersList.appendChild(li);
      });
    } else {
      chaptersList.classList.add('hidden');
      noChaptersEl.classList.remove('hidden');
    }

    loadingEl.classList.add('hidden');
    videoInfoEl.classList.remove('hidden');

    summarizeBtn.addEventListener('click', async () => {
      summarizeBtn.disabled = true;
      summarizeBtn.textContent = '추출 중...';

      try {
        extractedData = await chrome.tabs.sendMessage(tab.id, { action: 'extract' });
        
        const prompt = generatePrompt(extractedData);
        
        await chrome.runtime.sendMessage({
          action: 'openGemini',
          prompt: prompt
        });

        summarizeBtn.textContent = 'Gemini 탭 열림!';
        
        setTimeout(() => window.close(), 1000);

      } catch (err) {
        console.error('추출 실패:', err);
        summarizeBtn.disabled = false;
        summarizeBtn.textContent = 'Gemini로 요약하기';
        showError('자막 추출에 실패했습니다. 다시 시도해주세요.');
      }
    });

  } catch (err) {
    console.error('초기화 실패:', err);
    loadingEl.classList.add('hidden');
    showError('정보를 가져오는데 실패했습니다. 페이지를 새로고침 후 다시 시도해주세요.');
  }

  function showError(message) {
    errorEl.querySelector('.error-message').textContent = message;
    errorEl.classList.remove('hidden');
  }

  function generatePrompt(data) {
    const hasChapters = data.chapters && data.chapters.length > 0;
    
    let prompt = `다음 YouTube 영상을 요약해주세요.

## 영상 정보
- 제목: ${data.title}
- URL: ${data.url}

`;

    if (hasChapters) {
      prompt += `## 요청사항
이 영상은 ${data.chapters.length}개의 챕터로 구성되어 있습니다.
각 챕터별로 핵심 내용을 요약해주세요.
- 각 챕터의 주요 포인트 3-5개
- 전체 영상의 핵심 메시지

`;
    } else {
      prompt += `## 요청사항
영상의 전체 내용을 다음 형식으로 요약해주세요:
- 핵심 주제 및 메시지
- 주요 포인트 5-7개
- 결론 및 핵심 인사이트

`;
    }

    prompt += `## 영상 스크립트
${data.transcript}`;

    return prompt;
  }
});
