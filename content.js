class YouTubeExtractor {
  constructor(videoId = null) {
    this.videoId = videoId || this.getVideoId();
  }

  getVideoId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('v');
  }

  getVideoTitle() {
    const titleElement = document.querySelector('h1.ytd-video-primary-info-renderer yt-formatted-string') ||
                         document.querySelector('h1.ytd-watch-metadata yt-formatted-string') ||
                         document.querySelector('#title h1');
    return titleElement?.textContent?.trim() || '제목 없음';
  }

  getChapters() {
    const chapters = [];
    
    const chapterElements = document.querySelectorAll('ytd-macro-markers-list-item-renderer');
    
    if (chapterElements.length > 0) {
      chapterElements.forEach((el) => {
        const timeEl = el.querySelector('#time');
        const titleEl = el.querySelector('#details h4');
        
        if (timeEl && titleEl) {
          chapters.push({
            time: timeEl.textContent.trim(),
            title: titleEl.textContent.trim()
          });
        }
      });
    }

    if (chapters.length === 0) {
      const description = this.getDescription();
      const timestampRegex = /(?:^|\n)(\d{1,2}:\d{2}(?::\d{2})?)\s*[-–—]?\s*(.+?)(?=\n|$)/g;
      let match;
      
      while ((match = timestampRegex.exec(description)) !== null) {
        chapters.push({
          time: match[1],
          title: match[2].trim()
        });
      }
    }

    return chapters;
  }

  getDescription() {
    const descElement = document.querySelector('#description-inline-expander yt-attributed-string') ||
                        document.querySelector('#description yt-formatted-string') ||
                        document.querySelector('ytd-text-inline-expander #plain-snippet-text');
    return descElement?.textContent || '';
  }

  async getTranscript() {
    try {
      const transcriptData = await this.fetchTranscriptFromPage();
      return transcriptData;
    } catch (error) {
      console.error('자막 추출 실패:', error);
      return null;
    }
  }

  async fetchTranscriptFromPage() {
    return new Promise((resolve) => {
      let transcriptPanel = document.querySelector('ytd-transcript-renderer');
      
      if (!transcriptPanel) {
        this.openTranscriptPanel();
        
        setTimeout(() => {
          transcriptPanel = document.querySelector('ytd-transcript-renderer');
          if (transcriptPanel) {
            resolve(this.extractTranscriptText(transcriptPanel));
          } else {
            resolve(null);
          }
        }, 2000);
      } else {
        resolve(this.extractTranscriptText(transcriptPanel));
      }
    });
  }

  openTranscriptPanel() {
    const expandButton = document.querySelector('tp-yt-paper-button#expand');
    if (expandButton) {
      expandButton.click();
    }

    setTimeout(() => {
      const transcriptButton = Array.from(document.querySelectorAll('ytd-video-description-transcript-section-renderer button'))
        .find(btn => btn.textContent.includes('스크립트') || btn.textContent.includes('transcript'));
      if (transcriptButton) {
        transcriptButton.click();
      }
    }, 500);
  }

  extractTranscriptText(panel) {
    const segments = panel.querySelectorAll('ytd-transcript-segment-renderer');
    const transcript = [];

    segments.forEach((segment) => {
      const timeEl = segment.querySelector('.segment-timestamp');
      const textEl = segment.querySelector('.segment-text');

      if (timeEl && textEl) {
        transcript.push({
          time: timeEl.textContent.trim(),
          text: textEl.textContent.trim()
        });
      }
    });

    return transcript;
  }

  formatTranscriptByChapters(transcript, chapters) {
    if (!transcript || transcript.length === 0) {
      return '자막을 찾을 수 없습니다.';
    }

    if (chapters.length === 0) {
      return transcript.map(t => `[${t.time}] ${t.text}`).join('\n');
    }

    const chapterTranscripts = [];
    
    for (let i = 0; i < chapters.length; i++) {
      const currentChapter = chapters[i];
      const nextChapter = chapters[i + 1];
      
      const currentSeconds = this.timeToSeconds(currentChapter.time);
      const nextSeconds = nextChapter ? this.timeToSeconds(nextChapter.time) : Infinity;

      const chapterTexts = transcript.filter(t => {
        const seconds = this.timeToSeconds(t.time);
        return seconds >= currentSeconds && seconds < nextSeconds;
      });

      chapterTranscripts.push({
        chapter: currentChapter,
        texts: chapterTexts
      });
    }

    return chapterTranscripts.map(ct => {
      const texts = ct.texts.map(t => t.text).join(' ');
      return `## ${ct.chapter.time} - ${ct.chapter.title}\n${texts}`;
    }).join('\n\n');
  }

  timeToSeconds(timeStr) {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return parts[0] * 60 + parts[1];
  }

  async extractAll() {
    const title = this.getVideoTitle();
    const chapters = this.getChapters();
    const transcript = await this.getTranscript();
    const formattedTranscript = this.formatTranscriptByChapters(transcript, chapters);

    return {
      videoId: this.videoId,
      title,
      chapters,
      transcript: formattedTranscript,
      url: window.location.href
    };
  }
}

