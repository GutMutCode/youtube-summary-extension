function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = chrome.i18n.getMessage(key);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  applyI18n();
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
      summarizeBtn.textContent = chrome.i18n.getMessage('extracting');

      try {
        extractedData = await chrome.tabs.sendMessage(tab.id, { action: 'extract' });
        
        const prompt = generatePrompt(extractedData);
        
        await chrome.runtime.sendMessage({
          action: 'openGemini',
          prompt: prompt
        });

        summarizeBtn.textContent = chrome.i18n.getMessage('geminiTabOpened');
        
        setTimeout(() => window.close(), 1000);

      } catch (err) {
        console.error('Extract failed:', err);
        summarizeBtn.disabled = false;
        summarizeBtn.textContent = chrome.i18n.getMessage('summarizeBtn');
        showError(chrome.i18n.getMessage('extractFailed'));
      }
    });

  } catch (err) {
    console.error('Init failed:', err);
    loadingEl.classList.add('hidden');
    showError(chrome.i18n.getMessage('initFailed'));
  }

  function showError(message) {
    errorEl.querySelector('.error-message').textContent = message;
    errorEl.classList.remove('hidden');
  }

  function generatePrompt(data) {
    const hasChapters = data.chapters && data.chapters.length > 0;
    const i18n = chrome.i18n.getMessage;
    
    let prompt = `${i18n('promptTitle')}

## ${i18n('videoInfo')}
- ${i18n('titleLabel')}: ${data.title}
- URL: ${data.url}

`;

    if (hasChapters) {
      prompt += `## ${i18n('requestSection')}
${i18n('chaptersCountMessage', [data.chapters.length.toString()])}
${i18n('summarizeByChapter')}
- ${i18n('chapterPoints')}
- ${i18n('overallMessage')}

`;
    } else {
      prompt += `## ${i18n('requestSection')}
${i18n('summarizeWhole')}
- ${i18n('coreTopics')}
- ${i18n('mainPoints')}
- ${i18n('conclusions')}

`;
    }

    prompt += `## ${i18n('transcript')}
${data.transcript}`;

    return prompt;
  }
});
