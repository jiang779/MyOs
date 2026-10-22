<script setup lang="ts">
import { computed } from 'vue'
import type { ISourceOptions } from '@tsparticles/engine'
import { state } from '@/lib/store'

const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * 低噪科技粒子背景（tsParticles）
 * 缓慢漂移 + 近距弱连线，亮度压低，全屏置于底层（z-index:-1、pointer-events:none）。
 */
const options = computed<ISourceOptions>(() => {
  const rgb = state.theme === 'dark' ? '122,160,255' : '10,132,255'
  const color = `rgb(${rgb})`
  return {
    fullScreen: { enable: true, zIndex: -1 },
    detectRetina: true,
    fpsLimit: 60,
    particles: {
      number: { value: 90, density: { enable: true, width: 1920, height: 1080 } },
      paint: {
        color: { value: color },
        fill: { enable: true, opacity: 0.5 },
      },
      shape: { type: 'circle' },
      size: { value: { min: 1, max: 3 } },
      links: {
        enable: true,
        distance: 110,
        color,
        opacity: 0.13,
        width: 1,
      },
      move: {
        enable: !prefersReducedMotion,
        speed: 0.24,
        outModes: 'out',
      },
    },
  }
})
</script>

<template>
  <VueParticles id="tsparticles" :options="options" />
</template>