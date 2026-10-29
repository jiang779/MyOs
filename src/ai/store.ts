/**
 * 助手状态
 * ------------------------------------------------------------
 * · 会话元数据 → localStorage；消息体 → IndexedDB
 * · 流式回答单独放在 chatState.streaming，不进入 messages 数组，
 *   每帧只重渲染最后一条回答
 * · 流式过程中每 ~900ms 落一次快照，配合 pending 记录支持刷新后续传
 * · 续传去重：优先按 seq，其次按文本公共前缀合并
 */
import { reactive, shallowRef } from 'vue'
import { assistantConfig } from './config'
import { deleteMessage, deleteMessages, getMessages, putMessage } from './db'
import { buildKnowledgeContext } from './kb'
import { getSelectedToolIds } from './mcp'
import { settings } from './settings'
import { ChatStreamParser } from './sse'
import { createTransport } from './transport'
import type {
  Block,
  ChatConfig,
  ChatMessage,
  ConversationMeta,
  Frame,
  MessageStatus,
  Reference,
  TextBlock,
  ToolBlock,
} from './types'

const META_KEY = 'myos.ai.meta.v1'
const PENDING_KEY = 'myos.ai.pending.v1'
const transport = createTransport()

export interface StreamState {
  id: string
  conversationId: string
  role: 'assistant'
  blocks: Block[]
  status: MessageStatus
  createdAt: number
  version: number
  error?: string
  references?: Reference[]
}

interface PendingRecord {
  requestId: string
  conversationId: string
  messageId: string
  startedAt: number
  lastSeq: number
}

interface ResumeBaseline {
  text: string
  think: string
  textReplay: string
  thinkReplay: string
  tools: Map<string, string>
  toolReplay: Map<string, string>
}

export const chatState = reactive({
  ready: false,
  panelOpen: false,
  conversations: [] as ConversationMeta[],
  activeId: '',
  messages: [] as ChatMessage[],
  streaming: null as StreamState | null,
  sending: false,
  /** 连接中断、等待重连 */
  resumable: false,
})

export const chatConfig = shallowRef<ChatConfig>(assistantConfig)

let initialized = false
let currentAbort: AbortController | null = null
let clientRequestId = ''
let serverRequestId = ''
let lastSeq = 0
let finished = true
let pendingText = ''
let pendingThink = ''
let pendingBump = false
let flushRaf = 0
let lastPersist = 0
let lastPendingSave = 0
let streamError = ''
let pendingResume = false
let resumeBaseline: ResumeBaseline | null = null

/* ------------------------------ id / 存储 ------------------------------ */

function uid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function isMeta(value: unknown): value is ConversationMeta {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    typeof v.title === 'string' &&
    typeof v.createdAt === 'number' &&
    typeof v.updatedAt === 'number' &&
    typeof v.messageCount === 'number'
  )
}

function readMeta(): { activeId: string | null; items: ConversationMeta[] } {
  try {
    const raw = localStorage.getItem(META_KEY)
    if (!raw) return { activeId: null, items: [] }
    const parsed = JSON.parse(raw) as { activeId?: unknown; items?: unknown }
    const items = Array.isArray(parsed.items) ? parsed.items.filter(isMeta) : []
    return {
      activeId: typeof parsed.activeId === 'string' ? parsed.activeId : null,
      items,
    }
  } catch {
    return { activeId: null, items: [] }
  }
}

function saveMeta() {
  try {
    localStorage.setItem(
      META_KEY,
      JSON.stringify({ activeId: chatState.activeId, items: chatState.conversations })
    )
  } catch {
    /* 隐私模式 / 配额满：不影响当前会话 */
  }
}

function readPending(): PendingRecord | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    if (!raw) return null
    const v = JSON.parse(raw) as Record<string, unknown>
    if (
      typeof v.requestId !== 'string' ||
      typeof v.conversationId !== 'string' ||
      typeof v.messageId !== 'string'
    ) {
      return null
    }
    return {
      requestId: v.requestId,
      conversationId: v.conversationId,
      messageId: v.messageId,
      startedAt: typeof v.startedAt === 'number' ? v.startedAt : Date.now(),
      lastSeq: typeof v.lastSeq === 'number' ? v.lastSeq : 0,
    }
  } catch {
    return null
  }
}

function savePending(record: PendingRecord) {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(record))
  } catch {
    /* ignore */
  }
}

