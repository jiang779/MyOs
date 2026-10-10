<script setup lang="ts">
import AppIcon from './AppIcon.vue'

withDefaults(
  defineProps<{
    icon?: string
    label: string
    value: string | number
    unit?: string
    hint?: string
    tone?: '' | 'blue' | 'fire' | 'violet' | 'green'
  }>(),
  { tone: '' }
)
</script>

<template>
  <div class="card tile fade-up">
    <div class="row between">
      <span class="tile-label">{{ label }}</span>
      <span v-if="icon" class="tile-ico" :class="tone">
        <AppIcon :name="icon" :size="16" />
      </span>
    </div>
    <div class="tile-value">
      {{ value }}<em v-if="unit">{{ unit }}</em>
    </div>
    <slot />
    <p v-if="hint" class="tile-hint">{{ hint }}</p>
  </div>
</template>

<style scoped>
.tile {
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tile-label {
  font-size: 12.5px;
  color: var(--text-3);
  font-weight: 550;
}

.tile-ico {
  width: 28px;
  height: 28px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  background: var(--surface-2);
  color: var(--text-2);
}

.tile-ico.blue {
  background: var(--accent-soft);
  color: var(--accent);
}
.tile-ico.fire {
  background: rgba(255, 159, 10, 0.15);
  color: #e08600;
}
.tile-ico.violet {
  background: rgba(191, 90, 242, 0.15);
  color: #a05ad6;
}
.tile-ico.green {
  background: rgba(52, 199, 89, 0.15);
  color: #1a9e46;
}

.tile-value {
  font-size: 30px;
  font-weight: 680;
  letter-spacing: -0.035em;
  line-height: 1.15;
  margin-top: 2px;
}

.tile-value em {
  font-style: normal;
  font-size: 14px;
  font-weight: 550;
  color: var(--text-3);
  margin-left: 3px;
  letter-spacing: 0;
}

.tile-hint {
  font-size: 12.5px;
  color: var(--text-3);
  margin-top: 2px;
}
</style>
