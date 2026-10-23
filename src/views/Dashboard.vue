<script setup lang="ts">
import { computed, ref } from 'vue'
import StatTile from '@/components/StatTile.vue'
import ProgressBar from '@/components/ProgressBar.vue'
import ProgressRing from '@/components/ProgressRing.vue'
import CheckItem from '@/components/CheckItem.vue'
import MarkdownView from '@/components/MarkdownView.vue'
import SideSheet from '@/components/SideSheet.vue'
import {
  config,
  currentWeek,
  currentWeekNo,
  dietTodayTomorrow,
  formatDateCN,
  greeting,
  interviewGroups,
  interviewNotes,
  interviewQuestions,
  notes,
  projects,
  stages,
  toISODate,
  weeks,
} from '@/lib/data'
import { isChecked, toggleTask, weekStatus } from '@/lib/store'

const today = new Date()
const week = currentWeek()!
const weekNo = currentWeekNo(today)
const taskList = computed(() => week.tasks)
const doneCount = computed(() => week.tasks.filter((t, i) => isChecked(week.no, i, t.done)).length)
const weekProgress = computed(() =>
  week.tasks.length ? (doneCount.value / week.tasks.length) * 100 : week.progress
)

const dateLabel = `${formatDateCN(toISODate(today))} 星期${'日一二三四五六'[today.getDay()]}`
const noteCount = notes.length

const totalQ = interviewQuestions.length
const answerCount = interviewNotes.length
const typeCount = interviewGroups.length

const doneWeeks = computed(() => weeks.filter((w) => weekStatus(w.no, w.status) === 'done').length)
const weekTotal = weeks.length
const avgProject = computed(() =>
  projects.length ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length) : 0
)

const stageProgress = computed(() =>
  stages.map((s) => {
    const done = s.weeks.filter((w) => weekStatus(w.no, w.status) === 'done').length
    return { ...s, done, total: s.weeks.length, pct: (done / s.weeks.length) * 100 }
  })
)

const sheetOpen = ref(false)

const meals = dietTodayTomorrow(today)
const MEAL_ICON: Record<string, string> = { 早餐: '🌅', 午餐: '☀️', 晚餐: '🌙', 加餐: '🍎', 夜宵: '🌛' }
const WEEK_CN = '日一二三四五六'
const wd = (d: Date) => '星期' + WEEK_CN[d.getDay()]

const track = ref<HTMLElement | null>(null)
const activeGroup = ref(0)
const GAP = 16

function onScroll() {
  const el = track.value
  if (!el) return
  const first = el.querySelector('.page') as HTMLElement | null
  const w = first?.offsetWidth
  if (!w) return
  const idx = Math.round((el.scrollLeft - 16) / (w + GAP))
  activeGroup.value = Math.max(0, Math.min(3, idx))
}

function goToGroup(i: number) {
  const el = track.value
  const first = el?.querySelector('.page') as HTMLElement | null
  const w = first?.offsetWidth
  if (!el || !w) return
  el.scrollTo({ left: 16 + i * (w + GAP), behavior: 'smooth' })
}
</script>

