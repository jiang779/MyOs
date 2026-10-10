<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHead from '@/components/PageHead.vue'
import MarkdownView from '@/components/MarkdownView.vue'
import { bugs, daily, ideas, streakDays, config } from '@/lib/data'

type Tab = 'daily' | 'bugs' | 'ideas'

const tab = ref<Tab>('daily')
const streak = streakDays()

const tabs: { key: Tab; label: string; icon: string }[] = [
  { key: 'daily', label: '每日一句', icon: '✍️' },
  { key: 'bugs', label: '踩坑本', icon: '🕳️' },
  { key: 'ideas', label: '点子本', icon: '💡' },
]

const current = computed(() => (tab.value === 'ideas' ? ideas : bugs))

const allTags = computed(() => {
  const set = new Map<string, number>()
  ;[...bugs, ...ideas].forEach((e) => e.tags.forEach((t) => set.set(t, (set.get(t) ?? 0) + 1)))
  return [...set.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
})

const tagFilter = ref('')
const filtered = computed(() =>
  current.value.filter((e) => !tagFilter.value || e.tags.includes(tagFilter.value))
)
</script>

<template>
  <div>
    <PageHead kicker="沉淀线" title="日志 · 踩坑 · 点子" sub="记录比记忆可靠。今天做了什么，写一行就行。">
      <template #actions>
        <div class="segmented">
          <button v-for="t in tabs" :key="t.key" :class="{ active: tab === t.key }" @click="tab = t.key">
            {{ t.icon }} {{ t.label }}
          </button>
        </div>
      </template>
    </PageHead>

    <div class="grid grid-4">
      <div class="card tile fade-up">
        <span class="tiny muted">连续输出</span>
        <b class="num">{{ streak }}<em>天</em></b>
        <p class="tiny muted">目标 {{ config.streakGoal }} 天</p>
      </div>
      <div class="card tile fade-up">
        <span class="tiny muted">每日记录</span>
        <b class="num">{{ daily.length }}<em>条</em></b>
        <p class="tiny muted">最近 {{ daily[0]?.date ?? '—' }}</p>
      </div>
      <div class="card tile fade-up">
        <span class="tiny muted">踩坑</span>
        <b class="num">{{ bugs.length }}<em>个</em></b>
        <p class="tiny muted">都是超过 20 分钟的那种</p>
      </div>
      <div class="card tile fade-up">
        <span class="tiny muted">点子</span>
        <b class="num">{{ ideas.length }}<em>个</em></b>
        <p class="tiny muted">每周日挑一个看看</p>
      </div>
    </div>

    <!-- 每日 -->
    <section v-if="tab === 'daily'" class="card mt-20 fade-up">
      <div class="card-head">
        <h2 class="card-title"><span class="ico">✍️</span> 每天一句话</h2>
        <span class="card-note">共 {{ daily.length }} 天</span>
      </div>
      <ol v-if="daily.length" class="timeline">
        <li v-for="(d, i) in daily" :key="d.date" :class="{ first: i === 0 }">
          <span class="tl-dot" />
          <div class="tl-body">
            <div class="row" style="gap: 8px">
              <b class="tiny">{{ d.date }}</b>
              <span v-if="d.mood" class="tiny">{{ d.mood }}</span>
              <span v-if="i === 0" class="pill info">最近</span>
            </div>
            <p class="tl-text">{{ d.text }}</p>
          </div>
        </li>
      </ol>
      <div v-else class="empty">
        还没有记录。在 <code>data/daily/</code> 下新建 <code>2026-10-09.md</code>，写一句就算开始。
      </div>
    </section>

    <!-- 踩坑 / 点子 -->
    <template v-else>
      <div class="row wrap mt-20" style="gap: 8px">
        <button class="pill" :class="{ info: !tagFilter }" @click="tagFilter = ''">全部标签</button>
        <button
          v-for="[t, n] in allTags"
          :key="t"
          class="pill"
          :class="{ info: tagFilter === t }"
          @click="tagFilter = tagFilter === t ? '' : t"
        >
          #{{ t }} <span class="muted">{{ n }}</span>
        </button>
      </div>

      <div class="grid grid-2 mt-16">
        <article
          v-for="e in filtered"
          :key="e.title"
          class="card entry fade-up"
        >
          <div class="row between">
            <span class="tiny muted mono">{{ e.date }}</span>
            <div class="row wrap" style="gap: 5px">
              <span v-for="t in e.tags" :key="t" class="pill">{{ t }}</span>
            </div>
          </div>
          <h3 class="entry-title">
            <span v-if="tab === 'bugs'">🕳️</span><span v-else>💡</span>
            {{ e.title }}
          </h3>
          <MarkdownView :source="e.body" />
        </article>
      </div>

      <div v-if="!filtered.length" class="empty">
        这个标签下还没有内容
      </div>
    </template>
  </div>
</template>

<style scoped>
.tile {
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.num {
  font-size: 28px;
  font-weight: 680;
  letter-spacing: -0.035em;
}

.num em {
  font-style: normal;
  font-size: 13px;
  color: var(--text-3);
  font-weight: 550;
  margin-left: 3px;
}

/* 时间轴 */
.timeline {
  position: relative;
  padding-left: 22px;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 5px;
  top: 8px;
  bottom: 12px;
  width: 1.5px;
  background: var(--line);
  border-radius: 2px;
}

.timeline li {
  position: relative;
  padding: 0 0 22px 6px;
}

.tl-dot {
  position: absolute;
  left: -22px;
  top: 7px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--surface-solid);
  border: 2.5px solid var(--line-strong);
}

.timeline li.first .tl-dot {
  background: var(--grad-blue);
  border-color: transparent;
  box-shadow: 0 0 0 4px rgba(10, 132, 255, 0.14);
}

.tl-text {
  margin-top: 5px;
  font-size: 14.5px;
  color: var(--text);
  line-height: 1.7;
}

/* 条目卡 */
.entry {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.entry-title {
  font-size: 15.5px;
  letter-spacing: -0.02em;
  line-height: 1.45;
}

.pill {
  cursor: pointer;
}
</style>
