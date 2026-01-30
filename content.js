const SUMMARY_ICON_PATH = 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z';

function showToast(message) {
  const existing = document.querySelector('.yt-summary-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'yt-summary-toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 3000);
}

function createSummaryIcon() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', SUMMARY_ICON_PATH);
  svg.appendChild(path);
  return svg;
}

function summarizeVideo(videoId) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const prompt = `이 YouTube 영상을 요약해줘: ${url}`;

  chrome.runtime.sendMessage({
    action: 'openGemini',
    prompt: prompt
  });
}

class WatchPageButton {
  constructor() {
    this.button = null;
    this.init();
  }

  init() {
    this.waitForActions().then(() => this.addButton());
    this.observeNavigation();
  }

  waitForActions() {
    return new Promise((resolve) => {
      const check = () => {
        const container = document.querySelector('#actions #top-level-buttons-computed, #actions ytd-menu-renderer');
        if (container) resolve(container);
        else setTimeout(check, 500);
      };
      check();
    });
  }

  createButton() {
    const btn = document.createElement('button');
    btn.className = 'yt-summary-watch-btn';
    btn.title = 'Gemini로 요약하기';

    btn.appendChild(createSummaryIcon());

    const text = document.createElement('span');
    text.textContent = '요약';
    btn.appendChild(text);

    btn.addEventListener('click', () => this.handleClick(btn));
    return btn;
  }

  handleClick(btn) {
    if (btn.classList.contains('loading')) return;
    btn.classList.add('loading');

    const videoId = new URLSearchParams(window.location.search).get('v');
    summarizeVideo(videoId);

    setTimeout(() => btn.classList.remove('loading'), 1000);
  }

  addButton() {
    if (document.querySelector('.yt-summary-watch-btn')) return;

    const container = document.querySelector('#actions #top-level-buttons-computed, #actions ytd-menu-renderer');
    if (!container) return;

    this.button = this.createButton();
    container.insertBefore(this.button, container.firstChild);
  }

  removeButton() {
    const btn = document.querySelector('.yt-summary-watch-btn');
    if (btn) btn.remove();
    this.button = null;
  }

  observeNavigation() {
    let lastUrl = location.href;

    const observer = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        if (location.pathname === '/watch') {
          this.removeButton();
          setTimeout(() => this.addButton(), 1000);
        } else {
          this.removeButton();
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
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
    btn.appendChild(createSummaryIcon());

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleSummaryClick(videoId, btn);
    });

    return btn;
  }

  handleSummaryClick(videoId, btn) {
    if (btn.classList.contains('loading')) return;
    btn.classList.add('loading');
    summarizeVideo(videoId);
    setTimeout(() => btn.classList.remove('loading'), 1000);
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

    const container = this.getThumbnailContainer(videoRenderer);
    if (!container) return;

    if (container.querySelector('.yt-summary-btn')) return;

    container.style.position = 'relative';
    container.appendChild(this.createSummaryButton(videoId));
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
      document.querySelectorAll(selector).forEach(el => this.addOverlayToThumbnail(el));
    });
  }

  observeNewThumbnails() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;

          if (node.matches?.('ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer')) {
            this.addOverlayToThumbnail(node);
          }

          node.querySelectorAll?.('ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer')
            .forEach(el => this.addOverlayToThumbnail(el));
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }
}

if (window.location.pathname === '/watch') {
  new WatchPageButton();
} else {
  new ThumbnailOverlay();
}
