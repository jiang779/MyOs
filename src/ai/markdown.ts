/**
 * AI 输出的 Markdown → 安全 HTML
 * ------------------------------------------------------------
 * · markdown-it 关掉 raw HTML（html: false）
 * · 渲染前补全流式中未闭合的代码围栏，避免半截语法把后文吞掉
 * · 所有结果再过一遍 DOMPurify
 */
import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'
import { hljs } from '@/lib/md'

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
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

let hooked = false
function ensureHook() {
  if (hooked) return
  hooked = true
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank')
      node.setAttribute('rel', 'noopener noreferrer')
    }
  })
}

/** 流式输出时，代码围栏可能只有开头，临时补一个结尾用于渲染 */
function closeOpenFence(src: string): string {
  const fences = src.match(/^```/gm)
  if (fences && fences.length % 2 === 1) return src + '\n```'
  return src
}

const PURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'p',
    'br',
    'strong',
    'em',
    'del',
    'code',
    'pre',
    'blockquote',
    'ul',
    'ol',
    'li',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'hr',
    'a',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'span',
  ],
  ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'class'],
  FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'img'],
  ALLOW_DATA_ATTR: false,
}

export function renderAssistantMarkdown(source: string, streaming = false): string {
  const text = streaming ? closeOpenFence(source ?? '') : (source ?? '')
  const html = md.render(text)
  ensureHook()
  return DOMPurify.sanitize(html, PURIFY_CONFIG)
}
