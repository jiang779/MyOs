/**
 * 界面状态 + 用户操作数据
 * ------------------------------------------------------------
 * 数据哲学：状态在浏览器。全部落在 localStorage，换机器靠 Git 存 md。
 */
import { reactive, watch } from 'vue'
import progressJson from '../../data/interview-progress.json'

const LS_KEY = 'myos.state.v1'

/**
 * 面试题完成进度的「项目内兜底」：data/interview-progress.json 随 git 同步，
 * 在 localStorage 被清、换设备、首次打开时用它恢复进度。勾选后仍以 localStorage 为准。
 */
const progressSeed = (() => {
  const out: Record<string, boolean> = {}
  const done = (progressJson as { done?: Record<string, unknown> }).done
  if (done && typeof done === 'object') {
    for (const [id, v] of Object.entries(done)) {
      if (v === true) out[id] = true
    }
  }
  return out
})()

export type WeekStatus = 'todo' | 'active' | 'done'

/** 一条「不健康饮食」记录 */
export interface JunkRecord {
  id: string
  /** 吃的日期 YYYY-MM-DD */
  date: string
  /** 吃了什么 */
  food: string
  /** 可选场景：零食 / 加餐 / 夜宵 / 聚餐 / 甜饮 */
  scene?: string
  /** 写入时间（ISO），用于备份比对与同日记内排序 */
  createdAt: string
}

/** 可选的场景标签 */
export const JUNK_SCENES = ['零食', '加餐', '夜宵', '聚餐', '甜饮'] as const

interface AppState {
  theme: 'light' | 'dark'
  /** 周任务的勾选：`w1:0` → true */
  checks: Record<string, boolean>
  /** 周状态覆盖（md 里的是初值） */
  weekStatus: Record<string, WeekStatus>
  /** 面试题完成状态：题目 id → 已完成 */
  interviewDone: Record<string, boolean>
  /** 面试题完成时间：题目 id → ISO 时间（用于连续天数 / 近 7 日） */
  interviewDoneAt: Record<string, string>
  /** 不健康饮食记录（按日期倒序） */
  junkRecords: JunkRecord[]
  /** 最近一次导出备份的时间（ISO），空串 = 从未备份 */
  junkBackupAt: string
}

function defaults(): AppState {
  return {
    theme: 'light',
    checks: {},
    weekStatus: {},
    interviewDone: { ...progressSeed },
    interviewDoneAt: {},
    junkRecords: [],
    junkBackupAt: '',
  }
}

function load(): AppState {
  const base = defaults()
  try {
    const raw = localStorage.getItem(LS_KEY)
    const saved = raw ? (JSON.parse(raw) as Partial<AppState>) : {}
    // 完成进度以项目 json 为底，localStorage 里的增量覆盖上去；
    // 即使 localStorage 被清或只剩旧数据，也能从项目 json 兜底恢复。
    return {
      ...base,
      ...saved,
      interviewDone: { ...base.interviewDone, ...(saved.interviewDone ?? {}) },
      interviewDoneAt: { ...(saved.interviewDoneAt ?? {}) },
    }
  } catch {
    return { ...base }
  }
}

export const state = reactive<AppState>(load())

/** 首次进入跟随系统深色偏好 */
if (!localStorage.getItem(LS_KEY) && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
  state.theme = 'dark'
}

function applyTheme() {
  document.documentElement.dataset.theme = state.theme
  document.documentElement.style.colorScheme = state.theme
}
applyTheme()

watch(
  () => state.theme,
  () => applyTheme()
)

watch(
  state,
  (v) => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(v))
    } catch {
      /* 隐私模式下静默失败 */
    }
  },
  { deep: true }
)

/* ------------------------------ 交互 ------------------------------ */

export function toggleTheme() {
  const next: 'light' | 'dark' = state.theme === 'light' ? 'dark' : 'light'
  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => { finished: Promise<void> }
  }
  // 有 View Transition 就用整页交叉淡入，避免主题色硬切
  if (typeof doc.startViewTransition === 'function') {
    doc.startViewTransition(() => {
      state.theme = next
    })
  } else {
    state.theme = next
  }
}

export function taskKey(week: number, index: number) {
  return `w${week}:${index}`
}

export function isChecked(week: number, index: number, seed = false) {
  const k = taskKey(week, index)
  return k in state.checks ? state.checks[k] : seed
}

