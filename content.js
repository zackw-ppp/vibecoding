(() => {
  if (window.__mangaExtractorInjected) {
    return;
  }
  window.__mangaExtractorInjected = true;

  const DEFAULTS = {
    minWidth: 600,
    minHeight: 800,
    minRatio: 0.55,
    maxRatio: 0.9,
    includeHidden: false,
    dedupeQuery: true
  };

  const lazyAttrs = [
    'data-src',
    'data-original',
    'data-lazy-src',
    'data-echo',
    'data-url',
    'data-image'
  ];

  function normalizeUrl(rawUrl, dedupeQuery) {
    if (!rawUrl) return null;
    try {
      const u = new URL(rawUrl, location.href);
      if (dedupeQuery) {
        u.search = '';
      }
      return u.toString();
    } catch {
      return null;
    }
  }

  function getBestSrc(img) {
    const candidates = [];

    if (img.currentSrc) candidates.push(img.currentSrc);
    if (img.src) candidates.push(img.src);

    for (const attr of lazyAttrs) {
      const val = img.getAttribute(attr);
      if (val) candidates.push(val);
    }

    const srcset = img.getAttribute('srcset') || '';
    if (srcset.includes(',')) {
      const parsed = srcset
        .split(',')
        .map((item) => item.trim())
        .map((item) => {
          const [url, descriptor] = item.split(/\s+/);
          const score = descriptor?.endsWith('w') ? Number(descriptor.slice(0, -1)) : 0;
          return { url, score: Number.isFinite(score) ? score : 0 };
        })
        .filter((item) => item.url)
        .sort((a, b) => b.score - a.score);

      if (parsed.length) candidates.unshift(parsed[0].url);
    }

    return candidates.find(Boolean) || null;
  }

  function isVisibleEnough(el) {
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) {
      return false;
    }
    return true;
  }

  function collectImages(options) {
    const cfg = { ...DEFAULTS, ...(options || {}) };
    const allImages = Array.from(document.querySelectorAll('img'));
    const seen = new Set();
    const collected = [];

    for (const img of allImages) {
      if (!cfg.includeHidden && !isVisibleEnough(img)) continue;

      const width = img.naturalWidth || img.width || 0;
      const height = img.naturalHeight || img.height || 0;
      if (!width || !height) continue;

      if (width < cfg.minWidth || height < cfg.minHeight) continue;
      const ratio = width / height;
      if (ratio < cfg.minRatio || ratio > cfg.maxRatio) continue;

      const rawSrc = getBestSrc(img);
      const normalized = normalizeUrl(rawSrc, cfg.dedupeQuery);
      if (!normalized) continue;
      if (seen.has(normalized)) continue;
      seen.add(normalized);

      const rect = img.getBoundingClientRect();
      const top = rect.top + window.scrollY;

      collected.push({
        src: rawSrc,
        normalizedSrc: normalized,
        width,
        height,
        top
      });
    }

    return collected.sort((a, b) => a.top - b.top);
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'PING') {
      sendResponse({ ok: true });
      return;
    }

    if (message?.type !== 'COLLECT_IMAGES') return;

    const images = collectImages(message.options);
    sendResponse({ ok: true, images });
  });
})();
