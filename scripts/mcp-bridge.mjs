/**
 * 本地 MCP bridge（仅开发用）
 * ------------------------------------------------------------
 * 浏览器无法直接起进程，command transport 通过这个 bridge 转发。
 * 同时提供 mock 的 http / sse 两种 transport，方便联调三种模式。
 *
 * 启动：node scripts/mcp-bridge.mjs
 * 端口：5198（可用 MCP_BRIDGE_PORT 覆盖）
 *
 * ⚠️ 这个服务会在本机执行前端传来的 command。只在本机开发时使用，
 *    不要暴露到公网。
 */
import http from 'node:http'
import { spawn } from 'node:child_process'
import readline from 'node:readline'

const PORT = Number(process.env.MCP_BRIDGE_PORT || 5198)

const TOOLS = [
  {
    name: 'echo_text',
    title: '回显文本',
    description: '把输入文本原样返回，用于联调。',
    inputSchema: {
      type: 'object',
      properties: { text: { type: 'string', description: '要回显的文本' } },
      required: ['text'],
    },
  },
  {
    name: 'search_notes',
    title: '搜索笔记',
    description: '在本地笔记里搜索关键词。',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query'],
    },
  },
  {
    name: 'read_url',
    title: '读取网页',
    description: '读取一个 URL 的正文。',
    inputSchema: {
      type: 'object',
      properties: { url: { type: 'string' } },
      required: ['url'],
    },
  },
]

const sessions = new Map()

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept')
}

function json(res, status, body) {
  cors(res)
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (chunk) => {
      raw += chunk
      if (raw.length > 1_000_000) {
        reject(new Error('请求体过大'))
        req.destroy()
      }
    })
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {})
      } catch {
        reject(new Error('不是合法 JSON'))
      }
    })
    req.on('error', reject)
  })
}

/** command transport：spawn 命令，走 stdio 的 JSON-RPC */
function syncCommand(command) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, { shell: true, windowsHide: true })
    const rl = readline.createInterface({ input: child.stdout })
    let settled = false
    let stderr = ''

    const finish = (err, tools) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      child.kill()
      if (err) reject(err)
      else resolve(tools)
    }

    const timer = setTimeout(() => finish(new Error('命令执行超时（10s）')), 10_000)

    child.stderr.on('data', (chunk) => {
      stderr += String(chunk)
    })
    child.on('error', (err) => finish(err))
    child.on('exit', (code) => {
      if (!settled) finish(new Error(`命令退出（${code}）${stderr.slice(0, 200)}`))
    })

    const send = (message) => child.stdin.write(`${JSON.stringify(message)}\n`)

    rl.on('line', (line) => {
      let msg
      try {
        msg = JSON.parse(line)
      } catch {
        return
      }
      if (msg.id === 1) {
        if (msg.error) return finish(new Error(msg.error.message || 'initialize 失败'))
        send({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} })
        return
      }
      if (msg.id === 2) {
        if (msg.error) return finish(new Error(msg.error.message || 'tools/list 失败'))
        finish(null, msg.result?.tools ?? [])
      }
    })

    send({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'myos-bridge', version: '0.1' },
      },
    })
  })
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`)

  if (req.method === 'OPTIONS') {
    cors(res)
    res.writeHead(204)
    res.end()
    return
  }

  if (url.pathname === '/health') {
    json(res, 200, { ok: true })
    return
  }

  if (url.pathname === '/mcp/sync' && req.method === 'POST') {
    try {
      const body = await readBody(req)
      if (!body.command || typeof body.command !== 'string') {
        return json(res, 400, { error: '缺少 command' })
      }
      const tools = await syncCommand(body.command)
      json(res, 200, { tools })
    } catch (err) {
      json(res, 500, { error: err instanceof Error ? err.message : '同步失败' })
    }
    return
  }

  if (url.pathname === '/mcp/http' && req.method === 'POST') {
    try {
      const body = await readBody(req)
      if (body.method === 'tools/list') {
        return json(res, 200, { jsonrpc: '2.0', id: body.id ?? 1, result: { tools: TOOLS } })
      }
      if (body.method === 'initialize') {
        return json(res, 200, {
          jsonrpc: '2.0',
          id: body.id ?? 1,
          result: { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'mock-http', version: '1.0.0' } },
        })
      }
      json(res, 200, {
        jsonrpc: '2.0',
        id: body.id,
        error: { code: -32601, message: `未知方法 ${body.method}` },
      })
    } catch (err) {
      json(res, 400, { error: err instanceof Error ? err.message : '请求错误' })
    }
    return
  }

  if (url.pathname === '/mcp/sse' && req.method === 'GET') {
    cors(res)
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    })
    const sessionId = Math.random().toString(36).slice(2)
    sessions.set(sessionId, res)
    res.write(`event: endpoint\ndata: /mcp/messages?sessionId=${sessionId}\n\n`)

    const timer = setInterval(() => res.write(': ping\n\n'), 15_000)
    req.on('close', () => {
      clearInterval(timer)
      sessions.delete(sessionId)
    })
    return
  }

  if (url.pathname === '/mcp/messages' && req.method === 'POST') {
    const sessionId = url.searchParams.get('sessionId') || ''
    const stream = sessions.get(sessionId)
    if (!stream) return json(res, 404, { error: 'session 不存在' })

    try {
      const body = await readBody(req)
      const send = (message) => stream.write(`event: message\ndata: ${JSON.stringify(message)}\n\n`)

      if (body.method === 'initialize') {
        send({
          jsonrpc: '2.0',
          id: body.id,
          result: { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'mock-sse', version: '1.0.0' } },
        })
      } else if (body.method === 'tools/list') {
        send({ jsonrpc: '2.0', id: body.id, result: { tools: TOOLS } })
      } else if (body.method === 'notifications/initialized') {
        // 通知没有响应
      } else if (body.id !== undefined) {
        send({ jsonrpc: '2.0', id: body.id, error: { code: -32601, message: `未知方法 ${body.method}` } })
      }

      cors(res)
      res.writeHead(202)
      res.end()    } catch (err) {
      json(res, 400, { error: err instanceof Error ? err.message : '请求错误' })
    }
    return
  }

  json(res, 404, { error: 'not found' })
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`MCP bridge: http://127.0.0.1:${PORT}`)
  console.log('  POST /mcp/sync    command transport')
  console.log('  POST /mcp/http    mock http transport')
  console.log('  GET  /mcp/sse     mock sse transport')
})
