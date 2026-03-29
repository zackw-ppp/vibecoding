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

function encodeUtf8(text) {
  return new TextEncoder().encode(text);
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let j = 0; j < 8; j += 1) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dateToDos(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | (Math.floor(date.getSeconds() / 2));
  const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { dosTime, dosDate };
}

function u16le(value) {
  const b = new Uint8Array(2);
  new DataView(b.buffer).setUint16(0, value, true);
  return b;
}

function u32le(value) {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, value >>> 0, true);
  return b;
}

function concatBytes(chunks) {
  const total = chunks.reduce((acc, c) => acc + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

function buildZip(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const now = dateToDos(new Date());

  for (const file of files) {
    const nameBytes = encodeUtf8(file.name);
    const dataBytes = file.data;
    const checksum = crc32(dataBytes);

    const localHeader = concatBytes([
      u32le(0x04034b50),
      u16le(20),
      u16le(0),
      u16le(0),
      u16le(now.dosTime),
      u16le(now.dosDate),
      u32le(checksum),
      u32le(dataBytes.length),
      u32le(dataBytes.length),
      u16le(nameBytes.length),
      u16le(0),
      nameBytes
    ]);

    localParts.push(localHeader, dataBytes);

    const centralHeader = concatBytes([
      u32le(0x02014b50),
      u16le(20),
      u16le(20),
      u16le(0),
      u16le(0),
      u16le(now.dosTime),
      u16le(now.dosDate),
      u32le(checksum),
      u32le(dataBytes.length),
      u32le(dataBytes.length),
      u16le(nameBytes.length),
      u16le(0),
      u16le(0),
      u16le(0),
      u16le(0),
      u32le(0),
      u32le(offset),
      nameBytes
    ]);

    centralParts.push(centralHeader);
    offset += localHeader.length + dataBytes.length;
  }

  const centralDir = concatBytes(centralParts);
  const localData = concatBytes(localParts);

  const endRecord = concatBytes([
    u32le(0x06054b50),
    u16le(0),
    u16le(0),
    u16le(files.length),
    u16le(files.length),
    u32le(centralDir.length),
    u32le(localData.length),
    u16le(0)
  ]);

  return new Blob([localData, centralDir, endRecord], { type: 'application/zip' });
}

function sanitizePart(text, fallback) {
  const clean = String(text || '').trim().replace(/[\\/:*?"<>|]+/g, '_');
  return clean || fallback;
}

function isForbiddenStatus(status) {
  return status === 401 || status === 403;
}

function toAbsoluteUrl(url, pageUrl) {
  try {
    return new URL(url, pageUrl || undefined).toString();
  } catch {
    return null;
  }
}

async function fetchViaBackground(url, pageUrl) {
  const response = await fetch(url, {
    credentials: 'include',
    referrer: pageUrl || undefined,
    referrerPolicy: 'no-referrer-when-downgrade'
  });

  if (!response.ok) {
    throw new Error(`请求失败: ${response.status} ${url}`);
  }

  return new Uint8Array(await response.arrayBuffer());
}

async function fetchViaPage(tabId, imageUrl) {
  if (!tabId) return null;

  const [{ result } = {}] = await chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    func: async (url) => {
      try {
        const response = await fetch(url, { credentials: 'include' });
        if (!response.ok) {
          return { ok: false, error: `请求失败: ${response.status} ${url}` };
        }
        const buf = await response.arrayBuffer();
        const bytes = Array.from(new Uint8Array(buf));
        return { ok: true, bytes };
      } catch (error) {
        return { ok: false, error: String(error?.message || error) };
      }
    },
    args: [imageUrl]
  });

  if (!result?.ok || !Array.isArray(result.bytes)) {
    throw new Error(result?.error || '页面上下文抓取失败');
  }

  return new Uint8Array(result.bytes);
}

async function fetchImageBytes(url, context) {
  const absoluteUrl = toAbsoluteUrl(url, context.pageUrl);
  if (!absoluteUrl) {
    throw new Error(`无效图片地址: ${url}`);
  }

  try {
    return await fetchViaBackground(absoluteUrl, context.pageUrl);
  } catch (error) {
    const text = String(error?.message || error);
    const statusMatch = text.match(/请求失败:\s*(\d{3})/);
    const status = statusMatch ? Number(statusMatch[1]) : null;
    if (!isForbiddenStatus(status)) {
      throw error;
    }

    if (!context.tabId) {
      throw new Error(`${text}（且无法使用页面上下文重试）`);
    }

    return fetchViaPage(context.tabId, absoluteUrl);
  }
}

async function downloadImagesDirectly(images, naming, context) {
  const prefix = sanitizePart(naming?.prefix, 'manga');
  const chapter = sanitizePart(naming?.chapter, 'chapter');
  let count = 0;
  let skipped = 0;

  for (let idx = 0; idx < images.length; idx += 1) {
    const image = images[idx];
    const ext = extensionFromUrl(image.src);
    const absoluteUrl = toAbsoluteUrl(image.src, context.pageUrl);
    if (!absoluteUrl) {
      skipped += 1;
      continue;
    }

    const filename = `${prefix}_${chapter}/${prefix}_${chapter}_${pad(idx + 1)}.${ext}`;
    try {
      await chrome.downloads.download({
        url: absoluteUrl,
        filename,
        saveAs: false,
        conflictAction: 'uniquify'
      });
      count += 1;
    } catch {
      skipped += 1;
    }
  }

  return { mode: 'direct', count, skipped };
}

async function buildAndDownloadZip(images, naming, context) {
  const prefix = sanitizePart(naming?.prefix, 'manga');
  const chapter = sanitizePart(naming?.chapter, 'chapter');
  const files = [];
  const failures = [];

  for (let idx = 0; idx < images.length; idx += 1) {
    const image = images[idx];
    const ext = extensionFromUrl(image.src);
    const filename = `${prefix}_${chapter}_${pad(idx + 1)}.${ext}`;

    try {
      const data = await fetchImageBytes(image.src, context);
      files.push({ name: filename, data });
    } catch (error) {
      failures.push(`#${idx + 1} ${String(error?.message || error)}`);
    }
  }

  if (!files.length) {
    const direct = await downloadImagesDirectly(images, naming, context);
    if (!direct.count) {
      throw new Error(`全部下载失败。${failures[0] || ''}`.trim());
    }

    return {
      ...direct,
      warnings: failures.slice(0, 3)
    };
  }

  const zipName = `${prefix}_${chapter}.zip`;
  const blob = buildZip(files);
  const objectUrl = URL.createObjectURL(blob);
  try {
    await chrome.downloads.download({
      url: objectUrl,
      filename: zipName,
      saveAs: false,
      conflictAction: 'uniquify'
    });
  } finally {
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
  }

  return {
    mode: 'zip',
    count: files.length,
    skipped: failures.length,
    zipName,
    warnings: failures.slice(0, 3)
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'DOWNLOAD_IMAGES') return;

  buildAndDownloadZip(message.images || [], message.naming || {}, {
    tabId: message.tabId,
    pageUrl: message.pageUrl
  })
    .then((result) => sendResponse({ ok: true, ...result }))
    .catch((error) => sendResponse({ ok: false, error: String(error) }));

  return true;
});
