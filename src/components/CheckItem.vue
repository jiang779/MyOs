<script setup lang="ts">
import AppIcon from './AppIcon.vue'

defineProps<{ text: string; checked: boolean }>()
defineEmits<{ (e: 'toggle'): void }>()
</script>

<template>
  <button class="task" :class="{ done: checked }" @click="$emit('toggle')">
    <span class="check" :class="{ on: checked }">
      <AppIcon name="check" :size="13" />
    </span>
    <span class="task-text">{{ text }}</span>
  </button>
</template>

<style scoped>
.task {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  padding: 11px 12px;
  border-radius: var(--r-md);
  text-align: left;
  transition: background 0.22s var(--ease);
}

.task:hover {
  background: var(--surface-2);
}

.task-text {
  font-size: 14.5px;
  color: var(--text);
  line-height: 1.5;
  transition: all 0.25s var(--ease);
}

.task.done .task-text {
  color: var(--text-3);
  text-decoration: line-through;
  text-decoration-color: var(--line-strong);
}
</style>
