<script setup lang="ts">
import { computed } from 'vue'
import { formatDuration } from '../format'
import { renderAssistantMarkdown } from '../markdown'
import type { ChatMessage, ToolBlock } from '../types'
import ReferenceList from './ReferenceList.vue'

const props = defineProps<{ message: ChatMessage; retryable?: boolean }>()
defineEmits<{ (e: 'retry'): void }>()

const userText = computed(() =>
  props.message.blocks
    .filter((b) => b.kind === 'text')
    .map((b) => b.text)
    .join('\n')
)

const render = (text: string) => renderAssistantMarkdown(text)

function statusLabel(block: ToolBlock) {
  return block.status === 'running' ? '运行中…' : block.status === 'done' ? '完成' : '失败'
}
</script>

<template>
  <div class="msg" :class="message.role">
    <template v-if="message.role === 'user'">
      <div class="bubble">{{ userText }}</div>
    </template>

    <template v-else>
      <div class="blocks">
        <template v-for="(block, i) in message.blocks" :key="i">
          <details v-if="block.kind === 'think'" class="think">
            <summary>
              <span class="think-dot" />
              <span>思考过程</span>
              <span v-if="block.durationMs !== undefined" class="meta">
                {{ formatDuration(block.durationMs) }}
              </span>
            </summary>
            <pre>{{ block.text }}</pre>
          </details>

          <div v-else-if="block.kind === 'tool'" class="tool" :class="block.status">
            <div class="tool-head">
              <span class="tool-name">
                <i class="dot" />
                {{ block.name }}
              </span>
              <span class="tool-status" :class="block.status">
                {{ statusLabel(block) }}
                <template v-if="block.durationMs !== undefined">
                  · {{ formatDuration(block.durationMs) }}
                </template>
              </span>
            </div>

            <details class="tool-section" :open="block.status === 'running'">
              <summary>参数</summary>
              <pre>{{ block.args || '（无参数）' }}</pre>
            </details>

            <details v-if="block.result" class="tool-section">
              <summary>结果</summary>
              <pre>{{ block.result }}</pre>
            </details>

            <div v-if="block.status === 'error'" class="tool-failed">
              <span>工具执行失败</span>
              <button v-if="retryable" type="button" class="retry" @click="$emit('retry')">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 12a9 9 0 1 0 3-6.7" />
                  <path d="M3 4v5h5" />
                </svg>
                重试
              </button>
            </div>
          </div>

          <div v-else class="prose ai-md" v-html="render(block.text)" />
        </template>

        <span v-if="message.status === 'stopped'" class="tag">已停止</span>
        <span v-else-if="message.status === 'error'" class="tag err">出错</span>

        <ReferenceList v-if="message.references?.length" :references="message.references" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.msg {
  display: flex;
  flex-direction: column;
}

.msg.user {
  align-items: flex-end;
}

.bubble {
  max-width: 84%;
  padding: 8px 12px;
  border-radius: 14px 14px 4px 14px;
  background: var(--grad-blue);
  color: #fff;
  font-size: 13.5px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.blocks {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.think {
  border: 1px solid var(--line);
  background: var(--surface-2);
  border-radius: 10px;
}

.think summary {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 11px;
  font-size: 11.5px;
  color: var(--text-3);
  cursor: pointer;
  list-style: none;
}

.think summary::-webkit-details-marker {
  display: none;
}

.think-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent-2);
  box-shadow: 0 0 8px var(--accent-2);
}

.think .meta {
  margin-left: auto;
  font-variant-numeric: tabular-nums;
  font-size: 10.5px;
  opacity: 0.8;
}

.think pre {
  margin: 0;
  padding: 0 11px 10px;
  max-height: 240px;
  overflow: auto;
  font-size: 11.5px;
  line-height: 1.65;
  color: var(--text-2);
  white-space: pre-wrap;
  word-break: break-word;
}

.tool {
  border: 1px solid var(--accent-line);
  background: var(--accent-soft);
  border-radius: 10px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tool.error {
  border-color: rgba(255, 107, 129, 0.35);
  background: rgba(255, 107, 129, 0.06);
}

.tool-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 11.5px;
}

.tool-name {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--accent);
  font-weight: 600;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tool-name .dot {
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
}

.tool.error .tool-name,
.tool.error .tool-name .dot {
  color: var(--danger);
}

.tool.error .tool-name .dot {
  background: var(--danger);
}

.tool-status {
  flex: none;
  font-size: 10px;
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
}

.tool-status.done {
  color: var(--ok);
}

.tool-status.error {
  color: var(--danger);
}

.tool-section {
  border-top: 1px dashed var(--line-strong);
  padding-top: 5px;
}

.tool-section summary {
  font-size: 10.5px;
  color: var(--text-3);
  cursor: pointer;
  list-style: none;
}

.tool-section summary::-webkit-details-marker {
  display: none;
}

.tool-section summary::before {
  content: '▸';
  display: inline-block;
  margin-right: 5px;
  transition: transform 0.16s var(--ease);
}

.tool-section[open] summary::before {
  transform: rotate(90deg);
}

.tool-section pre {
  margin: 4px 0 2px;
  max-height: 120px;
  overflow: auto;
  font-size: 11px;
  line-height: 1.55;
  color: var(--text-2);
  white-space: pre-wrap;
  word-break: break-word;
}

.tool-failed {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-top: 5px;
  border-top: 1px dashed rgba(255, 107, 129, 0.28);
  font-size: 10.5px;
  color: var(--danger);
}

.retry {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border-radius: 999px;
  border: 1px solid rgba(255, 107, 129, 0.4);
  background: rgba(255, 107, 129, 0.1);
  color: var(--danger);
  font-size: 10.5px;
  transition: all 0.18s var(--ease);
}

.retry:hover {
  background: rgba(255, 107, 129, 0.2);
}

.tag {
  align-self: flex-start;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid var(--line);
  font-size: 10.5px;
  color: var(--text-3);
}

.tag.err {
  color: var(--danger);
  border-color: rgba(255, 107, 129, 0.28);
}

.ai-md {
  font-size: 13.5px;
  line-height: 1.7;
}

.ai-md :deep(p) {
  margin: 6px 0;
}

.ai-md :deep(ul),
.ai-md :deep(ol) {
  margin: 6px 0;
}

.ai-md :deep(pre) {
  margin: 8px 0;
}

.ai-md :deep(h1),
.ai-md :deep(h2),
.ai-md :deep(h3) {
  margin-top: 10px;
}
</style>
