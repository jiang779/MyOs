/**
 * 界面截图脚本（开发用）
 * 用法：先 `pnpm dev --port 5199`，再 `node scripts/shots.mjs`
 * 依赖本机 Chrome；puppeteer-core 不会额外下载浏览器。
 */
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.env.SHOT_URL || 'http://127.0.0.1:5199/'
const OUT = '.shots'

const SHOTS = [
  { name: 'desktop-light', path: '/', width: 1440, height: 900, theme: 'light' },
  { name: 'desktop-dark', path: '/', width: 1440, height: 900, theme: 'dark' },
  { name: 'tablet-dark', path: '/', width: 820, height: 1180, theme: 'dark' },
  { name: 'mobile-light', path: '/', width: 390, height: 844, theme: 'light' },
  { name: 'mobile-dark', path: '/', width: 390, height: 844, theme: 'dark' },
  { name: 'mobile-small', path: '/', width: 360, height: 640, theme: 'dark' },
  { name: 'interview-dark', path: '/interview', width: 1440, height: 900, theme: 'dark' },
  { name: 'notes-light', path: '/notes', width: 1440, height: 900, theme: 'light' },
  {
    name: 'drill-dark',
    path: '/',
    width: 1440,
    height: 900,
    theme: 'dark',
    click: '.console .btn.primary',
  },
  { name: 'planet-hover', path: '/', width: 1440, height: 900, theme: 'dark', hoverPlanet: true },
  { name: 'meteor', path: '/', width: 1440, height: 900, theme: 'dark', wait: 1200, waitMeteor: true },
  {
    name: 'planet-theme-switch',
    path: '/',
    width: 1440,
    height: 900,
    theme: 'dark',
    click: '.header .icon-btn',
  },
]

mkdirSync(OUT, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  userDataDir: '.tmp/pptr',
  args: [
    '--no-sandbox',
    '--hide-scrollbars',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--force-device-scale-factor=1',
  ],
})

for (const shot of SHOTS) {
  const page = await browser.newPage()
  const errors = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.on('pageerror', (err) => errors.push(String(err)))
  await page.setViewport({
    width: shot.width,
    height: shot.height,
    deviceScaleFactor: 1,
    isMobile: shot.width < 900,
    hasTouch: shot.width < 900,
  })
  await page.evaluateOnNewDocument((theme) => {
    localStorage.setItem('myos.state.v1', JSON.stringify({ theme }))
  }, shot.theme)
  await page.goto(new URL(shot.path, BASE).href, { waitUntil: 'networkidle0' })
  await page.evaluate(() => document.fonts?.ready)
  await new Promise((r) => setTimeout(r, shot.wait ?? 2600))

  if (shot.waitMeteor) {
    await page.waitForFunction(() => !!document.querySelector('.meteor .streak'), { timeout: 20000 })
    await new Promise((r) => setTimeout(r, 380))
  }

  if (shot.click) {
    await page.waitForSelector(shot.click)
    await page.click(shot.click)
    await new Promise((r) => setTimeout(r, 700))
  }

  if (shot.hoverPlanet) {
    const stage = await page.$('.planet .stage')
    const box = await stage?.boundingBox()
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await new Promise((r) => setTimeout(r, 500))
    }
  }

  await page.screenshot({ path: `${OUT}/${shot.name}.png` })
  await page.close()
  console.log(`shot: ${shot.name}${errors.length ? `  ⚠ ${errors.join(' | ')}` : ''}`)
}

await browser.close()
