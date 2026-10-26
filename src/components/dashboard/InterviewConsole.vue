<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import QuestionPlanet from '@/components/QuestionPlanet.vue'
import SpectrumBar from './SpectrumBar.vue'
import { interviewTotals, last7Days, streakDays, todayDone, typeStats } from '@/lib/dashboard'

defineProps<{ compact?: boolean }>()

const totals = computed(() => interviewTotals())
const stats = computed(() => typeStats())
const days = computed(() => last7Days())
const streak = computed(() => streakDays())
const todayN = computed(() => todayDone())
const maxDay = computed(() => Math.max(1, ...days.value.map((d) => d.count)))

const barH = (n: number) => (n ? 22 + (n / maxDay.value) * 78 : 8)
const pctLabel = computed(() => {
  const p = totals.value.pct
  return p > 0 && p < 10 ? p.toFixed(1) : String(Math.round(p))
})
</script>

<template>
  <section class="card card--primary console" :class="{ compact }">
    <header class="head">
      <div class="col head-text">
        <span class="kicker">面试题库 · {{ stats.length }} 类</span>
        <h2 class="title">今天刷几题？</h2>
      </div>
      <RouterLink class="go" to="/interview" title="全部题库">
        <span>全部题库</span>
        <AppIcon name="arrow" :size="14" />
      </RouterLink>
    </header>

    <div class="body">
      <div class="data">
        <div class="metrics">
          <div class="big">
            <b class="num">{{ totals.done }}</b>
            <span class="of num">/ {{ totals.total }} 题</span>
          </div>

          <div class="rate">
            <b class="num">{{ pctLabel }}<em>%</em></b>
            <span>完成率</span>
          </div>

          <div v-if="!compact" class="spark-wrap">
            <span class="spark-label">近 7 天</span>
            <div class="spark" aria-hidden="true">
              <i
                v-for="d in days"
                :key="d.key"
                :class="{ today: d.today, on: d.count > 0 }"
                :style="{ height: barH(d.count) + '%' }"
                :title="`${d.label} · ${d.count} 题`"
              />
            </div>
          </div>

          <div v-if="streak > 0" class="streak" :title="`连续 ${streak} 天`">
            <AppIcon name="flame" :size="13" />
            <b class="num">{{ streak }}</b>
            <span>天</span>
          </div>
        </div>

        <SpectrumBar :items="stats" :height="compact ? 8 : 10" />

        <ul class="types">
          <li v-for="s in stats" :key="s.fileName" :style="{ '--c': s.color }">
            <i class="dot" />
            <span class="name truncate">{{ s.type }}</span>
            <span class="n num">{{ s.done }}/{{ s.total }}</span>
            <span class="bar"><i :style="{ width: s.pct + '%' }" /></span>
          </li>
        </ul>

        <div class="goal">
          <span class="goal-label">今日目标</span>
          <span class="goal-dots" aria-hidden="true">
            <i v-for="i in 5" :key="i" :class="{ on: todayN >= i }" />
          </span>
          <span class="goal-n num">{{ Math.min(todayN, 5) }}/5</span>
        </div>

        <div class="actions">
          <button class="btn primary" type="button" @click="$emit('drill')">
            <AppIcon name="spark" :size="14" />
            随机 5 题
          </button>
          <span v-if="todayN" class="today num">今日 +{{ todayN }}</span>
        </div>
      </div>

      <div v-if="!compact" class="planet-col">
        <QuestionPlanet />
      </div>
    </div>
  </section>
</template>

<style scoped>
.console {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 228px;
  gap: 16px;
  align-items: stretch;
}

.data {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  min-height: 0;
}

.planet-col {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
}

.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.head-text {
  min-width: 0;
}

.kicker {
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--text-3);
}

.title {
  font-size: 20px;
  letter-spacing: -0.035em;
  margin-top: 2px;
}

.go {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11.5px;
  font-weight: 560;
  color: var(--text-3);
  transition: color var(--dur-2) var(--ease-out);
}

.go:hover {
  color: var(--accent);
}

.metrics {
  display: flex;
  align-items: flex-end;
  gap: 18px;
}

.big {
  display: flex;
  align-items: baseline;
  gap: 7px;
  min-width: 0;
}

.big b {
  font-size: clamp(38px, 4vw, 52px);
  font-weight: 700;
  letter-spacing: -0.05em;
  line-height: 0.9;
}

