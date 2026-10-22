<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { state } from '@/lib/store'

/**
 * 低噪科技粒子背景（自包含，无第三方依赖）
 * 缓慢漂移 + 近距弱连线，亮度压低，用 requestAnimationFrame 驱动。
 */
const canvas = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let raf = 0
let width = 0
let height = 0
let reduced = false
const dpr = Math.min(window.devicePixelRatio || 1, 2)

type Dot = { x: number; y: number; vx: number; vy: number; r: number }
let dots: Dot[] = []

function populate() {
  const count = Math.min(90, Math.round((width * height) / 17000))
  dots = Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.24,
    vy: (Math.random() - 0.5) * 0.24,
    r: Math.random() * 1.3 + 0.5,
  }))
}

function color() {
  return state.theme === 'dark' ? '122,160,255' : '10,132,255'
}

function drift() {
  for (const p of dots) {
    p.x += p.vx
    p.y += p.vy
    if (p.x < -12) p.x = width + 12
    else if (p.x > width + 12) p.x = -12
    if (p.y < -12) p.y = height + 12
    else if (p.y > height + 12) p.y = -12
  }
}

function draw() {
  if (!ctx) return
  ctx.clearRect(0, 0, width, height)
  const c = color()
  for (const p of dots) {
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${c},0.5)`
    ctx.fill()
  }

  const link = 110
  ctx.lineWidth = 1
  for (let i = 0; i < dots.length; i++) {
    const a = dots[i]
    for (let j = i + 1; j < dots.length; j++) {
      const b = dots[j]
      const dx = a.x - b.x
      const dy = a.y - b.y
      const d2 = dx * dx + dy * dy
      if (d2 < link * link) {
        const alpha = (1 - Math.sqrt(d2) / link) * 0.13
        ctx.strokeStyle = `rgba(${c},${alpha})`
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
      }
    }
  }
}

function resize() {
  const el = canvas.value
  if (!el) return
  width = window.innerWidth
  height = window.innerHeight
  el.width = width * dpr
  el.height = height * dpr
  el.style.width = width + 'px'
  el.style.height = height + 'px'
  ctx = el.getContext('2d')
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
  populate()
  if (reduced) draw()
}

function loop() {
  drift()
  draw()
  raf = requestAnimationFrame(loop)
}

onMounted(() => {
  reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  resize()
  if (!reduced) raf = requestAnimationFrame(loop)
  window.addEventListener('resize', resize)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('resize', resize)
})

watch(
  () => state.theme,
  () => {
    if (reduced) draw()
  }
)
</script>

<template>
  <canvas ref="canvas" class="particle-layer" aria-hidden="true" />
</template>

<style scoped>
.particle-layer {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
}
</style>