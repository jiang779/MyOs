/**
 * 看板派生数据
 * ------------------------------------------------------------
 * 这里只做「读 + 算」，不缓存。组件用 computed 包一层，
 * 勾题后依赖 state 自动重算。
 */
import {
  interviewGroups,
  interviewQuestions,
  notes,
  type InterviewQuestion,
  type NoteDoc,
} from './data'
import { state } from './store'

export interface TypeStat {
  type: string
  fileName: string
  total: number
  done: number
  pct: number
  color: string
}

/** 每个题型固定一个色相，光谱条 / 类型列表共用，换排序也不会串色 */
const TYPE_COLOR: Record<string, string> = {
  javascript: '#7c6cff',
  'vue-ts': '#22d3ee',
  engineering: '#34d399',
  'echarts-gis': '#fbbf77',
  uniapp: '#fb7185',
  business: '#60a5fa',
  'ai-modern': '#a78bfa',
  'resume-deep': '#f472b6',
}

const FALLBACK_COLORS = ['#7c6cff', '#22d3ee', '#34d399', '#fbbf77', '#fb7185', '#60a5fa']

/** 题型固定色，星球 / 光谱条 / 列表共用 */
export function typeColor(fileName: string): string {
  return TYPE_COLOR[fileName] ?? FALLBACK_COLORS[0]
}

export function typeStats(): TypeStat[] {
  return interviewGroups
    .map((g, i) => {
      const done = g.questions.reduce((n, q) => n + (state.interviewDone[q.id] ? 1 : 0), 0)
      return {
        type: g.type,
        fileName: g.fileName,
        total: g.questions.length,
        done,
        pct: g.questions.length ? (done / g.questions.length) * 100 : 0,
        color: TYPE_COLOR[g.fileName] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
      }
    })
    .sort((a, b) => b.total - a.total || a.type.localeCompare(b.type, 'zh-Hans-CN'))
}

export function interviewTotals() {
  const total = interviewQuestions.length
  const done = interviewQuestions.reduce((n, q) => n + (state.interviewDone[q.id] ? 1 : 0), 0)
  return { total, done, pct: total ? (done / total) * 100 : 0 }
}

/* ------------------------------ 时间 ------------------------------ */

export function dayKey(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

const WEEK_CN = ['日', '一', '二', '三', '四', '五', '六']

/** 完成时间 → 每天几题 */
export function doneByDay(): Map<string, number> {
  const map = new Map<string, number>()
  for (const iso of Object.values(state.interviewDoneAt)) {
    if (!iso) continue
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) continue
    const k = dayKey(d)
    map.set(k, (map.get(k) ?? 0) + 1)
  }
  return map
}

/** 连续刷题天数：今天没刷不算断，从昨天往前数 */
export function streakDays(): number {
  const counts = doneByDay()
  const cursor = new Date()
  if (!counts.get(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1)
  let n = 0
  while (counts.get(dayKey(cursor))) {
    n++
    cursor.setDate(cursor.getDate() - 1)
    if (n > 3650) break
  }
  return n
}

export function todayDone(): number {
  return doneByDay().get(dayKey(new Date())) ?? 0
}

export interface DayBar {
  key: string
  label: string
  count: number
  today: boolean
}

/** 最近 7 天（含今天） */
export function last7Days(): DayBar[] {
  const counts = doneByDay()
  const out: DayBar[] = []
  const base = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(base)
    d.setDate(d.getDate() - i)
    const k = dayKey(d)
    out.push({
      key: k,
      label: `周${WEEK_CN[d.getDay()]}`,
      count: counts.get(k) ?? 0,
      today: i === 0,
    })
  }
  return out
}

/* ------------------------------ 今日 5 题 ------------------------------ */

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * 同一天抽到的题固定（日期做种子），只从「未完成」里抽；
 * 全部刷完后返回空数组，由 UI 给个收尾态。
 */
export function todayDrill(count = 5): InterviewQuestion[] {
  const pool = interviewQuestions.filter((q) => !state.interviewDone[q.id])
  if (!pool.length) return []
  const rng = mulberry32(Number(dayKey(new Date()).replace(/-/g, '')))
  const arr = pool.slice()
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr.slice(0, Math.min(count, arr.length))
}

/* ------------------------------ 笔记 ------------------------------ */

export function recentNotes(count = 3): NoteDoc[] {
  return [...notes]
    .sort((a, b) => b.week - a.week || b.slug.localeCompare(a.slug, 'zh-Hans-CN'))
    .slice(0, count)
}
