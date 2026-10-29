import puppeteer from 'puppeteer-core'

const BASE = process.env.AI_BASE || 'http://127.0.0.1:5200'
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  userDataDir: `.tmp/pptr-p3-${Date.now()}`,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
const page = await browser.newPage()
const errors = []
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})
page.on('pageerror', (e) => errors.push(String(e)))

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await page.evaluateOnNewDocument(() => {
  localStorage.setItem('myos.state.v1', JSON.stringify({ theme: 'dark' }))
})
await page.goto(`${BASE}/knowledge`, { waitUntil: 'networkidle0' })
await wait(1000)

await page.click('.create input')
await page.type('.create input', '测试知识库')
await page.click('.create .btn.primary')
await page.waitForSelector('.base-list li.active')

const input = await page.$('.kb-main input[type=file]')
await input.uploadFile('.tmp/kb-md.md', '.tmp/kb-docx.docx', '.tmp/kb-test.pdf')
await page.waitForFunction(() => document.querySelectorAll('.doc').length === 3, { timeout: 30000 })
await wait(400)

const kbInfo = await page.evaluate(() => ({
  docs: [...document.querySelectorAll('.doc')].map((d) => d.innerText.slice(0, 140)),
  base: document.querySelector('.base-list li.active')?.innerText,
  error: document.querySelector('.notice.err')?.innerText ?? '',
}))
console.log('kb:', JSON.stringify(kbInfo, null, 2))
await page.evaluate(() => {
  document.querySelector('.main').scrollTop = 0
})
await wait(250)
await page.screenshot({ path: '.shots/ai-p3-kb.png' })

await page.click('.base-list li.active .bind input')
await page.waitForFunction(
  () => (JSON.parse(localStorage.getItem('myos.ai.settings.v1') || '{}').knowledgeBaseIds ?? []).length === 1,
  { timeout: 5000 }
)

const box = await (await page.$('.ai-orb')).boundingBox()
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
await wait(500)
await page.click('.ai-actions button[aria-label="设置"]')
await page.waitForSelector('.settings')
await page.waitForSelector('.kb-item input')
await wait(300)

const settingsInfo = await page.evaluate(() => ({
  checked: document.querySelector('.kb-item input')?.checked,
  model: document.querySelector('#ai-model')?.value,
  hint: document.querySelector('.kb-meta')?.textContent,
}))
console.log('settings:', JSON.stringify(settingsInfo))

await page.evaluate(() => {
  const temp = document.querySelector('#ai-temp')
  temp.value = '1'
  temp.dispatchEvent(new Event('input', { bubbles: true }))
  const tokens = document.querySelector('#ai-tokens')
  tokens.value = '4096'
  tokens.dispatchEvent(new Event('input', { bubbles: true }))
  tokens.dispatchEvent(new Event('change', { bubbles: true }))
})
await wait(300)
await page.screenshot({ path: '.shots/ai-p3-settings.png' })

await page.click('.set-head button')
await wait(400)

await page.click('.composer textarea')
await page.type('.composer textarea', '每周复盘应该怎么做？')
await page.keyboard.press('Enter')
await page.waitForSelector('.btn-stop', { timeout: 5000 }).catch(() => {})
await page.waitForFunction(
  () => document.body.innerText.includes('可以先这样拆') && !document.querySelector('.btn-stop'),
  { timeout: 20000 }
)
await wait(800)
await page.evaluate(() => {
  const body = document.querySelector('.ai-body')
  if (body) body.scrollTop = body.scrollHeight
})
await wait(300)

const refInfo = await page.evaluate(() => ({
  count: document.querySelectorAll('.ref').length,
  title: document.querySelector('.ref-title')?.textContent,
  snippet: document.querySelector('.ref-snippet')?.textContent,
  score: document.querySelector('.ref-score')?.textContent,
  settings: localStorage.getItem('myos.ai.settings.v1'),
}))
console.log('refs:', JSON.stringify(refInfo, null, 2))

if (refInfo.count) {
  await page.click('.ref summary')
  await wait(300)
  await page.evaluate(() => {
    const ref = document.querySelector('.ref')
    ref?.scrollIntoView({ block: 'center' })
  })
  await wait(300)
  const expanded = await page.evaluate(() =>
    document.querySelector('.ref-content')?.innerText?.slice(0, 200)
  )
  console.log('expanded:', expanded)
}
await page.screenshot({ path: '.shots/ai-p3-refs.png' })
console.log('errors:', errors.length ? errors.join(' | ') : 'none')

await browser.close()