function clearPending() {
  try {
    localStorage.removeItem(PENDING_KEY)
  } catch {
    /* ignore */
  }
  chatState.resumable = false
}

function makeConversation(): ConversationMeta {
  const now = Date.now()
  return { id: uid(), title: '新对话', createdAt: now, updatedAt: now, messageCount: 0 }
}

function bump(conversationId: string, firstText: string, isUser: boolean) {
  const conv = chatState.conversations.find((c) => c.id === conversationId)
  if (!conv) return
  conv.messageCount += 1
  conv.updatedAt = Date.now()
  if (isUser && (conv.title === '新对话' || !conv.title)) {
    conv.title = firstText.trim().slice(0, 24) || '新对话'
  }
  saveMeta()
}

/* ------------------------------ 初始化 / 会话 ------------------------------ */

async function loadActive() {
  pendingResume = false
  resumeBaseline = null
  chatState.resumable = false

  const id = chatState.activeId
  if (!id) {
    chatState.messages = []
    chatState.streaming = null
    return
  }

  const rows = await getMessages(id)
  const pending = readPending()
  const target =
    pending && pending.conversationId === id
      ? rows.find((m) => m.id === pending.messageId && m.status === 'streaming')
      : undefined

  if (target && pending && transport.supportsResume) {
    chatState.messages = rows.filter((m) => m.id !== target.id)
    chatState.streaming = { ...target, role: 'assistant', version: 0 }
    serverRequestId = pending.requestId
    lastSeq = pending.lastSeq
    finished = false
    pendingResume = true
    return
  }

  const changed: ChatMessage[] = []
  chatState.messages = rows.map((m) => {
    if (m.status !== 'streaming') return m
    const next: ChatMessage = { ...m, status: 'stopped' }
    changed.push(next)
    return next
  })
  chatState.streaming = null

  if (pending && pending.conversationId === id) clearPending()
  for (const m of changed) void putMessage(m)
}

export async function initAssistant(config: ChatConfig = assistantConfig) {
  chatConfig.value = config
  if (initialized) return
  initialized = true

  const meta = readMeta()
  chatState.conversations = meta.items

  if (!meta.items.length) {
    const conv = makeConversation()
    chatState.conversations.push(conv)
    chatState.activeId = conv.id
  } else {
    const active = meta.items.find((c) => c.id === meta.activeId)
    chatState.activeId = active?.id ?? meta.items[0].id
  }

  await loadActive()
  chatState.ready = true
  saveMeta()

  if (pendingResume) {
    pendingResume = false
    void resume()
  }
}

function ensureActive(): ConversationMeta {
  let conv = chatState.conversations.find((c) => c.id === chatState.activeId)
  if (!conv) {
    conv = makeConversation()
    chatState.conversations.unshift(conv)
    chatState.activeId = conv.id
    chatState.messages = []
    saveMeta()
  }
  return conv
}

function abandonStream() {
  if (!chatState.streaming) return
  if (chatState.sending) {
    try {
      currentAbort?.abort()
    } catch {
      /* ignore */
    }
    const id = serverRequestId || clientRequestId
    if (id) void transport.stop(id)
  }
  finish('stopped')
}

export function newConversation() {
  abandonStream()
  const conv = makeConversation()
  chatState.conversations.unshift(conv)
  chatState.activeId = conv.id
  chatState.messages = []
  chatState.streaming = null
  clearPending()
  saveMeta()
}

export async function selectConversation(id: string) {
  if (id === chatState.activeId) return
  if (!chatState.conversations.some((c) => c.id === id)) return
  abandonStream()
  chatState.activeId = id
  await loadActive()
  saveMeta()
  if (pendingResume) {
    pendingResume = false
    void resume()
  }
}

export async function deleteConversation(id: string) {
  if (chatState.activeId === id) abandonStream()
  await deleteMessages(id)
  chatState.conversations = chatState.conversations.filter((c) => c.id !== id)

  if (!chatState.conversations.length) {
    const conv = makeConversation()
    chatState.conversations.push(conv)
    chatState.activeId = conv.id
    chatState.messages = []
  } else if (chatState.activeId === id) {
    chatState.activeId = chatState.conversations[0].id
    await loadActive()
  }
  saveMeta()
}

export function renameConversation(id: string, title: string) {
  const next = title.trim().slice(0, 40)
  const conv = chatState.conversations.find((c) => c.id === id)
  if (!conv || !next) return
  conv.title = next
  conv.updatedAt = Date.now()
  saveMeta()
}

