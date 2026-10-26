<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import SummaryCard from './SummaryCard.vue'
import { notes } from '@/lib/data'
import { recentNotes } from '@/lib/dashboard'

defineProps<{ dense?: boolean }>()

const items = computed(() => recentNotes(3))

const meta = (n: { date: string; tags: string[] }) => n.date || n.tags[0] || ''
</script>

<template>
  <SummaryCard title="最近笔记" icon="note" :meta="`${notes.length} 篇`" :dense="dense">
    <ul class="list" :class="{ one: dense }">
      <li v-for="n in items" :key="`${n.week}-${n.slug}`">
        <RouterLink class="item" :to="{ name: 'note', params: { week: n.week, slug: n.slug } }">
          <span class="wk num">W{{ n.week }}</span>
          <span class="title truncate">{{ n.title }}</span>
          <span v-if="meta(n)" class="meta truncate">{{ meta(n) }}</span>
          <AppIcon name="arrow" :size="13" class="go" />
        </RouterLink>
      </li>
      <li v-if="!items.length" class="tiny muted">还没有笔记。</li>
    </ul>

    <template #footer>
      <div class="foot">
        <RouterLink class="more" to="/notes">全部笔记 →</RouterLink>
      </div>
    </template>
  </SummaryCard>
</template>

<style scoped>
.list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.list.one {
  gap: 2px;
}

.item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 8px;
  margin: 0 -8px;
  border-radius: 10px;
  color: var(--text);
  transition: background var(--dur-2) var(--ease-out);
}

.item:hover {
  background: var(--surface-2);
}

.wk {
  flex: none;
  font-size: 10.5px;
  font-weight: 600;
  color: var(--accent);
  background: var(--accent-soft);
  border-radius: 5px;
  padding: 1px 5px;
}

.title {
  flex: 1;
  min-width: 0;
  font-size: 13px;
}

.meta {
  flex: none;
  max-width: 42%;
  font-size: 10.5px;
  color: var(--text-3);
}

.go {
  flex: none;
  color: var(--text-3);
  opacity: 0;
  transition: opacity var(--dur-2) var(--ease-out);
}

.item:hover .go {
  opacity: 1;
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
