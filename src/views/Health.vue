<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHead from '@/components/PageHead.vue'
import AppIcon from '@/components/AppIcon.vue'
import { diet, dietNote, dietTodayTomorrow, isoWeekday, type DietDay } from '@/lib/data'
import {
  addJunkRecord,
  importJunkRecords,
  JUNK_SCENES,
  markJunkBackup,
  removeJunkRecord,
  state,
} from '@/lib/store'
import { groupByMonth, isoDate, junkStats, weekdayCN } from '@/lib/junk'

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

/* ------------------------------ 破功记录 ------------------------------ */

const todayISO = isoDate(new Date())
const draftDate = ref(todayISO)
const draftFood = ref('')
const draftScene = ref('')

const records = computed(() => state.junkRecords)
const stats = computed(() => junkStats(records.value))
const groups = computed(() => groupByMonth(records.value))

const maxMonth = computed(() => Math.max(1, ...stats.value.months.map((m) => m.count)))
const maxFood = computed(() => Math.max(1, ...stats.value.topFoods.map((f) => f.count)))
const barH = (n: number) => `${Math.round((n / maxMonth.value) * 100)}%`
const foodW = (n: number) => `${Math.round((n / maxFood.value) * 100)}%`

const notice = ref('')
let noticeTimer: number | undefined
function flash(msg: string) {
  notice.value = msg
  window.clearTimeout(noticeTimer)
  noticeTimer = window.setTimeout(() => (notice.value = ''), 3200)
}

function submit() {
  const food = draftFood.value.trim()
  if (!food) return
  addJunkRecord({ date: draftDate.value || todayISO, food, scene: draftScene.value })
  draftFood.value = ''
  draftScene.value = ''
  flash('已记一笔')
}

function del(id: string) {
  if (!window.confirm('删掉这条记录？')) return
  removeJunkRecord(id)
}

/* ------------------------------ 备份 / 恢复 ------------------------------ */

const fileInput = ref<HTMLInputElement | null>(null)

const backupText = computed(() => {
  if (!records.value.length) return '暂无记录'
  if (!state.junkBackupAt) return `${records.value.length} 条 · 从未备份`
  return unbacked.value > 0 ? `${unbacked.value} 条未备份` : '已是最新'
})

/** 备份之后新增的条数 */
const unbacked = computed(
  () => records.value.filter((r) => !state.junkBackupAt || (r.createdAt && r.createdAt > state.junkBackupAt)).length
)

/** 有记录没进最近一次备份 → 备份卡亮起来提醒导出 */
const needBackup = computed(
  () => records.value.length > 0 && (!state.junkBackupAt || unbacked.value > 0)
)