<template>
  <div class="dashboard">
    <div ref="track" class="scroll-track" @scroll="onScroll">
      <!-- 分组 A：首页概览（Hero + 统计瓦片） -->
      <div class="page page-overview">
        <section class="card hero">
          <div class="hero-left">
            <span class="page-kicker">第 {{ weekNo }} 周 · {{ week.stageTitle }}</span>
            <h1 class="hero-title">{{ greeting(today) }}，{{ config.owner }}</h1>
            <p class="hero-sub">
              {{ dateLabel }}
              <span class="sep">·</span>
              本周焦点：{{ week.title }}
            </p>
          </div>
          <div class="hero-right">
            <ProgressRing :value="weekProgress" :size="120" :stroke="10">
              <b>{{ doneCount }}<em>/{{ taskList.length }}</em></b>
              <span class="ring-cap">本周进度</span>
            </ProgressRing>
          </div>
        </section>

        <div class="stats-row">
          <StatTile icon="note" tone="fire" label="学习笔记" :value="noteCount" unit="篇" hint="按周归位" />
          <StatTile icon="cube" tone="violet" label="自研项目" :value="projects.length" unit="个" :hint="`平均完成度 ${avgProject}%`" />
          <StatTile icon="route" tone="green" label="已完成周" :value="doneWeeks" :unit="`/ ${weekTotal} 周`" hint="36 周路线" />
        </div>
      </div>

      <!-- 分组 B：本周计划（三件事 + 路线进度） -->
      <div class="page page-plan">
        <section class="card">
          <div class="card-head">
            <h2 class="card-title"><span class="ico">✅</span> 这周的三件事</h2>
            <div class="row" style="gap: 8px">
              <span class="card-note">{{ doneCount }}/{{ taskList.length }}</span>
              <button class="btn ghost sm" @click="sheetOpen = true">完整周计划</button>
            </div>
          </div>

          <div class="col task-list">
            <CheckItem
              v-for="(t, i) in taskList"
              :key="i"
              :text="t.text"
              :checked="isChecked(week.no, i, t.done)"
              @toggle="toggleTask(week.no, i, t.done)"
            />
          </div>

          <div class="prog">
            <ProgressBar :value="weekProgress" tone="green" />
          </div>

          <div class="row between wrap meta">
            <div class="col">
              <span class="tiny muted">本周交付物</span>
              <b class="deliver">{{ week.deliverable }}</b>
            </div>
            <div class="row" style="gap: 6px">
              <span class="pill info">阶段 {{ week.stage }}</span>
              <span class="pill">约 {{ week.hours }} 小时</span>
            </div>
          </div>
        </section>

        <section class="card">
          <div class="card-head">
            <h2 class="card-title"><span class="ico">🧭</span> 路线进度</h2>
            <RouterLink to="/agent" class="card-note">详情 →</RouterLink>
          </div>
          <div class="col stage-list">
            <div v-for="s in stageProgress" :key="s.id" class="stage-row">
              <div class="row between">
                <span class="tiny dim truncate">{{ s.title }}</span>
                <span class="tiny muted">{{ s.done }}/{{ s.total }}</span>
              </div>
              <ProgressBar :value="s.pct" :height="6" :tone="s.pct === 100 ? 'green' : ''" />
            </div>
          </div>
        </section>
      </div>

      <!-- 分组 C：饮食管理（今天 + 明天） -->
      <div class="page page-diet">
        <section class="card meal-card is-today">
          <div class="card-head">
            <h2 class="card-title"><span class="ico">🍽️</span> 今天吃什么</h2>
            <span class="pill info">{{ meals.today.day?.name }}</span>
          </div>
          <div class="meals">
            <div v-for="m in meals.today.day?.meals" :key="m.label" class="meal">
              <span class="meal-label">{{ MEAL_ICON[m.label] }} {{ m.label }}</span>
              <div class="chips">
                <span v-for="(it, i) in m.items" :key="i" class="chip">{{ it }}</span>
              </div>
            </div>
          </div>
          <p class="tiny muted meal-foot">{{ wd(meals.today.date) }} · {{ meals.today.day?.kind }}</p>
        </section>

        <section class="card meal-card">
          <div class="card-head">
            <h2 class="card-title"><span class="ico">📅</span> 明天吃什么</h2>
            <span class="pill">{{ meals.tomorrow.day?.name }}</span>
          </div>
          <div class="meals">
            <div v-for="m in meals.tomorrow.day?.meals" :key="m.label" class="meal">
              <span class="meal-label">{{ MEAL_ICON[m.label] }} {{ m.label }}</span>
              <div class="chips">
                <span v-for="(it, i) in m.items" :key="i" class="chip">{{ it }}</span>
              </div>
            </div>
          </div>
          <p class="tiny muted meal-foot">{{ wd(meals.tomorrow.date) }} · {{ meals.tomorrow.day?.kind }}</p>
        </section>
      </div>

      <!-- 分组 D：面试刷题 -->
      <div class="page page-interview">
        <section class="card interview-card">
          <div class="card-head">
            <h2 class="card-title"><span class="ico">📝</span> 面试题</h2>
            <RouterLink to="/interview" class="card-note">去刷题 →</RouterLink>
          </div>
          <div class="interview-body">
            <div class="row between wrap interview-stats">
              <div class="interview-stat">
                <span class="tiny muted">题库总数</span>
                <b class="interview-num">{{ totalQ }}<em>题</em></b>
              </div>
              <div class="interview-stat">
                <span class="tiny muted">答案笔记</span>
                <b class="interview-num">{{ answerCount }}<em>篇</em></b>
              </div>
              <div class="interview-stat">
                <span class="tiny muted">类型</span>
                <b class="interview-num">{{ typeCount }}<em>类</em></b>
              </div>
            </div>
            <ProgressBar :value="totalQ ? (answerCount / totalQ) * 100 : 0" tone="violet" :height="7" />
          </div>
        </section>
      </div>
    </div>

    <div class="track-dots" aria-hidden="true">
      <button
        v-for="i in 4"
        :key="i"
        class="dot"
        :class="{ on: activeGroup === i - 1 }"
        type="button"
        :aria-label="`第 ${i} 组`"
        @click="goToGroup(i - 1)"
      />
    </div>

    <SideSheet
      :open="sheetOpen"
      :kicker="`第 ${week.no} 周 · ${week.stageTitle}`"
      :title="week.title"
      @close="sheetOpen = false"
    >
      <MarkdownView :source="week.body" />
    </SideSheet>
  </div>
</template>

<style scoped>
.dashboard {
  position: relative;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dashboard :deep(.card) {
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-sm);
  transition: transform 0.22s var(--ease), border-color 0.22s var(--ease);
}

.dashboard :deep(.card:hover) {
  transform: translateY(-1px);
  border-color: var(--line-strong);
}

