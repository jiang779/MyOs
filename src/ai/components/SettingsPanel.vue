<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { listBases, type KnowledgeBase } from '../kb'
import { getSelectedToolIds } from '../mcp'
import { MODEL_SUGGESTIONS, settings } from '../settings'
import { assistant } from '../store'

defineEmits<{ (e: 'close'): void }>()
const router = useRouter()

const bases = ref<KnowledgeBase[]>([])
const loading = ref(true)
const toolCount = ref(0)

onMounted(async () => {
  toolCount.value = getSelectedToolIds(assistant.state.activeId).length
  try {
    bases.value = await listBases()
  } finally {
    loading.value = false
  }
})

const boundCount = computed(() => settings.knowledgeBaseIds.length)

function toggleBase(id: string, checked: boolean) {
  const set = new Set(settings.knowledgeBaseIds)
  if (checked) set.add(id)
  else set.delete(id)
  settings.knowledgeBaseIds = [...set]
}

function normalizeTokens() {
  settings.maxTokens = Math.round(
    Math.min(8192, Math.max(256, Number(settings.maxTokens) || 2048))
  )
}

function manage() {
  assistant.togglePanel(false)
  void router.push('/knowledge')
}

function manageTools() {
  assistant.togglePanel(false)
  void router.push('/tools')
}
</script>

<template>
  <div class="settings">
    <div class="set-head">
      <button type="button" aria-label="返回对话" @click="$emit('close')">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 5l-7 7 7 7" />
        </svg>
      </button>
      <b>设置</b>
      <span class="auto">自动保存</span>
    </div>

    <div class="set-body">
      <section>
        <div class="row">
          <label for="ai-model">模型</label>
          <span class="value">{{ settings.model || '默认' }}</span>
        </div>
        <input
          id="ai-model"
          v-model.trim="settings.model"
          class="text"
          list="ai-model-options"
          placeholder="留空使用 .env 里的 VITE_ARK_MODEL"
        />
        <datalist id="ai-model-options">
          <option v-for="model in MODEL_SUGGESTIONS" :key="model" :value="model" />
        </datalist>
        <p class="hint">可输入任意模型 ID；直连模式会直接发给模型服务。</p>
      </section>

      <section>
        <div class="row">
          <label for="ai-temp">温度</label>
          <span class="value">{{ settings.temperature.toFixed(1) }}</span>
        </div>
        <input
          id="ai-temp"
          v-model.number="settings.temperature"
          class="range"
          type="range"
          min="0"
          max="2"
          step="0.1"
        />
        <div class="scale"><span>更稳定</span><span>更发散</span></div>
      </section>

      <section>
        <div class="row">
          <label for="ai-tokens">最大 token</label>
          <span class="value">{{ settings.maxTokens }}</span>
        </div>
        <input
          id="ai-tokens"
          v-model.number="settings.maxTokens"
          class="text"
          type="number"
          min="256"
          max="8192"
          step="256"
          @change="normalizeTokens"
        />
        <p class="hint">256 – 8192，超出范围会自动收敛。</p>
      </section>

      <section>
        <div class="row">
          <label>知识库</label>
          <span class="value">{{ boundCount }} 个已绑定</span>
        </div>
        <p class="hint">可多选；回答会根据检索结果附带引用。</p>

        <div v-if="loading" class="hint muted">正在读取…</div>
        <ul v-else-if="bases.length" class="kb-list">
          <li v-for="base in bases" :key="base.id">
            <label class="kb-item">
              <input
                type="checkbox"
                :checked="settings.knowledgeBaseIds.includes(base.id)"
                @change="toggleBase(base.id, ($event.target as HTMLInputElement).checked)"
              />
              <span class="kb-name">{{ base.name }}</span>
              <span class="kb-meta">{{ base.docCount }} 文档 · {{ base.chunkCount }} 片段</span>
            </label>
          </li>
        </ul>
        <p v-else class="hint muted">还没有知识库，先建一个再绑定。</p>

        <button type="button" class="manage" @click="manage">管理知识库 →</button>
      </section>

      <section>
        <div class="row">
          <label>工具</label>
          <span class="value">{{ toolCount }} 个已暴露</span>
        </div>
        <p class="hint">只对当前会话生效；在工具页勾选要暴露给模型的 MCP 工具。</p>
        <button type="button" class="manage" @click="manageTools">管理工具 →</button>
      </section>
    </div>
  </div>
</template>

<style scoped>
.settings {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--surface-solid);
}

.set-head {
  flex: none;
  height: 44px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  border-bottom: 1px solid var(--line);
  font-size: 12.5px;
}

.set-head button {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  color: var(--text-3);
}

.set-head button:hover {
  color: var(--text);
  background: var(--surface-2);
}

.auto {
  margin-left: auto;
  font-size: 10px;
  color: var(--text-3);
}

.set-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

section {
  padding: 14px 16px;
  border-bottom: 1px solid var(--line);
}

section:last-child {
  border-bottom: 0;
}

.row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

label {
  font-size: 12px;
  color: var(--text);
}

.value {
  font-size: 10.5px;
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
}

.text {
  width: 100%;
  padding: 8px 10px;
  border-radius: 9px;
  border: 1px solid var(--line);
  background: var(--surface-2);
  color: var(--text);
  font: inherit;
  font-size: 12px;
  outline: none;
}

.text:focus {
  border-color: var(--accent-line);
  background: var(--surface-solid);
}

.range {
  width: 100%;
  accent-color: var(--accent);
}

.scale {
  display: flex;
  justify-content: space-between;
  margin-top: 3px;
  font-size: 9.5px;
  color: var(--text-3);
}

.hint {
  margin: 6px 0 0;
  font-size: 10.5px;
  line-height: 1.55;
  color: var(--text-3);
}

.hint.muted {
  opacity: 0.8;
}

.kb-list {
  margin: 8px 0 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.kb-item {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 8px;
  border-radius: 9px;
  border: 1px solid var(--line);
  background: var(--surface-2);
  cursor: pointer;
  transition: all 0.18s var(--ease);
}

.kb-item:hover {
  border-color: var(--accent-line);
}

.kb-item input {
  flex: none;
  accent-color: var(--accent);
}

.kb-name {
  flex: 1;
  min-width: 0;
  font-size: 11.5px;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kb-meta {
  flex: none;
  font-size: 9.5px;
  color: var(--text-3);
}

.manage {
  margin-top: 10px;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--surface-solid);
  color: var(--text-2);
  font-size: 11px;
  transition: all 0.18s var(--ease);
}

.manage:hover {
  border-color: var(--accent-line);
  color: var(--accent);
}
</style>
