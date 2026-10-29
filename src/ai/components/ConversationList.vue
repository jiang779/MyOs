<script setup lang="ts">
import { nextTick, ref } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import type { ConversationMeta } from '../types'

defineProps<{ items: ConversationMeta[]; activeId: string }>()
const emit = defineEmits<{
  (e: 'select', id: string): void
  (e: 'new'): void
  (e: 'rename', id: string, title: string): void
  (e: 'delete', id: string): void
  (e: 'close'): void
}>()

const editingId = ref('')
const draft = ref('')
const confirmId = ref('')
const inputEl = ref<HTMLInputElement | null>(null)
let confirmTimer = 0

function setInput(el: Element | ComponentPublicInstance | null) {
  inputEl.value = el instanceof HTMLInputElement ? el : null
}

function startRename(item: ConversationMeta) {
  editingId.value = item.id
  draft.value = item.title
  nextTick(() => {
    inputEl.value?.focus()
    inputEl.value?.select()
  })
}

function commitRename() {
  if (!editingId.value) return
  emit('rename', editingId.value, draft.value)
  editingId.value = ''
}

function cancelRename() {
  editingId.value = ''
}

function askDelete(id: string) {
  if (confirmId.value === id) {
    confirmId.value = ''
    emit('delete', id)
    return
  }
  confirmId.value = id
  window.clearTimeout(confirmTimer)
  confirmTimer = window.setTimeout(() => {
    if (confirmId.value === id) confirmId.value = ''
  }, 2600)
}

function timeLabel(ts: number) {
  const d = new Date(ts)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  return sameDay
    ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    : `${d.getMonth() + 1}/${d.getDate()}`
}
</script>

<template>
  <div class="conv">
    <header class="conv-head">
      <b>会话</b>
      <div class="row">
        <button type="button" class="mini" title="新建会话" aria-label="新建会话" @click="$emit('new')">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
        <button type="button" class="mini" title="收起" aria-label="收起会话列表" @click="$emit('close')">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>
    </header>

    <ul class="conv-list">
      <li v-for="item in items" :key="item.id" :class="{ active: item.id === activeId }">
        <template v-if="editingId === item.id">
          <input
            :ref="setInput"
            v-model="draft"
            class="rename"
            maxlength="40"
            @keydown.enter.prevent="commitRename"
            @keydown.esc.prevent="cancelRename"
            @blur="commitRename"
          />
        </template>
        <template v-else>
          <button type="button" class="conv-main" @click="$emit('select', item.id)">
            <span class="conv-title truncate">{{ item.title }}</span>
            <span class="conv-meta">
              {{ timeLabel(item.updatedAt) }}
              <i>·</i>
              {{ item.messageCount }} 条
            </span>
          </button>
          <div class="conv-ops">
            <button type="button" title="重命名" aria-label="重命名" @click.stop="startRename(item)">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 20h4L19 9l-4-4L4 16v4z" />
              </svg>
            </button>
            <button
              type="button"
              :class="{ danger: confirmId === item.id }"
              :title="confirmId === item.id ? '再点一次删除' : '删除'"
              :aria-label="confirmId === item.id ? '确认删除' : '删除'"
              @click.stop="askDelete(item.id)"
            >
              <span v-if="confirmId === item.id" class="confirm">确认?</span>
              <svg v-else viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
              </svg>
            </button>
          </div>
        </template>
      </li>
      <li v-if="!items.length" class="conv-empty">还没有会话</li>
    </ul>
  </div>
</template>

<style scoped>
.conv {
  position: absolute;
  top: 54px;
  left: 0;
  right: 0;
  z-index: 3;
  max-height: 320px;
  display: flex;
  flex-direction: column;
  background: var(--surface-solid);
  border-bottom: 1px solid var(--line-strong);
  box-shadow: var(--shadow);
}

.conv-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px 6px;
  font-size: 12px;
  color: var(--text-3);
}

.row {
  display: flex;
  gap: 2px;
}

.mini {
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  border-radius: 7px;
  color: var(--text-3);
}

.mini:hover {
  color: var(--text);
  background: var(--surface-2);
}

.conv-list {
  overflow-y: auto;
  padding: 4px 6px 8px;
}

.conv-list li {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  border-radius: 9px;
  padding: 2px 4px;
}

.conv-list li:hover {
  background: var(--surface-2);
}

.conv-list li.active {
  background: var(--accent-soft);
}

.conv-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  padding: 6px 6px;
  text-align: left;
}

.conv-title {
  max-width: 100%;
  font-size: 12.5px;
  color: var(--text);
}

.conv-meta {
  font-size: 10px;
  color: var(--text-3);
}

.conv-meta i {
  font-style: normal;
  opacity: 0.5;
  margin: 0 2px;
}

.conv-ops {
  flex: none;
  display: flex;
  gap: 1px;
  opacity: 0;
  transition: opacity 0.18s var(--ease);
}

.conv-list li:hover .conv-ops,
.conv-list li.active .conv-ops {
  opacity: 1;
}

.conv-ops button {
  min-width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  padding: 0 2px;
  border-radius: 6px;
  color: var(--text-3);
}

.conv-ops button:hover {
  color: var(--text);
  background: var(--surface-solid);
}

.conv-ops button.danger {
  color: var(--danger);
  background: rgba(255, 107, 129, 0.12);
}

.confirm {
  font-size: 10px;
  white-space: nowrap;
}

.rename {
  flex: 1;
  min-width: 0;
  margin: 4px 2px;
  padding: 5px 8px;
  border-radius: 7px;
  border: 1px solid var(--accent-line);
  background: var(--surface-solid);
  color: var(--text);
  font: inherit;
  font-size: 12.5px;
  outline: none;
}

.conv-empty {
  padding: 20px;
  text-align: center;
  font-size: 12px;
  color: var(--text-3);
}
</style>
