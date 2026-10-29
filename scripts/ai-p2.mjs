import puppeteer from 'puppeteer-core'

const BASE = process.env.AI_BASE || 'http://127.0.0.1:5200/'
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  userDataDir: `.tmp/pptr-ai-p2-${Date.now()}`,
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
await page.goto(BASE, { waitUntil: 'networkidle0' })
await wait(1000)

const before = await page.evaluate(() => {
  const m = document.querySelector('.main').getBoundingClientRect()
  return { x: Math.round(m.x), width: Math.round(m.width) }
})

const box = await (await page.$('.ai-orb')).boundingBox()
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
await wait(1000)

const after = await page.evaluate(() => {
  const m = document.querySelector('.main').getBoundingClientRect()
  const p = document.querySelector('.ai-panel').getBoundingClientRect()
  return {
    main: { x: Math.round(m.x), width: Math.round(m.width) },
    panel: { x: Math.round(p.x), width: Math.round(p.width) },
    aiOpen: document.documentElement.classList.contains('ai-open'),
  }
})
console.log('layout:', JSON.stringify({ before, after }))
await page.screenshot({ path: '.shots/ai-p2-layout.png' })

await page.click('.composer textarea')
await page.type('.composer textarea', '帮我把今天要做的事拆一下', { delay: 8 })
await page.keyboard.press('Enter')
await wait(600)
await page.screenshot({ path: '.shots/ai-p2-streaming.png' })

await page.waitForFunction(() => !document.querySelector('.btn-stop'), { timeout: 20000 })
await wait(700)
await page.screenshot({ path: '.shots/ai-p2-reply.png' })

const info = await page.evaluate(() => ({
  think: document.querySelector('.msg.assistant .think summary')?.innerText,
  tools: [...document.querySelectorAll('.msg.assistant .tool')].map((el) => el.innerText.slice(0, 160)),
  retry: [...document.querySelectorAll('.msg.assistant .retry')].map((el) => el.innerText),
  assistantText: document.querySelector('.msg.assistant')?.innerText.slice(0, 400),
}))
console.log('reply:', JSON.stringify(info, null, 2))

// 失败工具卡上的「重试」：移除失败回答，按同一轮用户消息重新请求
await page.click('.msg.assistant .retry')
await wait(400)
const retrying = await page.evaluate(() => ({
  sending: !!document.querySelector('.btn-stop'),
  messages: document.querySelectorAll('.msg').length,
}))
console.log('retry:', JSON.stringify(retrying))
await page.waitForFunction(() => !document.querySelector('.btn-stop'), { timeout: 20000 })
await wait(400)

// 新建会话，发一条后在流式过程中刷新，验证续传去重
await page.click('.ai-actions button[aria-label="新建会话"]')
await wait(400)
await page.click('.composer textarea')
await page.type('.composer textarea', '重连测试', { delay: 8 })
await page.keyboard.press('Enter')
await wait(700)

const mid = await page.evaluate(() => ({
  streaming: !!document.querySelector('.msg.assistant'),
  pending: localStorage.getItem('myos.ai.pending.v1'),
  text: document.querySelector('.msg.assistant')?.innerText.slice(0, 120),
}))
console.log('mid:', JSON.stringify(mid))

await page.reload({ waitUntil: 'networkidle0' })
await wait(700)

const box2 = await (await page.$('.ai-orb')).boundingBox()
await page.mouse.click(box2.x + box2.width / 2, box2.y + box2.height / 2)
await page.waitForSelector('.msg.assistant', { timeout: 8000 })
await page.waitForFunction(() => !document.querySelector('.btn-stop'), { timeout: 20000 })
await wait(700)

const resumed = await page.evaluate(() => {
  const text = document.querySelector('.msg.assistant')?.innerText ?? ''
  return {
    headingCount: (text.match(/可以先这样拆/g) || []).length,
    tableCount: (text.match(/维度/g) || []).length,
    pending: localStorage.getItem('myos.ai.pending.v1'),
    resumable: !!document.querySelector('.ai-resume'),
    head: text.slice(0, 260),
  }
})
console.log('resumed:', JSON.stringify(resumed, null, 2))
await page.screenshot({ path: '.shots/ai-p2-resumed.png' })
console.log('errors:', errors.length ? errors.join(' | ') : 'none')

await browser.close()
