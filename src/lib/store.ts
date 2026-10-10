/**
 * 界面状态 + 用户操作数据
 * ------------------------------------------------------------
 * 数据哲学：状态在浏览器。全部落在 localStorage，换机器靠 Git 存 md。
 */
import { reactive, watch } from 'vue'

const LS_KEY = 'myos.state.v1'

export type WeekStatus = 'todo' | 'active' | 'done'
export type VideoStatus = 'script' | 'record' | 'edit' | 'published'

interface AppState {
  theme: 'light' | 'dark'
  /** 周任务的勾选：`w1:0` → true */
  checks: Record<string, boolean>
  /** 周状态覆盖（md 里的是初值） */
  weekStatus: Record<string, WeekStatus>
  /** 视频状态覆盖 */
  videoStatus: Record<string, VideoStatus>
  /** 侧栏是否展开（桌面） */
  sidebarOpen: boolean
}

function defaults(): AppState {
  return {
    theme: 'light',
    checks: {},
    weekStatus: {},
    videoStatus: {},
    sidebarOpen: false,
  }
}

function load(): AppState {
  const base = defaults()
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return base
    const saved = JSON.parse(raw) as Partial<AppState>
    return { ...base, ...saved }
  } catch {
    return base
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
  state.theme = state.theme === 'light' ? 'dark' : 'light'
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

export function videoStatus(id: string, seed: VideoStatus): VideoStatus {
  return state.videoStatus[id] ?? seed
}

export function setVideoStatus(id: string, s: VideoStatus) {
  state.videoStatus[id] = s
}

export function resetAll() {
  const t = state.theme
  Object.assign(state, defaults(), { theme: t })
}
