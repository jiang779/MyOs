<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'

const props = defineProps<{ sending: boolean }>()
const emit = defineEmits<{ (e: 'send', text: string): void; (e: 'stop'): void }>()

const text = ref('')
const area = ref<HTMLTextAreaElement | null>(null)

function autosize() {
  const el = area.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 128)}px`
}

function submit() {
  if (props.sending) return
  const value = text.value.trim()
  if (!value) return
  emit('send', value)
  text.value = ''
  nextTick(autosize)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'Enter' || e.shiftKey) return
  // 中文输入法回车确认候选词时不要发送
  if (e.isComposing || e.keyCode === 229) return
  e.preventDefault()
  submit()
}

onMounted(() => {
  area.value?.focus()
  autosize()
})

defineExpose({ focus: () => area.value?.focus() })
</script>

<template>
  <div class="composer">
    <textarea
      ref="area"
      v-model="text"
      rows="1"
      placeholder="发消息…（Enter 发送，Shift+Enter 换行）"
      @input="autosize"
      @keydown="onKeydown"
    />

    <button
      v-if="sending"
      class="btn-stop"
      type="button"
      aria-label="停止生成"
      title="停止生成"
      @click="$emit('stop')"
    >
      <span />
    </button>
    <button
      v-else
      class="btn-send"
      type="button"
      :disabled="!text.trim()"
      aria-label="发送"
      title="发送"
      @click="submit"
    >
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 19V5" />
        <path d="M6 11l6-6 6 6" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.composer {
  flex: none;
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 12px 14px calc(12px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--line);
  background: var(--surface-solid);
}

textarea {
  flex: 1;
  min-height: 38px;
  max-height: 128px;
  resize: none;
  padding: 9px 12px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--surface-2);
  color: var(--text);
  font: inherit;
  font-size: 13.5px;
  line-height: 1.5;
  outline: none;
  transition: border-color 0.2s var(--ease), background 0.2s var(--ease);
}

textarea::placeholder {
  color: var(--text-3);
}

textarea:focus {
  border-color: var(--accent-line);
  background: var(--surface-solid);
}

.btn-send,
.btn-stop {
  flex: none;
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  border: 0;
  transition: all 0.2s var(--ease);
}

.btn-send {
  background: var(--grad-blue);
  color: #fff;
  box-shadow: 0 6px 18px rgba(91, 75, 232, 0.28);
}

.btn-send:disabled {
  background: var(--surface-2);
  color: var(--text-3);
  box-shadow: none;
  cursor: not-allowed;
}

.btn-send:not(:disabled):active {
  transform: scale(0.94);
}

.btn-stop {
  background: var(--surface-2);
  border: 1px solid var(--line-strong);
  color: var(--text);
}

.btn-stop span {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  background: currentColor;
}

.btn-stop:hover {
  border-color: var(--danger);
  color: var(--danger);
}
</style>
