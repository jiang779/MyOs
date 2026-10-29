<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { assistant } from '../store'
import Composer from './Composer.vue'
import ConversationList from './ConversationList.vue'
import MessageItem from './MessageItem.vue'
import SettingsPanel from './SettingsPanel.vue'
import StreamingMessage from './StreamingMessage.vue'

const emit = defineEmits<{ (e: 'close'): void }>()

const state = assistant.state
const cfg = computed(() => assistant.config.value)
const lastMessageId = computed(
  () => state.messages[state.messages.length - 1]?.id ?? ''
)

const listOpen = ref(false)
const settingsOpen = ref(false)
const body = ref<HTMLElement | null>(null)
const composer = ref<InstanceType<typeof Composer> | null>(null)

const STICK_THRESHOLD = 60
const stickToBottom = ref(true)
let lastScrollTop = 0

function nearBottom() {
  const el = body.value
  if (!el) return true
  return el.scrollHeight - el.scrollTop - el.clientHeight < STICK_THRESHOLD
}

/**
 * 滚动事件只更新「是否继续跟随底部」，绝不在这里写 scrollTop。
 * 之前在这里调 scrollToBottom()，用户往上滑会被立刻拉回底部，并且
 * 每次滚动都触发一次写入，造成一卡一卡。
 */
function onBodyScroll() {
  const el = body.value
  if (!el) return
  const top = el.scrollTop

  if (nearBottom()) {
    stickToBottom.value = true
  } else if (top < lastScrollTop - 2) {
    // 用户主动往上滑：暂停自动跟随
    stickToBottom.value = false
  }

  lastScrollTop = top
}

function scrollToBottom(force = false) {
  const el = body.value
  if (!el) return
  if (!force && !stickToBottom.value) return

  const target = el.scrollHeight - el.clientHeight
  // 已经在底部就不要重复写，避免滚动事件回环
  if (Math.abs(el.scrollTop - target) < 2) return

  el.scrollTop = target
  lastScrollTop = target
}

function jumpToBottom() {
  stickToBottom.value = true
  nextTick(() => scrollToBottom(true))
}

watch(
  () => state.messages.length,
  () => {
    // 完成一条回答时，如果用户正在往上看，不要把他拉回底部
    nextTick(() => scrollToBottom())
  }
)
watch(
  () => state.streaming?.version,
  () => {
    if (!stickToBottom.value) return
    nextTick(() => scrollToBottom())
  }
)
watch(
  () => state.activeId,
  () => {
    stickToBottom.value = true
    lastScrollTop = 0
    nextTick(() => scrollToBottom(true))
  }
)
watch(
  () => state.sending,
  (sending) => {
    if (!sending) return
    stickToBottom.value = true
    nextTick(() => scrollToBottom(true))
  }
)

function onSend(text: string) {
  listOpen.value = false
  stickToBottom.value = true
  void assistant.send(text)
  nextTick(() => scrollToBottom(true))
}

function onKey(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (settingsOpen.value) settingsOpen.value = false
  else if (listOpen.value) listOpen.value = false
  else emit('close')
}

function closeSettings() {
  settingsOpen.value = false
  nextTick(() => {
    scrollToBottom(true)
    composer.value?.focus()
  })
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  nextTick(() => {
    scrollToBottom(true)
    composer.value?.focus()
  })
})

onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <section class="ai-panel" role="dialog" aria-label="AI 助手">
    <header class="ai-head">
      <div class="ai-brand">
        <span class="ai-pulse" />
        <b>助手</b>
        <span class="ai-pill">通用</span>
      </div>

      <div class="ai-actions">
        <button
          type="button"
          title="设置"
          aria-label="设置"
          @click="settingsOpen = !settingsOpen; listOpen = false"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
            <path d="M4 8h8M16 8h4M4 16h4M12 16h8" />
            <circle cx="14" cy="8" r="2" />
            <circle cx="10" cy="16" r="2" />
          </svg>
        </button>
        <button type="button" title="会话列表" aria-label="会话列表" @click="listOpen = !listOpen; settingsOpen = false">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
            <path d="M4 7h16M4 12h10M4 17h7" />
          </svg>
        </button>
        <button type="button" title="新建会话" aria-label="新建会话" @click="assistant.newConversation(); listOpen = false">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
        <button type="button" title="关闭" aria-label="关闭" @click="$emit('close')">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </header>

    <SettingsPanel v-if="settingsOpen" @close="closeSettings" />

    <template v-else>
      <ConversationList
        v-if="listOpen"
        :items="state.conversations"
        :active-id="state.activeId"
        @select="(id) => { assistant.selectConversation(id); listOpen = false }"
        @new="assistant.newConversation(); listOpen = false"
        @rename="(id, title) => assistant.renameConversation(id, title)"
        @delete="(id) => assistant.deleteConversation(id)"
        @close="listOpen = false"
      />

      <div ref="body" class="ai-body" @scroll.passive="onBodyScroll">
        <div v-if="!state.messages.length && !state.streaming" class="ai-empty">
          <p class="ai-greeting">{{ cfg.greeting }}</p>
          <div class="ai-suggestions">
            <button v-for="s in cfg.suggestions" :key="s" type="button" @click="onSend(s)">
              <span>{{ s }}</span>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        </div>

        <MessageItem
          v-for="m in state.messages"
          :key="m.id"
          :message="m"
          :retryable="m.id === lastMessageId"
          @retry="assistant.retryMessage(m.id)"
        />
        <StreamingMessage v-if="state.streaming" :stream="state.streaming" />
      </div>

      <button
        v-if="!stickToBottom"
        type="button"
        class="ai-jump"
        aria-label="回到底部"
        title="回到底部"
        @click="jumpToBottom"
      >
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 5v14" />
          <path d="M6 13l6 6 6-6" />
        </svg>
      </button>

      <div v-if="state.resumable" class="ai-resume">
        <span class="resume-dot" />
        <span class="resume-text">连接中断，已收内容已保留</span>
        <button type="button" @click="assistant.resume()">继续接收</button>
      </div>

      <Composer ref="composer" :sending="state.sending" @send="onSend" @stop="assistant.stop()" />
    </template>
  </section>
