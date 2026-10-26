<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'

withDefaults(
  defineProps<{
    title: string
    icon?: string
    meta?: string
    dense?: boolean
  }>(),
  { dense: false }
)
</script>

<template>
  <section class="card summary" :class="{ dense }">
    <header class="card-head">
      <h2 class="card-title">
        <AppIcon v-if="icon" :name="icon" :size="15" class="ico" />
        {{ title }}
      </h2>
      <span v-if="meta" class="card-note num">{{ meta }}</span>
    </header>

    <div class="summary-body">
      <slot />
    </div>

    <slot name="footer" />
  </section>
</template>

<style scoped>
.summary {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  gap: 0;
  overflow: hidden;
}

.summary.dense {
  padding: 14px;
  border-radius: var(--r-lg);
}

.card-head {
  margin-bottom: 10px;
}

.card-title .ico {
  color: var(--accent);
}

.summary-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
}

/* 矮屏：整卡再压一档，保证移动端一屏不滚动 */
@media (max-height: 700px) {
  .summary.dense {
    padding: 11px;
  }
  .summary.dense .card-head {
    margin-bottom: 6px;
  }
}
</style>
