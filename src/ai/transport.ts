/**
 * 传输层
 * ------------------------------------------------------------
 * UI 只认一个契约：open()/receive() 返回 text/event-stream 的 Response，
 * 然后用 response.body.getReader() 逐片读、交给 ChatStreamParser。
 *
 * DirectTransport  浏览器直连模型（CORS 可用），把上游 SSE 翻译成统一帧
 * HttpTransport    POST /api/chat/send + GET /api/chat/receive/{id}
 * MockTransport    本地模拟流，不消耗额度，支持重放以验证续传去重
 */
import type { Frame } from './types'
import { SSEBuffer } from './sse'

export interface ChatRequest {
  requestId: string
  conversationId: string
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
  temperature?: number
  model?: string
  maxTokens?: number
  knowledgeBaseIds?: string[]
  /** 当前会话勾选暴露的 MCP 工具 id */
  toolIds?: string[]
  signal: AbortSignal
}

export interface ChatTransport {
  /** 是否支持 GET /receive 续传（直连模式没有服务端缓冲，不支持） */
  readonly supportsResume: boolean
  /** 是否由客户端本地做 RAG（直连/mock）；http 模式交给服务端并接收 REFERENCE */
  readonly localRag: boolean
  open(req: ChatRequest): Promise<Response>
  /** 断线续传：继续接收同一路流；不支持时抛错 */
  receive(requestId: string, signal: AbortSignal): Promise<Response>
  stop(requestId: string): Promise<void>
}

function sseResponse(stream: ReadableStream<Uint8Array>): Response {
  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
    },
  })
}

/* ------------------------------ 上游（OpenAI 兼容）→ 统一帧 ------------------------------ */

interface ArkToolCall {
  index?: number
  id?: string
  function?: { name?: string; arguments?: string }
}

interface ArkChunk {
  choices?: Array<{
    delta?: {
      content?: string
      reasoning_content?: string
      tool_calls?: ArkToolCall[]
    }
  }>
  error?: { message?: string } | string
}

function arkToFrames(raw: string): Frame[] {
  if (raw.trim() === '[DONE]') return [{ type: 'DONE' }]

  let json: ArkChunk
  try {
    json = JSON.parse(raw) as ArkChunk
  } catch {
    return []
  }

  if (json.error) {
    const message =
      typeof json.error === 'string' ? json.error : String(json.error.message ?? '模型返回错误')
    return [{ type: 'ERROR', message }]
  }

  const delta = json.choices?.[0]?.delta ?? {}
  const out: Frame[] = []

  if (typeof delta.reasoning_content === 'string' && delta.reasoning_content) {
    out.push({ type: 'THINKING', delta: delta.reasoning_content })
  }
  if (typeof delta.content === 'string' && delta.content) {
    out.push({ type: 'MESSAGE', delta: delta.content })
  }
  if (Array.isArray(delta.tool_calls)) {
    for (const tc of delta.tool_calls) {
      out.push({
        type: 'TOOL_CALL',
        id: tc.id ?? `call_${tc.index ?? 0}`,
        name: tc.function?.name,
        arguments: tc.function?.arguments,
        status: 'running',
      })
    }
  }
  return out
}

