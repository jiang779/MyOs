<script setup lang="ts">
import AppIcon from './AppIcon.vue'

defineProps<{ open: boolean; title?: string; kicker?: string }>()
defineEmits<{ (e: 'close'): void }>()
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="open" class="sheet-wrap" @click.self="$emit('close')">
        <aside class="sheet" role="dialog" aria-modal="true">
          <header class="sheet-head">
            <div class="col grow">
              <span v-if="kicker" class="page-kicker">{{ kicker }}</span>
              <h2 class="sheet-title">{{ title }}</h2>
            </div>
            <div class="row" style="gap: 8px">
              <slot name="actions" />
              <button class="btn ghost sm" @click="$emit('close')" title="关闭">
                <AppIcon name="close" :size="15" />
              </button>
            </div>
          </header>
          <div class="sheet-body">
            <slot />
          </div>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sheet-wrap {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  justify-content: flex-end;
  background: rgba(0, 0, 0, 0.32);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
}

.sheet {
  width: min(680px, 92vw);
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--surface-solid);
  border-left: 1px solid var(--line);
  box-shadow: var(--shadow-lg);
}

.sheet-head {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 24px 26px 16px;
  border-bottom: 1px solid var(--line);
}

.sheet-title {
  font-size: 21px;
  letter-spacing: -0.025em;
  margin-top: 2px;
}

.sheet-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px 26px 60px;
}

.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.3s var(--ease);
}
.sheet-enter-active .sheet,
.sheet-leave-active .sheet {
  transition: transform 0.34s var(--ease);
}
.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}
.sheet-enter-from .sheet,
.sheet-leave-to .sheet {
  transform: translateX(40px);
}
</style>
