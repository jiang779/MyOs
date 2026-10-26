<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import SideSheet from '@/components/SideSheet.vue'
import MarkdownView from '@/components/MarkdownView.vue'
import InterviewConsole from '@/components/dashboard/InterviewConsole.vue'
import PlanCard from '@/components/dashboard/PlanCard.vue'
import RoadCard from '@/components/dashboard/RoadCard.vue'
import NotesCard from '@/components/dashboard/NotesCard.vue'
import RecipeCard from '@/components/dashboard/RecipeCard.vue'
import DrillOverlay from '@/components/dashboard/DrillOverlay.vue'
import {
  config,
  currentWeek,
  currentWeekNo,
  dietTodayTomorrow,
  formatDateCN,
  greeting,
  toISODate,
  type InterviewQuestion,
} from '@/lib/data'
import { todayDrill } from '@/lib/dashboard'
import { useMediaQuery } from '@/lib/useMedia'

const isMobile = useMediaQuery('(max-width: 720px)')

const today = new Date()
const week = currentWeek()!
const weekNo = currentWeekNo(today)
const hello = greeting(today)
const dateLabel = `${formatDateCN(toISODate(today))} 星期${'日一二三四五六'[today.getDay()]}`
const shortDate = `${today.getMonth() + 1}/${today.getDate()} 周${
  '日一二三四五六'[today.getDay()]
} · 第 ${weekNo} 周`

const meals = dietTodayTomorrow(today)
const MEAL_ICON: Record<string, string> = { 早餐: '🌅', 午餐: '☀️', 晚餐: '🌙', 加餐: '🍎', 夜宵: '🌛' }

/* ---------------- 今日 5 题 ---------------- */
const drillOpen = ref(false)
const drillQuestions = ref<InterviewQuestion[]>([])

function startDrill() {
  const qs = todayDrill(5)
  if (!qs.length) return
  drillQuestions.value = qs
  drillOpen.value = true
}

/* ---------------- 抽屉 ---------------- */
const sheet = ref<'' | 'plan' | 'recipe'>('')
const sheetOpen = computed(() => sheet.value !== '')
const sheetTitle = computed(() => (sheet.value === 'plan' ? week.title : '今明两天的食谱'))
const sheetKicker = computed(() =>
  sheet.value === 'plan' ? `第 ${week.no} 周 · ${week.stageTitle}` : dateLabel
)

/* ---------------- 移动端四张卡切换 ---------------- */
const TABS = ['计划', '路线', '笔记', '食谱']
const tab = ref(0)
const deck = ref<HTMLElement | null>(null)

function goTab(i: number) {
  tab.value = i
  const el = deck.value
  if (!el) return
  el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
}

function onDeckScroll() {
  const el = deck.value
  if (!el) return
  const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth))
  tab.value = Math.max(0, Math.min(TABS.length - 1, i))
}
</script>

<template>
  <div class="dashboard" :class="{ 'is-mobile': isMobile }">
    <!-- ============================ 移动端：一屏不滚动 ============================ -->
    <template v-if="isMobile">
      <header class="m-hero">
        <h1 class="m-hello">{{ hello }}，{{ config.owner }}</h1>
        <span class="m-sub num">{{ shortDate }}</span>
      </header>

      <InterviewConsole compact class="m-console" @drill="startDrill" />

      <nav class="m-tabs" aria-label="卡片切换">
        <button
          v-for="(t, i) in TABS"
          :key="t"
          type="button"
          :class="{ active: tab === i }"
          @click="goTab(i)"
        >
          {{ t }}
        </button>
      </nav>

      <div ref="deck" class="m-deck" @scroll.passive="onDeckScroll">
        <div class="m-panel"><PlanCard dense @open="sheet = 'plan'" /></div>
        <div class="m-panel"><RoadCard dense /></div>
        <div class="m-panel"><NotesCard dense /></div>
        <div class="m-panel"><RecipeCard dense @open="sheet = 'recipe'" /></div>
      </div>
    </template>

    <!-- ============================ 桌面端：Bento ============================ -->
    <template v-else>
      <div class="d-dash">
        <header class="hero">
          <div class="hero-main">
            <span class="kicker"><i class="dot" />第 {{ weekNo }} 周 · {{ week.stageTitle }}</span>
            <h1 class="hello">{{ hello }}，{{ config.owner }}</h1>
            <p class="sub">
              {{ dateLabel }}
              <span class="sep">·</span>
              本周焦点：{{ week.title }}
            </p>
          </div>

          <div class="hero-actions">
            <button class="btn primary" type="button" @click="startDrill">
              <AppIcon name="spark" :size="15" />
              随机 5 题
            </button>
            <RouterLink class="btn ghost" to="/interview">面试题库</RouterLink>
          </div>
        </header>

        <div class="bento">
          <InterviewConsole class="area-console" @drill="startDrill" />
          <PlanCard class="area-plan" @open="sheet = 'plan'" />
          <RoadCard class="area-road" />
          <NotesCard class="area-notes" />
          <RecipeCard class="area-recipe" @open="sheet = 'recipe'" />
        </div>
      </div>
    </template>

    <DrillOverlay :open="drillOpen" :questions="drillQuestions" @close="drillOpen = false" />

    <SideSheet :open="sheetOpen" :kicker="sheetKicker" :title="sheetTitle" @close="sheet = ''">
      <MarkdownView v-if="sheet === 'plan'" :source="week.body" />

      <div v-else-if="sheet === 'recipe'" class="rs">
        <section v-for="(day, i) in [meals.today, meals.tomorrow]" :key="i" class="rs-day">
          <h3 class="rs-title">{{ i === 0 ? '今天' : '明天' }} · {{ day.day?.name || '—' }}</h3>
          <p class="tiny muted">{{ day.day?.kind || '' }}</p>
          <div v-for="m in day.day?.meals ?? []" :key="m.label" class="rs-meal">
            <span class="rs-lbl">{{ MEAL_ICON[m.label] || '·' }} {{ m.label }}</span>
            <span class="rs-chips">
              <span v-for="it in m.items" :key="it" class="rs-chip">{{ it }}</span>
            </span>
          </div>
        </section>
      </div>
    </SideSheet>
  </div>
