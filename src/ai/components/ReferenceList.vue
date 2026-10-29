<script setup lang="ts">
import type { Reference } from '../types'

defineProps<{ references: Reference[] }>()

function percent(score: number): string {
  const value = score > 1 ? score / 100 : score
  return `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`
}
</script>

<template>
  <div v-if="references.length" class="refs">
    <div class="refs-head">
      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
        <path d="M9 5h10a2 2 0 0 1 2 2v10" />
        <path d="M8 12h6M8 16h4" />
      </svg>
      <span>引用</span>
      <span class="refs-count">{{ references.length }}</span>
    </div>

    <details v-for="(ref, i) in references" :key="ref.id" class="ref">
      <summary>
        <span class="ref-idx">{{ i + 1 }}</span>
        <span class="ref-main">
          <span class="ref-title">{{ ref.title }}</span>
          <span class="ref-snippet">{{ ref.snippet }}</span>
        </span>
        <span class="ref-score">{{ percent(ref.score) }}</span>
      </summary>
      <pre class="ref-content">{{ ref.content }}</pre>
    </details>
  </div>
</template>

<style scoped>
.refs {
  margin-top: 2px;
  padding-top: 8px;
  border-top: 1px dashed var(--line);
}

.refs-head {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 5px;
  font-size: 10.5px;
  color: var(--text-3);
}

.refs-count {
  padding: 0 6px;
  border-radius: 999px;
  background: var(--surface-2);
  border: 1px solid var(--line);
  font-size: 9.5px;
}

.ref {
  border-bottom: 1px solid var(--line);
}

.ref:last-child {
  border-bottom: 0;
}

.ref summary {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 2px;
  cursor: pointer;
  list-style: none;
}

.ref summary::-webkit-details-marker {
  display: none;
}

.ref-idx {
  flex: none;
  width: 16px;
  height: 16px;
  display: grid;
  place-items: center;
  margin-top: 1px;
  border-radius: 5px;
  background: var(--surface-2);
  border: 1px solid var(--line);
  font-size: 9.5px;
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
}

.ref-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.ref-title {
  font-size: 11.5px;
  color: var(--text-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ref-snippet {
  font-size: 10.5px;
  line-height: 1.5;
  color: var(--text-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ref-score {
  flex: none;
  font-size: 9.5px;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
  padding: 1px 5px;
  border-radius: 999px;
  background: var(--accent-soft);
}

.ref-content {
  margin: 0 0 8px 24px;
  max-height: 200px;
  overflow: auto;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--surface-2);
  border: 1px solid var(--line);
  font-size: 11px;
  line-height: 1.65;
  color: var(--text-2);
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
