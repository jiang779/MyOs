/**
 * 消息持久化：IndexedDB
 * 会话元数据在 localStorage，消息体在这里。
 * 浏览器禁用 IndexedDB 时退化为内存 Map，界面仍可用（只是刷新会丢）。
 */
import type { ChatMessage } from './types'

const DB_NAME = 'myos-ai'
const DB_VERSION = 1
const STORE = 'messages'
const INDEX = 'conversationId'

let dbPromise: Promise<IDBDatabase> | null = null
let memoryOnly = false
const memory = new Map<string, ChatMessage>()

function clone<T>(value: T): T {
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value)) as T
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
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex(INDEX, INDEX, { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB 打开失败'))
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
    req.onerror = () => reject(req.error ?? new Error('IndexedDB 操作失败'))
  })
}

export async function putMessage(message: ChatMessage): Promise<void> {
  const copy = clone(message)
  memory.set(copy.id, copy)
  if (memoryOnly) return

  try {
    const db = await openDb()
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(copy)
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('写入失败'))
      tx.onabort = () => reject(tx.error ?? new Error('写入中止'))
    })
  } catch {
    memoryOnly = true
  }
}

export async function getMessages(conversationId: string): Promise<ChatMessage[]> {
  if (!memoryOnly) {
    try {
      const db = await openDb()
      const tx = db.transaction(STORE, 'readonly')
      const index = tx.objectStore(STORE).index(INDEX)
      const rows = await requestDone(index.getAll(conversationId) as IDBRequest<ChatMessage[]>)
      return rows.sort((a, b) => a.createdAt - b.createdAt)
    } catch {
      memoryOnly = true
    }
  }
  return [...memory.values()]
    .filter((m) => m.conversationId === conversationId)
    .sort((a, b) => a.createdAt - b.createdAt)
}

export async function deleteMessages(conversationId: string): Promise<void> {
  for (const [id, m] of memory) {
    if (m.conversationId === conversationId) memory.delete(id)
  }
  if (memoryOnly) return

  try {
    const db = await openDb()
    const tx = db.transaction(STORE, 'readwrite')
    const index = tx.objectStore(STORE).index(INDEX)
    const keys = await requestDone(index.getAllKeys(conversationId))
    for (const key of keys) tx.objectStore(STORE).delete(key)
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('删除失败'))
    })
  } catch {
    memoryOnly = true
  }
}

/** 删除单条消息（重试时移除失败的回答） */
export async function deleteMessage(id: string): Promise<void> {
  memory.delete(id)
  if (memoryOnly) return

  try {
    const db = await openDb()
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('删除失败'))
    })
  } catch {
    memoryOnly = true
  }
}