class ThumbnailOverlay {
  constructor() {
    this.processedThumbnails = new WeakSet();
    this.init();
  }

  init() {
    this.addOverlaysToExisting();
    this.observeNewThumbnails();
  }

  createSummaryButton(videoId) {
    const btn = document.createElement('button');
    btn.className = 'yt-summary-btn';
    btn.title = 'Gemini로 요약하기';
    
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z');
    svg.appendChild(path);
    btn.appendChild(svg);
    
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleSummaryClick(videoId, btn);
    });

    return btn;
  }

  async handleSummaryClick(videoId, btn) {
    btn.classList.add('loading');
    this.showToast('영상 페이지로 이동 중...');

    chrome.runtime.sendMessage({
      action: 'openVideoAndSummarize',
      videoId: videoId
    });
  }

  showToast(message) {
    const existing = document.querySelector('.yt-summary-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'yt-summary-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
  }

  getVideoIdFromElement(element) {
    const link = element.querySelector('a#thumbnail, a.ytd-thumbnail, a[href*="/watch"], a.yt-lockup-view-model__content-image');
    if (!link) return null;

    const href = link.getAttribute('href');
    if (!href) return null;

    const match = href.match(/[?&]v=([^&]+)/);
    return match ? match[1] : null;
  }

  getThumbnailContainer(element) {
    return element.querySelector('#thumbnail, ytd-thumbnail, .ytd-thumbnail, yt-thumbnail-view-model, a.yt-lockup-view-model__content-image');
  }

  addOverlayToThumbnail(videoRenderer) {
    if (this.processedThumbnails.has(videoRenderer)) return;

    const videoId = this.getVideoIdFromElement(videoRenderer);
    if (!videoId) return;

    const thumbnailContainer = this.getThumbnailContainer(videoRenderer);
    if (!thumbnailContainer) return;

    const existingBtn = thumbnailContainer.querySelector('.yt-summary-btn');
    if (existingBtn) return;

    thumbnailContainer.style.position = 'relative';
    
    const btn = this.createSummaryButton(videoId);
    thumbnailContainer.appendChild(btn);

    this.processedThumbnails.add(videoRenderer);
  }

  addOverlaysToExisting() {
    const selectors = [
      'ytd-rich-item-renderer',
      'ytd-video-renderer',
      'ytd-grid-video-renderer',
      'ytd-compact-video-renderer'
    ];

    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        this.addOverlayToThumbnail(el);
      });
    });
  }

  observeNewThumbnails() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;

          const isVideoRenderer = node.matches?.('ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer');
          
          if (isVideoRenderer) {
            this.addOverlayToThumbnail(node);
          }

          node.querySelectorAll?.('ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer')
            .forEach(el => this.addOverlayToThumbnail(el));
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
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

async function autoSummarize() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('autoSummary') !== 'true') return;

  const newUrl = new URL(window.location.href);
  newUrl.searchParams.delete('autoSummary');
  window.history.replaceState({}, '', newUrl.toString());

  await new Promise(resolve => setTimeout(resolve, 2000));

  const extractor = new YouTubeExtractor();
  const data = await extractor.extractAll();
  const prompt = generatePrompt(data);

  chrome.runtime.sendMessage({
    action: 'openGemini',
    prompt: prompt
  });
}

if (window.location.pathname === '/watch') {
  autoSummarize();
}

if (!window.location.pathname.startsWith('/watch')) {
  new ThumbnailOverlay();
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extract') {
    const extractor = new YouTubeExtractor();
    extractor.extractAll().then(data => {
      sendResponse(data);
    });
    return true;
  }
  
  if (request.action === 'getBasicInfo') {
    const extractor = new YouTubeExtractor();
    sendResponse({
      title: extractor.getVideoTitle(),
      chapters: extractor.getChapters(),
      videoId: extractor.videoId
    });
  }

  if (request.action === 'triggerAutoSummary') {
    autoSummarize();
  }
});
