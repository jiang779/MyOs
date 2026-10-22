<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHead from '@/components/PageHead.vue'
import ProgressBar from '@/components/ProgressBar.vue'
import SideSheet from '@/components/SideSheet.vue'
import AppIcon from '@/components/AppIcon.vue'
import { interviewGroups, interviewQuestions, type InterviewQuestion } from '@/lib/data'
import { getAnswer, setAnswer, removeAnswer, todayAnsweredCount } from '@/lib/store'

const DAILY_GOAL = 6

const today = new Date()
const todayCount = todayAnsweredCount(today)

const active = ref<InterviewQuestion | undefined>()
const draft = ref('')
const notice = ref('')
/** 收起的类型集合 */
const collapsed = ref<Set<string>>(new Set())
let noticeTimer: number | undefined

function toggleGroup(type: string) {
  const next = new Set(collapsed.value)
  if (next.has(type)) next.delete(type)
  else next.add(type)
  collapsed.value = next
}

function isCollapsed(type: string) {
  return collapsed.value.has(type)
}

function flash(msg: string) {
  notice.value = msg
  window.clearTimeout(noticeTimer)
  noticeTimer = window.setTimeout(() => (notice.value = ''), 2400)
}

/** 某道题是否已作答 */
function answered(id: string): boolean {
  return !!getAnswer(id)
}

function openQuestion(q: InterviewQuestion) {
  active.value = q
  draft.value = getAnswer(q.id)
}

function save() {
  if (!active.value) return
  setAnswer(active.value.id, draft.value)
  flash(draft.value.trim() ? '已保存答案' : '已清空答案')
}

function clearAnswer() {
  if (!active.value) return
  removeAnswer(active.value.id)
  draft.value = ''
  flash('已清空答案')
}

/** 已答题目总数 */
const answeredTotal = computed(() => interviewQuestions.filter((q) => answered(q.id)).length)

/** 导出答案为「题目 + 答案」格式，可直接覆盖 data/interview/*.md */
async function exportAnswers() {
  const blocks: string[] = []
  for (const g of interviewGroups) {
    blocks.push(renderGroup(g))
  }
  const text = blocks
    .map((b, i) => `<!-- ===== ${interviewGroups[i].fileName}.md ===== -->\n${b}`)
    .join('\n\n')

  try {
    await navigator.clipboard.writeText(text)
    flash('已复制全部（题目+答案），按类型覆盖到 data/interview/*.md')
  } catch {
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'interview-questions.md'
    a.click()
    URL.revokeObjectURL(url)
    flash('已下载全部（题目+答案）')
  }
}

/** 渲染单个类型为 md 文本 */
function renderGroup(g: { type: string; questions: { text: string; id: string }[] }): string {
  const lines: string[] = ['---', `type: ${g.type}`, '---', '']
  for (const q of g.questions) {
    lines.push(`- ${q.text}`)
    const ans = getAnswer(q.id)
    if (ans) {
      for (const al of ans.split('\n')) {
        lines.push(`  > ${al}`)
      }
    }
  }
  return lines.join('\n')
}

