import puppeteer from 'puppeteer-core'

const BASE = process.env.AI_BASE || 'http://127.0.0.1:5199/'
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  userDataDir: `.tmp/pptr-ai-${Date.now()}`,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})

const page = await browser.newPage()
page.on('console', (m) => {
  if (m.type() === 'error') console.log('console error:', m.text())
})
page.on('pageerror', (e) => console.log('pageerror:', String(e)))

await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await page.evaluateOnNewDocument(() => {
  localStorage.setItem('myos.state.v1', JSON.stringify({ theme: 'dark' }))
})
await page.goto(BASE, { waitUntil: 'networkidle0' })
await new Promise((r) => setTimeout(r, 1400))

const orb = await page.$('.ai-orb')
const box = await orb.boundingBox()
const clip = { x: box.x - 26, y: box.y - 26, width: box.width + 52, height: box.height + 52 }

await page.screenshot({ path: '.shots/ai-orb.png', clip })
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
await new Promise((r) => setTimeout(r, 900))
await page.screenshot({ path: '.shots/ai-orb-hover.png', clip })

await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
await new Promise((r) => setTimeout(r, 500))
await page.mouse.move(1180, 460)
await new Promise((r) => setTimeout(r, 1200))
await page.screenshot({ path: '.shots/ai-panel-empty.png' })

await page.click('.composer textarea')
await page.type('.composer textarea', '只回复：收到', { delay: 15 })
await page.keyboard.press('Enter')

await new Promise((r) => setTimeout(r, 1200))
await page.screenshot({ path: '.shots/ai-panel-streaming.png' })

try {
  await page.waitForFunction(() => !document.querySelector('.btn-stop'), { timeout: 120000 })
} catch {
  console.log('still streaming after 120s')
}
await new Promise((r) => setTimeout(r, 800))
await page.screenshot({ path: '.shots/ai-panel-reply.png' })

const info = await page.evaluate(() => ({
  sending: !!document.querySelector('.btn-stop'),
  userText: document.querySelector('.msg.user')?.innerText?.slice(0, 120),
  assistantText: document.querySelector('.msg.assistant')?.innerText?.slice(0, 1500),
  messages: document.querySelectorAll('.msg').length,
  stopTag: document.body.innerText.includes('已停止'),
  errorTag: document.body.innerText.includes('请求失败'),
}))
console.log(JSON.stringify(info, null, 2))

await browser.close()
