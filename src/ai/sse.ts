/**
 * SSE 解析器（自己实现，不依赖任何第三方 SSE 库）
 * ------------------------------------------------------------
 * 职责边界：
 *   SSEBuffer        只负责字节流 → 完整事件（按 \n\n 切，尾部不完整留在 buffer）
 *   ChatStreamParser 负责解码、JSON.parse、失败保留、帧校验
 *
 * 关键约定：
 * · TextDecoder 每次 decode(value, { stream: true })，结束时再 decode() 冲刷残余字节
 * · 只有遇到 \n\n 才认为一个事件完整；最后一段永远留在 buffer 等下一片
 * · 事件内多行 data: 按 SSE 规则用 \n 拼接后整体 JSON.parse
 * · JSON.parse 失败不丢弃：事件进入 deferred，下次继续尝试；流结束仍失败则报错帧
 * · 不用「是否以 } 结尾」之类启发式判断
 */

import type { Frame } from './types'

export interface RawEvent {
  event: string
  data: string
  id?: string
}

function parseEvent(raw: string): RawEvent | null {
  let event = 'message'
  let id: string | undefined
  const data: string[] = []

  for (const line of raw.split('\n')) {
    if (!line || line.startsWith(':')) continue

    const colon = line.indexOf(':')
    const field = colon === -1 ? line : line.slice(0, colon)
    let value = colon === -1 ? '' : line.slice(colon + 1)
    if (value.startsWith(' ')) value = value.slice(1)

    if (field === 'data') data.push(value)
    else if (field === 'event') event = value
    else if (field === 'id') id = value
  }

  if (!data.length) return null
  return { event, data: data.join('\n'), id }
}

export class SSEBuffer {
  private buf = ''

  push(text: string): RawEvent[] {
    // 每次都整体替换，能处理 \r\n 被切在两个 chunk 里的情况
    this.buf = (this.buf + text).replace(/\r\n/g, '\n')

    const out: RawEvent[] = []
    let idx = this.buf.indexOf('\n\n')
    while (idx >= 0) {
      const raw = this.buf.slice(0, idx)
      this.buf = this.buf.slice(idx + 2)
      const ev = parseEvent(raw)
      if (ev) out.push(ev)
      idx = this.buf.indexOf('\n\n')
    }
    return out
  }

  /** 流结束时把最后一段（可能没有 \n\n）也尝试解析 */
  flush(): RawEvent[] {
    const raw = this.buf
    this.buf = ''
    if (!raw.trim()) return []
    const ev = parseEvent(raw)
    return ev ? [ev] : []
  }

  /** 还没消费掉的尾部，调试用 */
  get rest(): string {
    return this.buf
  }
}

const INVALID = Symbol('invalid')

function readSeq(rec: Record<string, unknown>): number | undefined {
  const raw = rec.seq ?? rec.sequence
  const n = typeof raw === 'number' ? raw : Number(raw)
  return Number.isFinite(n) ? n : undefined
}

