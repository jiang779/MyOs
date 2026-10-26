<script setup lang="ts">
import SummaryCard from './SummaryCard.vue'
import { dietTodayTomorrow } from '@/lib/data'

defineProps<{ dense?: boolean }>()
defineEmits<{ (e: 'open'): void }>()

const meals = dietTodayTomorrow(new Date())
const MEAL_ICON: Record<string, string> = { 早餐: '🌅', 午餐: '☀️', 晚餐: '🌙', 加餐: '🍎', 夜宵: '🌛' }
const rows = meals.today.day?.meals?.slice(0, 3) ?? []
const tomorrow = meals.tomorrow.day?.meals?.map((m) => m.items.join('、')).join(' / ') ?? ''
</script>

<template>
  <SummaryCard
    title="今日食谱"
    icon="bowl"
    :meta="meals.today.day?.name || ''"
    :dense="dense"
  >
    <div class="meals">
      <div v-for="m in rows" :key="m.label" class="meal">
        <span class="lbl">{{ MEAL_ICON[m.label] || '·' }} {{ m.label }}</span>
        <span class="items truncate" :title="m.items.join(' · ')">{{ m.items.join(' · ') }}</span>
      </div>
      <p v-if="!rows.length" class="tiny muted">今天还没排菜。</p>
    </div>

    <div v-if="tomorrow" class="next">
      <span class="next-label">明天</span>
      <span class="items truncate" :title="tomorrow">{{ tomorrow }}</span>
    </div>

    <template #footer>
      <div class="foot">
        <span class="tomorrow truncate">{{ meals.today.day?.kind || '今日' }}</span>
        <button class="more" type="button" @click="$emit('open')">详细</button>
      </div>
    </template>
  </SummaryCard>
</template>

<style scoped>
.meals {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-height: 0;
}

.meal {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.lbl {
  flex: none;
  width: 62px;
  font-size: 11.5px;
  color: var(--text-2);
  white-space: nowrap;
}

.items {
  flex: 1;
  min-width: 0;
  font-size: 11.5px;
  color: var(--text-3);
}

.next {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
  padding-top: 8px;
  border-top: 1px dashed var(--line);
  min-width: 0;
}

.next-label {
  flex: none;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--text-3);
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 5px;
  padding: 0 5px;
}

.foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid var(--line);
}

.tomorrow {
  font-size: 11.5px;
  color: var(--text-3);
}

.more {
  flex: none;
  font-size: 12px;
  font-weight: 560;
  color: var(--accent);
}
</style>
