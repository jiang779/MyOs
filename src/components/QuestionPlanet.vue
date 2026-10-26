<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { interviewTotals } from '@/lib/dashboard'
import { state } from '@/lib/store'
import type { PlanetApi } from '@/three/planet'

const props = withDefaults(defineProps<{ compact?: boolean }>(), { compact: false })

const router = useRouter()
const canvasEl = ref<HTMLCanvasElement | null>(null)
const ready = ref(false)
const tip = ref<{ text: string } | null>(null)
const totals = computed(() => interviewTotals())

let api: PlanetApi | null = null
let seen = new Set<string>()

function doneSet(): Set<string> {
  const set = new Set<string>()
  for (const [id, v] of Object.entries(state.interviewDone)) if (v) set.add(id)
  return set
}

function sync(flashNew = false) {
  const next = doneSet()
  if (flashNew && api) {
    for (const id of next) if (!seen.has(id)) api.flash(id)
  }
  seen = next
  api?.setProgress(next)
}

watch(
  () => state.interviewDone,
  () => sync(true),
  { deep: true }
)

watch(
  () => state.theme,
  (t) => api?.setTheme(t)
)

onMounted(async () => {
  if (!canvasEl.value) return
  try {
    const { createPlanet } = await import('@/three/planet')
    api = createPlanet(canvasEl.value, {
      compact: props.compact,
      onHover: (info) => {
        tip.value = info ? { text: `${info.type} · ${info.done}/${info.total}` } : null
      },
      onPick: (fileName) => router.push({ path: '/interview', query: { type: fileName } }),
    })
    sync()
    api.setTheme(state.theme)
    ready.value = true
  } catch (err) {
    console.warn('[planet] 初始化失败', err)
  }
})

onBeforeUnmount(() => {
  api?.dispose()
  api = null
})
</script>

<template>
  <div class="planet" :class="{ compact, ready }">
    <div class="stage">
      <canvas ref="canvasEl" class="planet-canvas" />
    </div>

    <template v-if="!compact">
      <p class="cap" :class="{ live: !!tip }">
        <span class="dot" />
        <span class="cap-text truncate">{{ tip ? tip.text : '拖拽旋转 · 点击进入题型' }}</span>
      </p>
      <p class="cap-sub num">{{ totals.done }}/{{ totals.total }} 已点亮</p>
    </template>
  </div>
</template>

<style scoped>
.planet {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 100%;
}

.stage {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
}

.stage::before {
  content: '';
  position: absolute;
  inset: -12%;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 48%, var(--planet-halo), transparent 68%);
  pointer-events: none;
}

.planet-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  opacity: 0;
  transition: opacity 0.7s var(--ease-out);
  touch-action: none;
}

.planet.ready .planet-canvas {
  opacity: 1;
}

.cap {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  width: 100%;
  font-size: 10px;
  color: var(--text-3);
  white-space: nowrap;
  min-height: 14px;
}

.cap.live {
  color: var(--text-2);
}

.cap-text {
  min-width: 0;
}

.cap .dot {
  flex: none;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--accent-2);
  box-shadow: 0 0 6px var(--accent-2);
}

.cap-sub {
  font-size: 9.5px;
  color: var(--text-3);
  opacity: 0.75;
}

.planet.compact {
  width: 100%;
}

.planet.compact .planet-canvas {
  pointer-events: none;
}
</style>
