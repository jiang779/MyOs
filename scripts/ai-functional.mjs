import puppeteer from 'puppeteer-core'

const BASE = process.env.AI_BASE || 'http://127.0.0.1:5200/'
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  userDataDir: `.tmp/pptr-ai-fn-${Date.now()}`,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
const page = await browser.newPage()
const errors = []
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})
page.on('pageerror', (e) => errors.push(String(e)))

await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await page.evaluateOnNewDocument(() => {
  localStorage.setItem('myos.state.v1', JSON.stringify({ theme: 'dark' }))
})
await page.goto(BASE, { waitUntil: 'networkidle0' })
await new Promise((r) => setTimeout(r, 1000))

async function openPanel() {
  const orb = await page.$('.ai-orb')
  const box = await orb.boundingBox()
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await page.waitForSelector('.ai-panel')
  await new Promise((r) => setTimeout(r, 400))
}

await openPanel()
await page.click('.composer textarea')
await page.type('.composer textarea', '测试停止与持久化', { delay: 10 })
await page.keyboard.press('Enter')
await new Promise((r) => setTimeout(r, 260))
await page.click('.btn-stop')
await new Promise((r) => setTimeout(r, 500))
const stopped = await page.evaluate(() => ({
  tag: document.body.innerText.includes('已停止'),
  user: document.querySelector('.msg.user')?.innerText,
  sending: !!document.querySelector('.btn-stop'),
}))
console.log('stop:', JSON.stringify(stopped))

await page.reload({ waitUntil: 'networkidle0' })
await new Promise((r) => setTimeout(r, 800))
await openPanel()
const persisted = await page.evaluate(() => ({
  user: document.querySelector('.msg.user')?.innerText,
  messages: document.querySelectorAll('.msg').length,
  title: document.querySelector('.ai-panel')?.innerText.includes('测试停止与持久化'),
}))
console.log('persist:', JSON.stringify(persisted))

// 会话列表：重命名
await page.click('.ai-actions button[aria-label="会话列表"]')
await page.waitForSelector('.conv')
await page.click('.conv-ops button[aria-label="重命名"]')
await page.waitForSelector('.conv .rename')
await page.click('.conv .rename', { clickCount: 3 })
await page.type('.conv .rename', '新标题')
await page.keyboard.press('Enter')
await new Promise((r) => setTimeout(r, 300))
const renamed = await page.evaluate(() => document.querySelector('.conv-title')?.textContent)
console.log('rename:', renamed)

// 删除（两次点击确认）
await page.click('.conv-ops button[aria-label="删除"]')
await new Promise((r) => setTimeout(r, 100))
await page.click('.conv-ops button[aria-label="确认删除"]')
await new Promise((r) => setTimeout(r, 500))
const deleted = await page.evaluate(() => ({
  convs: document.querySelectorAll('.conv-list li').length,
  messages: document.querySelectorAll('.msg').length,
}))
console.log('delete:', JSON.stringify(deleted))

// 移动端
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
await page.reload({ waitUntil: 'networkidle0' })
await new Promise((r) => setTimeout(r, 900))
await page.evaluate(() => document.querySelector('.ai-orb')?.click())
await new Promise((r) => setTimeout(r, 600))
await page.screenshot({ path: '.shots/ai-mobile.png' })
const mobile = await page.evaluate(() => {
  const el = document.querySelector('.ai-panel')
  const r = el?.getBoundingClientRect()
  return r ? { x: r.x, y: r.y, w: r.width, h: r.height } : null
})
console.log('mobile:', JSON.stringify(mobile))
console.log('errors:', errors.length ? errors.join(' | ') : 'none')

await browser.close()