function transformArk(
  body: ReadableStream<Uint8Array>,
  signal: AbortSignal,
  requestId: string
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = body.getReader()
      const decoder = new TextDecoder('utf-8')
      const sse = new SSEBuffer()
      let closed = false
      let seq = 0

      const send = (frame: Frame) => {
        if (closed) return
        const next = frame.type === 'INIT_REQUEST_ID' ? frame : { ...frame, seq: ++seq }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(next)}\n\n`))
      }
      const forward = (raw: string) => {
        for (const frame of arkToFrames(raw)) send(frame)
      }

      try {
        send({ type: 'INIT_REQUEST_ID', requestId })
        for (;;) {
          const { value, done } = await reader.read()
          if (done) break
          for (const ev of sse.push(decoder.decode(value, { stream: true }))) forward(ev.data)
        }
        for (const ev of sse.push(decoder.decode())) forward(ev.data)
        for (const ev of sse.flush()) forward(ev.data)
        send({ type: 'DONE' })
        closed = true
        controller.close()
      } catch (err) {
        if (signal.aborted) {
          closed = true
          try {
            controller.close()
          } catch {
            /* 已关闭 */
          }
          return
        }
        send({ type: 'ERROR', message: err instanceof Error ? err.message : '读取模型流失败' })
        closed = true
        try {
          controller.close()
        } catch {
          /* 已关闭 */
        }
      }
    },
    cancel() {
      void body.cancel().catch(() => undefined)
    },
  })
}

/* ------------------------------ 直连 ------------------------------ */

class DirectTransport implements ChatTransport {
  readonly supportsResume = false
  readonly localRag = true

  async open(req: ChatRequest): Promise<Response> {
    const key = import.meta.env.VITE_ARK_API_KEY
    const model = import.meta.env.VITE_ARK_MODEL
    const base = (import.meta.env.VITE_ARK_BASE_URL ?? '').replace(/\/+$/, '')

    if (!key || !model || !base) {
      throw new Error('缺少模型配置：请在 .env.local 填写 VITE_ARK_API_KEY / VITE_ARK_MODEL / VITE_ARK_BASE_URL')
    }

    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: req.model || model,
        messages: req.messages,
        stream: true,
        temperature: req.temperature ?? 0.6,
        ...(req.maxTokens ? { max_tokens: req.maxTokens } : {}),
      }),
      signal: req.signal,
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new Error(`模型请求失败（${res.status}）${detail ? `：${detail.slice(0, 240)}` : ''}`)
    }
    if (!res.body) throw new Error('模型没有返回流式响应')

    return sseResponse(transformArk(res.body, req.signal, req.requestId))
  }

  async receive(): Promise<Response> {
    throw new Error('直连模式不支持断点续传；需要续传请把 VITE_CHAT_MODE 设为 http')
  }

  async stop(): Promise<void> {
    // 直连模式由 AbortController 中止
  }
}

/* ------------------------------ /api ------------------------------ */

class HttpTransport implements ChatTransport {
  readonly supportsResume = true
  readonly localRag = false

  async open(req: ChatRequest): Promise<Response> {
    const res = await fetch('/api/chat/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId: req.requestId,
        conversationId: req.conversationId,
        messages: req.messages,
        temperature: req.temperature,
        model: req.model,
        maxTokens: req.maxTokens,
        knowledgeBaseIds: req.knowledgeBaseIds ?? [],
        toolIds: req.toolIds ?? [],
      }),
      signal: req.signal,
    })
    if (!res.ok) throw new Error(`请求失败（${res.status}）`)
    return res
  }

  async receive(requestId: string, signal: AbortSignal): Promise<Response> {
    const res = await fetch(`/api/chat/receive/${encodeURIComponent(requestId)}`, {
      headers: { Accept: 'text/event-stream' },
      signal,
    })
    if (!res.ok) throw new Error(`续传失败（${res.status}）`)
    return res
  }

  async stop(requestId: string): Promise<void> {
    try {
      await fetch('/api/chat/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
      })
    } catch {
      /* 停止是尽力而为 */
    }
  }
}

/* ------------------------------ Mock ------------------------------ */

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

/** 固定的帧序列；seq 稳定，重放时客户端可以按 seq 去重 */
function mockFrames(toolIds: string[] = []): Frame[] {
  const frames: Frame[] = []
  let seq = 0
  const push = (frame: Frame) => {
    frames.push({ ...frame, seq: ++seq } as Frame)
  }

  if (toolIds.length) {
    const name = toolIds[0].split(':').slice(1).join(':') || 'mcp_tool'
    push({
      type: 'TOOL_CALL',
      id: 'mock-mcp-tool',
      name,
      arguments: '{"query":"mock"}',
      status: 'running',
    })
    push({
      type: 'TOOL_RESULT',
      id: 'mock-mcp-tool',
      content: `Mock：${name} 返回了示例结果`,
      status: 'success',
      durationMs: 320,
    })
  }

  push({
    type: 'THINKING',
    delta: '先确认你想达成什么，再把问题拆成几个能马上做的动作。\n',
  })
  push({
    type: 'TOOL_CALL',
    id: 'mock-tool-1',
    name: 'lookup_knowledge',
    arguments: '{"query":"工作台"}',
    status: 'running',
  })
  push({
    type: 'TOOL_RESULT',
    id: 'mock-tool-1',
    content: '当前知识库为空，下面给通用拆解。',
    status: 'success',
    durationMs: 420,
  })
  push({
    type: 'TOOL_CALL',
    id: 'mock-tool-2',
    name: 'read_page',
    arguments: '{"url":"https://example.com"}',
    status: 'running',
  })
  push({
    type: 'TOOL_RESULT',
    id: 'mock-tool-2',
    content: '读取失败：页面响应超时（30s）',
    status: 'error',
    durationMs: 1500,
  })
  push({
    type: 'MESSAGE',
    delta:
      '## 可以先这样拆\n\n1. **写清楚目标**：用一句话说明要达成什么。\n2. **列出约束**：时间、依赖、不能动的东西。\n3. **只留一个下一步**：今天就能开始的动作。\n\n```ts\nconst next = "先写一版最丑但能跑的"\n```\n\n',
  })
  push({
    type: 'MESSAGE',
    delta:
      '| 维度 | 要回答的问题 |\n| --- | --- |\n| 目标 | 达成什么？ |\n| 约束 | 什么不能变？ |\n| 下一步 | 今天做什么？ |\n',
  })
  push({ type: 'DONE' })
  return frames
}

/** 把一个 JSON 拆成两行 data:（JSON 允许 token 之间有空白，换行合法） */
function splitJsonEvent(json: string): string {
  let inString = false
  let escaped = false
  const candidates: number[] = []

  for (let i = 0; i < json.length; i++) {
    const ch = json[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
    } else if (ch === '"') {
      inString = true
    } else if (ch === ',') {
      candidates.push(i)
    }
  }

  const mid = Math.floor(json.length / 2)
  const cut = candidates.sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid))[0]
  if (cut === undefined) return `data: ${json}\n\n`
  return `data: ${json.slice(0, cut + 1)}\ndata: ${json.slice(cut + 1)}\n\n`
}

function chunkString(text: string, size: number): string[] {
  const out: string[] = []
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size))
  return out
}

class MockTransport implements ChatTransport {
  readonly supportsResume = true
  readonly localRag = true
  private toolIds = new Map<string, string[]>()

  private buildStream(requestId: string, signal: AbortSignal, toolIds: string[]): Response {
    const encoder = new TextEncoder()
    const frames: Frame[] = [{ type: 'INIT_REQUEST_ID', requestId }, ...mockFrames(toolIds)]

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let aborted = false
        const onAbort = () => {
          aborted = true
          try {
            controller.close()
          } catch {
            /* 已关闭 */
          }
        }
        signal.addEventListener('abort', onAbort, { once: true })

        try {
          for (let i = 0; i < frames.length && !aborted; i++) {
            const frame = frames[i]
            const json = JSON.stringify(frame)
            const payload = i === 4 ? splitJsonEvent(json) : `data: ${json}\n\n`
            for (const part of chunkString(payload, 7)) {
              if (aborted) return
              controller.enqueue(encoder.encode(part))
              await sleep(16)
            }
          }
          if (!aborted) controller.close()
        } catch {
          /* 被取消 */
        } finally {
          signal.removeEventListener('abort', onAbort)
        }
      },
    })

    return sseResponse(stream)
  }

  async open(req: ChatRequest): Promise<Response> {
    this.toolIds.set(req.requestId, req.toolIds ?? [])
    return this.buildStream(req.requestId, req.signal, req.toolIds ?? [])
  }

  /** 重放整段流；客户端按 seq / 内容去重，模拟服务端断线重连 */
  async receive(requestId: string, signal: AbortSignal): Promise<Response> {
    return this.buildStream(requestId, signal, this.toolIds.get(requestId) ?? [])
  }

  async stop(): Promise<void> {
    /* mock 由 abort 结束 */
  }
}

export function createTransport(): ChatTransport {
  const mocked = import.meta.env.VITE_CHAT_MOCK === '1'
  const noKey = !import.meta.env.VITE_ARK_API_KEY
  if (mocked || noKey) return new MockTransport()
  return import.meta.env.VITE_CHAT_MODE === 'http' ? new HttpTransport() : new DirectTransport()
}
