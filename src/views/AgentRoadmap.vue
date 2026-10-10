<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import PageHead from '@/components/PageHead.vue'
import ProgressBar from '@/components/ProgressBar.vue'
import MarkdownView from '@/components/MarkdownView.vue'
import SideSheet from '@/components/SideSheet.vue'
import CheckItem from '@/components/CheckItem.vue'
import AppIcon from '@/components/AppIcon.vue'
import { currentWeekNo, stages, weeks, type WeekPlan } from '@/lib/data'
import { cycleWeekStatus, isChecked, toggleTask, weekStatus, type WeekStatus } from '@/lib/store'

type Filter = 'all' | 'todo' | 'active' | 'done'

const filter = ref<Filter>('all')
const todayWeek = currentWeekNo()

/* 阶段卡展开/收起：默认全部收起 */
const expanded = ref<Set<number>>(new Set())
const isExpanded = (id: number) => expanded.value.has(id)
function toggleStage(id: number) {
  const next = new Set(expanded.value)
  next.has(id) ? next.delete(id) : next.add(id)
  expanded.value = next
}

const statusOf = (w: WeekPlan) => weekStatus(w.no, w.status)

const STATUS_LABEL: Record<WeekStatus, string> = {
  todo: '待开始',
  active: '进行中',
  done: '完成',
}
const STATUS_PILL: Record<WeekStatus, string> = { todo: 'mute', active: 'info', done: 'ok' }

const visible = computed(() =>
  stages
    .map((s) => ({
      ...s,
      weeks: s.weeks.filter((w) => filter.value === 'all' || statusOf(w) === filter.value),
      done: s.weeks.filter((w) => statusOf(w) === 'done').length,
    }))
    .filter((s) => s.weeks.length)
)

const totalDone = computed(() => weeks.filter((w) => statusOf(w) === 'done').length)
const overall = computed(() => (totalDone.value / weeks.length) * 100)

/* 切筛选时：全部 → 收回；指定状态 → 自动展开命中的阶段，否则筛完是空的没意义 */
watch(filter, (f) => {
  expanded.value = f === 'all' ? new Set() : new Set(visible.value.map((s) => s.id))
})

const active = ref<WeekPlan | null>(null)
const open = (w: WeekPlan) => (active.value = w)

function weekTasksDone(w: WeekPlan) {
  return w.tasks.filter((t, i) => isChecked(w.no, i, t.done)).length
}
function weekPct(w: WeekPlan) {
  return w.tasks.length ? (weekTasksDone(w) / w.tasks.length) * 100 : w.progress
}
</script>

