<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  createServer,
  deleteServer,
  getSelectedToolIds,
  listServers,
  listTools,
  saveTools,
  setServerEnabled,
  setToolEnabled,
  syncServer,
  type McpServer,
  type McpTool,
  type McpTransport,
} from '@/ai/mcp'
import { assistant } from '@/ai/store'

const servers = ref<McpServer[]>([])
const tools = ref<McpTool[]>([])
const activeId = ref('')
const selected = ref<string[]>([])
const loading = ref(true)
const syncing = ref('')
const error = ref('')
const confirmServer = ref('')
const form = reactive({
  name: '',
  transport: 'http' as McpTransport,
  endpoint: '',
  command: '',
})

const activeServer = computed(() => servers.value.find((s) => s.id === activeId.value))
const activeTools = computed(() => tools.value.filter((t) => t.serverId === activeId.value))
const serverName = (id: string) => servers.value.find((s) => s.id === id)?.name ?? ''
const selectableTools = computed(() =>
  tools.value.filter(
    (tool) => tool.enabled && servers.value.find((s) => s.id === tool.serverId)?.enabled
  )
)
const conversationTitle = computed(
  () => assistant.state.conversations.find((c) => c.id === assistant.state.activeId)?.title ?? '未选择会话'
)

function msg(err: unknown): string {
  return err instanceof Error ? err.message : '操作失败'
}

async function refresh() {
  servers.value = await listServers()
  tools.value = await listTools()
  if (!activeId.value || !servers.value.some((s) => s.id === activeId.value)) {
    activeId.value = servers.value[0]?.id ?? ''
  }
  loadSelection()
}

function loadSelection() {
  const conversationId = assistant.state.activeId
  const saved = getSelectedToolIds(conversationId)
  const valid = new Set(selectableTools.value.map((t) => t.id))
  const pruned = saved.filter((id) => valid.has(id))
  selected.value = pruned
  if (conversationId && pruned.length !== saved.length) {
    saveTools(conversationId, pruned)
  }
}

function isSelected(id: string) {
  return selected.value.includes(id)
}

function toggleSelected(id: string, checked: boolean) {
  const set = new Set(selected.value)
  if (checked) set.add(id)
  else set.delete(id)
  selected.value = [...set]
  saveTools(assistant.state.activeId, selected.value)
}

function selectAll() {
  selected.value = selectableTools.value.map((t) => t.id)
  saveTools(assistant.state.activeId, selected.value)
}

function clearSelection() {
  selected.value = []
  saveTools(assistant.state.activeId, selected.value)
}

async function addServer() {
  error.value = ''
  try {
    const server = await createServer({
      name: form.name,
      transport: form.transport,
      endpoint: form.endpoint,
      command: form.command,
    })
    form.name = ''
    form.endpoint = ''
    form.command = ''
    await refresh()
    activeId.value = server.id
  } catch (err) {
    error.value = msg(err)
  }
}

async function removeServer(id: string) {
  if (confirmServer.value !== id) {
    confirmServer.value = id
    window.setTimeout(() => {
      if (confirmServer.value === id) confirmServer.value = ''
    }, 2600)
    return
  }
  confirmServer.value = ''
  await deleteServer(id)
  loadSelection()
  await refresh()
}

async function toggleServer(server: McpServer, enabled: boolean) {
  await setServerEnabled(server.id, enabled)
  await refresh()
}

async function toggleToolEnabled(tool: McpTool, enabled: boolean) {
  await setToolEnabled(tool.id, enabled)
  await refresh()
}

async function runSync(id: string) {
  syncing.value = id
  error.value = ''
  try {
    await syncServer(id)
    await refresh()
  } catch (err) {
    error.value = msg(err)
    await refresh()
  } finally {
    syncing.value = ''
  }
}