export function togglePanel(open?: boolean) {
  chatState.panelOpen = typeof open === 'boolean' ? open : !chatState.panelOpen
}

/* ------------------------------ 历史与请求 ------------------------------ */

function messageText(m: ChatMessage): string {
  return m.blocks
    .filter((b): b is TextBlock => b.kind === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim()
}

function buildHistory(context?: string): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  const knowledge = chatConfig.value.knowledge?.filter(Boolean).join('\n\n')
  const system = [
    chatConfig.value.systemPrompt,
    knowledge ? `参考知识：\n${knowledge}` : '',
    context ? `检索到的知识片段（回答时优先使用；无关则忽略）：\n${context}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')

  const picked: Array<{ role: 'user' | 'assistant'; content: string }> = []
  let chars = 0

  for (let i = chatState.messages.length - 1; i >= 0 && picked.length < 24; i--) {
    const msg = chatState.messages[i]
    const content = messageText(msg)
    if (!content) continue
    if (chars + content.length > 16000 && picked.length > 0) break
    picked.unshift({ role: msg.role, content })
    chars += content.length
  }

  return [{ role: 'system', content: system }, ...picked]
}

/* ------------------------------ 落盘 / 续传记录 ------------------------------ */

function savePendingThrottled() {
  const stream = chatState.streaming
  if (!stream || !serverRequestId) return
  if (Date.now() - lastPendingSave < 500) return
  lastPendingSave = Date.now()
  savePending({
    requestId: serverRequestId,
    conversationId: stream.conversationId,
    messageId: stream.id,
    startedAt: stream.createdAt,
    lastSeq,
  })
}

function persistStreaming() {
  const stream = chatState.streaming
  if (!stream) return
  lastPersist = Date.now()
  const message: ChatMessage = {
    id: stream.id,
    conversationId: stream.conversationId,
    role: 'assistant',
    blocks: stream.blocks.map((b) => ({ ...b })),
    status: 'streaming',
    createdAt: stream.createdAt,
    references: (stream.references ?? []).map((r) => ({ ...r })),
  }
  void putMessage(message)
  savePendingThrottled()
}

/* ------------------------------ 流式渲染 ------------------------------ */

function scheduleFlush() {
  if (flushRaf) return
  flushRaf = requestAnimationFrame(() => {
    flushRaf = 0
    flushNow()
  })
}

function flushNow() {
  if (flushRaf) {
    cancelAnimationFrame(flushRaf)
    flushRaf = 0
  }
  const stream = chatState.streaming
  if (!stream) {
    pendingText = ''
    pendingThink = ''
    pendingBump = false
    return
  }

  let changed = false

  if (pendingText) {
    const last = stream.blocks[stream.blocks.length - 1]
    if (last && last.kind === 'text') last.text += pendingText
    else stream.blocks.push({ kind: 'text', text: pendingText })
    pendingText = ''
    changed = true
  }
  if (pendingThink) {
    const last = stream.blocks[stream.blocks.length - 1]
    if (last && last.kind === 'think') last.text += pendingThink
    else stream.blocks.push({ kind: 'think', text: pendingThink, startedAt: Date.now() })
    pendingThink = ''
    changed = true
  }

  if (changed || pendingBump) {
    stream.version += 1
    pendingBump = false
  }

  if (Date.now() - lastPersist > 900) persistStreaming()
}

function ensureThinkStarted(stream: StreamState) {
  for (let i = stream.blocks.length - 1; i >= 0; i--) {
    const b = stream.blocks[i]
    if (b.kind === 'think') {
      if (!b.startedAt) b.startedAt = Date.now()
      return
    }
    if (b.kind === 'text' || b.kind === 'tool') return
  }
}

/** 结束仍在进行的思考块，算出耗时 */
function closeThink(stream: StreamState) {
  for (let i = stream.blocks.length - 1; i >= 0; i--) {
    const b = stream.blocks[i]
    if (b.kind === 'think') {
      if (!b.endedAt) {
        b.endedAt = Date.now()
        b.durationMs = b.endedAt - (b.startedAt ?? b.endedAt)
      }
      return
    }
    if (b.kind === 'text' || b.kind === 'tool') return
  }
}

/** 续传时合并：服务端可能从头重放，也可能只发新增部分 */
function mergeText(base: string, incoming: string): string {
  if (!base) return incoming
  if (incoming.startsWith(base)) return incoming
  if (base.startsWith(incoming)) return base
  let i = 0
  while (i < base.length && i < incoming.length && base[i] === incoming[i]) i++
  return base + incoming.slice(i)
}

function pushDelta(kind: 'text' | 'think', delta: string) {
  if (!delta || !chatState.streaming) return
  const stream = chatState.streaming

  if (resumeBaseline) {
    if (kind === 'text') {
      resumeBaseline.textReplay += delta
      const merged = mergeText(resumeBaseline.text, resumeBaseline.textReplay)
      const last = stream.blocks[stream.blocks.length - 1]
      if (last && last.kind === 'text') last.text = merged
      else stream.blocks.push({ kind: 'text', text: merged })
    } else {
      resumeBaseline.thinkReplay += delta
      const merged = mergeText(resumeBaseline.think, resumeBaseline.thinkReplay)
      const last = stream.blocks[stream.blocks.length - 1]
      if (last && last.kind === 'think') last.text = merged
      else stream.blocks.push({ kind: 'think', text: merged, startedAt: Date.now() })
      ensureThinkStarted(stream)
    }
    pendingBump = true
    scheduleFlush()
    return
  }

  if (kind === 'text') closeThink(stream)

  const last = stream.blocks[stream.blocks.length - 1]
  if (!last || last.kind !== kind) {
    flushNow()
    stream.blocks.push(
      kind === 'text'
        ? { kind: 'text', text: '' }
        : { kind: 'think', text: '', startedAt: Date.now() }
    )
  }

  if (kind === 'text') pendingText += delta
  else pendingThink += delta
  scheduleFlush()
}

function applyToolCall(frame: Extract<Frame, { type: 'TOOL_CALL' }>) {
  const stream = chatState.streaming
  if (!stream) return
  closeThink(stream)
  flushNow()

  let block = stream.blocks.find(
    (b): b is ToolBlock => b.kind === 'tool' && b.id === frame.id
  )
  if (!block) {
    block = {
      kind: 'tool',
      id: frame.id,
      name: frame.name || 'tool',
      args: '',
      status: 'running',
      startedAt: Date.now(),
    }
    stream.blocks.push(block)
  }
  if (frame.name) block.name = frame.name

  if (frame.arguments) {
    if (resumeBaseline) {
      const base = resumeBaseline.tools.get(frame.id) ?? ''
      const replay = (resumeBaseline.toolReplay.get(frame.id) ?? '') + frame.arguments
      resumeBaseline.toolReplay.set(frame.id, replay)
      block.args = mergeText(base, replay)
    } else {
      block.args += frame.arguments
    }
  }
  if (frame.status) block.status = frame.status
  stream.version += 1
  persistStreaming()
}

function applyToolResult(frame: Extract<Frame, { type: 'TOOL_RESULT' }>) {
  const stream = chatState.streaming
  if (!stream) return
  flushNow()

  let block = stream.blocks.find(
    (b): b is ToolBlock => b.kind === 'tool' && b.id === frame.id
  )
  if (!block) {
    block = {
      kind: 'tool',
      id: frame.id,
      name: 'tool',
      args: '',
      status: 'running',
      startedAt: Date.now(),
    }
    stream.blocks.push(block)
  }

  block.result = frame.content
  block.status = frame.status === 'error' ? 'error' : 'done'
  if (!block.endedAt) {
    block.endedAt = Date.now()
    block.durationMs =
      frame.durationMs ?? block.endedAt - (block.startedAt ?? block.endedAt)
  } else if (frame.durationMs !== undefined) {
    block.durationMs = frame.durationMs
  }

  stream.version += 1
  persistStreaming()
}

function applyReferences(references: Reference[]) {
  const stream = chatState.streaming
  if (!stream || !references.length) return
  const map = new Map((stream.references ?? []).map((r) => [r.id, r]))
  for (const ref of references) {
    if (!ref.id || map.has(ref.id)) continue
    map.set(ref.id, ref)
  }
  stream.references = [...map.values()].slice(0, 8)
  stream.version += 1
  persistStreaming()
}

function handleFrames(frames: Frame[]) {
  for (const frame of frames) {
    if (finished || !chatState.streaming) return

    if (frame.type === 'INIT_REQUEST_ID') {
      if (frame.requestId) {
        serverRequestId = frame.requestId
        lastPendingSave = 0
        savePendingThrottled()
      }
      continue
    }

    const seq = (frame as { seq?: number }).seq
    if (seq !== undefined) {
      if (seq <= lastSeq) continue
      lastSeq = seq
    }

    switch (frame.type) {
      case 'MESSAGE':
        pushDelta('text', frame.delta)
        break
      case 'THINKING':
      case 'THINK':
        pushDelta('think', frame.delta)
        break
      case 'TOOL_CALL':
        applyToolCall(frame)
        break
      case 'TOOL_RESULT':
        applyToolResult(frame)
        break
      case 'REFERENCE':
        applyReferences(frame.references)
        break
      case 'ERROR':
        streamError = frame.message
        throw new Error(frame.message)
      case 'DONE':
        closeThink(chatState.streaming)
        break
    }

    savePendingThrottled()
  }
}

/* ------------------------------ 发送 / 停止 / 重试 ------------------------------ */

function resetRun() {
  finished = false
  pendingText = ''
  pendingThink = ''
  pendingBump = false
  lastPersist = 0
  lastPendingSave = 0
  lastSeq = 0
  serverRequestId = ''
  streamError = ''
  resumeBaseline = null
  chatState.resumable = false
}

function finish(status: Extract<MessageStatus, 'done' | 'stopped' | 'error'>, error?: string) {
  if (finished) return
  finished = true
  flushNow()

  const stream = chatState.streaming
  if (stream) {
    closeThink(stream)
    stream.status = status

    if (status === 'error') {
      stream.error = error
      const hasText = stream.blocks.some((b) => b.kind === 'text' && b.text.trim())
      if (!hasText) {
        stream.blocks.push({ kind: 'text', text: `请求失败：${error || '未知错误'}` })
      }
    }
    if (status === 'done' && stream.blocks.length === 0) {
      stream.blocks.push({ kind: 'text', text: '（没有返回内容）' })
    }
    if (status === 'stopped' && stream.blocks.length === 0) {
      stream.blocks.push({ kind: 'text', text: '已停止生成。' })
    }

    const message: ChatMessage = {
      id: stream.id,
      conversationId: stream.conversationId,
      role: 'assistant',
      blocks: stream.blocks.map((b) => ({ ...b })),
      status,
      createdAt: stream.createdAt,
      error,
      references: (stream.references ?? []).map((r) => ({ ...r })),
    }
    chatState.messages.push(message)
    void putMessage(message)
    chatState.streaming = null

    const conv = chatState.conversations.find((c) => c.id === message.conversationId)
    if (conv) bump(conv.id, '', false)
  }

  clearPending()
  chatState.sending = false
  currentAbort = null
  clientRequestId = ''
  serverRequestId = ''
  lastSeq = 0
  pendingText = ''
  pendingThink = ''
  pendingBump = false
  streamError = ''
  resumeBaseline = null
  lastPersist = 0
}

async function runAssistant() {
  const conv = ensureActive()
  const last = chatState.messages[chatState.messages.length - 1]
  if (!last || last.role !== 'user' || chatState.streaming) return

  // 直连/mock 在客户端做一次检索；http 模式交给服务端返回 REFERENCE
  const query = messageText(last)
  let knowledgeContext = ''
  let knowledgeRefs: Reference[] = []
  if (transport.localRag && settings.knowledgeBaseIds.length) {
    try {
      const rag = await buildKnowledgeContext(query, settings.knowledgeBaseIds, 4)
      knowledgeContext = rag.context
      knowledgeRefs = rag.references
    } catch {
      /* 检索失败不阻塞对话 */
    }
  }

  resetRun()
  chatState.streaming = {
    id: uid(),
    conversationId: conv.id,
    role: 'assistant',
    blocks: [],
    status: 'streaming',
    createdAt: Date.now(),
    version: 0,
  }
  chatState.sending = true
  const controller = new AbortController()
  currentAbort = controller
  clientRequestId = uid()

  if (knowledgeRefs.length) {
    handleFrames([{ type: 'REFERENCE', references: knowledgeRefs }])
  }

  const history = buildHistory(knowledgeContext)
  const toolIds = getSelectedToolIds(conv.id)

  try {
    const response = await transport.open({
      requestId: clientRequestId,
      conversationId: conv.id,
      messages: history,
      temperature: settings.temperature,
      model: settings.model || undefined,
      maxTokens: settings.maxTokens,
      knowledgeBaseIds: settings.knowledgeBaseIds,
      toolIds,
      signal: controller.signal,
    })
    if (!response.body) throw new Error('响应没有可读流')

    const reader = response.body.getReader()
    const parser = new ChatStreamParser()

    for (;;) {
      const { value, done } = await reader.read()
      if (done || finished) break
      handleFrames(parser.push(value))
    }
    if (!finished) handleFrames(parser.flush())
    finish('done')
  } catch (err) {
    if (streamError) {
      finish('error', streamError)
      return
    }
    if (controller.signal.aborted) {
      finish('stopped')
      return
    }
    // 已经拿到 requestId 才值得续传
    if (serverRequestId) {
      chatState.resumable = true
      chatState.sending = false
      currentAbort = null
      savePendingThrottled()
      return
    }
    finish('error', err instanceof Error ? err.message : '请求失败')
  }
}

function lastText(stream: StreamState): string {
  for (let i = stream.blocks.length - 1; i >= 0; i--) {
    const b = stream.blocks[i]
    if (b.kind === 'text') return b.text
  }
  return ''
}

function lastThink(stream: StreamState): string {
  for (let i = stream.blocks.length - 1; i >= 0; i--) {
    const b = stream.blocks[i]
    if (b.kind === 'think') return b.text
  }
  return ''
}

export async function resume() {
  if (!transport.supportsResume) {
    clearPending()
    return
  }
  if (chatState.sending) return
  const pending = readPending()
  if (!pending) return
  if (pending.conversationId !== chatState.activeId) return

  if (!chatState.streaming) {
    await loadActive()
  }
  const stream = chatState.streaming
  if (!stream || stream.conversationId !== pending.conversationId) {
    clearPending()
    return
  }

  resetRun()
  serverRequestId = pending.requestId
  lastSeq = pending.lastSeq
  chatState.sending = true
  chatState.resumable = false
  resumeBaseline = {
    text: lastText(stream),
    think: lastThink(stream),
    textReplay: '',
    thinkReplay: '',
    tools: new Map(
      stream.blocks.filter((b): b is ToolBlock => b.kind === 'tool').map((b) => [b.id, b.args])
    ),
    toolReplay: new Map(),
  }

  const controller = new AbortController()
  currentAbort = controller

  try {
    const response = await transport.receive(pending.requestId, controller.signal)
    if (!response.body) throw new Error('续传响应没有可读流')

    const reader = response.body.getReader()
    const parser = new ChatStreamParser()

    for (;;) {
      const { value, done } = await reader.read()
      if (done || finished) break
      handleFrames(parser.push(value))
    }
    if (!finished) handleFrames(parser.flush())
    finish('done')
  } catch (err) {
    if (streamError) {
      finish('error', streamError)
      return
    }
    if (controller.signal.aborted) {
      finish('stopped')
      return
    }
    chatState.resumable = true
    chatState.sending = false
    currentAbort = null
    savePendingThrottled()
  }
}

export async function send(text: string) {
  const content = text.trim()
  if (!content || chatState.sending || chatState.streaming) return
  if (!chatState.ready) await initAssistant(chatConfig.value)

  const conv = ensureActive()
  const userMessage: ChatMessage = {
    id: uid(),
    conversationId: conv.id,
    role: 'user',
    blocks: [{ kind: 'text', text: content }],
    status: 'done',
    createdAt: Date.now(),
  }
  chatState.messages.push(userMessage)
  void putMessage(userMessage)
  bump(conv.id, content, true)

  await runAssistant()
}

export function stop() {
  if (!chatState.streaming) return
  try {
    currentAbort?.abort()
  } catch {
    /* ignore */
  }
  const id = serverRequestId || clientRequestId
  if (id) void transport.stop(id)
  finish('stopped')
}

export async function retryMessage(id: string) {
  if (chatState.sending || chatState.streaming) return
  const last = chatState.messages[chatState.messages.length - 1]
  if (!last || last.id !== id || last.role !== 'assistant') return

  chatState.messages.pop()
  await deleteMessage(id)

  if (chatState.messages[chatState.messages.length - 1]?.role !== 'user') return
  await runAssistant()
}

export const assistant = {
  state: chatState,
  config: chatConfig,
  init: initAssistant,
  send,
  stop,
  resume,
  retryMessage,
  togglePanel,
  newConversation,
  selectConversation,
  deleteConversation,
  renameConversation,
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    if (readPending() && !chatState.sending) void resume()
  })
}
