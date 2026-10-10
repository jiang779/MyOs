<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{ value: number; size?: number; stroke?: number; tone?: 'blue' | 'fire' | 'green' | 'violet' }>(),
  { size: 128, stroke: 10, tone: 'blue' }
)

const R = 52
const C = 2 * Math.PI * R
const pct = computed(() => Math.min(100, Math.max(0, props.value)) / 100)
const offset = computed(() => C * (1 - pct.value))
</script>

<template>
  <div class="ring-wrap" :style="{ width: size + 'px', height: size + 'px' }">
    <svg viewBox="0 0 120 120" :width="size" :height="size">
      <defs>
        <linearGradient :id="`g-${tone}`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" :stop-color="tone === 'fire' ? '#ff9f0a' : tone === 'green' ? '#30d158' : tone === 'violet' ? '#bf5af2' : '#0a84ff'" />
          <stop offset="100%" :stop-color="tone === 'fire' ? '#ff375f' : tone === 'green' ? '#0a84ff' : tone === 'violet' ? '#5e5ce6' : '#5e5ce6'" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" :r="R" class="ring-bg" :stroke-width="stroke" />
      <circle
        cx="60"
        cy="60"
        :r="R"
        class="ring-fg"
        :stroke="`url(#g-${tone})`"
        :stroke-width="stroke"
        :stroke-dasharray="C"
        :stroke-dashoffset="offset"
        transform="rotate(-90 60 60)"
      />
    </svg>
    <div class="ring-center">
      <slot>
        <b>{{ Math.round(value) }}<em>%</em></b>
      </slot>
    </div>
  </div>
</template>

<style scoped>
.ring-wrap {
  position: relative;
  flex: none;
}

.ring-bg {
  fill: none;
  stroke: var(--line);
}

.ring-fg {
  fill: none;
  stroke-linecap: round;
  transition: stroke-dashoffset 1s var(--ease);
}

.ring-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 1px;
}

.ring-center b {
  font-size: 27px;
  font-weight: 680;
  letter-spacing: -0.04em;
  color: var(--text);
  line-height: 1;
}

.ring-center b em {
  font-style: normal;
  font-size: 13px;
  color: var(--text-3);
  margin-left: 1px;
}
</style>
