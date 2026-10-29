/**
 * 一个最小的 MCP stdio 服务，用于演示 command transport。
 * 用法：node scripts/mock-mcp-server.mjs
 * 协议：stdin / stdout 每行一个 JSON-RPC 消息
 */
import readline from 'node:readline'

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

const reply = (message) => {
  process.stdout.write(`${JSON.stringify(message)}\n`)
}

const rl = readline.createInterface({ input: process.stdin })

rl.on('line', (line) => {
  let msg
  try {
    msg = JSON.parse(line)
  } catch {
    return
  }
  if (msg.id === undefined) return

  if (msg.method === 'initialize') {
    reply({
      jsonrpc: '2.0',
      id: msg.id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'mock-mcp', version: '1.0.0' },
      },
    })
    return
  }

  if (msg.method === 'tools/list') {
    reply({ jsonrpc: '2.0', id: msg.id, result: { tools: TOOLS } })
    return
  }

  if (msg.method === 'tools/call') {
    const name = msg.params?.name ?? 'tool'
    reply({
      jsonrpc: '2.0',
      id: msg.id,
      result: {
        content: [{ type: 'text', text: `${name} 的 mock 结果：${JSON.stringify(msg.params?.arguments ?? {})}` }],
      },
    })
    return
  }

  reply({ jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: `未知方法 ${msg.method}` } })
})
