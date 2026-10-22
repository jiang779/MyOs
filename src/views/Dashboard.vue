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
  interviewQuestions,
  notes,
  projects,
  stages,
  toISODate,
  weeks,
} from '@/lib/data'
import { isChecked, toggleTask, weekStatus, getAnswer, todayAnsweredCount } from '@/lib/store'

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
const doneQ = interviewQuestions.filter((q) => !!getAnswer(q.id)).length
const todayQ = todayAnsweredCount(today)

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
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="hero card fade-up">
      <div class="hero-left">
        <span class="page-kicker">
          第 {{ weekNo }} 周 · {{ week.stageTitle }}
        </span>
        <h1 class="hero-title">{{ greeting(today) }}，{{ config.owner }}</h1>
        <p class="hero-sub">
          {{ dateLabel }}
          <span class="sep">·</span>
          本周焦点：{{ week.title }}
        </p>
      </div>

      <div class="hero-right">
        <div class="ring-box">
          <ProgressRing :value="weekProgress" :size="140" :stroke="11">
            <b>{{ doneCount }}<em>/{{ taskList.length }}</em></b>
            <span class="ring-cap">本周进度</span>
          </ProgressRing>
        </div>

        <div class="hero-bar">
          <div class="hero-bar-head">
            <span class="tiny muted">本周进度</span>
            <b class="hero-bar-num">{{ doneCount }}<em>/{{ taskList.length }}</em></b>
          </div>
          <ProgressBar :value="weekProgress" tone="green" />
        </div>
      </div>
    </section>

    <!-- 指标 -->
    <div class="grid grid-3 stat-grid mt-20">
      <StatTile icon="note" tone="fire" label="学习笔记" :value="noteCount" unit="篇" hint="按周归位，写一篇算一篇" />
      <StatTile icon="cube" tone="violet" label="自研项目" :value="projects.length" unit="个" :hint="`平均完成度 ${avgProject}%`" />
      <StatTile icon="route" tone="green" label="已完成周" :value="doneWeeks" :unit="`/ ${weekTotal} 周`" hint="36 周 Agent 路线" />
    </div>

    <!-- 今日菜谱：今天 + 明天 -->
    <div class="grid grid-2 mt-20">
      <section class="card meal-card is-today fade-up">
        <div class="card-head">
          <h2 class="card-title"><span class="ico">🍽️</span> 今天吃什么</h2>
          <div class="row" style="gap: 10px">
            <span class="pill info">{{ meals.today.day?.name }}</span>
            <RouterLink to="/health" class="card-note">全部 →</RouterLink>
          </div>
        </div>
        <div class="meals">
          <div v-for="m in meals.today.day?.meals" :key="m.label" class="meal">
            <span class="meal-label">{{ MEAL_ICON[m.label] }} {{ m.label }}</span>
            <div class="chips">
              <span v-for="(it, i) in m.items" :key="i" class="chip">{{ it }}</span>
            </div>
          </div>
        </div>
        <p class="tiny muted mt-12">{{ wd(meals.today.date) }} · {{ meals.today.day?.kind }}</p>
      </section>

      <section class="card meal-card fade-up">
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
        <p class="tiny muted mt-12">{{ wd(meals.tomorrow.date) }} · {{ meals.tomorrow.day?.kind }}</p>
      </section>
    </div>

    <!-- 主体两栏：本周三件事 + 路线进度 -->
    <div class="grid grid-2 main-row mt-20">
      <section class="card fade-up">
        <div class="card-head">
          <h2 class="card-title"><span class="ico">✅</span> 这周的三件事</h2>
          <div class="row" style="gap: 8px">
            <span class="card-note">{{ doneCount }}/{{ taskList.length }}</span>
            <button class="btn ghost sm" @click="sheetOpen = true">看完整周计划</button>
          </div>
        </div>

        <div class="col" style="gap: 2px">
          <CheckItem
            v-for="(t, i) in taskList"
            :key="i"
            :text="t.text"
            :checked="isChecked(week.no, i, t.done)"
            @toggle="toggleTask(week.no, i, t.done)"
          />
        </div>

        <div class="mt-16">
          <ProgressBar :value="weekProgress" tone="green" />
        </div>

        <div class="hr" />

        <div class="row between wrap" style="gap: 12px">
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

      <section class="card fade-up">
        <div class="card-head">
          <h2 class="card-title"><span class="ico">🧭</span> 路线进度</h2>
          <RouterLink to="/agent" class="card-note">路线详情 →</RouterLink>
        </div>
        <div class="col" style="gap: 12px">
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

    <!-- 面试题进度 -->
    <section class="card fade-up interview-card mt-20">
      <div class="card-head">
        <h2 class="card-title"><span class="ico">📝</span> 面试题</h2>
        <RouterLink to="/interview" class="card-note">去刷题 →</RouterLink>
      </div>
      <div class="interview-body">
        <div class="row between" style="gap: 16px; flex-wrap: wrap">
          <div class="interview-stat">
            <span class="tiny muted">题库总数</span>
            <b class="interview-num">{{ totalQ }}<em>题</em></b>
          </div>
          <div class="interview-stat">
            <span class="tiny muted">已答</span>
            <b class="interview-num">{{ doneQ }}<em>/ {{ totalQ }}</em></b>
          </div>
          <div class="interview-stat">
            <span class="tiny muted">今日任务（6 道）</span>
            <b class="interview-num">{{ todayQ }}<em>/ 6</em></b>
          </div>
        </div>
        <ProgressBar
          :value="totalQ ? (doneQ / totalQ) * 100 : 0"
          tone="violet"
          :height="7"
        />
      </div>
    </section>

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
.hero {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 28px;
  align-items: center;
  padding: 30px 34px;
  overflow: hidden;
}