export function toggleTask(week: number, index: number, seed = false) {
  const k = taskKey(week, index)
  state.checks[k] = !isChecked(week, index, seed)
}

export function weekStatus(week: number, seed: WeekStatus): WeekStatus {
  return state.weekStatus[String(week)] ?? seed
}

export function cycleWeekStatus(week: number, seed: WeekStatus): WeekStatus {
  const order: WeekStatus[] = ['todo', 'active', 'done']
  const cur = weekStatus(week, seed)
  const next = order[(order.indexOf(cur) + 1) % order.length]
  state.weekStatus[String(week)] = next
  return next
}

/* ------------------------------ 面试题完成状态 ------------------------------ */

export function isInterviewDone(id: string) {
  return !!state.interviewDone[id]
}

export function toggleInterviewDone(id: string) {
  const next = !isInterviewDone(id)
  state.interviewDone[id] = next
  if (next) {
    state.interviewDoneAt[id] = new Date().toISOString()
  } else {
    delete state.interviewDoneAt[id]
  }
}

/** 某题完成时间（ISO），没有记录返回空串 */
export function interviewDoneAt(id: string): string {
  return state.interviewDoneAt[id] ?? ''
}

/**
 * 从外部 JSON 导入面试题完成进度（按题目 id 合并，只增不改）。
 * 返回新增的完成题数。外部文件不可信，这里逐项校验。
 * doneAt 可选：老备份里没有，导入后按「导入时刻」补一个近似时间。
 */
export function importInterviewDone(rows: unknown, rowsAt?: unknown): number {
  if (!rows || typeof rows !== 'object') return 0
  const rec = rows as Record<string, unknown>
  const at = rowsAt && typeof rowsAt === 'object' ? (rowsAt as Record<string, unknown>) : null
  const now = new Date().toISOString()
  let added = 0
  for (const [id, v] of Object.entries(rec)) {
    if (v === true && typeof id === 'string' && id && !state.interviewDone[id]) {
      state.interviewDone[id] = true
      const raw = at?.[id]
      state.interviewDoneAt[id] = typeof raw === 'string' && raw ? raw : now
      added++
    }
  }
  return added
}

/* ------------------------------ 不健康饮食记录 ------------------------------ */

function sortJunk(rows: JunkRecord[]) {
  rows.sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : a.createdAt < b.createdAt ? 1 : -1
  )
}

export function addJunkRecord(input: { date: string; food: string; scene?: string }) {
  const rec: JunkRecord = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    date: input.date,
    food: input.food.trim(),
    scene: input.scene || undefined,
    createdAt: new Date().toISOString(),
  }
  state.junkRecords.unshift(rec)
  sortJunk(state.junkRecords)
  return rec
}

export function removeJunkRecord(id: string) {
  const i = state.junkRecords.findIndex((r) => r.id === id)
  if (i >= 0) state.junkRecords.splice(i, 1)
}

/**
 * 合并导入的记录（按 id 去重，不会覆盖已有数据）。
 * 返回新增条数。外部文件不可信，这里逐条校验字段。
 */
export function importJunkRecords(rows: unknown): number {
  if (!Array.isArray(rows)) return 0
  const seen = new Set(state.junkRecords.map((r) => r.id))
  let added = 0
  for (const raw of rows) {
    if (!raw || typeof raw !== 'object') continue
    const r = raw as Partial<JunkRecord>
    const date = typeof r.date === 'string' ? r.date.trim() : ''
    const food = typeof r.food === 'string' ? r.food.trim() : ''
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !food) continue
    const id = typeof r.id === 'string' && r.id ? r.id : `${date}-${food}-${added}`
    if (seen.has(id)) continue
    state.junkRecords.push({
      id,
      date,
      food: food.slice(0, 200),
      scene: typeof r.scene === 'string' ? r.scene : undefined,
      createdAt: typeof r.createdAt === 'string' ? r.createdAt : '',
    })
    seen.add(id)
    added++
  }
  sortJunk(state.junkRecords)
  return added
}

export function markJunkBackup() {
  state.junkBackupAt = new Date().toISOString()
}

export function resetAll() {
  const t = state.theme
  // 饮食记录是长期积累、不可再生的数据，重置界面状态时不动它
  const keepJunk = state.junkRecords.slice()
  const keepBackup = state.junkBackupAt
  Object.assign(state, defaults(), { theme: t, junkRecords: keepJunk, junkBackupAt: keepBackup })
}
