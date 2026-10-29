/**
 * MCP 工具接入
 * ------------------------------------------------------------
 * · 服务配置与工具列表存在 IndexedDB myos-mcp（servers / tools）
 * · 三种 transport：
 *   - http    POST JSON-RPC tools/list
 *   - sse     MCP SSE 握手：GET 拿 endpoint → POST initialize/tools/list → 从流里收响应
 *   - command 浏览器不能起进程，转发到本地 bridge（scripts/mcp-bridge.mjs）
 * · 每个会话勾选要暴露的工具，存 localStorage；发起对话时提交 toolIds
 */
import { SSEBuffer, type RawEvent } from './sse'

export type McpTransport = 'sse' | 'http' | 'command'

export interface McpServer {
  id: string
  name: string
  transport: McpTransport
  endpoint: string
  command: string
  enabled: boolean
  createdAt: number
  updatedAt: number
  lastSyncAt?: number
  error?: string
}

export interface McpTool {
  id: string
  serverId: string
  name: string
  title?: string
  description?: string
  inputSchema?: unknown
  enabled: boolean
  syncedAt: number
}

export interface McpServerInput {
  name: string
  transport: McpTransport
  endpoint?: string
  command?: string
}

interface McpToolRaw {
  name: string
  title?: string
  description?: string
  inputSchema?: unknown
}

interface JsonRpcResponse {
  jsonrpc?: string
  id?: number
  result?: unknown
  error?: { message?: string }
}

const DB_NAME = 'myos-mcp'
const DB_VERSION = 1
const SERVERS = 'servers'
const TOOLS = 'tools'
const SELECTION_KEY = 'myos.ai.toolSelection.v1'
const BRIDGE_URL = 'http://127.0.0.1:5198'

const memory = {
  servers: new Map<string, McpServer>(),
  tools: new Map<string, McpTool>(),
}

let memoryOnly = false
let dbPromise: Promise<IDBDatabase> | null = null

function uid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  const pending = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB 不可用'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(SERVERS)) {
        db.createObjectStore(SERVERS, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(TOOLS)) {
        const store = db.createObjectStore(TOOLS, { keyPath: 'id' })
        store.createIndex('serverId', 'serverId', { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('MCP 数据库打开失败'))
  }).catch((err) => {
    memoryOnly = true
    throw err
  })
  dbPromise = pending
  return pending
}

function requestDone<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('MCP 操作失败'))
  })
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('MCP 写入失败'))
    tx.onabort = () => reject(tx.error ?? new Error('MCP 写入中止'))
  })
}

async function getAll<T>(store: string): Promise<T[]> {
  const db = await openDb()
  const tx = db.transaction(store, 'readonly')
  const rows = await requestDone(tx.objectStore(store).getAll() as IDBRequest<T[]>)
  await txDone(tx)
  return rows
}

async function putRecord(store: string, value: unknown): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(store, 'readwrite')
  tx.objectStore(store).put(value)
  await txDone(tx)
}

async function deleteRecord(store: string, id: string): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(store, 'readwrite')
  tx.objectStore(store).delete(id)
  await txDone(tx)
}

/* ------------------------------ 服务 / 工具 CRUD ------------------------------ */

export async function listServers(): Promise<McpServer[]> {
  if (!memoryOnly) {
    try {
      const rows = await getAll<McpServer>(SERVERS)
      return rows.sort((a, b) => a.createdAt - b.createdAt)
    } catch {
      memoryOnly = true
    }
  }
  return [...memory.servers.values()].sort((a, b) => a.createdAt - b.createdAt)
}

export async function createServer(input: McpServerInput): Promise<McpServer> {
  const name = input.name.trim()
  if (!name) throw new Error('服务名称不能为空')
  const endpoint = (input.endpoint ?? '').trim()
  const command = (input.command ?? '').trim()
  if (input.transport !== 'command' && !endpoint) throw new Error('请填写 endpoint')
  if (input.transport === 'command' && !command) throw new Error('请填写启动命令')

  const now = Date.now()
  const server: McpServer = {
    id: uid(),
    name: name.slice(0, 40),
    transport: input.transport,
    endpoint,
    command,
    enabled: true,
    createdAt: now,
    updatedAt: now,
  }
  memory.servers.set(server.id, server)
  if (!memoryOnly) {
    try {
      await putRecord(SERVERS, server)
    } catch {
      memoryOnly = true
    }
  }
  return server
}

export async function updateServer(id: string, patch: Partial<McpServer>): Promise<void> {
  const current = (await listServers()).find((s) => s.id === id)
  if (!current) return
  const next: McpServer = { ...current, ...patch, id, updatedAt: Date.now() }
  memory.servers.set(id, next)
  if (!memoryOnly) {
    try {
      await putRecord(SERVERS, next)
    } catch {
      memoryOnly = true
    }
  }
}

