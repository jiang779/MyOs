/**
 * Markdown → HTML
 * markdown-it + highlight.js，样式在 style.css 的 .prose 里统一收口。
 */
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import json from 'highlight.js/lib/languages/json'
import bash from 'highlight.js/lib/languages/bash'
import python from 'highlight.js/lib/languages/python'
import css from 'highlight.js/lib/languages/css'
import xml from 'highlight.js/lib/languages/xml'
import markdown from 'highlight.js/lib/languages/markdown'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('js', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('ts', typescript)
hljs.registerLanguage('json', json)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('shell', bash)
hljs.registerLanguage('python', python)
hljs.registerLanguage('py', python)
hljs.registerLanguage('css', css)
hljs.registerLanguage('html', xml)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('markdown', markdown)
hljs.registerLanguage('md', markdown)

const md: MarkdownIt = new MarkdownIt({
  html: true,
  linkify: true,
  breaks: false,
  highlight(code: string, lang: string): string {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value
      } catch {
        /* fallthrough */
      }
    }
    return md.utils.escapeHtml(code)
  },
})

/* ------------------------------ 标题锚点 / 目录 ------------------------------ */

export interface OutlineItem {
  /** 标题的 DOM id，可直接用于锚点跳转 */
  id: string
  text: string
  /** 标题层级 h1..h6 */
  level: number
  /** 相对最浅一级的缩进深度，用于目录缩进 */
  depth: number
}

/** 只取字段用得上的最小结构，避免依赖 markdown-it 内部类型路径 */
interface MdToken {
  type: string
  tag: string
  content: string
  children: MdToken[] | null
  attrSet(name: string, value: string): void
}

/** 把标题里的行内标记去掉，得到纯文本（用于生成 id 与目录文字） */
function inlineText(token?: MdToken): string {
  if (!token || token.type !== 'inline' || !token.children) return ''
  return token.children
    .filter((c) => c.type === 'text' || c.type === 'code_inline')
    .map((c) => c.content)
    .join('')
    .trim()
}

/** 中文/英文都能用的 slug：保留字母数字汉字，空格转连字符 */
function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}_-]/gu, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * 解析一次 md，同时产出 html（标题带 id）与目录树。
 * 两者出自同一批 token，保证目录里的 id 一定能跳到正文。
 */
export function renderMarkdownDoc(src: string): { html: string; outline: OutlineItem[] } {
  const env: Record<string, unknown> = {}
  const tokens = md.parse(src ?? '', env) as unknown as MdToken[]

  const outline: OutlineItem[] = []
  const used = new Map<string, number>()

  tokens.forEach((t, i) => {
    if (t.type !== 'heading_open') return
    const level = Number(t.tag.slice(1)) || 1
    const text = inlineText(tokens[i + 1])

    // 同篇文档里标题文字可能重复（比如多个「目录」），加序号去重
    const base = slugify(text) || `section-${outline.length + 1}`
    const seen = used.get(base) ?? 0
    used.set(base, seen + 1)
    const id = seen === 0 ? base : `${base}-${seen}`

    t.attrSet('id', id)
    outline.push({ id, text: text || `第 ${outline.length + 1} 节`, level, depth: 0 })
  })

  // 深度相对最浅标题归一化：只写 ## / ### 的笔记也从头缩进
  const minLevel = outline.reduce((min, o) => Math.min(min, o.level), 6)
  outline.forEach((o) => (o.depth = o.level - minLevel))

  return { html: md.renderer.render(tokens as never, md.options, env), outline }
}

export function renderMarkdown(src: string): string {
  return renderMarkdownDoc(src).html
}

export function renderInline(src: string): string {
  return md.renderInline(src ?? '')
}

/** 供其他地方复用同一份 highlight.js 语言注册 */
export { hljs }

