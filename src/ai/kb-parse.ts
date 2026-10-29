/** 从上传文件里抽取纯文本：txt / md / pdf / docx */
import type { Reference } from './types'

export function extOf(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? ''
}

export async function extractText(file: File): Promise<string> {
  const ext = extOf(file.name)
  if (ext === 'txt' || ext === 'md' || ext === 'markdown') return file.text()
  if (ext === 'pdf') return extractPdf(file)
  if (ext === 'docx') return extractDocx(file)
  throw new Error(`暂不支持 .${ext || '未知'}，请上传 txt / md / pdf / docx`)
}

async function extractPdf(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist')
  const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  pdfjs.GlobalWorkerOptions.workerSrc = worker

  const data = new Uint8Array(await file.arrayBuffer())
  const task = pdfjs.getDocument({ data })
  const doc = await task.promise
  const pages: string[] = []

  try {
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p)
      const content = await page.getTextContent()
      const text = content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
      if (text) pages.push(text)
    }
  } finally {
    await task.destroy()
  }

  return pages.join('\n\n')
}

async function extractDocx(file: File): Promise<string> {
  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(await file.arrayBuffer())
  const entry = zip.file('word/document.xml')
  if (!entry) throw new Error('docx 结构异常：缺少 word/document.xml')

  const xml = await entry.async('string')
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length) throw new Error('docx 解析失败')

  return Array.from(doc.getElementsByTagName('w:p'))
    .map((p) =>
      Array.from(p.getElementsByTagName('w:t'))
        .map((t) => t.textContent ?? '')
        .join('')
    )
    .join('\n')
}

/** 引用摘要：压平空白 + 截断 */
export function makeSnippet(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > max ? `${clean.slice(0, max)}…` : clean
}

export type { Reference }