function fmtDate(ts?: number): string {
  if (!ts) return '未同步'
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function schema(value: unknown): string {
  if (value === undefined) return ''
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

watch(
  () => assistant.state.activeId,
  () => loadSelection()
)

onMounted(async () => {
  try {
    await assistant.init()
    await refresh()
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="tools-page">
    <header class="page-head">
      <div class="eyebrow">MCP · 工具注册</div>
      <h1>工具</h1>
      <p class="desc">
        接入 MCP 服务，同步工具列表，勾选当前会话要暴露给模型的工具。调用结果会以工具卡片显示在回答里。
      </p>
    </header>

    <div v-if="error" class="notice err">{{ error }}</div>

    <section class="card session-card">
      <div class="session-head">
        <div class="session-title">
          <span class="dot" />
          <b>当前会话</b>
          <span class="conv">{{ conversationTitle }}</span>
          <span class="auto">勾选后自动保存</span>
        </div>
        <div class="session-actions">
          <span class="count">{{ selected.length }} / {{ selectableTools.length }}</span>
          <button type="button" class="mini" @click="selectAll">全选</button>
          <button type="button" class="mini" @click="clearSelection">清空</button>
        </div>
      </div>

      <div v-if="loading" class="empty">读取中…</div>
      <div v-else-if="selectableTools.length" class="chips">
        <label
          v-for="tool in selectableTools"
          :key="tool.id"
          class="chip"
          :class="{ on: isSelected(tool.id) }"
          :title="tool.description"
        >
          <input
            type="checkbox"
            :checked="isSelected(tool.id)"
            @change="toggleSelected(tool.id, ($event.target as HTMLInputElement).checked)"
          />
          <span class="chip-name">{{ tool.title || tool.name }}</span>
          <span class="chip-server">{{ serverName(tool.serverId) }}</span>
        </label>
      </div>
      <div v-else class="empty">
        还没有可用工具。先在下面接入一个 MCP 服务并同步；停用的服务/工具不会出现在这里。
      </div>
    </section>

    <div class="tools-grid">
      <aside class="card side">
        <div class="side-head">
          <b>MCP 服务</b>
          <span>{{ servers.length }}</span>
        </div>

        <div class="add">
          <input v-model="form.name" maxlength="40" placeholder="服务名称，例如 本地工具" />
          <select v-model="form.transport">
            <option value="http">HTTP</option>
            <option value="sse">SSE</option>
            <option value="command">Command</option>
          </select>
          <input
            v-if="form.transport === 'command'"
            v-model="form.command"
            placeholder="node scripts/mock-mcp-server.mjs"
          />
          <input
            v-else
            v-model="form.endpoint"
            :placeholder="
              form.transport === 'sse'
                ? 'http://127.0.0.1:5198/mcp/sse'
                : 'http://127.0.0.1:5198/mcp/http'
            "
          />
          <button type="button" class="btn primary" :disabled="!form.name.trim()" @click="addServer">
            新增服务
          </button>
          <p v-if="form.transport === 'command'" class="hint">
            command 需要先运行 <code>node scripts/mcp-bridge.mjs</code>；bridge 会在本机执行该命令，仅限开发使用。
          </p>
          <p v-else class="hint">
            HTTP 直接 POST <code>tools/list</code>；SSE 会先走 MCP 握手再取工具。
          </p>
        </div>

        <ul v-if="servers.length" class="server-list">
          <li
            v-for="server in servers"
            :key="server.id"
            :class="{ active: server.id === activeId, off: !server.enabled }"
            @click="activeId = server.id"
          >
            <div class="server-main">
              <div class="server-top">
                <span class="transport" :class="server.transport">{{ server.transport }}</span>
                <b>{{ server.name }}</b>
                <label class="switch" @click.stop>
                  <input
                    type="checkbox"
                    :checked="server.enabled"
                    @change="toggleServer(server, ($event.target as HTMLInputElement).checked)"
                  />
                  启用
                </label>
              </div>
              <code class="server-endpoint">{{ server.endpoint || server.command }}</code>
              <div class="server-meta">
                <span>同步：{{ fmtDate(server.lastSyncAt) }}</span>
                <span v-if="server.error" class="server-error" :title="server.error">同步失败</span>
              </div>
            </div>
            <div class="server-actions" @click.stop>
              <button
                type="button"
                class="sync"
                :disabled="syncing === server.id"
                @click="runSync(server.id)"
              >
                {{ syncing === server.id ? '同步中…' : '同步' }}
              </button>
              <button
                type="button"
                class="del"
                :class="{ danger: confirmServer === server.id }"
                :title="confirmServer === server.id ? '再点一次删除' : '删除服务'"
                @click="removeServer(server.id)"
              >
                {{ confirmServer === server.id ? '确认?' : '删除' }}
              </button>
            </div>
          </li>
        </ul>
        <div v-else class="side-empty">还没有 MCP 服务。</div>
      </aside>

      <section class="card main-card">
        <div class="main-head">
          <div>
            <h2>{{ activeServer?.name || '选择一个服务' }}</h2>
            <span v-if="activeServer">
              {{ activeServer.transport.toUpperCase() }} · {{ activeTools.length }} 个工具
            </span>
            <span v-else>从左侧选择，或先新增</span>
          </div>
          <button
            v-if="activeServer"
            type="button"
            class="btn primary"
            :disabled="syncing === activeServer.id"
            @click="runSync(activeServer.id)"
          >
            {{ syncing === activeServer.id ? '同步中…' : '同步工具' }}
          </button>
        </div>

        <div v-if="activeServer?.error" class="sync-error">{{ activeServer.error }}</div>

        <div v-if="activeTools.length" class="tool-list">
          <article v-for="tool in activeTools" :key="tool.id" class="tool-item" :class="{ off: !tool.enabled }">
            <div class="tool-top">
              <div class="tool-name">
                <b>{{ tool.title || tool.name }}</b>
                <code>{{ tool.name }}</code>
              </div>
              <label class="switch" @click.stop>
                <input
                  type="checkbox"
                  :checked="tool.enabled"
                  @change="toggleToolEnabled(tool, ($event.target as HTMLInputElement).checked)"
                />
                启用
              </label>
            </div>
            <p class="tool-desc">{{ tool.description || '没有描述' }}</p>
            <details v-if="tool.inputSchema" class="schema">
              <summary>参数结构</summary>
              <pre>{{ schema(tool.inputSchema) }}</pre>
            </details>
          </article>
        </div>

        <div v-else class="drop">
          <div class="drop-icon">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 3v5M15 3v5" />
              <path d="M6 8h12v3a6 6 0 0 1-12 0V8z" />
              <path d="M12 17v4" />
            </svg>
          </div>
          <p>{{ activeServer ? '还没有工具，点「同步工具」拉取' : '先新增一个 MCP 服务' }}</p>
          <span>http / sse / command</span>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.tools-page {
  max-width: 1180px;
}

.eyebrow {
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent);
}

.page-head h1 {
  margin: 6px 0 8px;
  font-size: 36px;
  letter-spacing: -0.03em;
}

.desc {
  max-width: 680px;
  color: var(--text-3);
  font-size: 13px;
  line-height: 1.7;
}

.notice {
  margin-bottom: 14px;
  padding: 9px 12px;
  border-radius: 10px;
  font-size: 12px;
}

.notice.err {
  color: var(--danger);
  border: 1px solid rgba(255, 107, 129, 0.28);
  background: rgba(255, 107, 129, 0.08);
}

.session-card {
  padding: 14px 16px;
  margin-bottom: 16px;
}

.session-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.session-title {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  font-size: 12.5px;
}

.session-title .dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent-2);
  box-shadow: 0 0 8px var(--accent-2);
}

.conv {
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-3);
  font-size: 11.5px;
}

.auto {
  color: var(--text-3);
  font-size: 10px;
  opacity: 0.8;
}

.session-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: none;
}

