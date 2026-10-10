/**
 * Markdown 数据层 · 解析工具
 * ------------------------------------------------------------
 * 目标：让「改 md 就能用」成立 —— 只有最朴素的 frontmatter 与标题分节，
 * 不依赖任何编辑器插件，手写也不会错。
 */

export type FmValue = string | string[]
export interface ParsedMd {
  data: Record<string, FmValue>
  body: string
}

/** 解析 `--- ... ---` 形式的 frontmatter（只支持标量与行内数组） */
export function parseFrontmatter(raw: string): ParsedMd {
  const text = raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n')
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(text)
  if (!m) return { data: {}, body: text.trim() }

  const data: Record<string, FmValue> = {}
  for (const line of m[1].split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue
    const i = line.indexOf(':')
    if (i < 0) continue
    const key = line.slice(0, i).trim()
    const rawVal = line.slice(i + 1).trim()
    data[key] = parseValue(rawVal)
  }
  return { data, body: text.slice(m[0].length).trim() }
}

function parseValue(v: string): FmValue {
  if (v.startsWith('[') && v.endsWith(']')) {
    return v
      .slice(1, -1)
      .split(',')
      .map((s) => stripQuote(s.trim()))
      .filter(Boolean)
  }
  return stripQuote(v)
}

function stripQuote(s: string): string {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1)
  }
  return s
}

/** 取 `## 标题` 到下一个同级/更高级标题之间的内容 */
export function section(body: string, heading: string): string {
  const lines = body.split('\n')
  const start = lines.findIndex((l) => /^#{1,6}\s/.test(l) && l.replace(/^#{1,6}\s*/, '').trim() === heading)
  if (start < 0) return ''
  const level = /^#+/.exec(lines[start])![0].length
  const out: string[] = []
  for (let i = start + 1; i < lines.length; i++) {
    const h = /^(#+)\s/.exec(lines[i])
    if (h && h[1].length <= level) break
    out.push(lines[i])
  }
  return out.join('\n').trim()
}

export interface Task {
  text: string
  done: boolean
}

/** 从 `## 本周三件事` 这类小节里抽出 `- [ ] / - [x]` 清单 */
export function parseChecklist(text: string): Task[] {
  const out: Task[] = []
  for (const line of text.split('\n')) {
    const m = /^\s*[-*]\s+\[( |x|X)\]\s*(.+?)\s*$/.exec(line)
    if (m) out.push({ text: m[2], done: m[1].toLowerCase() === 'x' })
  }
  if (out.length) return out
  // 容错：没有 checkbox 语法就当普通列表
  for (const line of text.split('\n')) {
    const m = /^\s*[-*]\s+(.+?)\s*$/.exec(line)
    if (m) out.push({ text: m[1], done: false })
  }
  return out
}

/** 抽出 `- xxx` 形式的列表（去掉行内标记），用于「目标 / 核心概念」 */
export function parseList(text: string): string[] {
  const out: string[] = []
  for (const line of text.split('\n')) {
    const m = /^\s*[-*]\s+(?:\[(?: |x|X)\]\s*)?(.+?)\s*$/.exec(line)
    if (m) out.push(m[1].replace(/\*\*/g, '').replace(/`/g, '').trim())
  }
  return out
}

/** 取 md 里第一个 ``` 代码块的内容；没有代码块就返回原文 */
export function codeBlock(text: string): string {
  const m = /```[a-zA-Z]*\n([\s\S]*?)```/.exec(text)
  return (m ? m[1] : text).trim()
}

/** 纯文本摘要：去掉标记，取前 n 字 */
export function plain(text: string, n = 90): string {
  const s = text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*`_\-[\]()!]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return s.length > n ? s.slice(0, n) + '…' : s
}

/** 剥离代码块等重内容，用于列表摘要 */
export function firstParagraph(text: string): string {
  const first =
    text
      .split('\n\n')
      .map((s) => s.trim())
      .find((s) => s && !s.startsWith('#') && !s.startsWith('```') && !s.startsWith('-')) ?? ''
  return plain(first, 120)
}