export async function deleteServer(id: string): Promise<void> {
  memory.servers.delete(id)
  for (const [key, tool] of memory.tools) if (tool.serverId === id) memory.tools.delete(key)
  if (!memoryOnly) {
    try {
      const db = await openDb()
      const tx = db.transaction(TOOLS, 'readwrite')
      const req = tx.objectStore(TOOLS).index('serverId').getAllKeys(id)
      req.onsuccess = () => {
        for (const key of req.result) tx.objectStore(TOOLS).delete(key)
      }
      await txDone(tx)
      await deleteRecord(SERVERS, id)
    } catch {
      memoryOnly = true
    }
  }
}

export async function listTools(serverId?: string): Promise<McpTool[]> {
  if (!memoryOnly) {
    try {
      const db = await openDb()
      const tx = db.transaction(TOOLS, 'readonly')
      const req = serverId
        ? (tx.objectStore(TOOLS).index('serverId').getAll(serverId) as IDBRequest<McpTool[]>)
        : (tx.objectStore(TOOLS).getAll() as IDBRequest<McpTool[]>)
      const rows = await requestDone(req)
      await txDone(tx)
      return rows.sort((a, b) => a.name.localeCompare(b.name))
    } catch {
      memoryOnly = true
    }
  }
  const rows = [...memory.tools.values()]
  return rows
    .filter((t) => !serverId || t.serverId === serverId)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function setServerEnabled(id: string, enabled: boolean): Promise<void> {
  await updateServer(id, { enabled })
}

export async function setToolEnabled(id: string, enabled: boolean): Promise<void> {
  const tool = (await listTools()).find((t) => t.id === id)
  if (!tool) return
  const next = { ...tool, enabled }
  memory.tools.set(id, next)
  if (!memoryOnly) {
    try {
      await putRecord(TOOLS, next)
    } catch {
      memoryOnly = true
    }
  }
}

/* ------------------------------ 会话工具选择 ------------------------------ */

function readSelection(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(SELECTION_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const out: Record<string, string[]> = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (Array.isArray(value)) out[key] = value.filter((x): x is string => typeof x === 'string')
    }
    return out
  } catch {
    return {}
  }
}

export function getSelectedToolIds(conversationId: string): string[] {
  if (!conversationId) return []
  return readSelection()[conversationId] ?? []
}

/** 保存当前会话暴露给模型的工具 id */
export function saveTools(conversationId: string, ids: string[]): void {
  if (!conversationId) return
  try {
    const map = readSelection()
    map[conversationId] = [...new Set(ids)]
    localStorage.setItem(SELECTION_KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

/* ------------------------------ JSON-RPC / 同步 ------------------------------ */

function toolsFromResult(result: unknown): McpToolRaw[] {
  const list = (result as { tools?: unknown } | null)?.tools
  if (!Array.isArray(list)) return []
  return list
    .map((item) => {
      const r = (item ?? {}) as Record<string, unknown>
      return {
        name: String(r.name ?? ''),
        title: typeof r.title === 'string' ? r.title : undefined,
        description: typeof r.description === 'string' ? r.description : undefined,
        inputSchema: r.inputSchema,
      }
    })
    .filter((tool) => tool.name)
}

function parseJsonRpc(text: string): JsonRpcResponse | null {
  try {
    const json = JSON.parse(text) as JsonRpcResponse
    return json && typeof json === 'object' ? json : null
  } catch {
    return null
  }
}

async function httpTools(endpoint: string): Promise<McpToolRaw[]> {
  if (!endpoint) throw new Error('请填写 HTTP endpoint')
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
  })
  if (!res.ok) throw new Error(`MCP HTTP ${res.status}`)

  const contentType = res.headers.get('content-type') ?? ''
  if (contentType.includes('text/event-stream')) {
    return readSseResponse(res, 1)
  }
  const json = (await res.json()) as JsonRpcResponse
  if (json.error) throw new Error(json.error.message ?? 'MCP 返回错误')
  return toolsFromResult(json.result)
}

async function readSseResponse(res: Response, id: number): Promise<McpToolRaw[]> {
  const reader = res.body?.getReader()
  if (!reader) throw new Error('MCP 没有返回可读流')
  const decoder = new TextDecoder()
  const buffer = new SSEBuffer()
  const timer = window.setTimeout(() => void reader.cancel().catch(() => undefined), 8000)

  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      for (const ev of buffer.push(decoder.decode(value, { stream: true }))) {
        const msg = parseJsonRpc(ev.data)
        if (msg && msg.id === id) {
          if (msg.error) throw new Error(msg.error.message ?? 'MCP 返回错误')
          return toolsFromResult(msg.result)
        }
      }
    }
    throw new Error('MCP 响应超时')
  } finally {
    window.clearTimeout(timer)
    void reader.cancel().catch(() => undefined)
  }
}

