/**
 * 知识库（本地 RAG）
 * ------------------------------------------------------------
 * 存储：IndexedDB myos-kb（bases / docs / chunks），不可用时退化为内存
 * 解析：txt / md 直接读，pdf 走 pdfjs-dist，docx 走 jszip + word/document.xml
 * 检索：字符 bigram + 拉丁词的 TF-IDF 余弦相似度（纯本地，无需向量模型）
 */
import type { Reference } from './types'
import { extOf, extractText, makeSnippet } from './kb-parse'

export interface KnowledgeBase {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  docCount: number
  chunkCount: number
}

export interface KnowledgeDoc {
  id: string
  baseId: string
  name: string
  ext: string
  size: number
  createdAt: number
  chunkCount: number
  preview: string
}

export interface KnowledgeChunk {
  id: string
  baseId: string
  docId: string
  title: string
  text: string
  ord: number
}

export interface RetrievedChunk {
  id: string
  docId: string
  title: string
  text: string
  score: number
}

export interface KnowledgeContext {
  references: Reference[]
  context: string
  hits: RetrievedChunk[]
}

const DB_NAME = 'myos-kb'
const DB_VERSION = 1
const BASES = 'bases'
const DOCS = 'docs'
const CHUNKS = 'chunks'

const memory = {
  bases: new Map<string, KnowledgeBase>(),
  docs: new Map<string, KnowledgeDoc>(),
  chunks: new Map<string, KnowledgeChunk>(),
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
      if (!db.objectStoreNames.contains(BASES)) {
        db.createObjectStore(BASES, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(DOCS)) {
        const store = db.createObjectStore(DOCS, { keyPath: 'id' })
        store.createIndex('baseId', 'baseId', { unique: false })
      }
      if (!db.objectStoreNames.contains(CHUNKS)) {
        const store = db.createObjectStore(CHUNKS, { keyPath: 'id' })
        store.createIndex('baseId', 'baseId', { unique: false })
        store.createIndex('docId', 'docId', { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('知识库数据库打开失败'))
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
    req.onerror = () => reject(req.error ?? new Error('知识库操作失败'))
  })
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('知识库写入失败'))
    tx.onabort = () => reject(tx.error ?? new Error('知识库写入中止'))
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

function deleteByIndex(store: string, index: string, value: string): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite')
        const req = tx.objectStore(store).index(index).getAllKeys(value)
        req.onsuccess = () => {
          for (const key of req.result) tx.objectStore(store).delete(key)
        }
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error ?? new Error('知识库删除失败'))
      })
  )
}

/* ------------------------------ 知识库 ------------------------------ */