</template>

<style scoped>
.ai-panel {
  position: fixed;
  right: 20px;
  bottom: 122px;
  z-index: 900;
  width: 404px;
  height: min(660px, calc(100dvh - 158px));
  display: flex;
  flex-direction: column;
  background: var(--surface-solid);
  border: 1px solid var(--line-strong);
  border-radius: var(--r-2xl);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  isolation: isolate;
  will-change: transform;
}

.ai-head {
  flex: none;
  height: 54px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px 0 16px;
  border-bottom: 1px solid var(--line);
  background: var(--surface-solid);
}

.ai-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13.5px;
}

.ai-brand b {
  letter-spacing: -0.01em;
}

.ai-pulse {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent-2);
  box-shadow: 0 0 10px var(--accent-2);
}

.ai-pill {
  padding: 1px 7px;
  border-radius: 999px;
  border: 1px solid var(--line);
  font-size: 10px;
  color: var(--text-3);
}

.ai-actions {
  display: flex;
  gap: 2px;
}

.ai-actions button {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  color: var(--text-3);
  transition: all 0.18s var(--ease);
}

.ai-actions button:hover {
  color: var(--text);
  background: var(--surface-2);
}

.ai-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  padding: 18px 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ai-jump {
  position: absolute;
  right: 16px;
  bottom: calc(72px + env(safe-area-inset-bottom));
  z-index: 4;
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 1px solid var(--line-strong);
  background: var(--surface-solid);
  color: var(--text-2);
  box-shadow: var(--shadow);
  transition: color 0.18s var(--ease), border-color 0.18s var(--ease), transform 0.18s var(--ease);
}

.ai-jump:hover {
  color: var(--accent);
  border-color: var(--accent-line);
  transform: translateY(-1px);
}

.ai-resume {
  flex: none;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 14px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid var(--accent-line);
  background: var(--accent-soft);
  font-size: 11.5px;
  color: var(--text-2);
}

.resume-dot {
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--danger);
  box-shadow: 0 0 8px var(--danger);
}

.resume-text {
  flex: 1;
  min-width: 0;
}

.ai-resume button {
  flex: none;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid var(--accent-line);
  background: var(--surface-solid);
  color: var(--accent);
  font-size: 11px;
  transition: all 0.18s var(--ease);
}

.ai-resume button:hover {
  background: var(--accent);
  color: #fff;
}

.ai-empty {
  margin: auto 0;
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 8px 2px;
}

.ai-greeting {
  font-size: 14.5px;
  line-height: 1.75;
  color: var(--text);
}

.ai-suggestions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ai-suggestions button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--surface-2);
  color: var(--text-2);
  font-size: 12.5px;
  text-align: left;
  transition: all 0.2s var(--ease);
}

.ai-suggestions button:hover {
  color: var(--text);
  border-color: var(--accent-line);
  background: var(--accent-soft);
}

.ai-suggestions svg {
  flex: none;
  opacity: 0.6;
}

@media (max-width: 720px) {
  .ai-panel {
    inset: 0;
    width: auto;
    height: auto;
    border-radius: 0;
    border: 0;
    padding-top: env(safe-area-inset-top);
  }

  .ai-body {
    padding-bottom: calc(20px + env(safe-area-inset-bottom));
  }
}

.ai-panel-enter-active,
.ai-panel-leave-active {
  transition: opacity 0.22s var(--ease), transform 0.28s var(--ease-out);
}

.ai-panel-enter-from,
.ai-panel-leave-to {
  opacity: 0;
  transform: translateY(14px) scale(0.985);
}
</style>