async function sseTools(endpoint: string): Promise<McpToolRaw[]> {
  if (!endpoint) throw new Error('请填写 SSE endpoint')
  const controller = new AbortController()
  const res = await fetch(endpoint, {
    headers: { Accept: 'text/event-stream' },
    signal: controller.signal,
  })
  if (!res.ok || !res.body) throw new Error(`MCP SSE ${res.status}`)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  const buffer = new SSEBuffer()
  const pending = new Map<number, (msg: JsonRpcResponse) => void>()
  let messageUrl = endpoint
  let endpointReady: (() => void) | null = null
  const endpointPromise = new Promise<void>((resolve) => {
    endpointReady = resolve
  })
  let nextId = 1

  const handleEvent = (ev: RawEvent) => {
    if (ev.event === 'endpoint') {
      try {
        messageUrl = new URL(ev.data, endpoint).toString()
      } catch {
        /* 保留原 endpoint */
      }
      endpointReady?.()
      return
    }
    const msg = parseJsonRpc(ev.data)
    if (msg?.id && pending.has(msg.id)) {
      const resolve = pending.get(msg.id)
      pending.delete(msg.id)
      resolve?.(msg)
    }
  }

  const pump = (async () => {
    try {
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        for (const ev of buffer.push(decoder.decode(value, { stream: true }))) handleEvent(ev)
      }
    } catch {
      /* aborted */
    }
  })()

  const post = async (method: string, params: unknown): Promise<JsonRpcResponse | null> => {
    const id = method.startsWith('notifications/') ? undefined : nextId++
    let resolvePending: ((msg: JsonRpcResponse) => void) | null = null
    const response =
      id === undefined
        ? null
        : new Promise<JsonRpcResponse>((resolve) => {
            resolvePending = resolve
            pending.set(id, resolve)
          })

    const sent = await fetch(messageUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        ...(id !== undefined ? { id } : {}),
        method,
        params,
      }),
    })
    if (!sent.ok) throw new Error(`MCP SSE 消息 ${sent.status}`)
    if (id === undefined || !response) return null

    const timer = window.setTimeout(() => {
      if (resolvePending) {
        pending.delete(id)
        resolvePending({ error: { message: 'MCP 响应超时' } })
      }
    }, 8000)

    try {
      return await response
    } finally {
      window.clearTimeout(timer)
    }
  }

  try {
    await Promise.race([
      endpointPromise,
      new Promise<void>((resolve) => window.setTimeout(resolve, 2500)),
    ])
    const init = await post('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'myos', version: '0.1' },
    })
    if (init?.error) throw new Error(init.error.message ?? 'MCP initialize 失败')
    await post('notifications/initialized', {})
    const response = await post('tools/list', {})
    if (!response) return []
    if (response.error) throw new Error(response.error.message ?? 'MCP tools/list 失败')
    return toolsFromResult(response.result)
  } finally {
    controller.abort()
    void reader.cancel().catch(() => undefined)
    void pump
  }
}

async function commandTools(command: string): Promise<McpToolRaw[]> {
  if (!command) throw new Error('请填写启动命令')
  let res: Response
  try {
    res = await fetch(`${BRIDGE_URL}/mcp/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command }),
    })
  } catch {
    throw new Error('command transport 需要先启动本地 bridge：node scripts/mcp-bridge.mjs')
  }
  const json = (await res.json().catch(() => null)) as
    | { tools?: McpToolRaw[]; error?: string }
    | null
  if (!res.ok || !json) throw new Error(json?.error ?? `MCP bridge ${res.status}`)
  if (json.error) throw new Error(json.error)
  return Array.isArray(json.tools) ? json.tools : []
}

async function fetchMcpTools(server: McpServer): Promise<McpToolRaw[]> {
  if (server.transport === 'command') return commandTools(server.command)
  if (server.transport === 'sse') return sseTools(server.endpoint)
  return httpTools(server.endpoint)
}

export async function syncServer(id: string): Promise<McpTool[]> {
  const server = (await listServers()).find((s) => s.id === id)
  if (!server) throw new Error('MCP 服务不存在')

  try {
    const raw = await fetchMcpTools(server)
    const existing = await listTools(server.id)
    const enabledByName = new Map(existing.map((t) => [t.name, t.enabled]))
    const syncedAt = Date.now()
    const tools: McpTool[] = raw.map((tool) => ({
      id: `${server.id}:${tool.name}`,
      serverId: server.id,
      name: tool.name,
      title: tool.title,
      description: tool.description,
      inputSchema: tool.inputSchema,
      enabled: enabledByName.get(tool.name) ?? true,
      syncedAt,
    }))

    memory.tools.forEach((tool, key) => {
      if (tool.serverId === server.id) memory.tools.delete(key)
    })
    for (const tool of tools) memory.tools.set(tool.id, tool)

    if (!memoryOnly) {
      try {
        const db = await openDb()
        const tx = db.transaction(TOOLS, 'readwrite')
        const store = tx.objectStore(TOOLS)
        const keys = await requestDone(
          store.index('serverId').getAllKeys(server.id) as IDBRequest<IDBValidKey[]>
        )
        for (const key of keys) store.delete(key)
        for (const tool of tools) store.put(tool)
        await txDone(tx)
      } catch {
        memoryOnly = true
      }
    }

    await updateServer(server.id, { lastSyncAt: syncedAt, error: '', updatedAt: syncedAt })
    return tools
  } catch (err) {
    const message = err instanceof Error ? err.message : '同步失败'
    await updateServer(server.id, { error: message, updatedAt: Date.now() })
    throw err
  }
}

/** 兼容命名：同步工具列表 */
export const sync = syncServer