<template>
  <div>
    <PageHead
      kicker="学习线 · 阶段 0–5 · 36 周"
      title="Agent 路线"
      sub="每周不求学完，只求交出一个东西。点周卡右侧的状态可以标记「进行中 / 完成」。"
    >
      <template #actions>
        <div class="segmented">
          <button :class="{ active: filter === 'all' }" @click="filter = 'all'">全部</button>
          <button :class="{ active: filter === 'todo' }" @click="filter = 'todo'">待开始</button>
          <button :class="{ active: filter === 'active' }" @click="filter = 'active'">进行中</button>
          <button :class="{ active: filter === 'done' }" @click="filter = 'done'">完成</button>
        </div>
      </template>
    </PageHead>

    <!-- 总览 -->
    <section class="card fade-up">
      <div class="row between wrap" style="gap: 20px">
        <div class="col">
          <span class="tiny muted">整体进度</span>
          <b class="big">{{ totalDone }}<em>/ {{ weeks.length }} 周</em></b>
        </div>
        <div class="col grow" style="min-width: 240px; gap: 8px">
          <ProgressBar :value="overall" tone="green" />
          <div class="row between">
            <span class="tiny muted">当前第 {{ todayWeek }} 周 · 共 {{ weeks.length }} 周</span>
            <span class="tiny muted">{{ Math.round(overall) }}%</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 阶段卡 0–5 -->
    <section
      v-for="s in visible"
      :key="s.id"
      class="card stage-card fade-up"
      :class="{ collapsed: !isExpanded(s.id) }"
    >
      <header
        class="stage-head"
        role="button"
        tabindex="0"
        :aria-expanded="isExpanded(s.id)"
        @click="toggleStage(s.id)"
        @keydown.enter.prevent="toggleStage(s.id)"
        @keydown.space.prevent="toggleStage(s.id)"
      >
        <div class="stage-no">{{ s.id }}</div>
        <div class="col grow">
          <b class="stage-title">阶段 {{ s.id }} · {{ s.title.replace(/^阶段 \d+ · /, '') }}</b>
          <span class="tiny muted">
            第 {{ s.weeks[0].no }}–{{ s.weeks[s.weeks.length - 1].no }} 周 · 共
            {{ s.weeks.length }} 周
          </span>
        </div>
        <div class="stage-prog">
          <div class="row between mb-8">
            <span class="tiny muted">完成度</span>
            <span class="tiny muted">{{ s.done }}/{{ s.weeks.length }}</span>
          </div>
          <ProgressBar :value="(s.done / s.weeks.length) * 100" :height="6" tone="green" />
        </div>
        <span class="stage-chev" :class="{ open: isExpanded(s.id) }">
          <AppIcon name="chevron" :size="18" />
        </span>
      </header>

      <!-- 展开区：具体周卡 -->
      <div class="stage-body" :class="{ open: isExpanded(s.id) }">
        <div class="stage-body-inner">
          <div class="grid grid-3 week-grid">
            <article
              v-for="w in s.weeks"
              :key="w.no"
              class="week-card"
              :class="{ current: w.no === todayWeek }"
              @click="open(w)"
            >
              <div class="row between">
                <span class="pill" :class="{ info: w.no === todayWeek }">
                  {{ w.no === todayWeek ? '本周' : `第 ${w.no} 周` }}
                </span>
                <button
                  class="pill status"
                  :class="STATUS_PILL[statusOf(w)]"
                  title="点一下切换：待开始 → 进行中 → 完成"
                  @click.stop="cycleWeekStatus(w.no, w.status)"
                >
                  {{ STATUS_LABEL[statusOf(w)] }}
                </button>
              </div>

              <h4 class="week-title">{{ w.title }}</h4>

              <!-- 本周每日安排（Day1 … Day6） -->
              <ul v-if="w.days.length" class="days">
                <li v-for="d in w.days" :key="d.label">
                  <span class="day-label">{{ d.label }}</span>
                  <span class="day-text">{{ d.text }}</span>
                </li>
              </ul>

              <div v-if="w.deliverable" class="deliver-line">
                <span class="tiny muted">交付</span>
                <span class="deliver">{{ w.deliverable }}</span>
              </div>

              <footer class="week-foot">
                <ProgressBar
                  :value="weekPct(w)"
                  :height="6"
                  :tone="statusOf(w) === 'done' ? 'green' : ''"
                />
                <div class="row between mt-8">
                  <span class="tiny muted">约 {{ w.hours }} 小时</span>
                  <span class="tiny muted">三件事 {{ weekTasksDone(w) }}/{{ w.tasks.length }}</span>
                </div>
              </footer>
            </article>
          </div>
        </div>
      </div>
    </section>

    <div v-if="!visible.length" class="empty">这个状态下还没有周。</div>

    <!-- 渲染 week-xx.md -->
    <SideSheet
      :open="!!active"
      :kicker="active ? `第 ${active.no} 周 · ${active.stageTitle}` : ''"
      :title="active?.title"
      @close="active = null"
    >
      <template v-if="active">
        <div class="sheet-tasks">
          <div class="row between mb-12">
            <b class="tiny dim">本周三件事</b>
            <button class="pill" :class="STATUS_PILL[statusOf(active)]" @click="cycleWeekStatus(active.no, active.status)">
              标记为{{ STATUS_LABEL[statusOf(active)] }}
            </button>
          </div>
          <CheckItem
            v-for="(t, i) in active.tasks"
            :key="i"
            :text="t.text"
            :checked="isChecked(active.no, i, t.done)"
            @toggle="toggleTask(active.no, i, t.done)"
          />
          <p class="tiny muted mt-8">已完成 {{ weekTasksDone(active) }} / {{ active.tasks.length }}</p>
        </div>
        <div class="hr" />
        <MarkdownView :source="active.body" />
      </template>
    </SideSheet>
  </div>
