chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openGemini') {
    openGeminiWithPrompt(request.prompt);
    sendResponse({ success: true });
  }
  
  if (request.action === 'openVideoAndSummarize') {
    openVideoAndSummarize(request.videoId);
    sendResponse({ success: true });
  }
  
  return true;
});

async function openVideoAndSummarize(videoId) {
  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const prompt = `다음 YouTube 영상을 챕터별로 요약해줘. 챕터가 없다면 주요 내용을 시간순으로 정리해줘.

${youtubeUrl}`;
  
  openGeminiWithPrompt(prompt);
}

async function openGeminiWithPrompt(prompt) {
  const tab = await chrome.tabs.create({
    url: 'https://gemini.google.com/app',
    active: false
  });

  chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
    if (tabId === tab.id && info.status === 'complete') {
      chrome.tabs.onUpdated.removeListener(listener);
      
      setTimeout(() => {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: insertPromptToGemini,
          args: [prompt]
        });
      }, 2000);
    }
  });
}

function insertPromptToGemini(prompt) {
  const tryInsert = (attempts = 0) => {
    if (attempts > 10) {
      console.error('Gemini 입력창을 찾을 수 없습니다');
      return;
    }

    const inputArea = document.querySelector('div[contenteditable="true"]') ||
                      document.querySelector('textarea') ||
                      document.querySelector('.ql-editor');

    if (inputArea) {
      if (inputArea.tagName === 'TEXTAREA') {
        inputArea.value = prompt;
        inputArea.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        inputArea.innerText = prompt;
        inputArea.dispatchEvent(new InputEvent('input', { bubbles: true }));
      }
      inputArea.focus();
      
      setTimeout(() => clickSendButton(), 500);
    } else {
      setTimeout(() => tryInsert(attempts + 1), 500);
    }
  };

  const clickSendButton = (attempts = 0) => {
    if (attempts > 10) {
      console.error('Gemini 전송 버튼을 찾을 수 없습니다');
      return;
    }

    const sendBtn = document.querySelector('button.send-button') ||
                    document.querySelector('button[aria-label*="보내기"]') ||
                    document.querySelector('button[aria-label*="Send"]') ||
                    document.querySelector('.send-button-container button');

    if (sendBtn && !sendBtn.disabled) {
      sendBtn.click();
    } else {
      setTimeout(() => clickSendButton(attempts + 1), 300);
    }
  };

  tryInsert();
}