</template>

<style scoped>
.dashboard {
  position: relative;
}

/* ============================ 桌面 Bento ============================ */
.d-dash {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 6px;
}

.hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  padding: 2px 2px 0;
}

.hero-main {
  min-width: 0;
}

.kicker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--text-3);
}

.kicker .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 10px var(--accent);
}

.hello {
  font-size: clamp(26px, 2.7vw, 36px);
  letter-spacing: -0.04em;
  margin-top: 7px;
}

.sub {
  margin-top: 6px;
  font-size: 12.5px;
  color: var(--text-3);
}

.sep {
  opacity: 0.5;
  margin: 0 6px;
}

.hero-actions {
  flex: none;
  display: flex;
  gap: 8px;
  padding-bottom: 3px;
}

.bento {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  grid-template-areas:
    'console console console console console console console console plan plan plan plan'
    'console console console console console console console console road road road road'
    'notes notes notes notes notes notes notes notes recipe recipe recipe recipe';
  gap: 14px;
  align-items: stretch;
}

.area-console {
  grid-area: console;
}
.area-plan {
  grid-area: plan;
}
.area-road {
  grid-area: road;
}
.area-notes {
  grid-area: notes;
}
.area-recipe {
  grid-area: recipe;
}

/* 平板：控制台通栏，两列副卡 */
@media (max-width: 1180px) {
  .bento {
    grid-template-columns: repeat(6, minmax(0, 1fr));
    grid-template-areas:
      'console console console console console console'
      'plan plan plan road road road'
      'notes notes notes recipe recipe recipe';
  }
}

/* ============================ 移动端一屏 ============================ */
.dashboard.is-mobile {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
}

.m-hero {
  flex: none;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  padding: 0 2px;
}

.m-hello {
  font-size: 19px;
  letter-spacing: -0.035em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.m-sub {
  flex: none;
  font-size: 10.5px;
  color: var(--text-3);
  white-space: nowrap;
}

.m-console {
  flex: 1.15 1 0;
  min-height: 0;
}

.m-tabs {
  flex: none;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 2px;
  padding: 3px;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: var(--r-pill);
}

.m-tabs button {
  padding: 5px 0;
  border-radius: var(--r-pill);
  font-size: 11.5px;
  font-weight: 560;
  color: var(--text-3);
  transition: all var(--dur-2) var(--ease-out);
}

.m-tabs button.active {
  color: var(--text);
  background: var(--surface-solid);
  box-shadow: var(--shadow-sm);
}

.m-deck {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
  overscroll-behavior-x: contain;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.m-deck::-webkit-scrollbar {
  display: none;
}

.m-panel {
  flex: 0 0 100%;
  width: 100%;
  height: 100%;
  min-height: 0;
  scroll-snap-align: start;
  scroll-snap-stop: always;
  padding: 0 1px;
}

/* 矮屏兜底：再压一档，保证仍然一屏 */
@media (max-height: 700px) {
  .m-hello {
    font-size: 17px;
  }
  .m-hero {
    padding-bottom: 0;
  }
  .dashboard.is-mobile {
    gap: 6px;
  }
  .m-console {
    flex: 0 0 auto;
  }
  .m-deck {
    flex: 1 1 0;
  }
}

/* ============================ 食谱抽屉 ============================ */
.rs {
  display: flex;
  flex-direction: column;
  gap: 26px;
}

.rs-day {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rs-title {
  font-size: 15px;
  font-weight: 650;
}

.rs-meal {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.rs-lbl {
  flex: none;
  width: 68px;
  font-size: 12px;
  color: var(--text-3);
  padding-top: 2px;
}

.rs-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.rs-chip {
  padding: 2px 9px;
  border-radius: var(--r-pill);
  font-size: 12px;
  color: var(--text-2);
  background: var(--surface-2);
  border: 1px solid var(--line);
}
</style>
