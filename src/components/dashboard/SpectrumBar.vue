<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { TypeStat } from '@/lib/dashboard'

const props = withDefaults(
  defineProps<{
    items: TypeStat[]
    height?: number
    animate?: boolean
  }>(),
  { height: 10, animate: true }
)

const ready = ref(false)
onMounted(() => {
  requestAnimationFrame(() => (ready.value = true))
})

const label = computed(() =>
  props.items.map((s) => `${s.type} ${s.done}/${s.total}`).join('，')
)
</script>

<template>
  <div class="spectrum" :style="{ height: height + 'px' }" role="img" :aria-label="`各题型完成情况：${label}`">
    <span
      v-for="s in items"
      :key="s.fileName"
      class="seg"
      :style="{ flexGrow: s.total, color: s.color }"
      :title="`${s.type} ${s.done}/${s.total}`"
    >
      <i class="track" />
      <i class="fill" :style="{ width: (ready || !animate ? s.pct : 0) + '%' }" />
    </span>
  </div>
</template>

<style scoped>
.spectrum {
  display: flex;
  align-items: stretch;
  gap: 3px;
  width: 100%;
}

.seg {
  position: relative;
  flex-basis: 0;
  flex-shrink: 1;
  min-width: 0;
  border-radius: 3px;
  overflow: hidden;
}

.track {
  position: absolute;
  inset: 0;
  background: currentColor;
  opacity: 0.16;
}

.fill {
  position: relative;
  display: block;
  height: 100%;
  background: currentColor;
  border-radius: 3px;
  transition: width 0.9s var(--ease-out);
}
</style>
