import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { chromium } from '@playwright/test'

const appIconPath = resolve(
  'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png',
)
const splashDirectory = resolve(
  'ios/App/App/Assets.xcassets/Splash.imageset',
)
const splashPath = resolve(splashDirectory, 'splash-2732x2732.png')

const brandMark = `
  <svg viewBox="0 0 512 512" aria-hidden="true">
    <path d="M118 278c0-81 62-147 138-147s138 66 138 147H118Z"
      fill="none" stroke="#FFF8E9" stroke-width="38" stroke-linecap="round"/>
    <path d="M86 335h340" stroke="#FFF8E9" stroke-width="38" stroke-linecap="round"/>
    <path d="M178 395h156" stroke="#F2C9A9" stroke-width="30" stroke-linecap="round"/>
  </svg>
`

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
  headless: true,
})

try {
  await mkdir(dirname(appIconPath), { recursive: true })
  await mkdir(splashDirectory, { recursive: true })

  const iconPage = await browser.newPage({
    viewport: { width: 1024, height: 1024 },
    deviceScaleFactor: 1,
  })
  await iconPage.setContent(`
    <style>
      * { box-sizing: border-box; }
      html, body { width: 100%; height: 100%; margin: 0; overflow: hidden; }
      body {
        display: grid;
        place-items: center;
        background: #B75235;
      }
      svg { width: 68%; height: 68%; }
    </style>
    ${brandMark}
  `)
  await iconPage.screenshot({ path: appIconPath })
  await iconPage.close()

  const splashPage = await browser.newPage({
    viewport: { width: 2732, height: 2732 },
    deviceScaleFactor: 1,
  })
  await splashPage.setContent(`
    <style>
      * { box-sizing: border-box; }
      html, body { width: 100%; height: 100%; margin: 0; overflow: hidden; }
      body {
        display: grid;
        place-items: center;
        background: #FFF8E9;
        color: #3A2C25;
        font-family: ui-serif, "Iowan Old Style", "Songti SC", Georgia, serif;
      }
      main {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 52px;
        transform: translateY(-4%);
      }
      .mark {
        display: grid;
        place-items: center;
        width: 410px;
        height: 410px;
        border-radius: 112px;
        background: #B75235;
      }
      svg { width: 76%; height: 76%; }
      strong {
        font-size: 174px;
        font-weight: 600;
        letter-spacing: -6px;
        line-height: 1;
      }
    </style>
    <main>
      <div class="mark">${brandMark}</div>
      <strong>Mise</strong>
    </main>
  `)
  await splashPage.screenshot({ path: splashPath })
  await splashPage.close()

  await Promise.all([
    copyFile(splashPath, resolve(splashDirectory, 'splash-2732x2732-1.png')),
    copyFile(splashPath, resolve(splashDirectory, 'splash-2732x2732-2.png')),
  ])
} finally {
  await browser.close()
}
