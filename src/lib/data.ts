/**
 * 内容数据读取
 * ------------------------------------------------------------
 * 构建期用 import.meta.glob 把 data/ 下的 markdown 全部内联进来，
 * 所以「加一个 md 文件 = 加一条内容」，不需要动任何代码。
 */
import {
  firstParagraph,
  parseChecklist,
  parseFrontmatter,
  parseList,
  section,
  type Task,
} from './parse'
import configJson from '../../data/config.json'

/* ------------------------------ 类型 ------------------------------ */

export interface DayItem {
  /** Day1 / Day1-3 */
  label: string
  text: string
}

export interface WeekPlan {
  no: number
  stage: number
  stageTitle: string
  title: string
  focus: string
  status: 'todo' | 'active' | 'done'
  progress: number
  hours: number
  deliverable: string
  /** 每日安排：Day1 … Day6 */
  days: DayItem[]
  delivers: string[]
  body: string
  tasks: Task[]
}

export interface Stage {
  id: number
  title: string
  weeks: WeekPlan[]
}

export interface Project {
  slug: string
  title: string
  emoji: string
  status: string
  stack: string[]
  pitch: string
  missing: string
  progress: number
  period: string
  link: string
  body: string
}

export type VideoStatus = 'script' | 'record' | 'edit' | 'published'

export interface Video {
  id: string
  no: number
  title: string
  topic: string
  status: VideoStatus
  platform: string
  publishedAt: string
  views: number
  hook: string
  body: string
}

export interface SiteConfig {
  owner: string
  startDate: string
  videoMonthlyGoal: number
  streakGoal: number
  coachTips: string[]
}

export const config = configJson as SiteConfig

/* ------------------------------ 工具 ------------------------------ */

function str(v: unknown, fb = ''): string {
  return typeof v === 'string' && v.trim() ? v.trim() : fb
}
function num(v: unknown, fb = 0): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fb
}
function arr(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String)
  if (typeof v === 'string' && v) return [v]
  return []
}

const rawFiles = (modules: Record<string, unknown>): Record<string, string> => {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(modules)) out[k] = String(v)
  return out
}

