# AGENTS.md

## Cursor Cloud specific instructions

### What this project is
This repo is a **static Chrome extension (Manifest V3)** — the "Manga Image Extractor". It is plain HTML/CSS/JS with **no package manager, no dependencies, no build step, no test suite, and no linter config**. The source files (`manifest.json`, `background.js`, `content.js`, `popup.html/.css/.js`) are loaded directly into Chrome as an unpacked extension. `background.js` implements its own ZIP writer (CRC32 + local/central headers) so there are no third-party libraries to install.

Because there is nothing to install, the startup **update script is intentionally a no-op**. There is no server/backend — the extension runs entirely inside the user's browser. `Google Chrome`, `Node`, and `Python 3` are already present in the base VM.

There are no lint/test/build commands to run. "Running" the app means loading it in Chrome and using the popup.

### Loading the extension (important gotcha)
This Chrome build (148) **silently ignores the `--load-extension` and `--disable-extensions-except` CLI flags** (extension-loading via flags has been disabled for security). Passing them does nothing — `chrome://extensions` will show no extension. To load it you must use the UI:
1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select the repo directory (`/workspace`).

An unpacked extension loaded this way **persists in that Chrome profile across restarts** (as long as you don't wipe the profile), so you only need to load it once per profile.

### Running Chrome / enabling DevTools (CDP) in this VM
- The `/usr/local/bin/google-chrome` wrapper forces `--user-data-dir=/home/ubuntu/.config/google-chrome` and `--remote-debugging-port=9222`.
- Chrome 136+ **disables remote debugging when using the default user-data-dir**. To get a working CDP endpoint on `localhost:9222`, launch with a **non-default** profile, e.g. `google-chrome --user-data-dir=/tmp/chrome-profile <url>`.
- Downloads go to `~/Downloads`.
- The deterministic unpacked-extension ID for path `/workspace` is `mfcnnpgffdelhlegadfaiedfiklhjacl`. The manifest defines no icon, so Chrome shows a default "M" toolbar icon; pin it via Preferences `extensions.pinned_extensions` if you want a directly clickable toolbar button.

### Testing the core flow without clicking the toolbar
Extension pages cannot be opened as top-level tabs here (`chrome-extension://…/popup.html` returns `ERR_BLOCKED_BY_CLIENT`), which makes fully headless popup automation awkward. The reliable way to exercise the real code end to end is over CDP against the **service worker** target:
1. Serve a test page with manga-sized images (`python3 -m http.server`). The default filters require width ≥ 600, height ≥ 800, and aspect ratio (w/h) between 0.55 and 0.90, so use e.g. 800×1000 images plus some out-of-range noise images.
2. Attach to the SW target (`chrome-extension://<id>/background.js`) and run the same steps `popup.js` performs: `chrome.tabs.sendMessage(tabId, {type:'COLLECT_IMAGES', options})` to run `content.js`, then build/download the ZIP.
3. **Call `runDownloadJob(message)` directly** in the SW instead of `chrome.runtime.sendMessage({type:'DOWNLOAD_IMAGES', …})` — a context cannot message its own listener, so from the SW the message route throws `Could not establish connection. Receiving end does not exist.` `runDownloadJob` is exactly what the `onMessage` handler calls.
4. The CDP WebSocket handshake is rejected unless you either suppress the `Origin` header or launch Chrome with `--remote-allow-origins=*`.
5. Content scripts only inject into pages loaded **after** the extension is ready; reload the test tab (or let `popup.js`/your driver inject `content.js` via `chrome.scripting`) before collecting.

A successful run downloads `~/Downloads/<prefix>_<chapter>.zip` (default `manga_chapter.zip`) containing sequentially named images (`manga_chapter_0001.png`, …).
