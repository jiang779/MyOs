<script setup lang="ts">
import EarthBackdrop from './EarthBackdrop.vue'
import Meteors from './Meteors.vue'
</script>

<template>
  <div class="ambient" aria-hidden="true">
    <div class="glow" />
    <Meteors />
    <EarthBackdrop />
    <div class="horizon" />
    <div class="grain" />
    <div class="vignette" />
  </div>
</template>

<style scoped>
/* 环境层：深空 + 流星 + 底部地球
   地球是静态的，动效只来自偶发流星与交互 */
.ambient {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
  background: var(--scene-base);
}

.glow {
  position: absolute;
  inset: -12%;
  background-image: var(--scene-glow);
  background-size: cover;
}

.horizon {
  position: absolute;
  left: -10%;
  right: -10%;
  bottom: -14%;
  height: 44%;
  background: radial-gradient(55% 100% at 50% 100%, var(--horizon-glow), transparent 70%);
}

.grain {
  position: absolute;
  inset: 0;
  opacity: var(--scene-grain);
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.86' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 160px 160px;
}

.vignette {
  position: absolute;
  inset: 0;
  background: var(--scene-vignette);
}
</style>