.hero::after {
  content: '';
  position: absolute;
  right: -80px;
  top: -80px;
  width: 320px;
  height: 320px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(94, 92, 230, 0.16), transparent 68%);
  pointer-events: none;
}

.hero-title {
  font-size: 32px;
  letter-spacing: -0.035em;
}

.hero-sub {
  margin-top: 8px;
  color: var(--text-2);
  font-size: 14.5px;
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
  font-size: 11.5px;
  color: var(--text-3);
  margin-top: 2px;
}

.hero-bar {
  display: none;
  width: 100%;
}

.hero-bar-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 9px;
}

.hero-bar-num {
  font-size: 16px;
  font-weight: 680;
  letter-spacing: -0.02em;
}

.hero-bar-num em {
  font-style: normal;
  font-size: 12.5px;
  font-weight: 550;
  color: var(--text-3);
}

.deliver {
  font-size: 14px;
  font-weight: 600;
}

.stage-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.interview-card {
  padding: 22px 24px;
}

.interview-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 4px;
}

.interview-stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 90px;
}

.interview-num {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.03em;
}

.interview-num em {
  font-style: normal;
  font-size: 13px;
  color: var(--text-3);
  font-weight: 550;
  margin-left: 2px;
}

.meal-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 22px 24px;
}

.meal-card.is-today {
  border-color: rgba(10, 132, 255, 0.3);
  box-shadow: 0 14px 40px rgba(10, 132, 255, 0.14);
}

.meals {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.meal {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.meal-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip {
  display: inline-flex;
  align-items: center;
  padding: 5px 11px;
  border-radius: var(--r-pill);
  font-size: 12.5px;
  font-weight: 500;
  color: var(--text-2);
  background: var(--surface-2);
  border: 1px solid var(--line);
  line-height: 1.5;
}

.is-today .chip {
  background: var(--accent-soft);
  border-color: rgba(10, 132, 255, 0.2);
  color: var(--accent);
}

@media (max-width: 1100px) {
  .main-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .hero {
    grid-template-columns: 1fr;
    padding: 24px 22px;
    text-align: left;
  }
  .hero-title {
    font-size: 26px;
  }
  .hero-right {
    width: 100%;
    justify-self: stretch;
  }
  .ring-box {
    display: none;
  }
  .hero-bar {
    display: block;
  }
}

/* 移动端指标瓦片：一行两个，别挤成一列 */
@media (max-width: 720px) {
  .stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
  .stat-grid :deep(.tile) {
    padding: 15px 16px;
    gap: 3px;
  }
  .stat-grid :deep(.tile-value) {
    font-size: 25px;
  }
  .stat-grid :deep(.tile-ico) {
    width: 26px;
    height: 26px;
  }
  .stat-grid :deep(.tile-hint) {
    font-size: 11.5px;
  }
}
</style>
