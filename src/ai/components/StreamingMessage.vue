<script setup lang="ts">
import { computed } from 'vue'
import { formatDuration } from '../format'
import { renderAssistantMarkdown } from '../markdown'
import type { StreamState } from '../store'
import type { ThinkBlock, ToolBlock } from '../types'
import ReferenceList from './ReferenceList.vue'

const props = defineProps<{ stream: StreamState }>()

const blocks = computed(() => props.stream.blocks)
const lastTextIndex = computed(() => {
  for (let i = blocks.value.length - 1; i >= 0; i--) {
    if (blocks.value[i].kind === 'text') return i
  }
  return -1
})

const render = (text: string) => renderAssistantMarkdown(text, true)

function statusLabel(block: ToolBlock) {
  return block.status === 'running' ? '运行中…' : block.status === 'done' ? '完成' : '失败'
}

function thinkDuration(block: ThinkBlock): number | undefined {
  if (block.durationMs !== undefined) return block.durationMs
  if (block.startedAt) return Date.now() - block.startedAt
  return undefined
}
</script>

<template>
  <div class="msg assistant">
    <div v-if="!blocks.length" class="waiting">
      <span class="dot" /><span class="dot" /><span class="dot" />
      <span class="wait-text">正在连接…</span>
    </div>

    <div v-else class="blocks">
      <template v-for="(block, i) in blocks" :key="i">
        <details v-if="block.kind === 'think'" class="think" open>
          <summary>
            <span class="think-dot" :class="{ pulse: !block.endedAt }" />
            <span>{{ block.endedAt ? '思考过程' : '思考中…' }}</span>
            <span v-if="thinkDuration(block) !== undefined" class="meta">
              {{ formatDuration(thinkDuration(block)) }}
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
            <span>工具执行失败，完成后可重试</span>
          </div>
        </div>

        <div
          v-else
          class="prose ai-md"
          :class="{ streaming: i === lastTextIndex && stream.status === 'streaming' }"
          v-html="render(block.text)"
        />
      </template>

      <ReferenceList v-if="stream.references?.length" :references="stream.references" />
    </div>
  </div>
</template>

<style scoped>
.msg {
  display: flex;
  flex-direction: column;
}

.blocks {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.waiting {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 0;
  color: var(--text-3);
  font-size: 12px;
}

.wait-text {
  margin-left: 4px;
}

.dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent);
  opacity: 0.4;
  animation: blink 1.2s infinite;
}

.dot:nth-child(2) {
  animation-delay: 0.15s;
}

.dot:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes blink {
  0%,
  100% {
    opacity: 0.25;
    transform: translateY(0);
  }
  50% {
    opacity: 1;
    transform: translateY(-2px);
  }
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

.think-dot.pulse {
  animation: think 1.1s ease-in-out infinite;
}

@keyframes think {
  50% {
    opacity: 0.35;
    transform: scale(0.7);
  }
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

.tool.error .tool-name {
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
  padding-top: 5px;
  border-top: 1px dashed rgba(255, 107, 129, 0.28);
  font-size: 10.5px;
  color: var(--danger);
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

.ai-md.streaming :deep(p:last-child)::after {
  content: '';
  display: inline-block;
  width: 2px;
  height: 1em;
  margin-left: 2px;
  vertical-align: -2px;
  background: var(--accent);
  animation: caret 1s steps(1) infinite;
}

@keyframes caret {
  50% {
    opacity: 0;
  }
}
</style>
