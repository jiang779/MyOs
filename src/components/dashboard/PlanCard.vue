<script setup lang="ts">
import { computed } from 'vue'
import CheckItem from '@/components/CheckItem.vue'
import ProgressBar from '@/components/ProgressBar.vue'
import SummaryCard from './SummaryCard.vue'
import { currentWeek } from '@/lib/data'
import { isChecked, toggleTask } from '@/lib/store'

defineProps<{ dense?: boolean }>()
defineEmits<{ (e: 'open'): void }>()

const week = currentWeek()!
const tasks = computed(() => week.tasks.slice(0, 3))
const done = computed(() => tasks.value.filter((t, i) => isChecked(week.no, i, t.done)).length)
const pct = computed(() =>
  tasks.value.length ? (done.value / tasks.value.length) * 100 : week.progress
)
</script>

<template>
  <SummaryCard title="这周的三件事" icon="target" :meta="`${done}/${tasks.length}`" :dense="dense">
    <div class="tasks">
      <CheckItem
        v-for="(t, i) in tasks"
        :key="i"
        :text="t.text"
        :checked="isChecked(week.no, i, t.done)"
        @toggle="toggleTask(week.no, i, t.done)"
      />
      <p v-if="!tasks.length" class="tiny muted">这周还没写计划。</p>
    </div>

    <template #footer>
      <div class="foot">
        <ProgressBar :value="pct" :height="4" tone="green" />
        <div class="foot-row">
          <span class="deliver truncate" :title="week.deliverable">{{ week.deliverable || '—' }}</span>
          <button class="more" type="button" @click="$emit('open')">完整计划</button>
        </div>
      </div>
    </template>
  </SummaryCard>
</template>

<style scoped>
.tasks {
  display: flex;
  flex-direction: column;
}

.foot {
  display: flex;
  flex-direction: column;
  gap: 9px;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--line);
}

.foot-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.deliver {
  font-size: 12px;
  color: var(--text-3);
  min-width: 0;
}

.more {
  flex: none;
  font-size: 12px;
  font-weight: 560;
  color: var(--accent);
}

:deep(.task) {
  padding: 8px 8px;
  gap: 10px;
}

:deep(.task-text) {
  font-size: 13.5px;
}

.dense .foot {
  padding-top: 9px;
  gap: 7px;
}

/* 矮屏：任务行收紧，保证 640 高度也能放下三件事 */
@media (max-height: 700px) {
  :deep(.task) {
    padding: 4px 6px;
    gap: 8px;
  }
  :deep(.task-text) {
    font-size: 12.5px;
    line-height: 1.42;
  }
  .foot {
    margin-top: 6px;
    padding-top: 6px;
  }
}
</style>