/** 只导出单个类型，直接复制可覆盖对应文件 */
async function exportGroup(g: { type: string; fileName: string; questions: { text: string; id: string }[] }) {
  const text = renderGroup(g)
  try {
    await navigator.clipboard.writeText(text)
    flash(`已复制「${g.type}」，覆盖到 ${g.fileName}.md`)
  } catch {
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${g.fileName}.md`
    a.click()
    URL.revokeObjectURL(url)
    flash(`已下载 ${g.fileName}.md`)
  }
}
</script>

<template>
  <div>
    <PageHead kicker="面试题库 · 按类型分组" title="面试题" sub="点一道题，写下你的答案。不校验对错，写下来就是背过了。">
      <template #actions>
        <button class="btn ghost sm" @click="exportAnswers" :disabled="!answeredTotal">
          <AppIcon name="download" :size="15" />
          导出答案
        </button>
      </template>
    </PageHead>

    <!-- 每日任务 -->
    <section class="card fade-up daily-card">
      <div class="row between">
        <div class="col" style="gap: 6px">
          <span class="page-kicker">今日任务</span>
          <b class="daily-title">背 {{ DAILY_GOAL }} 道题</b>
          <span class="tiny muted">今天答过的题都算，不限定哪 {{ DAILY_GOAL }} 道</span>
        </div>
        <div class="daily-num">
          <b>{{ todayCount }}</b><em>/ {{ DAILY_GOAL }}</em>
        </div>
      </div>
      <ProgressBar
        :value="Math.min(100, (todayCount / DAILY_GOAL) * 100)"
        :tone="todayCount >= DAILY_GOAL ? 'green' : 'fire'"
        :height="8"
      />
      <p v-if="todayCount >= DAILY_GOAL" class="tiny ok mt-10">今日任务完成，可以歇了 🎉</p>
    </section>

    <!-- 题库：按类型分组 -->
    <div class="col mt-20" style="gap: 20px">
      <section v-for="g in interviewGroups" :key="g.type" class="card fade-up">
        <div class="card-head group-head" @click="toggleGroup(g.type)">
          <h2 class="card-title"><span class="ico">📚</span> {{ g.type }}</h2>
          <div class="row" style="gap: 10px">
            <span class="card-note">
              {{ g.questions.filter((q) => answered(q.id)).length }}/{{ g.questions.length }} 已答
            </span>
            <button
              class="btn ghost sm export-btn"
              title="复制本类题目+答案"
              @click.stop="exportGroup(g)"
            >
              <AppIcon name="download" :size="14" />
              复制本类
            </button>
            <AppIcon
              name="chevron"
              :size="16"
              class="chevron"
              :class="{ open: !isCollapsed(g.type) }"
            />
          </div>
        </div>
        <Transition name="expand">
          <ul v-show="!isCollapsed(g.type)" class="q-list">
            <li
              v-for="(q, i) in g.questions"
              :key="q.id"
              class="q-item"
              :class="{ done: answered(q.id) }"
              @click="openQuestion(q)"
            >
              <span class="q-no">{{ String(i + 1).padStart(2, '0') }}</span>
              <span class="q-text">{{ q.text }}</span>
              <span class="q-mark">{{ answered(q.id) ? '✓' : '→' }}</span>
            </li>
          </ul>
        </Transition>
      </section>
    </div>

    <!-- 答题侧栏 -->
    <SideSheet
      :open="!!active"
      :kicker="active?.type"
      :title="active?.text"
      @close="active = undefined"
    >
      <template v-if="active">
        <div class="answer-area">
          <label class="tiny muted">写下你的答案（不校验对错）</label>
          <textarea
            v-model="draft"
            class="answer-input"
            placeholder="把你想到的写下来，想到多少写多少……"
            rows="12"
          />
          <div class="row between mt-14">
            <button v-if="answered(active.id)" class="btn ghost sm" @click="clearAnswer">
              清空答案
            </button>
            <span v-else></span>
            <button class="btn primary sm" @click="save">
              <AppIcon name="check" :size="14" />
              保存答案
            </button>
          </div>
        </div>
      </template>
    </SideSheet>

    <!-- 轻提示 -->
    <Transition name="toast">
      <div v-if="notice" class="toast">{{ notice }}</div>
    </Transition>
  </div>
</template>

<style scoped>
.daily-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.daily-title {
  font-size: 20px;
  letter-spacing: -0.02em;
}

.daily-num {
  font-size: 30px;
  font-weight: 700;
  letter-spacing: -0.03em;
}

.daily-num em {
  font-style: normal;
  font-size: 15px;
  color: var(--text-3);
  font-weight: 550;
  margin-left: 2px;
}

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
  transition: background 0.2s var(--ease);
}

.q-item:hover {
  background: var(--surface-2);
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

.q-mark {
  flex: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 650;
  color: var(--text-3);
  background: var(--surface-2);
  transition: all 0.22s var(--ease);
}

.q-item.done .q-no {
  background: var(--accent-soft);
  border-color: rgba(10, 132, 255, 0.22);
  color: var(--accent);
}

.q-item.done .q-text {
  color: var(--text-2);
}

.q-item.done .q-mark {
  background: var(--accent);
  color: #fff;
}

.group-head {
  cursor: pointer;
  user-select: none;
}

.chevron {
  color: var(--text-3);
  transition: transform 0.25s var(--ease);
  transform: rotate(-90deg);
}

.chevron.open {
  transform: rotate(0);
}

.expand-enter-active,
.expand-leave-active {
  overflow: hidden;
  transition: max-height 0.3s var(--ease), opacity 0.25s var(--ease);
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}

.expand-enter-to,
.expand-leave-from {
  max-height: 3000px;
  opacity: 1;
}

.answer-area {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.answer-input {
  width: 100%;
  resize: vertical;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid var(--line);
  background: var(--surface-2);
  color: var(--text);
  font-size: 14px;
  line-height: 1.65;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s var(--ease), box-shadow 0.2s var(--ease);
}

.answer-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(10, 132, 255, 0.14);
}

.toast {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 18px;
  border-radius: var(--r-pill);
  background: var(--surface-solid);
  border: 1px solid var(--line);
  box-shadow: var(--shadow-lg);
  font-size: 13.5px;
  font-weight: 550;
  z-index: 300;
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.25s var(--ease), transform 0.25s var(--ease);
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(10px);
}
</style>