/** 去掉行内标记，用于卡片上的纯文本展示 */
function stripMd(s: string): string {
  return s.replace(/\*\*/g, '').replace(/`/g, '').replace(/\s+/g, ' ').trim()
}

/**
 * 解析「每日安排」：`- Day1：xxx` 或 `- Day1-3：xxx`
 */
function parseDays(text: string): DayItem[] {
  const out: DayItem[] = []
  for (const line of text.split('\n')) {
    const m = /^\s*[-*]\s*(Day\s*\d+(?:\s*[-–~]\s*\d+)?)\s*[：:]\s*(.+?)\s*$/.exec(line)
    if (m) out.push({ label: m[1].replace(/\s+/g, ''), text: stripMd(m[2]) })
  }
  return out
}

/* ------------------------------ Agent 周计划 ------------------------------ */

const weekFiles = rawFiles(
  import.meta.glob('../../data/agent/week-*.md', { query: '?raw', import: 'default', eager: true })
)

export const weeks: WeekPlan[] = Object.entries(weekFiles)
  .map(([path, raw]) => {
    const { data, body } = parseFrontmatter(raw)
    const fileNo = num(/week-(\d+)/.exec(path)?.[1], 0)
    const tasks = parseChecklist(section(body, '本周三件事'))
    return {
      no: num(data.week, fileNo),
      stage: num(data.stage, 0),
      stageTitle: str(data.stageTitle, '未分组'),
      title: str(data.title, `第 ${fileNo} 周`),
      focus: str(data.focus, firstParagraph(body)),
      status: (str(data.status, 'todo') as WeekPlan['status']) ?? 'todo',
      progress: num(data.progress, 0),
      hours: num(data.hours, 0),
      deliverable: str(data.deliverable, section(body, '交付物').split('\n')[0]?.replace(/^[-*]\s*/, '') ?? ''),
      days: parseDays(section(body, '每日安排')),
      delivers: parseList(section(body, '交付物')),
      body,
      tasks,
    }
  })
  .sort((a, b) => a.no - b.no)

export const stages: Stage[] = Object.values(
  weeks.reduce<Record<number, Stage>>((acc, w) => {
    acc[w.stage] ??= { id: w.stage, title: w.stageTitle, weeks: [] }
    acc[w.stage].weeks.push(w)
    return acc
  }, {})
).sort((a, b) => a.id - b.id)

export function weekByNo(no: number): WeekPlan | undefined {
  return weeks.find((w) => w.no === no)
}

/** 当前周：按开始日期推算，找不到就退回第一个 active，再退回第一周 */
export function currentWeekNo(today = new Date()): number {
  const start = new Date(config.startDate + 'T00:00:00')
  const days = Math.floor((+startOfDay(today) - +start) / 86400000)
  const no = Math.floor(days / 7) + 1
  return Math.max(1, no)
}

export function currentWeek(): WeekPlan | undefined {
  return (
    weekByNo(currentWeekNo()) ??
    weeks.find((w) => w.status === 'active') ??
    weeks[0]
  )
}

/* ------------------------------ 学习笔记（按周归属） ------------------------------
 * 约定：文件放在 data/notes/week-XX/ 目录下，XX 就是周号。
 * 目录即归属 —— 不需要在文件里写任何字段，文件名就是笔记标题。
 * 想按时间排序，文件名用 2026-10-10-xxx.md 这种前缀即可（按文件名排序）。
 */

export interface NoteDoc {
  /** 所属周号，来自目录名 week-XX */
  week: number
  /** 路由标识：文件名（不含 .md） */
  slug: string
  /** 标题：frontmatter 里有 title 就用它，否则用文件名 */
  title: string
  /** 可选日期 */
  date: string
  /** 可选标签 */
  tags: string[]
  /** 原始 markdown，原样渲染 */
  body: string
}

const noteFiles = rawFiles(
  import.meta.glob('../../data/notes/week-*/**/*.md', {
    query: '?raw',
    import: 'default',
    eager: true,
  })
)

export const notes: NoteDoc[] = Object.entries(noteFiles)
  .map(([path, raw]) => {
    const week = num(/\/week-(\d+)\//.exec(path)?.[1], 0)
    const slug = path.split('/').pop()!.replace(/\.md$/i, '')
    const { data, body } = parseFrontmatter(raw)
    return {
      week,
      slug,
      title: str(data.title, slug),
      date: str(data.date, ''),
      tags: arr(data.tags),
      body,
    }
  })
  .filter((n) => n.week > 0 && n.slug && !n.slug.startsWith('.'))
  .sort((a, b) => a.slug.localeCompare(b.slug, 'zh-Hans-CN'))

export function notesForWeek(week: number): NoteDoc[] {
  return notes.filter((n) => n.week === week)
}

export function noteBySlug(week: number, slug: string): NoteDoc | undefined {
  return notes.find((n) => n.week === week && n.slug === slug)
}

/* ------------------------------ 项目 ------------------------------ */

const projectFiles = rawFiles(
  import.meta.glob('../../data/projects/*.md', { query: '?raw', import: 'default', eager: true })
)

export const projects: Project[] = Object.entries(projectFiles)
  .map(([path, raw]) => {
    const { data, body } = parseFrontmatter(raw)
    const slug = path.split('/').pop()!.replace('.md', '')
    return {
      slug,
      title: str(data.title, slug),
      emoji: str(data.emoji, '📦'),
      status: str(data.status, '进行中'),
      stack: arr(data.stack),
      pitch: str(data.pitch, firstParagraph(body)),
      missing: str(data.missing, '—'),
      progress: num(data.progress, 0),
      period: str(data.period, ''),
      link: str(data.link, ''),
      body,
    }
  })
  .sort((a, b) => b.progress - a.progress)

/* ------------------------------ 创作 ------------------------------ */

const videoFiles = rawFiles(
  import.meta.glob('../../data/creator/video-*.md', { query: '?raw', import: 'default', eager: true })
)

export const videos: Video[] = Object.entries(videoFiles)
  .map(([path, raw]) => {
    const { data, body } = parseFrontmatter(raw)
    const no = num(/video-(\d+)/.exec(path)?.[1], 0)
    return {
      id: `v${no}`,
      no,
      title: str(data.title, `第 ${no} 条`),
      topic: str(data.topic, '未分类'),
      status: (str(data.status, 'script') as VideoStatus) ?? 'script',
      platform: str(data.platform, '—'),
      publishedAt: str(data.publishedAt, ''),
      views: num(data.views, 0),
      hook: str(data.hook, firstParagraph(body)),
      body,
    }
  })
  .sort((a, b) => a.no - b.no)

export const VIDEO_STEPS: { key: VideoStatus; label: string }[] = [
  { key: 'script', label: '脚本' },
  { key: 'record', label: '录制' },
  { key: 'edit', label: '剪辑' },
  { key: 'published', label: '发布' },
]

/* ------------------------------ 日志（已下线） ------------------------------
 * 原来的「每日一句 / 踩坑本 / 点子本」与连续输出天数统计已废弃，
 * 数据文件归档在 data/_archive/log-module/。
 * 现在统一用上面的「学习笔记」（data/notes/week-XX/）。
 */

/* ------------------------------ 健康 · 饮食 ------------------------------ */

export interface Meal {
  /** 早餐 / 晚餐 */
  label: string
  /** 原始整句 */
  text: string
  /** 按顶层「+」拆开的分项（括号内的 + 不拆） */
  items: string[]
}

export interface DietDay {
  /** 周一 … 周日 */
  name: string
  /** 1=周一 … 7=周日 */
  week: number
  /** 工作日 / 居家 */
  kind: string
  meals: Meal[]
}

const WEEK_INDEX: Record<string, number> = { 周一: 1, 周二: 2, 周三: 3, 周四: 4, 周五: 5, 周六: 6, 周日: 7 }

/** 按顶层加号拆分，跳过【】（）[] 内的加号 */
function splitItems(text: string): string[] {
  const out: string[] = []
  let buf = ''
  let depth = 0
  for (const ch of text) {
    if ('【（(['.includes(ch)) depth++
    else if ('】）)]'.includes(ch)) depth = Math.max(0, depth - 1)
    if (ch === '+' && depth === 0) {
      out.push(buf.trim())
      buf = ''
    } else {
      buf += ch
    }
  }
  if (buf.trim()) out.push(buf.trim())
  return out.filter(Boolean)
}

const dietRaw = rawFiles(
  import.meta.glob('../../data/health/diet.md', { query: '?raw', import: 'default', eager: true })
)

const dietMeta = parseFrontmatter(Object.values(dietRaw)[0] ?? '')

export const dietNote = str(dietMeta.data.note, '')

export const diet: DietDay[] = dietMeta.body
  .split(/\n(?=##\s)/)
  .filter((p) => p.trimStart().startsWith('## '))
  .map((part) => {
    const lines = part.split('\n')
    const head = lines[0].replace(/^##\s*/, '').trim()
    const [name, kind = ''] = head.split(/[·•|｜/\s]+/).map((s) => s.trim())
    const meals: Meal[] = []
    for (const line of lines.slice(1)) {
      const m = /^\s*[-*]?\s*(早餐|午餐|晚餐|加餐|夜宵)\s*[：:]\s*(.+?)\s*$/.exec(line)
      if (m) meals.push({ label: m[1], text: m[2], items: splitItems(m[2]) })
    }
    return { name, week: WEEK_INDEX[name] ?? 0, kind, meals }
  })
  .filter((d) => d.week > 0)
  .sort((a, b) => a.week - b.week)

export function dietDayByWeek(week: number): DietDay | undefined {
  return diet.find((d) => d.week === week)
}

/** JS getDay(): 0=周日 … 6=周六 → 1=周一 … 7=周日 */
export function isoWeekday(d: Date): number {
  return d.getDay() === 0 ? 7 : d.getDay()
}

export function dietForDate(d: Date): DietDay | undefined {
  return dietDayByWeek(isoWeekday(d))
}

export function mealOf(day: DietDay | undefined, label: string): Meal | undefined {
  return day?.meals.find((m) => m.label === label)
}

/** 今天 / 明天（含各自对应的星期几菜谱） */
export function dietTodayTomorrow(today = new Date()): {
  today: { date: Date; label: string; day?: DietDay }
  tomorrow: { date: Date; label: string; day?: DietDay }
} {
  const t = startOfDay(today)
  const m = startOfDay(today)
  m.setDate(m.getDate() + 1)
  return {
    today: { date: t, label: toISODate(t), day: dietForDate(t) },
    tomorrow: { date: m, label: toISODate(m), day: dietForDate(m) },
  }
}

/* ------------------------------ 派生指标 ------------------------------ */

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function toISODate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export interface VideoSummary {
  published: number
  goal: number
  making: number
  next?: Video
  monthPublished: number
}

export function videoSummary(getStatus: (v: Video) => VideoStatus, today = new Date()): VideoSummary {
  const month = toISODate(today).slice(0, 7)
  const list = videos.map((v) => ({ ...v, status: getStatus(v) }))
  const publishedList = list.filter((v) => v.status === 'published')
  return {
    published: publishedList.length,
    goal: config.videoMonthlyGoal,
    making: list.filter((v) => v.status !== 'published').length,
    next: list.find((v) => v.status !== 'published'),
    monthPublished: publishedList.filter((v) => v.publishedAt.startsWith(month)).length,
  }
}

/** 今天的教练提示（按天轮换，写死在 config 里，以后交给 AI 生成） */
export function coachTip(today = new Date()): string {
  const tips = config.coachTips?.length ? config.coachTips : ['今天只做一件事，做完再说。']
  const dayIndex = Math.floor(+startOfDay(today) / 86400000)
  return tips[dayIndex % tips.length]
}

export function greeting(today = new Date()): string {
  const h = today.getHours()
  if (h < 5) return '夜深了'
  if (h < 11) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
}

export function formatDateCN(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${y} 年 ${+m} 月 ${+d} 日`
}
