/**
 * 不健康饮食记录 · 统计
 * ------------------------------------------------------------
 * 纯函数，不碰 DOM、不碰 storage：以后要换成云端存储，这里不用改。
 */
import type { JunkRecord } from './store'

export function isoDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** 本周一 00:00（与周计划的周口径一致，周一为一周之始） */
export function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
}

export interface JunkStats {
  total: number
  /** 本月次数 */
  month: number
  /** 本周次数 */
  week: number
  /** 距上一次破功过了几天；从没记录过 → null */
  cleanDays: number | null
  /** 最近一次破功的日期 */
  lastDate: string | null
  /** 最常吃的（按食物文本归并） */
  topFoods: { food: string; count: number }[]
  /** 近 6 个月，按月次数 */
  months: { key: string; label: string; count: number }[]
  /** 场景分布 */
  scenes: { scene: string; count: number }[]
}

export function junkStats(records: JunkRecord[], today = new Date()): JunkStats {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const todayKey = isoDate(t)
  const weekKey = isoDate(startOfWeek(t))
  const monthKey = todayKey.slice(0, 7)

  const foodCount = new Map<string, number>()
  const sceneCount = new Map<string, number>()

  for (const r of records) {
    const k = r.food.replace(/\s+/g, '')
    if (k) foodCount.set(k, (foodCount.get(k) ?? 0) + 1)
    if (r.scene) sceneCount.set(r.scene, (sceneCount.get(r.scene) ?? 0) + 1)
  }

  const lastDate = records.reduce<string | null>(
    (max, r) => (max === null || r.date > max ? r.date : max),
    null
  )

  // 未来日期（手选错日期）不算负数天
  const cleanDays = lastDate
    ? Math.max(0, Math.round((t.getTime() - new Date(`${lastDate}T00:00:00`).getTime()) / 86400000))
    : null

  const months: JunkStats['months'] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(t.getFullYear(), t.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    months.push({ key, label: `${d.getMonth() + 1}月`, count: records.filter((r) => r.date.startsWith(key)).length })
  }

  return {
    total: records.length,
    month: records.filter((r) => r.date.startsWith(monthKey)).length,
    week: records.filter((r) => r.date >= weekKey && r.date <= todayKey).length,
    cleanDays,
    lastDate,
    topFoods: [...foodCount.entries()]
      .map(([food, count]) => ({ food, count }))
      .sort((a, b) => b.count - a.count || (a.food < b.food ? -1 : 1))
      .slice(0, 5),
    months,
    scenes: [...sceneCount.entries()]
      .map(([scene, count]) => ({ scene, count }))
      .sort((a, b) => b.count - a.count),
  }
}

export interface JunkGroup {
  key: string
  label: string
  items: JunkRecord[]
}

/** 按月分组（新的在前），组内按日期倒序 */
export function groupByMonth(records: JunkRecord[]): JunkGroup[] {
  const map = new Map<string, JunkRecord[]>()
  for (const r of records) {
    const key = r.date.slice(0, 7)
    const list = map.get(key)
    if (list) list.push(r)
    else map.set(key, [r])
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, items]) => {
      const [y, m] = key.split('-')
      return { key, label: `${y} 年 ${Number(m)} 月`, items }
    })
}

/** 中文星期，用于明细里显示「周五」 */
export function weekdayCN(date: string): string {
  const d = new Date(`${date}T00:00:00`)
  return Number.isNaN(d.getTime()) ? '' : `周${'日一二三四五六'[d.getDay()]}`
}