.count {
  font-size: 11px;
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
}

.mini {
  padding: 3px 9px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--surface-2);
  color: var(--text-3);
  font-size: 10.5px;
}

.mini:hover {
  color: var(--accent);
  border-color: var(--accent-line);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 9px;
  border-radius: 9px;
  border: 1px solid var(--line);
  background: var(--surface-2);
  font-size: 11px;
  color: var(--text-2);
  cursor: pointer;
  transition: all 0.18s var(--ease);
}

.chip:hover {
  border-color: var(--accent-line);
}

.chip.on {
  border-color: var(--accent-line);
  background: var(--accent-soft);
  color: var(--text);
}

.chip input {
  accent-color: var(--accent);
}

.chip-name {
  font-weight: 500;
}

.chip-server {
  font-size: 9.5px;
  color: var(--text-3);
}

.empty {
  padding: 10px 2px;
  font-size: 11.5px;
  color: var(--text-3);
}

.tools-grid {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.side,
.main-card {
  padding: 16px;
}

.side-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 13px;
}

.side-head span {
  color: var(--text-3);
  font-size: 11px;
}

.add {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.add input,
.add select {
  width: 100%;
  padding: 8px 10px;
  border-radius: 9px;
  border: 1px solid var(--line);
  background: var(--surface-2);
  color: var(--text);
  font: inherit;
  font-size: 11.5px;
  outline: none;
}

.add input:focus,
.add select:focus {
  border-color: var(--accent-line);
  background: var(--surface-solid);
}

.add .btn {
  height: 32px;
  font-size: 11.5px;
}

.hint {
  margin: 2px 0 0;
  font-size: 9.5px;
  line-height: 1.55;
  color: var(--text-3);
}

.hint code {
  font-size: 9px;
  color: var(--text-2);
}

.server-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.server-list li {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 9px;
  border-radius: 10px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.18s var(--ease);
}

.server-list li:hover {
  background: var(--surface-2);
}

.server-list li.active {
  border-color: var(--accent-line);
  background: var(--accent-soft);
}

.server-list li.off {
  opacity: 0.55;
}

.server-main {
  min-width: 0;
}

.server-top {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.server-top b {
  flex: 1;
  min-width: 0;
  font-size: 11.5px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.transport {
  flex: none;
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 8.5px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: var(--surface-solid);
  border: 1px solid var(--line-strong);
  color: var(--text-3);
}

.transport.sse {
  color: var(--accent);
}

.transport.command {
  color: var(--warn, #f5a524);
}

.switch {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex: none;
  font-size: 9.5px;
  color: var(--text-3);
  cursor: pointer;
}

.switch input {
  width: 11px;
  height: 11px;
  accent-color: var(--accent);
}

.server-endpoint {
  display: block;
  margin-top: 4px;
  font-size: 9px;
  color: var(--text-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.server-meta {
  display: flex;
  justify-content: space-between;
  gap: 6px;
  margin-top: 3px;
  font-size: 9px;
  color: var(--text-3);
}

.server-error {
  color: var(--danger);
}

.server-actions {
  display: flex;
  gap: 4px;
  justify-content: flex-end;
}

.sync,
.del {
  padding: 2px 8px;
  border-radius: 6px;
  border: 1px solid var(--line);
  background: var(--surface-solid);
  color: var(--text-3);
  font-size: 9.5px;
}

.sync:hover {
  color: var(--accent);
  border-color: var(--accent-line);
}

.del:hover,
.del.danger {
  color: var(--danger);
  border-color: rgba(255, 107, 129, 0.35);
  background: rgba(255, 107, 129, 0.08);
}

.side-empty {
  padding: 18px 0;
  text-align: center;
  font-size: 11px;
  color: var(--text-3);
}

.main-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.main-head h2 {
  margin: 0 0 3px;
  font-size: 17px;
}

.main-head span {
  font-size: 11px;
  color: var(--text-3);
}

.main-head .btn {
  flex: none;
  height: 32px;
  padding: 0 14px;
  font-size: 11.5px;
}

.sync-error {
  margin-bottom: 10px;
  padding: 7px 9px;
  border-radius: 8px;
  border: 1px solid rgba(255, 107, 129, 0.28);
  background: rgba(255, 107, 129, 0.08);
  color: var(--danger);
  font-size: 10.5px;
  line-height: 1.5;
  word-break: break-word;
}

.tool-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tool-item {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: var(--surface-2);
}

.tool-item.off {
  opacity: 0.55;
}

.tool-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.tool-name {
  min-width: 0;
}

.tool-name b {
  font-size: 12px;
  font-weight: 500;
}

.tool-name code {
  display: block;
  margin-top: 2px;
  font-size: 9px;
  color: var(--text-3);
}

.tool-desc {
  margin: 5px 0 0;
  font-size: 10.5px;
  line-height: 1.6;
  color: var(--text-3);
}

.schema {
  margin-top: 6px;
  border-top: 1px dashed var(--line-strong);
  padding-top: 5px;
}

.schema summary {
  font-size: 9.5px;
  color: var(--text-3);
  cursor: pointer;
  list-style: none;
}

.schema summary::-webkit-details-marker {
  display: none;
}

.schema summary::before {
  content: '▸';
  margin-right: 4px;
}

.schema[open] summary::before {
  display: inline-block;
  transform: rotate(90deg);
}

.schema pre {
  margin: 5px 0 0;
  max-height: 180px;
  overflow: auto;
  padding: 7px 9px;
  border-radius: 7px;
  background: var(--surface-solid);
  border: 1px solid var(--line);
  font-size: 9.5px;
  line-height: 1.55;
  color: var(--text-2);
  white-space: pre-wrap;
  word-break: break-word;
}

.drop {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 280px;
  border: 1px dashed var(--line-strong);
  border-radius: 13px;
  background: var(--surface-2);
}

.drop-icon {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: var(--surface-solid);
  border: 1px solid var(--line);
  color: var(--accent);
}

.drop p {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--text-2);
}

.drop span {
  font-size: 10px;
  color: var(--text-3);
}

@media (max-width: 900px) {
  .tools-grid {
    grid-template-columns: 1fr;
  }

  .session-head {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