function parseFrame(data: string, eventName = 'message'): Frame | null | typeof INVALID {
  const text = data.trim()
  if (!text) return null
  const event = eventName.trim().toUpperCase()

  // 兼容 event: INIT_REQUEST_ID + data 直接是 id 的写法
  if (event === 'INIT_REQUEST_ID' && !text.startsWith('{')) {
    return { type: 'INIT_REQUEST_ID', requestId: text }
  }

  if (text === '[DONE]') return { type: 'DONE' }

  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return INVALID
  }

  if (!json || typeof json !== 'object') return INVALID
  const rec = json as Record<string, unknown>
  const type = String(rec.type ?? (event !== 'MESSAGE' ? event : ''))
  const seq = readSeq(rec)
  const withSeq = seq === undefined ? {} : { seq }

  switch (type) {
    case 'MESSAGE': {
      const delta = typeof rec.delta === 'string' ? rec.delta : String(rec.text ?? rec.content ?? '')
      return { type: 'MESSAGE', delta, ...withSeq }
    }
    case 'THINKING':
    case 'THINK': {
      const delta = typeof rec.delta === 'string' ? rec.delta : String(rec.text ?? '')
      return { type: 'THINKING', delta, ...withSeq }
    }
    case 'TOOL_CALL': {
      const id = String(rec.id ?? '')
      if (!id) return null
      const status =
        rec.status === 'done' || rec.status === 'error' || rec.status === 'running'
          ? rec.status
          : undefined
      return {
        type: 'TOOL_CALL',
        id,
        name: typeof rec.name === 'string' ? rec.name : undefined,
        arguments:
          typeof rec.arguments === 'string'
            ? rec.arguments
            : typeof rec.args === 'string'
              ? rec.args
              : undefined,
        status,
        ...withSeq,
      }
    }
    case 'TOOL_RESULT': {
      const status =
        rec.status === 'error' || rec.status === 'failed'
          ? 'error'
          : rec.status === 'success' || rec.status === 'ok' || rec.status === 'done'
            ? 'success'
            : undefined
      const duration = Number(rec.durationMs ?? rec.duration ?? rec.cost)
      return {
        type: 'TOOL_RESULT',
        id: String(rec.id ?? ''),
        content: String(rec.content ?? rec.result ?? ''),
        status,
        durationMs: Number.isFinite(duration) ? duration : undefined,
        ...withSeq,
      }
    }
    case 'INIT_REQUEST_ID':
      return {
        type: 'INIT_REQUEST_ID',
        requestId: String(rec.requestId ?? rec.request_id ?? rec.id ?? ''),
      }
    case 'REFERENCE': {
      const raw = Array.isArray(rec.references)
        ? rec.references
        : rec.reference
          ? [rec.reference]
          : [rec]
      const references = raw
        .map((item, index) => {
          const r = (item ?? {}) as Record<string, unknown>
          const score = Number(r.score ?? r.similarity ?? 0)
          return {
            id: String(r.id ?? r.chunkId ?? `ref-${index}`),
            title: String(r.title ?? r.docTitle ?? r.name ?? ''),
            snippet: String(r.snippet ?? r.summary ?? ''),
            content: String(r.content ?? r.text ?? ''),
            score: Number.isFinite(score) ? score : 0,
            docId: typeof r.docId === 'string' ? r.docId : undefined,
          }
        })
        .filter((r) => r.title || r.content)
      if (!references.length) return null
      return { type: 'REFERENCE', references, ...withSeq }
    }
    case 'DONE':
      return { type: 'DONE', ...withSeq }
    case 'ERROR':
      return {
        type: 'ERROR',
        message: String(rec.message ?? rec.error ?? '流式请求出错'),
        ...withSeq,
      }
    default:
      // 未知类型：不是坏 JSON，直接忽略
      return null
  }
}

/** 把 fetch 出来的字节流一片片喂进来，吐出可渲染的帧。 */
export class ChatStreamParser {
  private decoder = new TextDecoder('utf-8')
  private sse = new SSEBuffer()
  private deferred: RawEvent[] = []

  push(chunk: Uint8Array): Frame[] {
    const text = this.decoder.decode(chunk, { stream: true })
    return this.consume(this.sse.push(text))
  }

  flush(): Frame[] {
    const tail = this.decoder.decode()
    const events = [...this.sse.push(tail), ...this.sse.flush()]
    const frames = this.consume(events)

    if (this.deferred.length) {
      const raw = this.deferred[0].data.slice(0, 160)
      frames.push({ type: 'ERROR', message: `无法解析的流式事件：${raw}` })
      this.deferred = []
    }
    return frames
  }

  private consume(events: RawEvent[]): Frame[] {
    const out: Frame[] = []
    const all = [...this.deferred, ...events]
    this.deferred = []

    for (const ev of all) {
      const frame = parseFrame(ev.data, ev.event)
      if (frame === INVALID) {
        this.deferred.push(ev)
      } else if (frame) {
        out.push(frame)
      }
    }
    return out
  }
}

/** 兼容命名：流式 SSE 解析器，测试与外部调用可直接 new parseSSE() */
export { ChatStreamParser as parseSSE }
