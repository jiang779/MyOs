<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'toggle'): void }>()

const canvasEl = ref<HTMLCanvasElement | null>(null)
const hovering = ref(false)

interface Particle {
  theta: number
  phi: number
  seed: number
  size: number
}

const particles: Particle[] = []
const N = 1200

let ctx: CanvasRenderingContext2D | null = null
let cssW = 0
let cssH = 0
let dpr = 1
let raf = 0
let last = 0
let time = 0
let hover = 0
let burst = 0
let running = false

const reduce =
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)

function build() {
  if (particles.length) return
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2
    particles.push({
      theta: i * golden + (Math.random() - 0.5) * 0.3,
      phi: Math.asin(Math.max(-1, Math.min(1, y))) + (Math.random() - 0.5) * 0.1,
      seed: Math.random(),
      size: 0.6 + Math.random() * 1.2,
    })
  }
}

function resize() {
  const el = canvasEl.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  cssW = Math.max(1, rect.width)
  cssH = Math.max(1, rect.height)
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  el.width = Math.round(cssW * dpr)
  el.height = Math.round(cssH * dpr)
  ctx = el.getContext('2d')
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  if (reduce) draw(performance.now())
}

function draw(now: number) {
  if (!running && !reduce) return
  raf = requestAnimationFrame(draw)

  if (!ctx || document.hidden) return

  const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016
  last = now

  const dark = document.documentElement.dataset.theme !== 'light'
  const target = hovering.value ? 1 : 0
  hover += (target - hover) * (1 - Math.exp(-dt * 9))
  burst = Math.max(0, burst - dt * 1.8)
  if (!reduce) time += dt * (1 + hover * 1.6)

  const cx = cssW / 2
  const cy = cssH / 2
  const base = Math.min(cssW, cssH) * 0.33
  const rot = time * (0.16 + hover * 0.5)
  const tilt = 0.42
  const ct = Math.cos(tilt)
  const st = Math.sin(tilt)

  ctx.clearRect(0, 0, cssW, cssH)

  // 底下垫一层柔和的暗/亮圆，避免直接浮在复杂背景上
  const pad = ctx.createRadialGradient(cx, cy, base * 0.1, cx, cy, Math.min(cssW, cssH) * 0.5)
  if (dark) {
    pad.addColorStop(0, 'rgba(6, 8, 14, 0.45)')
    pad.addColorStop(0.55, 'rgba(6, 8, 14, 0.12)')
    pad.addColorStop(1, 'rgba(6, 8, 14, 0)')
  } else {
    pad.addColorStop(0, 'rgba(246, 248, 252, 0.5)')
    pad.addColorStop(0.55, 'rgba(246, 248, 252, 0.14)')
    pad.addColorStop(1, 'rgba(246, 248, 252, 0)')
  }
  ctx.fillStyle = pad
  ctx.fillRect(0, 0, cssW, cssH)

  // 背后的柔光
  const glow = ctx.createRadialGradient(cx, cy, base * 0.1, cx, cy, base * 1.9)
  if (dark) {
    glow.addColorStop(0, `rgba(150, 190, 255, ${0.08 + hover * 0.12 + burst * 0.1})`)
    glow.addColorStop(1, 'rgba(150, 190, 255, 0)')
  } else {
    glow.addColorStop(0, `rgba(70, 90, 150, ${0.07 + hover * 0.07 + burst * 0.06})`)
    glow.addColorStop(1, 'rgba(70, 90, 150, 0)')
  }
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, cssW, cssH)

  for (const p of particles) {
    const lon = p.theta + rot
    const cosPhi = Math.cos(p.phi)

    const x = Math.cos(lon) * cosPhi
    const y0 = Math.sin(p.phi)
    const z0 = Math.sin(lon) * cosPhi

    // 绕 X 轴倾斜
    const y = y0 * ct - z0 * st
    const z = y0 * st + z0 * ct

    const persp = 1 / (1 + z * 0.34)

    // 悬浮时的不规则叶瓣：横向抻开、纵向压扁，形成团簇而不是圆球
    const lobe =
      1 +
      hover *
        (0.2 * Math.sin(3 * lon + time * 1.5 + p.seed * 2.1) +
          0.08 * Math.sin(5 * lon - time * 1.1 + p.seed * 3.3) +
          0.04 * Math.sin(2.4 * p.phi + time * 1.9 + p.seed * 4.1))

    const radius =
      base * (1 + hover * 0.02 + burst * 0.18) * lobe * (0.97 + p.seed * 0.06)

    const sx = cx + x * radius * persp * (1 + hover * 0.14)
    const sy = cy + y * radius * persp * (1 - hover * 0.08)

    const depth = (z + 1) / 2
    let alpha = (0.32 + depth * 0.68) * (0.55 + hover * 0.35 + burst * 0.15)
    alpha *= 0.9 + 0.1 * Math.sin(time * 2 + p.seed * 12)
    alpha = Math.max(0, Math.min(1, alpha))

    const size = p.size * (0.7 + depth * 0.6) * (1 + hover * 0.2)

    ctx.fillStyle = dark
      ? `rgba(235, 242, 255, ${alpha})`
      : `rgba(26, 32, 48, ${Math.min(1, alpha * 1.25)})`
    ctx.fillRect(sx, sy, size, size)
  }
}

function start() {
  if (running) return
  running = true
  last = 0
  raf = requestAnimationFrame(draw)
}

function stop() {
  running = false
  if (raf) cancelAnimationFrame(raf)
  raf = 0
}

function onVisibility() {
  if (document.hidden) stop()
  else {
    resize()
    start()
  }
}

function onEnter() {
  hovering.value = true
  if (reduce) draw(performance.now())
}

function onLeave() {
  hovering.value = false
  if (reduce) draw(performance.now())
}

function onClick() {
  burst = 1
  emit('toggle')
}

watch(
  () => props.open,
  (open) => {
    if (open) burst = Math.max(burst, 0.5)
  }
)

onMounted(() => {
  build()
  resize()
  if (reduce) draw(performance.now())
  else start()
  window.addEventListener('resize', resize, { passive: true })
  document.addEventListener('visibilitychange', onVisibility)
})

onBeforeUnmount(() => {
  stop()
  window.removeEventListener('resize', resize)
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<template>
  <button
    class="ai-orb"
    type="button"
    :aria-expanded="props.open"
    aria-label="打开 AI 助手"
    @click="onClick"
    @pointerenter="onEnter"
    @pointerleave="onLeave"
  >
    <canvas ref="canvasEl" aria-hidden="true" />
  </button>
</template>

<style scoped>
.ai-orb {
  position: fixed;
  right: 22px;
  bottom: 22px;
  z-index: 240;
  width: 96px;
  height: 96px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  overflow: hidden;
  transition: transform 0.36s var(--ease-out), filter 0.36s var(--ease-out);
  -webkit-tap-highlight-color: transparent;
}

.ai-orb::before {
  content: '';
  position: absolute;
  inset: 8%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(140, 175, 255, 0.1), transparent 70%);
  pointer-events: none;
}

.ai-orb:hover {
  filter: brightness(1.08);
}

.ai-orb:active {
  filter: brightness(1.15);
}

.ai-orb canvas {
  width: 100%;
  height: 100%;
  display: block;
  border-radius: 50%;
}

@media (max-width: 900px) {
  .ai-orb {
    right: 14px;
    bottom: calc(var(--tabbar-h) + 14px + env(safe-area-inset-bottom));
    width: 78px;
    height: 78px;
  }
}
</style>