/* ---------------- 滚动容器（桌面栅格 / 非桌面横向滑动） ---------------- */
.scroll-track {
  flex: 1;
  min-height: 0;
  height: 100%;
}

/* ---------------- Hero ---------------- */
.hero {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 24px;
  align-items: center;
  padding: 22px 26px;
  overflow: hidden;
}

.hero::after {
  content: '';
  position: absolute;
  right: -90px;
  top: -90px;
  width: 240px;
  height: 240px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(94, 92, 230, 0.1), transparent 70%);
  pointer-events: none;
}

.hero-title {
  font-size: 25px;
  letter-spacing: -0.03em;
}

.hero-sub {
  margin-top: 6px;
  color: var(--text-2);
  font-size: 13.5px;
}

.sep {
  color: var(--text-3);
  margin: 0 4px;
}

.hero-right {
  position: relative;
  z-index: 1;
}

.ring-cap {
  font-size: 11px;
  color: var(--text-3);
  margin-top: 2px;
}

/* ---------------- 统计瓦片 ---------------- */
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

/* ---------------- 主卡片通用 ---------------- */
.card {
  padding: 18px 20px;
}

.card-head {
  margin-bottom: 12px;
}

.task-list {
  gap: 0;
}

.task-list :deep(.task) {
  padding: 7px 10px;
}

.prog {
  margin-top: 10px;
}

.meta {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
}

.deliver {
  font-size: 13.5px;
  font-weight: 600;
}

.stage-list {
  gap: 12px;
}

.stage-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* ---------------- 面试题 ---------------- */
.interview-card {
  padding: 18px 20px;
}

.interview-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.interview-stats {
  gap: 12px;
}

.interview-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 74px;
}

.interview-num {
  font-size: 21px;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.2;
}

.interview-num em {
  font-style: normal;
  font-size: 12px;
  color: var(--text-3);
  font-weight: 550;
  margin-left: 2px;
}

/* ---------------- 食谱（降噪：仅细描边区分今天） ---------------- */
.meal-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 18px;
}

.meal-card.is-today {
  border-color: rgba(10, 132, 255, 0.35);
}

.meals {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.meal {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.meal-label {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-2);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.chip {
  display: inline-flex;
  align-items: center;
  padding: 3px 9px;
  border-radius: var(--r-pill);
  font-size: 11.5px;
  font-weight: 500;
  color: var(--text-2);
  background: var(--surface-2);
  border: 1px solid var(--line);
  line-height: 1.4;
}

.meal-foot {
  margin-top: 0;
}

/* ============================================================
   桌面 ≥1400px：静态栅格，一屏平铺
   ============================================================ */
@media (min-width: 1400px) {
  .dashboard {
    height: auto;
    min-height: 100%;
    overflow: visible;
  }

  .scroll-track {
    flex: none;
    height: auto;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 330px;
    grid-template-areas:
      'hero hero'
      'stats interview'
      'plan diet';
    gap: 14px;
    align-content: start;
  }

  .page-overview {
    display: contents;
  }
  .hero {
    grid-area: hero;
  }
  .stats-row {
    grid-area: stats;
  }
  .page-plan {
    grid-area: plan;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }
  .page-interview {
    grid-area: interview;
  }
  .page-diet {
    grid-area: diet;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
}

/* ============================================================
   非桌面 <1400px：横向滑动 + 分页吸附
   ============================================================ */
@media (max-width: 1399px) {
  .scroll-track {
    display: flex;
    gap: 16px;
    overflow-x: auto;
    overflow-y: hidden;
    scroll-snap-type: x mandatory;
    scroll-padding-left: 16px;
    padding: 4px 16px 0;
    align-items: stretch;
  }

  .scroll-track::-webkit-scrollbar {
    display: none;
  }
  .scroll-track {
    scrollbar-width: none;
  }

  .page {
    flex: 0 0 auto;
    width: min(82vw, 540px);
    height: 100%;
    scroll-snap-align: start;
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow: hidden;
  }

  .page-overview {
    display: flex;
    flex-direction: column;
  }
}

/* ---------------- 移动端 <900px：单页分组 ---------------- */
@media (max-width: 900px) {
  .page {
    width: min(86vw, 460px);
  }
}

/* ---------------- 分页指示点 ---------------- */
.track-dots {
  display: none;
}

@media (max-width: 1399px) {
  .track-dots {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 10px 0 12px;
  }

  .dot {
    width: 6px;
    height: 6px;
    padding: 0;
    border-radius: 999px;
    background: var(--line-strong);
    border: 0;
    cursor: pointer;
    transition: all 0.22s var(--ease);
  }

  .dot.on {
    width: 18px;
    background: var(--accent);
  }
}

@media (max-width: 560px) {
  .hero {
    grid-template-columns: 1fr;
    gap: 14px;
    padding: 18px 18px;
  }
  .hero-right {
    justify-self: start;
  }
}
</style>