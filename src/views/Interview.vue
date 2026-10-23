<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHead from '@/components/PageHead.vue'
import SideSheet from '@/components/SideSheet.vue'
import AppIcon from '@/components/AppIcon.vue'
import ProgressBar from '@/components/ProgressBar.vue'
import { interviewGroups, interviewQuestions, interviewNotesForType, type InterviewGroup } from '@/lib/data'
import { isInterviewDone, importInterviewDone, state, toggleInterviewDone } from '@/lib/store'

/* 类型卡展开/收起：默认全部收起（同 agent 阶段卡） */
const expanded = ref<Set<string>>(new Set())
const isExpanded = (k: string) => expanded.value.has(k)
function toggleType(k: string) {
  const next = new Set(expanded.value)
  next.has(k) ? next.delete(k) : next.add(k)
  expanded.value = next
}

/* 抽屉：某类型的答案笔记 */
const active = ref<InterviewGroup | null>(null)
const openNotes = (g: InterviewGroup) => {
  active.value = g
}
const activeNotes = computed(() => (active.value ? interviewNotesForType(active.value.fileName) : []))
const noteCountOf = (fileName: string) => interviewNotesForType(fileName).length
/** 笔记目录名，给空状态里的提示用 */
const noteDir = (fileName: string) => `data/interview-notes/${fileName}/`

/* 答题进度：记录哪道题完成了 + 导出/导入备份（状态落到项目 json，不怕清 localStorage） */
const totalCount = interviewQuestions.length
const doneCount = computed(() => interviewQuestions.filter((q) => isInterviewDone(q.id)).length)

const notice = ref('')
let noticeTimer: number | undefined
function flash(msg: string) {
  notice.value = msg
  window.clearTimeout(noticeTimer)
  noticeTimer = window.setTimeout(() => (notice.value = ''), 3200)
}

const fileInput = ref<HTMLInputElement | null>(null)