</template>

<style scoped>
.big {
  font-size: 30px;
  font-weight: 680;
  letter-spacing: -0.035em;
}

.big em {
  font-style: normal;
  font-size: 14px;
  color: var(--text-3);
  font-weight: 550;
  margin-left: 4px;
}

/* ---------------- 阶段卡 ---------------- */
.stage-card {
  margin-top: 20px;
  padding: 24px;
}

.stage-head {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
  cursor: pointer;
  user-select: none;
  border-radius: var(--r-md);
  transition: margin-bottom 0.35s var(--ease);
}

.stage-head:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 6px;
}

/* 收起时：只剩标题 + 进度这一行，去掉下方留白 */
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

/* 展开区动画（0fr → 1fr 平滑展开） */
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
  width: 42px;
  height: 42px;
  flex: none;
  border-radius: 14px;
  display: grid;
  place-items: center;
  font-size: 17px;
  font-weight: 680;
  color: #fff;
  background: var(--grad-blue);
  box-shadow: 0 6px 16px rgba(10, 132, 255, 0.28);
}

.stage-title {
  font-size: 16px;
  font-weight: 660;
  letter-spacing: -0.02em;
}

.stage-prog {
  width: 180px;
  flex: none;
}

.week-grid {
  gap: 16px;
}

/* ---------------- 周卡 ---------------- */
.week-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px;
  border-radius: var(--r-lg);
  background: var(--surface-solid);
  border: 1px solid var(--line);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: transform 0.3s var(--ease), box-shadow 0.3s var(--ease), border-color 0.3s var(--ease);
}

.week-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow);
  border-color: var(--line-strong);
}

.week-card.current {
  border-color: rgba(10, 132, 255, 0.45);
  box-shadow: 0 8px 30px rgba(10, 132, 255, 0.14);
}

.week-title {
  font-size: 15.5px;
  font-weight: 650;
  letter-spacing: -0.025em;
  line-height: 1.35;
}

.days {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  align-content: start;
}

.days li {
  display: flex;
  gap: 8px;
  font-size: 12px;
  line-height: 1.5;
}

.day-label {
  flex: none;
  min-width: 44px;
  font-size: 11px;
  font-weight: 600;
  color: var(--accent);
  padding-top: 1px;
}

.day-text {
  color: var(--text-2);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.deliver-line {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding-top: 10px;
  border-top: 1px solid var(--line);
}

.deliver-line .deliver {
  font-size: 12.5px;
  font-weight: 550;
  color: var(--text);
  line-height: 1.5;
}

.week-foot {
  margin-top: auto;
}

.status {
  cursor: pointer;
}

.status:active {
  transform: scale(0.94);
}

.sheet-tasks {
  padding: 12px 14px;
  border-radius: var(--r-lg);
  background: var(--surface-2);
  border: 1px solid var(--line);
}

.sheet-tasks .pill {
  cursor: pointer;
}

@media (max-width: 1100px) {
  .stage-prog {
    width: 130px;
  }
}

@media (max-width: 720px) {
  .stage-card {
    padding: 16px 16px 18px;
  }
  /* 移动端：标题 + 进度恒定一行，不换行 */
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
  .stage-prog {
    width: auto;
    flex: none;
    min-width: 72px;
  }
  .stage-prog .row.between {
    justify-content: flex-end;
    gap: 6px;
  }
  /* 移动端省掉「完成度」三个字，只留 x/y */
  .stage-prog .row.between > span:first-child {
    display: none;
  }
  .stage-chev {
    width: 26px;
    height: 26px;
  }
}
</style>
