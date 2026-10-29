import puppeteer from 'puppeteer-core'

const BASE = 'http://127.0.0.1:5200'
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  userDataDir: `.tmp/pptr-scroll-${Date.now()}`,
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
await wait(1200)

const box = await (await page.$('.ai-orb')).boundingBox()
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
await wait(500)

async function send(text) {
  await page.click('.composer textarea')
  await page.type('.composer textarea', text)
  await page.keyboard.press('Enter')
  await page.waitForSelector('.btn-stop', { timeout: 5000 })
}

function metrics() {
  return page.evaluate(() => {
    const el = document.querySelector('.ai-body')
    const max = el.scrollHeight - el.clientHeight
    return {
      max,
      top: Math.round(el.scrollTop),
      atBottom: max - el.scrollTop < 6,
      jump: !!document.querySelector('.ai-jump'),
    }
  })
}

async function wheelUp() {
  await page.mouse.move(1400, 420)
  await page.mouse.wheel({ deltaY: -700 })
}

await send('第一条滚动测试')
await page.waitForFunction(() => !document.querySelector('.btn-stop'), { timeout: 20000 })
await wait(700)
console.log('after reply:', JSON.stringify(await metrics()))

await wheelUp()
await wait(350)
const up1 = await metrics()
await wait(900)
const up2 = await metrics()
console.log('after wheel up:', JSON.stringify(up1))
console.log('900ms later:', JSON.stringify(up2))

if (await page.$('.ai-jump')) {
  await page.click('.ai-jump')
  await wait(400)
}
console.log('after jump:', JSON.stringify(await metrics()))

await send('第二条滚动测试，这次在流式过程中往上滑')
await wait(600)
await wheelUp()
await wait(600)
console.log('mid-stream after wheel:', JSON.stringify(await metrics()))
await page.waitForFunction(() => !document.querySelector('.btn-stop'), { timeout: 20000 })
await wait(700)
console.log('after second reply:', JSON.stringify(await metrics()))

console.log('errors:', errors.length ? errors.join(' | ') : 'none')
await browser.close()
