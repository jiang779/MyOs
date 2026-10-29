<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  addDocument,
  createBase,
  deleteBase,
  deleteDoc,
  listBases,
  listDocs,
  type KnowledgeBase,
  type KnowledgeDoc,
} from '@/ai/kb'
import { settings } from '@/ai/settings'

const bases = ref<KnowledgeBase[]>([])
const docs = ref<KnowledgeDoc[]>([])
const activeId = ref('')
const newName = ref('')
const loading = ref(true)
const uploading = ref(false)
const error = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const confirmBase = ref('')
const confirmDoc = ref('')

const activeBase = computed(() => bases.value.find((b) => b.id === activeId.value))

function msg(err: unknown): string {
  return err instanceof Error ? err.message : '操作失败'
}

async function refreshBases(select?: string) {
  bases.value = await listBases()
  if (select) activeId.value = select
  if (!activeId.value || !bases.value.some((b) => b.id === activeId.value)) {
    activeId.value = bases.value[0]?.id ?? ''
  }
  await refreshDocs()
}

async function refreshDocs() {
  docs.value = activeId.value ? await listDocs(activeId.value) : []
}

async function select(id: string) {
  activeId.value = id
  error.value = ''
  await refreshDocs()
}

async function create() {
  const name = newName.value.trim()
  if (!name) return
  error.value = ''
  try {
    const base = await createBase(name)
    newName.value = ''
    await refreshBases(base.id)
  } catch (err) {
    error.value = msg(err)
  }
}

async function removeBase(id: string) {
  if (confirmBase.value !== id) {
    confirmBase.value = id
    window.setTimeout(() => {
      if (confirmBase.value === id) confirmBase.value = ''
    }, 2600)
    return
  }
  confirmBase.value = ''
  await deleteBase(id)
  settings.knowledgeBaseIds = settings.knowledgeBaseIds.filter((x) => x !== id)
  if (activeId.value === id) activeId.value = ''
  await refreshBases()
}

async function removeDoc(id: string) {
  if (confirmDoc.value !== id) {
    confirmDoc.value = id
    window.setTimeout(() => {
      if (confirmDoc.value === id) confirmDoc.value = ''
    }, 2600)
    return
  }
  confirmDoc.value = ''
  await deleteDoc(id)
  await refreshBases(activeId.value)
}

function pick() {
  fileInput.value?.click()
}

async function upload(files: FileList | null) {
  if (!files?.length) return
  if (!activeId.value) {
    error.value = '先建一个知识库，再上传文档'
    return
  }
  uploading.value = true
  error.value = ''
  const failures: string[] = []

  try {
    for (const file of Array.from(files)) {
      try {
        await addDocument(activeId.value, file)
      } catch (err) {
        failures.push(`${file.name}：${msg(err)}`)
      }
    }
    await refreshBases(activeId.value)
  } finally {
    uploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }

  if (failures.length) error.value = failures.join('；')
}

function drop(event: DragEvent) {
  upload(event.dataTransfer?.files ?? null)
}

function isBound(id: string) {
  return settings.knowledgeBaseIds.includes(id)
}

function toggleBind(id: string, checked: boolean) {
  const set = new Set(settings.knowledgeBaseIds)
  if (checked) set.add(id)
  else set.delete(id)
  settings.knowledgeBaseIds = [...set]
}

function fmtSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`
  return `${bytes} B`
}

function fmtDate(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

onMounted(async () => {
  try {
    await refreshBases()
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="kb-page">
    <header class="page-head">
      <div class="eyebrow">RAG · 本地知识库</div>
      <h1>知识库</h1>
      <p class="desc">
        上传资料，勾选绑定到助手。回答时先检索最相关的片段，再在末尾附上引用。
      </p>
    </header>

    <div v-if="error" class="notice err">{{ error }}</div>

    <div class="kb-grid">
      <aside class="card kb-side">
        <div class="side-head">
          <b>知识库</b>
          <span>{{ bases.length }}</span>
        </div>

        <div class="create">
          <input
            v-model="newName"
            maxlength="40"
            placeholder="新知识库名称"
            @keydown.enter="create"
          />
          <button type="button" class="btn primary" :disabled="!newName.trim()" @click="create">
            新建
          </button>
        </div>

        <div v-if="loading" class="side-empty">读取中…</div>
        <ul v-else-if="bases.length" class="base-list">
          <li
            v-for="base in bases"
            :key="base.id"
            :class="{ active: base.id === activeId }"
            @click="select(base.id)"
          >
            <div class="base-main">
              <b>{{ base.name }}</b>
              <span>{{ base.docCount }} 文档 · {{ base.chunkCount }} 片段</span>
            </div>
            <div class="base-side">
              <label class="bind" :class="{ on: isBound(base.id) }" @click.stop>
                <input
                  type="checkbox"
                  :checked="isBound(base.id)"
                  @change="toggleBind(base.id, ($event.target as HTMLInputElement).checked)"
                />
                绑定
              </label>
              <button
                type="button"
                class="del"
                :class="{ danger: confirmBase === base.id }"
                :title="confirmBase === base.id ? '再点一次删除' : '删除知识库'"
                @click.stop="removeBase(base.id)"
              >
                {{ confirmBase === base.id ? '确认?' : '删除' }}
              </button>
            </div>
          </li>
        </ul>
        <div v-else class="side-empty">还没有知识库，先建一个。</div>

        <p class="side-hint">勾选「绑定」后，助手回答会使用这些知识库。</p>
      </aside>

      <section class="card kb-main" @dragover.prevent @drop.prevent="drop">
        <div class="main-head">
          <div class="main-title">
            <h2>{{ activeBase?.name || '选择一个知识库' }}</h2>
            <span v-if="activeBase">
              {{ activeBase.docCount }} 个文档 · {{ activeBase.chunkCount }} 个片段
            </span>
            <span v-else>从左侧选择，或先新建</span>
          </div>

          <button
            type="button"
            class="btn primary"
            :disabled="!activeId || uploading"
            @click="pick"
          >
            {{ uploading ? '解析中…' : '上传文档' }}
          </button>
          <input
            ref="fileInput"
            type="file"
            accept=".txt,.md,.markdown,.pdf,.docx"
            multiple
            hidden
            @change="upload(($event.target as HTMLInputElement).files)"
          />
        </div>

        <p class="upload-hint">
          支持 txt / md / pdf / docx · 单文件 ≤ 10MB · 可多选 · 也可以直接拖进这个区域
        </p>

        <div v-if="activeBase && docs.length" class="doc-list">
          <article v-for="doc in docs" :key="doc.id" class="doc">
            <span class="ext">{{ doc.ext }}</span>
            <div class="doc-main">
              <div class="doc-top">
                <b>{{ doc.name }}</b>
                <span>{{ fmtSize(doc.size) }} · {{ doc.chunkCount }} 片段 · {{ fmtDate(doc.createdAt) }}</span>
              </div>
              <p>{{ doc.preview }}</p>
            </div>
            <button
              type="button"
              class="del"
              :class="{ danger: confirmDoc === doc.id }"
              :title="confirmDoc === doc.id ? '再点一次删除' : '删除文档'"
              @click="removeDoc(doc.id)"
            >
              {{ confirmDoc === doc.id ? '确认?' : '删除' }}
            </button>
          </article>
        </div>

        <div v-else class="drop" :class="{ disabled: !activeId }" @click="pick">
          <div class="drop-icon">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 16V4M7 9l5-5 5 5" />
              <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
            </svg>
          </div>
          <p>{{ activeId ? '把资料拖到这里，或点击上传' : '先新建一个知识库' }}</p>
          <span>txt / md / pdf / docx</span>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.kb-page {
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
  max-width: 620px;
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

.kb-grid {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.kb-side,
.kb-main {
  padding: 16px;
}

.side-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 13px;
}

.side-head span {
  font-size: 11px;
  color: var(--text-3);
}

.create {
  display: flex;
  gap: 6px;
}

.create input {
  flex: 1;
  min-width: 0;
  padding: 8px 10px;
  border-radius: 9px;
  border: 1px solid var(--line);
  background: var(--surface-2);
  color: var(--text);
  font: inherit;
  font-size: 12px;
  outline: none;
}

.create input:focus {
  border-color: var(--accent-line);
  background: var(--surface-solid);
}

.create .btn {
  flex: none;
  padding: 0 14px;
  font-size: 12px;
}

.base-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.base-list li {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 9px;
  border-radius: 10px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.18s var(--ease);
}

.base-list li:hover {
  background: var(--surface-2);
}

.base-list li.active {
  background: var(--accent-soft);
  border-color: var(--accent-line);
}

.base-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.base-main b {
  font-size: 12px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.base-main span {
  font-size: 10px;
  color: var(--text-3);
}

.base-side {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.bind {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 9.5px;
  color: var(--text-3);
  cursor: pointer;
}

.bind.on {
  color: var(--accent);
}

.bind input {
  width: 11px;
  height: 11px;
  accent-color: var(--accent);
}

.del {
  padding: 1px 4px;
  border-radius: 5px;
  font-size: 9.5px;
  color: var(--text-3);
  transition: all 0.18s var(--ease);
}

.del:hover,
.del.danger {
  color: var(--danger);
  background: rgba(255, 107, 129, 0.1);
}

.side-empty {
  margin-top: 14px;
  padding: 18px 8px;
  text-align: center;
  font-size: 11.5px;
  color: var(--text-3);
}

.side-hint {
  margin-top: 14px;
  padding-top: 10px;
  border-top: 1px solid var(--line);
  font-size: 10px;
  line-height: 1.6;
  color: var(--text-3);
}

.main-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.main-title h2 {
  margin: 0 0 3px;
  font-size: 17px;
  letter-spacing: -0.01em;
}

.main-title span {
  font-size: 11px;
  color: var(--text-3);
}

.main-head .btn {
  flex: none;
  padding: 0 16px;
  height: 34px;
  font-size: 12px;
}

.upload-hint {
  margin: 8px 0 14px;
  font-size: 10.5px;
  color: var(--text-3);
}

.doc-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.doc {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 11px;
  border: 1px solid var(--line);
  background: var(--surface-2);
}

.ext {
  flex: none;
  width: 34px;
  padding: 3px 0;
  border-radius: 6px;
  background: var(--surface-solid);
  border: 1px solid var(--line-strong);
  text-align: center;
  font-size: 9px;
  text-transform: uppercase;
  color: var(--text-3);
}

.doc-main {
  flex: 1;
  min-width: 0;
}

.doc-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.doc-top b {
  font-size: 12px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.doc-top span {
  flex: none;
  font-size: 9.5px;
  color: var(--text-3);
}

.doc p {
  margin: 4px 0 0;
  font-size: 10.5px;
  line-height: 1.55;
  color: var(--text-3);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.drop {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 300px;
  border: 1px dashed var(--line-strong);
  border-radius: 14px;
  background: var(--surface-2);
  cursor: pointer;
  transition: all 0.2s var(--ease);
}

.drop:hover {
  border-color: var(--accent-line);
  background: var(--accent-soft);
}

.drop.disabled {
  cursor: default;
  opacity: 0.7;
}

.drop-icon {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--surface-solid);
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
  .kb-grid {
    grid-template-columns: 1fr;
  }

  .drop {
    min-height: 220px;
  }
}
</style>
