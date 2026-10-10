<script setup lang="ts">
import { ref } from 'vue'
import PageHead from '@/components/PageHead.vue'
import AppIcon from '@/components/AppIcon.vue'
import { diet, dietNote, dietTodayTomorrow, isoWeekday, type DietDay } from '@/lib/data'

type Tab = 'diet' | 'sport'
const tab = ref<Tab>('diet')

const tt = dietTodayTomorrow()
const todayWeek = isoWeekday(tt.today.date)

const WEEK_CN = '日一二三四五六'
const wd = (d: Date) => '星期' + WEEK_CN[d.getDay()]
const MEAL_ICON: Record<string, string> = { 早餐: '🌅', 午餐: '☀️', 晚餐: '🌙', 加餐: '🍎', 夜宵: '🌛' }

function isToday(d: DietDay) {
  return d.week === todayWeek
}
</script>

<template>
  <div>
    <PageHead
      kicker="生命线"
      title="健康"
      sub="吃得干净，才有力气折腾。先管好一周菜谱，运动模块之后再补。"
    >
      <template #actions>
        <div class="segmented">
          <button :class="{ active: tab === 'diet' }" @click="tab = 'diet'">🍽 饮食</button>
          <button :class="{ active: tab === 'sport' }" @click="tab = 'sport'">🏃 运动</button>
        </div>
      </template>
    </PageHead>

    <!-- ============ 饮食 ============ -->
    <template v-if="tab === 'diet'">
      <p v-if="dietNote" class="diet-note fade-up">
        <AppIcon name="spark" :size="14" />
        <span>{{ dietNote }}</span>
      </p>

      <!-- 今天 / 明天 -->
      <div class="grid grid-2 mt-20">
        <section class="card day-card is-today fade-up">
          <div class="card-head">
            <h2 class="card-title"><span class="ico">🍽️</span> 今天吃什么</h2>
            <span class="pill info">{{ tt.today.day?.name }}</span>
          </div>
          <div class="meals">
            <div v-for="m in tt.today.day?.meals" :key="m.label" class="meal">
              <span class="meal-label">{{ MEAL_ICON[m.label] }} {{ m.label }}</span>
              <div class="chips">
                <span v-for="(it, i) in m.items" :key="i" class="chip">{{ it }}</span>
              </div>
            </div>
          </div>
          <p class="tiny muted mt-12">{{ wd(tt.today.date) }} · {{ tt.today.day?.kind }}</p>
        </section>

        <section class="card day-card fade-up">
          <div class="card-head">
            <h2 class="card-title"><span class="ico">📅</span> 明天吃什么</h2>
            <span class="pill">{{ tt.tomorrow.day?.name }}</span>
          </div>
          <div class="meals">
            <div v-for="m in tt.tomorrow.day?.meals" :key="m.label" class="meal">
              <span class="meal-label">{{ MEAL_ICON[m.label] }} {{ m.label }}</span>
              <div class="chips">
                <span v-for="(it, i) in m.items" :key="i" class="chip">{{ it }}</span>
              </div>
            </div>
          </div>
          <p class="tiny muted mt-12">{{ wd(tt.tomorrow.date) }} · {{ tt.tomorrow.day?.kind }}</p>
        </section>
      </div>

      <!-- 一周菜谱 -->
      <section class="card mt-20 fade-up">
        <div class="card-head">
          <h2 class="card-title"><span class="ico">📖</span> 一周菜谱</h2>
          <span class="card-note">{{ diet.length }} 天 · 工作日食堂 + 晚餐水煮</span>
        </div>

        <div class="grid grid-3 week-grid">
          <article
            v-for="d in diet"
            :key="d.week"
            class="week-day"
            :class="{ 'is-today': isToday(d) }"
          >
            <div class="row between">
              <b class="week-day-name">{{ d.name }}</b>
              <span class="pill" :class="d.kind === '居家' ? 'violet' : 'mute'">{{ d.kind }}</span>
            </div>
            <div class="week-meals">
              <div v-for="m in d.meals" :key="m.label" class="week-meal">
                <span class="week-meal-label">{{ m.label }}</span>
                <span class="week-meal-text">{{ m.text }}</span>
              </div>
            </div>
            <span v-if="isToday(d)" class="today-flag">今天</span>
          </article>
        </div>
      </section>
    </template>

    <!-- ============ 运动（暂不添加内容） ============ -->
    <template v-else>
      <section class="card mt-20 fade-up">
        <div class="empty-block">
          <span class="ico-big">🏃</span>
          <b>运动模块还没开始</b>
          <p class="tiny muted">这一栏先留着占位。等想好练什么、怎么记，再往 <code>data/health/</code> 里加内容。</p>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.diet-note {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 12px 16px;
  border-radius: var(--r-md);
  background: var(--accent-soft);
  border: 1px solid rgba(10, 132, 255, 0.16);
  color: var(--text-2);
  font-size: 13.5px;
  line-height: 1.6;
}

.diet-note svg {
  color: var(--accent);
  flex: none;
  margin-top: 3px;
}

.day-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.day-card.is-today {
  border-color: rgba(10, 132, 255, 0.3);
  box-shadow: 0 14px 40px rgba(10, 132, 255, 0.14);
}

.day-card.is-today .card-title .ico {
  filter: drop-shadow(0 2px 6px rgba(10, 132, 255, 0.35));
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

.week-grid {
  gap: 14px;
}

.week-day {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 17px;
  border-radius: var(--r-lg);
  background: var(--surface-2);
  border: 1px solid var(--line);
  transition: transform 0.28s var(--ease), border-color 0.28s var(--ease),
    box-shadow 0.28s var(--ease);
}

.week-day:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.week-day.is-today {
  background: var(--surface-solid);
  border-color: rgba(10, 132, 255, 0.3);
  box-shadow: 0 10px 30px rgba(10, 132, 255, 0.12);
}

.week-day-name {
  font-size: 15px;
  font-weight: 650;
  letter-spacing: -0.02em;
}

.week-meals {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.week-meal {
  display: flex;
  gap: 8px;
  font-size: 12.5px;
  line-height: 1.6;
}

.week-meal-label {
  flex: none;
  color: var(--text-3);
  font-weight: 600;
}

.week-meal-text {
  color: var(--text-2);
}

.today-flag {
  position: absolute;
  top: -9px;
  right: 14px;
  padding: 2px 9px;
  border-radius: var(--r-pill);
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  background: var(--grad-blue);
  box-shadow: 0 4px 12px rgba(10, 132, 255, 0.35);
}

.empty-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 46px 20px;
  text-align: center;
}

.empty-block .ico-big {
  font-size: 40px;
  line-height: 1;
}

.empty-block b {
  font-size: 16px;
}

.empty-block p {
  max-width: 380px;
}

.empty-block code {
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace;
  font-size: 12px;
  padding: 1px 6px;
  border-radius: 6px;
  background: var(--surface-2);
  border: 1px solid var(--line);
  color: var(--accent);
}

@media (max-width: 720px) {
  .week-grid {
    gap: 12px;
  }
}
</style>
