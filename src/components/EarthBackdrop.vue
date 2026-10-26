<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { state } from '@/lib/store'
import type { EarthApi } from '@/three/earth'

const canvasEl = ref<HTMLCanvasElement | null>(null)
const ready = ref(false)
let api: EarthApi | null = null

onMounted(async () => {
  if (!canvasEl.value) return
  try {
    const { createEarth } = await import('@/three/earth')
    api = createEarth(canvasEl.value, {
      onReady: () => {
        ready.value = true
      },
    })
    api.setTheme(state.theme)
  } catch (err) {
    console.warn('[earth] 初始化失败', err)
  }
})

watch(
  () => state.theme,
  (t) => api?.setTheme(t)
)

onBeforeUnmount(() => {
  api?.dispose()
  api = null
})
</script>

<template>
  <div class="earth" :class="{ ready }">
    <canvas ref="canvasEl" />
  </div>
</template>

<style scoped>
.earth {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.earth canvas {
  width: 100%;
  height: 100%;
  display: block;
  opacity: 0;
  transition: opacity 1.1s var(--ease-out);
}

.earth.ready canvas {
  opacity: 1;
}
</style>