function exportProgress() {
  const payload = {
    app: 'my-os',
    kind: 'interview-progress',
    version: 1,
    exportedAt: new Date().toISOString(),
    total: totalCount,
    done: state.interviewDone,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `interview-progress-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  flash(`已导出 ${doneCount.value} 题进度`)
}

async function importProgress(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    const parsed: unknown = JSON.parse(await file.text())
    const rec = (parsed as { done?: unknown } | null)?.done ?? parsed
    const n = importInterviewDone(rec)
    flash(n > 0 ? `已导入 ${n} 题完成进度` : '没有新进度（题目都已完成）')
  } catch {
    flash('这个文件读不出来，请选导出的 JSON 进度文件')
  } finally {
    input.value = ''
  }
}
</script>

<template>
  <div>
    <PageHead
      kicker="面试题库 · 按类型分组"
      title="面试题"
      sub="题目在 data/interview/*.md，答案一行行写在 data/interview-notes/<类型>/ 里，手动加 md 即自动出现。"
    >
      <template #actions>
        <span class="pill">{{ interviewQuestions.length }} 题</span>
      </template>
    </PageHead>

    <!-- 类型卡：阶段卡样式，题目直接铺开 -->
    <section
      v-for="(g, idx) in interviewGroups"
      :key="g.fileName"
      class="card stage-card fade-up"
      :class="{ collapsed: !isExpanded(g.fileName) }"
    >
      <header
        class="stage-head"
        role="button"
        tabindex="0"
        :aria-expanded="isExpanded(g.fileName)"
        @click="toggleType(g.fileName)"
        @keydown.enter.prevent="toggleType(g.fileName)"
        @keydown.space.prevent="toggleType(g.fileName)"
      >
        <div class="stage-no">{{ idx + 1 }}</div>
        <div class="col grow">
          <b class="stage-title">{{ g.type }}</b>
          <span class="tiny muted">共 {{ g.questions.length }} 题</span>
        </div>
        <button
          class="note-btn"
          :class="{ none: !noteCountOf(g.fileName) }"
          @click.stop="openNotes(g)"
        >
          <AppIcon name="note" :size="13" />
          <span>查看笔记</span>
          <span class="note-n">{{ noteCountOf(g.fileName) }}</span>
        </button>
        <span class="stage-chev" :class="{ open: isExpanded(g.fileName) }">
          <AppIcon name="chevron" :size="18" />
        </span>
      </header>

      <div class="stage-body" :class="{ open: isExpanded(g.fileName) }">
        <div class="stage-body-inner">
          <ul class="q-list">
            <li
              v-for="(q, i) in g.questions"
              :key="q.id"
              class="q-item"
              :class="{ done: isInterviewDone(q.id) }"
              @click="toggleInterviewDone(q.id)"
            >
              <span class="q-no">{{ String(i + 1).padStart(2, '0') }}</span>
              <span class="q-text">{{ q.text }}</span>
              <button
                class="q-check"
                :class="{ on: isInterviewDone(q.id) }"
                type="button"
                :aria-label="isInterviewDone(q.id) ? '取消完成' : '标记完成'"
                @click.stop="toggleInterviewDone(q.id)"
              >
                <AppIcon v-if="isInterviewDone(q.id)" name="check" :size="12" />
              </button>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <div v-if="!interviewGroups.length" class="empty">还没有面试题。</div>

    <!-- 某类型的答案笔记抽屉 -->
    <SideSheet
      :open="!!active"
      :kicker="active?.type"
      :title="active ? `${active.type} · 答案笔记` : ''"
      @close="active = null"
    >
      <template v-if="active">
        <ul v-if="activeNotes.length" class="note-list">
          <li v-for="n in activeNotes" :key="n.slug">
            <RouterLink
              class="note-item"
              :to="{ name: 'interview-note', params: { type: active!.fileName, slug: n.slug } }"
            >
              <span class="note-ico"><AppIcon name="note" :size="15" /></span>
              <span class="col grow" style="min-width: 0; gap: 3px">
                <b class="note-name">{{ n.title }}</b>
                <span class="tiny muted">
                  {{ n.date || '未标日期' }}{{ n.tags.length ? ' · ' + n.tags.join(' / ') : '' }}
                </span>
              </span>
              <AppIcon name="arrow" :size="15" class="note-go" />
            </RouterLink>
          </li>
        </ul>

        <div v-else class="note-empty">
          <span class="note-empty-ico"><AppIcon name="note" :size="26" /></span>
          <b>这一类型还没有答案笔记</b>
          <p class="tiny muted">
            在项目的 <code>{{ noteDir(active.fileName) }}</code> 目录下新建一个
            <code>.md</code> 文件就行，文件名就是题目，内容写你的答案。
          </p>
        </div>
      </template>
    </SideSheet>

    <!-- 答题进度：导出/导入备份 -->
    <section class="card mt-20 fade-up">
      <div class="card-head">
        <h2 class="card-title"><span class="ico">📝</span> 答题进度</h2>
        <span class="card-note">{{ doneCount }}/{{ totalCount }} 题完成</span>
      </div>
      <div class="progress-bar-wrap">
        <ProgressBar :value="totalCount ? (doneCount / totalCount) * 100 : 0" tone="violet" :height="7" />
      </div>
      <p class="tiny muted progress-tip">
        进度默认存在浏览器里，清 localStorage 或换设备会丢。点「导出进度」把 JSON 存到项目
        <code>data/</code> 目录并 git 提交，「导入恢复」随时拿回来。
      </p>
      <div class="row wrap progress-actions">
        <button class="btn sm" @click="exportProgress">导出进度</button>
        <button class="btn ghost sm" @click="fileInput?.click()">导入恢复</button>
        <input ref="fileInput" type="file" accept="application/json,.json" hidden @change="importProgress" />
        <span v-if="notice" class="notice">{{ notice }}</span>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* ---------------- 类型卡（阶段卡） ---------------- */
.stage-card {
  margin-top: 16px;
  padding: 16px 22px;
}

.stage-head {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 12px;
  cursor: pointer;
  user-select: none;
  border-radius: var(--r-md);
  transition: margin-bottom 0.35s var(--ease);
}

.stage-head:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 6px;
}

.stage-card.collapsed .stage-head {
  margin-bottom: 0;
}

.stage-chev {
  flex: none;
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: var(--text-3);
  background: var(--surface-2);
  border: 1px solid var(--line);
  transition: transform 0.35s var(--ease), color 0.3s var(--ease), background 0.3s var(--ease);
}

.stage-head:hover .stage-chev {
  color: var(--accent);
  background: var(--accent-soft);
}

.stage-chev.open {
  transform: rotate(180deg);
  color: var(--accent);
  background: var(--accent-soft);
}

.stage-body {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.4s var(--ease);
}

.stage-body.open {
  grid-template-rows: 1fr;
}

.stage-body-inner {
  overflow: hidden;
  min-height: 0;
}

.stage-no {
  width: 34px;
  height: 34px;
  flex: none;
  border-radius: 11px;
  display: grid;
  place-items: center;
  font-size: 15px;
  font-weight: 680;
  color: #fff;
  background: var(--grad-blue);
  box-shadow: 0 6px 16px rgba(10, 132, 255, 0.28);
}

.stage-title {
  font-size: 15px;
  font-weight: 660;
  letter-spacing: -0.02em;
}

/* ---------------- 题目列表（直接铺开） ---------------- */
.q-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.q-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  cursor: pointer;
}

.q-item:hover {
  background: var(--surface-2);
}

.q-item.done .q-text {
  color: var(--text-3);
  text-decoration: line-through;
}

.q-item.done .q-no {
  color: var(--accent);
  background: var(--accent-soft);
  border-color: rgba(10, 132, 255, 0.25);
}

.q-no {
  width: 30px;
  height: 30px;
  flex: none;
  border-radius: 9px;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 640;
  font-family: 'SF Mono', Menlo, monospace;
  background: var(--surface-2);
  border: 1px solid var(--line);
  color: var(--text-3);
}

.q-text {
  flex: 1;
  font-size: 14.5px;
  line-height: 1.5;
  color: var(--text);
}

.q-check {
  flex: none;
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  border-radius: 7px;
  border: 1.5px solid var(--line-strong);
  color: #fff;
  background: transparent;
  transition: background 0.2s var(--ease), border-color 0.2s var(--ease);
}

.q-check.on {
  background: var(--accent);
  border-color: var(--accent);
}

/* ---------------- 查看笔记入口（放类型卡头部） ---------------- */
.note-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  flex: none;
  margin-left: auto;
  padding: 7px 12px;
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 550;
  color: var(--accent);
  background: var(--accent-soft);
  border: 1px solid rgba(10, 132, 255, 0.2);
  transition: filter 0.25s var(--ease), transform 0.2s var(--ease);
}

.note-btn:hover {
  filter: brightness(1.04);
}

.note-btn:active {
  transform: scale(0.985);
}

.note-btn.none {
  color: var(--text-3);
  background: var(--surface-2);
  border-color: var(--line);
}

.note-btn .note-n {
  min-width: 20px;
  padding: 0 6px;
  border-radius: 6px;
  font-size: 11.5px;
  text-align: center;
  background: var(--surface-solid);
  border: 1px solid var(--line);
}

.note-btn.none .note-n {
  color: var(--text-3);
}

/* ---------------- 抽屉笔记列表 ---------------- */
.note-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.note-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 15px;
  border-radius: var(--r-lg);
  background: var(--surface-solid);
  border: 1px solid var(--line);
  box-shadow: var(--shadow-sm);
  transition: transform 0.25s var(--ease), border-color 0.25s var(--ease), box-shadow 0.25s var(--ease);
}

.note-item:hover {
  transform: translateY(-2px);
  border-color: var(--line-strong);
  box-shadow: var(--shadow);
}

.note-ico {
  flex: none;
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  color: var(--accent);
  background: var(--accent-soft);
}

.note-name {
  font-size: 14px;
  font-weight: 620;
  letter-spacing: -0.01em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note-go {
  flex: none;
  color: var(--text-3);
}

.note-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
  padding: 40px 20px;
  border-radius: var(--r-lg);
  border: 1px dashed var(--line-strong);
  background: var(--surface-2);
}

.note-empty-ico {
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  border-radius: 16px;
  color: var(--text-3);
  background: var(--surface-solid);
  border: 1px solid var(--line);
  margin-bottom: 4px;
}

.note-empty p {
  max-width: 320px;
  line-height: 1.7;
}

.note-empty code {
  padding: 1px 5px;
  border-radius: 5px;
  font-size: 12px;
  background: var(--surface-solid);
  border: 1px solid var(--line);
}

.empty {
  margin-top: 20px;
  text-align: center;
  color: var(--text-3);
  padding: 40px 0;
}

/* ---------------- 答题进度卡 ---------------- */
.progress-bar-wrap {
  margin: 14px 0 12px;
}

.progress-tip {
  line-height: 1.7;
}

.progress-tip code {
  padding: 1px 5px;
  border-radius: 5px;
  font-size: 12px;
  background: var(--surface-2);
  border: 1px solid var(--line);
}

.progress-actions {
  margin-top: 12px;
}

.notice {
  margin-left: auto;
  font-size: 12.5px;
  color: var(--accent);
}

@media (max-width: 720px) {
  .stage-card {
    padding: 16px 16px 18px;
  }
  .stage-head {
    flex-wrap: nowrap;
    gap: 10px;
  }
  .stage-head .col.grow {
    min-width: 0;
  }
  .stage-no {
    width: 34px;
    height: 34px;
    border-radius: 11px;
    font-size: 15px;
  }
  .stage-title {
    font-size: 14px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .note-btn {
    padding: 7px 10px;
    font-size: 12px;
  }
  .note-btn span:nth-child(2) {
    display: none;
  }
  .stage-chev {
    width: 26px;
    height: 26px;
  }
}
</style>