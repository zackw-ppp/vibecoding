let latestImages = [];

const el = {
  minWidth: document.getElementById('minWidth'),
  minHeight: document.getElementById('minHeight'),
  minRatio: document.getElementById('minRatio'),
  maxRatio: document.getElementById('maxRatio'),
  prefix: document.getElementById('prefix'),
  chapter: document.getElementById('chapter'),
  collectBtn: document.getElementById('collectBtn'),
  downloadBtn: document.getElementById('downloadBtn'),
  status: document.getElementById('status'),
  preview: document.getElementById('preview')
};

function setStatus(text) {
  el.status.textContent = text;
}

function renderPreview(images) {
  el.preview.innerHTML = '';
  images.slice(0, 20).forEach((img, i) => {
    const li = document.createElement('li');
    li.textContent = `${String(i + 1).padStart(4, '0')}  ${img.width}x${img.height}  ${img.src}`;
    el.preview.appendChild(li);
  });
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] || null;
}

function collectOptions() {
  return {
    minWidth: Number(el.minWidth.value || 600),
    minHeight: Number(el.minHeight.value || 800),
    minRatio: Number(el.minRatio.value || 0.55),
    maxRatio: Number(el.maxRatio.value || 0.9)
  };
}

function isInjectableUrl(url = '') {
  return /^(https?:|file:)/.test(url);
}

async function ensureContentScriptReady(tab) {
  if (!tab?.id) {
    throw new Error('未找到活动标签页');
  }

  if (!isInjectableUrl(tab.url || '')) {
    throw new Error('当前页面不支持（请在 http/https 网页使用，不支持 chrome:// 页面）');
  }

  try {
    const probe = await chrome.tabs.sendMessage(tab.id, { type: 'PING' });
    if (probe?.ok) return;
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
  }
}

el.collectBtn.addEventListener('click', async () => {
  try {
    const tab = await getActiveTab();
    if (!tab) {
      setStatus('未找到活动标签页');
      return;
    }

    setStatus('提取中...');
    await ensureContentScriptReady(tab);

    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'COLLECT_IMAGES',
      options: collectOptions()
    });

    if (!response?.ok) {
      setStatus('提取失败');
      return;
    }

    latestImages = response.images || [];
    renderPreview(latestImages);
    el.downloadBtn.disabled = latestImages.length === 0;
    setStatus(`提取完成：${latestImages.length} 张`);
  } catch (error) {
    setStatus(`提取失败：${String(error.message || error)}`);
  }
});

el.downloadBtn.addEventListener('click', async () => {
  if (!latestImages.length) return;
  setStatus('下载中...');
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'DOWNLOAD_IMAGES',
      images: latestImages,
      naming: {
        prefix: el.prefix.value,
        chapter: el.chapter.value
      }
    });

    if (!response?.ok) {
      setStatus(`下载失败：${response?.error || 'unknown error'}`);
      return;
    }

    setStatus(`下载任务已提交：${response.count} 张`);
  } catch (error) {
    setStatus(`下载失败：${String(error)}`);
  }
});