.big .of {
  font-size: 11.5px;
  color: var(--text-3);
  white-space: nowrap;
}

.rate {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding-bottom: 2px;
}

.rate b {
  font-size: 17px;
  font-weight: 680;
  letter-spacing: -0.03em;
  line-height: 1;
}

.rate b em {
  font-style: normal;
  font-size: 10px;
  color: var(--text-3);
  margin-left: 1px;
}

.rate span {
  font-size: 10.5px;
  color: var(--text-3);
}

.spark-wrap {
  margin-left: auto;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 5px;
}

.spark-label {
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--text-3);
}

.spark {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 26px;
}

.spark i {
  width: 5px;
  min-height: 3px;
  border-radius: 2px;
  background: var(--line-strong);
  opacity: 0.5;
}

.spark i.on {
  background: var(--accent);
  opacity: 0.75;
}

.spark i.today {
  background: var(--accent-2);
  opacity: 1;
  box-shadow: 0 0 8px var(--accent-2);
}

.streak {
  display: flex;
  align-items: baseline;
  gap: 3px;
  padding-bottom: 2px;
  color: var(--text-3);
  flex: none;
}

.streak b {
  font-size: 15px;
  font-weight: 680;
  color: var(--text);
}

.streak span {
  font-size: 10.5px;
}

.types {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 20px;
  align-content: start;
  min-height: 0;
}

.types li {
  display: grid;
  grid-template-columns: 7px minmax(0, 1fr) auto;
  grid-template-rows: auto 3px;
  align-items: center;
  gap: 2px 7px;
  min-width: 0;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 2px;
  background: var(--c);
}

.name {
  font-size: 11.5px;
  color: var(--text-2);
}

.n {
  font-size: 10px;
  color: var(--text-3);
}

.bar {
  grid-column: 2 / -1;
  height: 3px;
  border-radius: 2px;
  background: var(--line);
  overflow: hidden;
}

.bar i {
  display: block;
  height: 100%;
  border-radius: 2px;
  background: var(--c);
  transition: width 0.8s var(--ease-out);
}

.goal {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--line);
}

.goal-label {
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--text-3);
}

.goal-dots {
  display: flex;
  gap: 5px;
}

.goal-dots i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  border: 1px solid var(--line-strong);
}

.goal-dots i.on {
  background: var(--accent);
  border-color: transparent;
  box-shadow: 0 0 8px var(--accent);
}

.goal-n {
  margin-left: auto;
  font-size: 10.5px;
  color: var(--text-3);
}

.actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.today {
  font-size: 11px;
  color: var(--text-3);
}

/* ---------------- 移动端紧凑档 ---------------- */
.console.compact {
  padding: 14px;
  gap: 9px;
}

.console.compact .body {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.compact .goal {
  border-top: 0;
  padding-top: 0;
}

.compact .title {
  font-size: 16px;
}

.compact .kicker {
  font-size: 10px;
}

.compact .big b {
  font-size: 34px;
}

.compact .rate b {
  font-size: 15px;
}

.compact .metrics {
  gap: 12px;
}

.compact .types {
  gap: 10px 12px;
  padding: 2px 0;
}

.compact .types li {
  padding: 4px 0;
}

.compact .name {
  font-size: 10.5px;
}

.compact .actions :deep(.btn) {
  min-height: 32px;
  padding: 5px 14px;
  font-size: 12px;
}

/* 控制台通栏时，类型列表保持 2 列：右侧有星球，4 列会把题型名挤断 */

/* 小屏兜底：一屏放不下时只砍次要信息，不出现滚动 */
@media (max-height: 720px) {
  .console.compact {
    height: auto;
    gap: 7px;
    padding: 12px;
  }
  .compact .goal {
    display: none;
  }
  .compact .types li:nth-child(n + 7) {
    display: none;
  }
  .compact .big b {
    font-size: 30px;
  }
  .compact .actions :deep(.btn) {
    min-height: 30px;
    padding: 4px 12px;
  }
  .compact .types {
    gap: 4px 12px;
  }
  .compact .types li {
    padding: 2px 0;
  }
}

@media (max-height: 620px) {
  .compact .rate {
    display: none;
  }
  .compact .types li:nth-child(n + 5) {
    display: none;
  }
}
</style>
