import { reactive, watch } from 'vue'
import { assistantConfig } from './config'

export interface AssistantSettings {
  model: string
  temperature: number
  maxTokens: number
  knowledgeBaseIds: string[]
}

const KEY = 'myos.ai.settings.v1'
const DEFAULT_MODEL = import.meta.env.VITE_ARK_MODEL ?? ''

function clamp(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, value))
}

function defaults(): AssistantSettings {
  return {
    model: DEFAULT_MODEL,
    temperature: assistantConfig.temperature ?? 0.6,
    maxTokens: 2048,
    knowledgeBaseIds: [],
  }
}

function load(): AssistantSettings {
  const base = defaults()
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return base
    const v = JSON.parse(raw) as Partial<AssistantSettings>
    return {
      model: typeof v.model === 'string' ? v.model : base.model,
      temperature: clamp(Number(v.temperature), 0, 2, base.temperature),
      maxTokens: Math.round(clamp(Number(v.maxTokens), 256, 8192, base.maxTokens)),
      knowledgeBaseIds: Array.isArray(v.knowledgeBaseIds)
        ? v.knowledgeBaseIds.filter((x): x is string => typeof x === 'string')
        : [],
    }
  } catch {
    return base
  }
}

export const settings = reactive<AssistantSettings>(load())

watch(
  settings,
  () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings))
    } catch {
      /* ignore */
    }
  },
  { deep: true }
)

export const MODEL_SUGGESTIONS = [
  ...new Set(
    [
      DEFAULT_MODEL,
      'deepseek-v4-pro-ga-260813',
      'deepseek-v3-250324',
      'doubao-seed-1-6-250615',
    ].filter(Boolean)
  ),
]
