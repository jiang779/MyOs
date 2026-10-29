import puppeteer from 'puppeteer-core'

const BASE = process.env.AI_BASE || 'http://127.0.0.1:5200'
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  userDataDir: `.tmp/pptr-p4-${Date.now()}`,
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
await page.goto(`${BASE}/tools`, { waitUntil: 'networkidle0' })
await wait(1200)

async function addServer(name, transport, value) {
  await page.type('.add input:first-of-type', name)
  await page.select('.add select', transport)
  await wait(120)
  const input = await page.$('.add input:last-of-type')
  await input.type(value)
  await page.click('.add .btn.primary')
  await wait(500)
}

async function syncActive() {
  await page.click('.main-card .btn.primary')
  await page.waitForFunction(() => document.querySelectorAll('.tool-item').length === 3, {
    timeout: 20000,
  })
}

await addServer('本地 MCP', 'command', 'node scripts/mock-mcp-server.mjs')
await syncActive()
const commandTools = await page.$$eval('.tool-name code', (els) => els.map((e) => e.textContent))
console.log('command tools:', JSON.stringify(commandTools))

await addServer('HTTP MCP', 'http', 'http://127.0.0.1:5198/mcp/http')
await syncActive()
const httpTools = await page.$$eval('.tool-name code', (els) => els.map((e) => e.textContent))
console.log('http tools:', JSON.stringify(httpTools))

await addServer('SSE MCP', 'sse', 'http://127.0.0.1:5198/mcp/sse')
await syncActive()
const sseTools = await page.$$eval('.tool-name code', (els) => els.map((e) => e.textContent))
console.log('sse tools:', JSON.stringify(sseTools))

const servers = await page.$$eval('.server-list li', (els) =>
  els.map((e) => e.innerText.replace(/\n/g, ' | ').slice(0, 160))
)
const chipCount = await page.$$eval('.chips .chip', (els) => els.length)
console.log('servers:', JSON.stringify(servers, null, 2))
console.log('chips:', chipCount)

await page.click('.chips .chip:first-child input')
await wait(300)
const selection = await page.evaluate(() => localStorage.getItem('myos.ai.toolSelection.v1'))
console.log('selection:', selection)
await page.screenshot({ path: '.shots/ai-p4-tools.png' })

const box = await (await page.$('.ai-orb')).boundingBox()
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
await wait(600)

await page.click('.composer textarea')
await page.type('.composer textarea', '测试一下选中的 MCP 工具')
await page.keyboard.press('Enter')
await page.waitForSelector('.btn-stop', { timeout: 5000 }).catch(() => {})
await page.waitForFunction(
  () => document.body.innerText.includes('可以先这样拆') && !document.querySelector('.btn-stop'),
  { timeout: 20000 }
)
await wait(700)

const toolNames = await page.$$eval('.msg.assistant .tool-name', (els) =>
  els.map((e) => e.innerText.replace(/\n/g, ' '))
)
console.log('tool cards:', JSON.stringify(toolNames))
await page.evaluate(() => {
  const body = document.querySelector('.ai-body')
  if (body) body.scrollTop = 0
})
await wait(300)
await page.screenshot({ path: '.shots/ai-p4-reply.png' })

await page.click('.ai-actions button[aria-label="设置"]')
await wait(500)
const values = await page.$$eval('.settings .value', (els) => els.map((e) => e.textContent))
console.log('settings values:', JSON.stringify(values))
await page.screenshot({ path: '.shots/ai-p4-settings.png' })

console.log('errors:', errors.length ? errors.join(' | ') : 'none')
await browser.close()
