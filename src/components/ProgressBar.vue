<script setup lang="ts">
withDefaults(
  defineProps<{
    value: number
    tone?: '' | 'green' | 'fire' | 'violet'
    height?: number
  }>(),
  { tone: '', height: 10 }
)
</script>

<template>
  <div class="progress" :class="tone" :style="{ height: height + 'px' }">
    <span :style="{ width: Math.min(100, Math.max(0, value)) + '%' }" />
  </div>
</template>
