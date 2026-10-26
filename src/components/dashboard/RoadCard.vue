<script setup lang="ts">
import { computed } from 'vue'
import SummaryCard from './SummaryCard.vue'
import { currentWeekNo, stages, weekByNo, weeks } from '@/lib/data'
import { weekStatus } from '@/lib/store'

defineProps<{ dense?: boolean }>()

const currentNo = currentWeekNo()
const total = weeks.length
const cur = weekByNo(currentNo)

const done = computed(() => weeks.filter((w) => weekStatus(w.no, w.status) === 'done').length)
const stage = computed(() => stages.find((s) => s.weeks.some((w) => w.no === currentNo)))
const stageDone = computed(
  () => stage.value?.weeks.filter((w) => weekStatus(w.no, w.status) === 'done').length ?? 0
)
</script>

<template>
  <SummaryCard title="36 周路线" icon="route" :meta="`${done}/${total}`" :dense="dense">
    <div class="rail" aria-hidden="true">
      <i
        v-for="w in weeks"
        :key="w.no"
        :class="{ done: weekStatus(w.no, w.status) === 'done', cur: w.no === currentNo }"
      />
    </div>

    <div class="now">
      <b class="num">第 {{ currentNo }} 周</b>
      <span class="truncate">{{ cur?.title }}</span>
    </div>

    <div class="stage">
      <span class="truncate">{{ stage?.title || '未分组' }}</span>
      <span class="num">{{ stageDone }}/{{ stage?.weeks.length ?? 0 }}</span>
    </div>

    <template #footer>
      <div class="foot">
        <RouterLink class="more" to="/agent">查看路线 →</RouterLink>
      </div>
    </template>
  </SummaryCard>
</template>

<style scoped>
.rail {
  display: grid;
  grid-template-columns: repeat(36, minmax(0, 1fr));
  gap: 2px;
  height: 10px;
  align-items: stretch;
}

.rail i {
  border-radius: 2px;
  background: var(--line-strong);
  opacity: 0.45;
}

.rail i.done {
  background: var(--accent);
  opacity: 0.9;
}

.rail i.cur {
  background: var(--accent-2);
  opacity: 1;
  box-shadow: 0 0 10px var(--accent-2);
}

.now {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.now b {
  font-size: 13px;
  font-weight: 650;
  flex: none;
}

.now span {
  font-size: 12px;
  color: var(--text-3);
  min-width: 0;
}

.stage {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 11.5px;
  color: var(--text-3);
}

.stage span:first-child {
  min-width: 0;
}

.foot {
  margin-top: auto;
  padding-top: 8px;
}

.more {
  font-size: 12px;
  font-weight: 560;
  color: var(--accent);
}
</style>