function exportBackup() {
  const payload = {
    app: 'my-os',
    kind: 'junk-records',
    version: 1,
    exportedAt: new Date().toISOString(),
    records: state.junkRecords,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `junk-records-${todayISO}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  markJunkBackup()
  flash(`已导出 ${state.junkRecords.length} 条`)
}

async function importBackup(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    const parsed: unknown = JSON.parse(await file.text())
    const rows = Array.isArray(parsed) ? parsed : (parsed as { records?: unknown } | null)?.records
    if (!Array.isArray(rows)) throw new Error('bad format')
    const n = importJunkRecords(rows)
    flash(n > 0 ? `已导入 ${n} 条` : '没有新记录（都已存在）')
  } catch {
    flash('这个文件读不出来，请选导出的 JSON 备份')
  } finally {
    input.value = ''
  }
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

      <!-- ============ 破功记录 ============ -->
      <section class="card mt-20 fade-up">
        <div class="card-head">
          <h2 class="card-title"><span class="ico">🍟</span> 破功记录</h2>
          <span class="card-note">吃了一笔就记一笔</span>
        </div>

        <form class="junk-form" @submit.prevent="submit">
          <input v-model="draftDate" class="field date" type="date" :max="todayISO" aria-label="日期" />
          <input
            v-model="draftFood"
            class="field grow"
            type="text"
            maxlength="60"
            placeholder="吃了什么？比如「一包薯片 + 半杯奶茶」"
            aria-label="吃了什么"
          />
          <button class="btn primary sm" type="submit" :disabled="!draftFood.trim()">记一笔</button>
        </form>

        <div class="scene-row">
          <span class="tiny muted">场景</span>
          <button
            v-for="s in JUNK_SCENES"
            :key="s"
            type="button"
            class="scene"
            :class="{ on: draftScene === s }"
            @click="draftScene = draftScene === s ? '' : s"
          >
            {{ s }}
          </button>
          <span v-if="notice" class="notice">{{ notice }}</span>
        </div>

        <div class="junk-metrics">
          <div class="jm">
            <span class="jm-label">距上次破功</span>
            <b class="jm-value"
              >{{ stats.cleanDays === null ? '—' : stats.cleanDays
              }}<em v-if="stats.cleanDays !== null">天</em></b
            >
          </div>
          <div class="jm">
            <span class="jm-label">本周</span>
            <b class="jm-value">{{ stats.week }}<em>次</em></b>
          </div>
          <div class="jm">
            <span class="jm-label">本月</span>
            <b class="jm-value">{{ stats.month }}<em>次</em></b>
          </div>
          <div class="jm">
            <span class="jm-label">累计</span>
            <b class="jm-value">{{ stats.total }}<em>次</em></b>
          </div>
        </div>
      </section>

      <!-- ============ 统计 + 明细 ============ -->
      <div class="grid grid-2 mt-20">
        <section class="card fade-up">
          <div class="card-head">
            <h2 class="card-title"><span class="ico">📊</span> 统计</h2>
            <span class="card-note">近 6 个月</span>
          </div>

          <div class="trend">
            <div v-for="m in stats.months" :key="m.key" class="trend-col">
              <span class="trend-num">{{ m.count || '' }}</span>
              <div class="trend-bar">
                <span :style="{ height: barH(m.count) }" :class="{ zero: !m.count }" />
              </div>
              <span class="trend-label">{{ m.label }}</span>
            </div>
          </div>

          <template v-if="stats.topFoods.length">
            <p class="sub-title">最常吃</p>
            <ul class="top-list">
              <li v-for="f in stats.topFoods" :key="f.food">
                <span class="top-food truncate">{{ f.food }}</span>
                <span class="top-bar"><span :style="{ width: foodW(f.count) }" /></span>
                <span class="top-count">{{ f.count }} 次</span>
              </li>
            </ul>
          </template>

          <template v-if="stats.scenes.length">
            <p class="sub-title">场景</p>
            <div class="chips">
              <span v-for="s in stats.scenes" :key="s.scene" class="chip">{{ s.scene }} · {{ s.count }}</span>
            </div>
          </template>

          <div v-if="!stats.total" class="empty">还没有记录，趋势图长出来再说</div>
        </section>

        <section class="card fade-up">
          <div class="card-head">
            <h2 class="card-title"><span class="ico">📋</span> 明细</h2>
            <span class="card-note">{{ stats.total }} 条</span>
          </div>

          <div v-if="groups.length" class="junk-list">
            <div v-for="g in groups" :key="g.key" class="junk-group">
              <p class="junk-month">{{ g.label }} · {{ g.items.length }} 次</p>
              <div v-for="r in g.items" :key="r.id" class="junk-item">
                <span class="junk-date">{{ r.date.slice(5) }} {{ weekdayCN(r.date) }}</span>
                <span class="junk-food grow">{{ r.food }}</span>
                <span v-if="r.scene" class="pill mute">{{ r.scene }}</span>
                <button class="junk-del" title="删除这条" @click="del(r.id)">×</button>
              </div>
            </div>
          </div>
          <div v-else class="empty">还没记过，继续保持 🍃</div>
        </section>
      </div>

      <!-- ============ 备份 ============ -->
      <section class="card mt-20 fade-up" :class="{ 'backup-due': needBackup }">
        <div class="card-head">
          <h2 class="card-title">
            <span class="ico">💾</span> 数据备份
            <span v-if="needBackup" class="due-dot" title="有新记录还没导出"></span>
          </h2>
          <span class="card-note" :class="{ warn: needBackup }">{{ backupText }}</span>
        </div>
        <p class="tiny muted backup-tip">
          这份记录存在当前设备的浏览器里（localStorage）。<b>清浏览器数据、换手机换电脑、无痕模式都会读不到</b>，
          所以隔一段时间导出一份 JSON 放到项目目录或网盘，换设备时用「导入恢复」拿回来。
        </p>
        <div class="row wrap mt-12">
          <button class="btn sm" @click="exportBackup">导出备份</button>
          <button class="btn ghost sm" @click="fileInput?.click()">导入恢复</button>
          <input ref="fileInput" type="file" accept="application/json,.json" hidden @change="importBackup" />
          <span v-if="state.junkBackupAt" class="tiny muted">上次备份 {{ state.junkBackupAt.slice(0, 10) }}</span>
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

/* ---------------- 破功记录 ---------------- */

.junk-form {
  display: flex;
  gap: 10px;
  align-items: center;
}

.field {
  padding: 9px 13px;
  border-radius: var(--r-pill);
  border: 1px solid var(--line);
  background: var(--surface-2);
  color: var(--text);
  font: inherit;
  font-size: 13.5px;
  transition: border-color 0.2s var(--ease), background 0.2s var(--ease);
}

.field::placeholder {
  color: var(--text-3);
}

.field:focus {
  outline: none;
  border-color: rgba(10, 132, 255, 0.45);
  background: var(--surface-solid);
}

.field.date {
  flex: none;
  width: 150px;
}

.scene-row {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
  margin-top: 10px;
}

.scene {
  padding: 4px 12px;
  border-radius: var(--r-pill);
  font-size: 12.5px;
  font-weight: 550;
  color: var(--text-2);
  background: var(--surface-2);
  border: 1px solid var(--line);
  transition: all 0.2s var(--ease);
}

.scene:hover {
  border-color: var(--line-strong);
}

.scene.on {
  color: var(--accent);
  background: var(--accent-soft);
  border-color: rgba(10, 132, 255, 0.3);
}

.notice {
  margin-left: auto;
  font-size: 12.5px;
  color: var(--accent);
  animation: fadeUp 0.3s var(--ease) both;
}

.junk-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid var(--line);
}

.jm {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.jm-label {
  font-size: 12px;
  color: var(--text-3);
  font-weight: 550;
}

.jm-value {
  font-size: 22px;
  font-weight: 680;
  letter-spacing: -0.03em;
  line-height: 1.2;
}

.jm-value em {
  font-style: normal;
  font-size: 12.5px;
  font-weight: 550;
  color: var(--text-3);
  margin-left: 2px;
}

/* ---------------- 统计 ---------------- */

.sub-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-3);
  margin: 20px 0 10px;
}

.trend {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  height: 116px;
  padding: 0 2px;
}

.trend-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  height: 100%;
}

.trend-num {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-2);
  height: 14px;
  line-height: 14px;
}

.trend-bar {
  flex: 1;
  width: 100%;
  max-width: 34px;
  display: flex;
  align-items: flex-end;
  border-radius: 8px;
  background: var(--surface-2);
  overflow: hidden;
}

.trend-bar > span {
  display: block;
  width: 100%;
  min-height: 3px;
  border-radius: 8px;
  background: var(--grad-fire);
  transition: height 0.6s var(--ease);
}

.trend-bar > span.zero {
  background: var(--line);
}

.trend-label {
  font-size: 11.5px;
  color: var(--text-3);
}

.top-list {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.top-list li {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 84px auto;
  align-items: center;
  gap: 10px;
}

.top-food {
  font-size: 13px;
  color: var(--text-2);
}

.top-bar {
  height: 7px;
  border-radius: 999px;
  background: var(--surface-2);
  overflow: hidden;
}

.top-bar > span {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: var(--grad-fire);
  transition: width 0.6s var(--ease);
}

.top-count {
  font-size: 12px;
  color: var(--text-3);
  white-space: nowrap;
  min-width: 42px;
  text-align: right;
}

/* ---------------- 明细 ---------------- */

.junk-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 420px;
  overflow-y: auto;
  margin-right: -6px;
  padding-right: 6px;
}

.junk-month {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-3);
  margin-bottom: 8px;
}

.junk-group .junk-item + .junk-item {
  margin-top: 6px;
}

.junk-item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  border-radius: var(--r-sm);
  background: var(--surface-2);
  border: 1px solid var(--line);
  transition: border-color 0.2s var(--ease);
}

.junk-item:hover {
  border-color: var(--line-strong);
}

.junk-date {
  flex: none;
  font-size: 12px;
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
}

.junk-food {
  font-size: 13.5px;
  color: var(--text);
  min-width: 0;
}

.junk-del {
  flex: none;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 15px;
  line-height: 1;
  color: var(--text-3);
  transition: all 0.2s var(--ease);
}

.junk-del:hover {
  color: var(--danger);
  background: rgba(255, 59, 48, 0.12);
}

/* 有新记录没备份时，把这张卡点亮，提醒导出 */
.card.backup-due {
  border-color: rgba(255, 159, 10, 0.42);
  box-shadow: 0 12px 32px rgba(255, 159, 10, 0.1);
}

.card.backup-due .card-title .ico {
  filter: drop-shadow(0 2px 6px rgba(255, 159, 10, 0.4));
}

.due-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-left: 7px;
  vertical-align: 3px;
  border-radius: 50%;
  background: var(--warn);
  box-shadow: 0 0 0 3px rgba(255, 159, 10, 0.18);
  animation: duePulse 2s var(--ease) infinite;
}

.card-note.warn {
  color: var(--warn);
  font-weight: 600;
}

@keyframes duePulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

.backup-tip {
  line-height: 1.7;
  max-width: 720px;
}

.backup-tip b {
  color: var(--text-2);
}

@media (max-width: 720px) {
  .week-grid {
    gap: 12px;
  }

  .junk-form {
    flex-wrap: wrap;
  }

  .field.date {
    width: calc(50% - 5px);
  }

  .field.grow {
    width: calc(50% - 5px);
  }

  .junk-form .btn {
    width: 100%;
    justify-content: center;
  }

  .junk-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px 10px;
  }

  .junk-list {
    max-height: none;
  }

  .top-list li {
    grid-template-columns: minmax(0, 1fr) 60px auto;
  }
}
</style>
