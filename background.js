function extensionFromUrl(url) {
  try {
    const pathname = new URL(url).pathname;
    const file = pathname.split('/').pop() || '';
    const ext = file.split('.').pop()?.toLowerCase();
    if (ext && /^[a-z0-9]{2,5}$/.test(ext)) {
      return ext;
    }
  } catch {
    return null;
  }
  return 'jpg';
}

function pad(num, len = 4) {
  return String(num).padStart(len, '0');
}

async function downloadSequential(images, naming) {
  const prefix = naming?.prefix?.trim() || 'manga';
  const chapter = naming?.chapter?.trim() || 'chapter';
  let idx = 1;

  for (const image of images) {
    const ext = extensionFromUrl(image.src);
    const filename = `${prefix}_${chapter}_${pad(idx)}.${ext}`;
    await chrome.downloads.download({
      url: image.src,
      filename,
      saveAs: false,
      conflictAction: 'uniquify'
    });
    idx += 1;
  }

  return { count: images.length };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'DOWNLOAD_IMAGES') return;

  downloadSequential(message.images || [], message.naming || {})
    .then((result) => sendResponse({ ok: true, ...result }))
    .catch((error) => sendResponse({ ok: false, error: String(error) }));

  return true;
});