export async function listBases(): Promise<KnowledgeBase[]> {
  if (!memoryOnly) {
    try {
      const rows = await getAll<KnowledgeBase>(BASES)
      return rows.sort((a, b) => b.updatedAt - a.updatedAt)
    } catch {
      memoryOnly = true
    }
  }
  return [...memory.bases.values()].sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function createBase(name: string): Promise<KnowledgeBase> {
  const clean = name.trim()
  if (!clean) throw new Error('知识库名称不能为空')
  const now = Date.now()
  const base: KnowledgeBase = {
    id: uid(),
    name: clean.slice(0, 40),
    createdAt: now,
    updatedAt: now,
    docCount: 0,
    chunkCount: 0,
  }
  memory.bases.set(base.id, base)
  if (!memoryOnly) {
    try {
      await putRecord(BASES, base)
    } catch {
      memoryOnly = true
    }
  }
  return base
}

export async function deleteBase(id: string): Promise<void> {
  memory.bases.delete(id)
  for (const [key, doc] of memory.docs) if (doc.baseId === id) memory.docs.delete(key)
  for (const [key, chunk] of memory.chunks) if (chunk.baseId === id) memory.chunks.delete(key)
  if (memoryOnly) return
  try {
    await deleteByIndex(DOCS, 'baseId', id)
    await deleteByIndex(CHUNKS, 'baseId', id)
    await deleteRecord(BASES, id)
  } catch {
    memoryOnly = true
  }
}

export async function listDocs(baseId: string): Promise<KnowledgeDoc[]> {
  if (!memoryOnly) {
    try {
      const db = await openDb()
      const tx = db.transaction(DOCS, 'readonly')
      const req = tx.objectStore(DOCS).index('baseId').getAll(baseId) as IDBRequest<KnowledgeDoc[]>
      const rows = await requestDone(req)
      await txDone(tx)
      return rows.sort((a, b) => b.createdAt - a.createdAt)
    } catch {
      memoryOnly = true
    }
  }
  return [...memory.docs.values()]
    .filter((d) => d.baseId === baseId)
    .sort((a, b) => b.createdAt - a.createdAt)
}

async function refreshBaseCounts(baseId: string): Promise<void> {
  const bases = await listBases()
  const base = bases.find((b) => b.id === baseId)
  if (!base) return
  const docs = await listDocs(baseId)
  const chunks = await getChunksForBases([baseId])
  const next: KnowledgeBase = {
    ...base,
    docCount: docs.length,
    chunkCount: chunks.length,
    updatedAt: Date.now(),
  }
  memory.bases.set(baseId, next)
  if (!memoryOnly) {
    try {
      await putRecord(BASES, next)
    } catch {
      memoryOnly = true
    }
  }
}

export async function addDocument(baseId: string, file: File): Promise<KnowledgeDoc> {
  if (file.size > 10 * 1024 * 1024) throw new Error('文件不能超过 10MB')
  const text = await extractText(file)
  if (!text.trim()) throw new Error('没有解析到文字内容')

  const pieces = chunkText(text)
  if (!pieces.length) throw new Error('没有可入库的文本片段')

  const docId = uid()
  const doc: KnowledgeDoc = {
    id: docId,
    baseId,
    name: file.name,
    ext: extOf(file.name),
    size: file.size,
    createdAt: Date.now(),
    chunkCount: pieces.length,
    preview: makeSnippet(text, 180),
  }

  const chunks: KnowledgeChunk[] = pieces.map((chunk, i) => ({
    id: `${docId}-${i}`,
    baseId,
    docId,
    title: file.name,
    text: chunk,
    ord: i,
  }))

  memory.docs.set(doc.id, doc)
  for (const chunk of chunks) memory.chunks.set(chunk.id, chunk)

  if (!memoryOnly) {
    try {
      const db = await openDb()
      const tx = db.transaction([DOCS, CHUNKS], 'readwrite')
      tx.objectStore(DOCS).put(doc)
      for (const chunk of chunks) tx.objectStore(CHUNKS).put(chunk)
      await txDone(tx)
    } catch {
      memoryOnly = true
    }
  }

  await refreshBaseCounts(baseId)
  return doc
}

export async function deleteDoc(docId: string): Promise<void> {
  const doc = memory.docs.get(docId)
  memory.docs.delete(docId)
  for (const [key, chunk] of memory.chunks) if (chunk.docId === docId) memory.chunks.delete(key)

  if (!memoryOnly) {
    try {
      await deleteRecord(DOCS, docId)
      await deleteByIndex(CHUNKS, 'docId', docId)
    } catch {
      memoryOnly = true
    }
  }
  if (doc) await refreshBaseCounts(doc.baseId)
}

/* ------------------------------ 切块 / 检索 ------------------------------ */

export function chunkText(text: string, size = 480, overlap = 60, max = 40): string[] {
  const clean = text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  if (!clean) return []

  const out: string[] = []
  let start = 0
  while (start < clean.length && out.length < max) {
    let end = Math.min(clean.length, start + size)
    if (end < clean.length) {
      const window = clean.slice(start, end)
      const cut = Math.max(
        window.lastIndexOf('\n'),
        window.lastIndexOf('。'),
        window.lastIndexOf('. ')
      )
      if (cut > size * 0.5) end = start + cut + 1
    }
    const piece = clean.slice(start, end).trim()
    if (piece) out.push(piece)
    if (end >= clean.length) break
    start = Math.max(start + 1, end - overlap)
  }
  return out
}

export function tokenize(text: string): string[] {
  const out: string[] = []
  const runs = text.toLowerCase().match(/[a-z0-9_]+|[\u4e00-\u9fa5]+/g) ?? []
  for (const run of runs) {
    if (/^[a-z0-9_]/.test(run)) {
      if (run.length >= 2) out.push(run)
      continue
    }
    if (run.length === 1) {
      out.push(run)
      continue
    }
    for (let i = 0; i < run.length - 1; i++) out.push(run.slice(i, i + 2))
    if (run.length <= 6) out.push(run)
  }
  return out
}

export function scoreChunks(query: string, chunks: KnowledgeChunk[]): RetrievedChunk[] {
  if (!chunks.length) return []
  const qTokens = tokenize(query)
  if (!qTokens.length) return []

  const qTf = new Map<string, number>()
  for (const t of qTokens) qTf.set(t, (qTf.get(t) ?? 0) + 1)

  const df = new Map<string, number>()
  const tfs = chunks.map((chunk) => {
    const tf = new Map<string, number>()
    for (const t of tokenize(chunk.text)) tf.set(t, (tf.get(t) ?? 0) + 1)
    for (const t of tf.keys()) df.set(t, (df.get(t) ?? 0) + 1)
    return tf
  })

  const N = chunks.length
  const idf = (term: string) => Math.log((N + 1) / ((df.get(term) ?? 0) + 1)) + 1

  const qWeights = new Map<string, number>()
  let qNorm = 0
  for (const [term, n] of qTf) {
    const w = n * idf(term)
    qWeights.set(term, w)
    qNorm += w * w
  }
  qNorm = Math.sqrt(qNorm)
  if (!qNorm) return []

  const out: RetrievedChunk[] = []
  chunks.forEach((chunk, i) => {
    const tf = tfs[i]
    let dot = 0
    for (const [term, wq] of qWeights) {
      const wd = (tf.get(term) ?? 0) * idf(term)
      dot += wq * wd
    }
    let dNorm = 0
    for (const [term, n] of tf) {
      const wd = n * idf(term)
      dNorm += wd * wd
    }
    dNorm = Math.sqrt(dNorm)
    if (!dNorm || !dot) return
    const score = Math.min(1, Math.max(0, dot / (qNorm * dNorm)))
    out.push({ id: chunk.id, docId: chunk.docId, title: chunk.title, text: chunk.text, score })
  })

  return out.sort((a, b) => b.score - a.score)
}

export async function getChunksForBases(baseIds: string[]): Promise<KnowledgeChunk[]> {
  if (!baseIds.length) return []
  if (!memoryOnly) {
    try {
      const db = await openDb()
      const tx = db.transaction(CHUNKS, 'readonly')
      const index = tx.objectStore(CHUNKS).index('baseId')
      const reqs = baseIds.map(
        (id) => index.getAll(id) as IDBRequest<KnowledgeChunk[]>
      )
      const rows = await Promise.all(reqs.map((req) => requestDone(req)))
      await txDone(tx)
      return rows.flat()
    } catch {
      memoryOnly = true
    }
  }
  return [...memory.chunks.values()].filter((c) => baseIds.includes(c.baseId))
}

export async function buildKnowledgeContext(
  query: string,
  baseIds: string[],
  topK = 4
): Promise<KnowledgeContext> {
  if (!baseIds.length || !query.trim()) {
    return { references: [], context: '', hits: [] }
  }
  const chunks = await getChunksForBases(baseIds)
  const hits = scoreChunks(query, chunks).slice(0, topK)
  const references: Reference[] = hits.map((hit) => ({
    id: hit.id,
    docId: hit.docId,
    title: hit.title,
    snippet: makeSnippet(hit.text, 160),
    content: hit.text,
    score: hit.score,
  }))
  const context = hits
    .map((hit, i) => `[${i + 1}] ${hit.title}\n${hit.text}`)
    .join('\n\n')
  return { references, context, hits }
}
