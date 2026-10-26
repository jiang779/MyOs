<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { state } from '@/lib/store'

/**
 * 流星雨
 * ------------------------------------------------------------
 * 持续不断、密度较高，从右上流向左下。只在深色主题出现。
 * 每颗就是一个 CSS 动画元素，跑完即删；没有常驻 rAF。
 */
interface Meteor {
  id: number
  x: number
  y: number
  len: number
  dur: number
  angle: number
  travel: number
}

const MAX = 14
const items = ref<Meteor[]>([])
const timers = new Set<number>()
let seq = 0
let loopTimer = 0

const reduce =
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)

function addTimer(fn: () => void, ms: number) {
  const id = window.setTimeout(() => {
    timers.delete(id)
    fn()
  }, ms)
  timers.add(id)
  return id
}

function spawn() {
  if (reduce || state.theme !== 'dark' || document.hidden) return
  if (items.value.length >= MAX) return

  const len = 220 + Math.random() * 180
  const m: Meteor = {
    id: ++seq,
    x: 30 + Math.random() * 72,
    y: 2 + Math.random() * 32,
    len,
    dur: 1.8 + Math.random() * 0.8,
    angle: 142 + Math.random() * 9,
    travel: len + 260 + Math.random() * 160,
  }
  items.value.push(m)
  addTimer(
    () => {
      items.value = items.value.filter((i) => i.id !== m.id)
    },
    (m.dur + 0.35) * 1000
  )
}

function loop() {
  spawn()
  loopTimer = window.setTimeout(loop, 180 + Math.random() * 300)
}

onMounted(() => {
  if (reduce) return
  loop()
})

onBeforeUnmount(() => {
  window.clearTimeout(loopTimer)
  for (const t of timers) window.clearTimeout(t)
  timers.clear()
})
</script>

<template>
  <div class="meteors" aria-hidden="true">
    <span
      v-for="m in items"
      :key="m.id"
      class="meteor"
      :style="{
        left: m.x + '%',
        top: m.y + '%',
        transform: `rotate(${m.angle}deg)`,
        '--dur': m.dur + 's',
        '--travel': m.travel + 'px',
      }"
    >
      <i class="streak" :style="{ width: m.len + 'px' }" />
    </span>
  </div>
</template>

<style scoped>
.meteors {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.meteor {
  position: absolute;
  transform-origin: left center;
  will-change: transform, opacity;
}

.streak {
  position: relative;
  display: block;
  height: 2px;
  border-radius: 1px;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(180, 208, 255, 0.22) 34%,
    rgba(214, 232, 255, 0.85) 78%,
    #ffffff 100%
  );
  animation: meteor-fly var(--dur, 1.6s) linear forwards;
}

.streak::after {
  content: '';
  position: absolute;
  right: -1px;
  top: 50%;
  width: 4px;
  height: 4px;
  margin-top: -2px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 14px 4px rgba(170, 205, 255, 0.95);
}

@keyframes meteor-fly {
  0% {
    transform: translateX(-60px);
    opacity: 0;
  }
  8% {
    opacity: 1;
  }
  75% {
    opacity: 0.95;
  }
  100% {
    transform: translateX(var(--travel, 520px));
    opacity: 0;
  }
}

/* 白天的主题没有流星 */
html[data-theme='light'] .meteors {
  display: none;
}

@media (prefers-reduced-motion: reduce) {
  .meteors {
    display: none;
  }
}
</style>
