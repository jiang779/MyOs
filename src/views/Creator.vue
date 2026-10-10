<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHead from '@/components/PageHead.vue'
import ProgressRing from '@/components/ProgressRing.vue'
import ProgressBar from '@/components/ProgressBar.vue'
import MarkdownView from '@/components/MarkdownView.vue'
import SideSheet from '@/components/SideSheet.vue'
import AppIcon from '@/components/AppIcon.vue'
import { config, toISODate, VIDEO_STEPS, videos, type Video, type VideoStatus } from '@/lib/data'
import { setVideoStatus, videoStatus } from '@/lib/store'

const today = new Date()
const month = toISODate(today).slice(0, 7)

const active = ref<Video | undefined>()
const filter = ref<'all' | VideoStatus>('all')

const withStatus = computed(() => videos.map((v) => ({ ...v, status: videoStatus(v.id, v.status) })))

const list = computed(() =>
  withStatus.value.filter((v) => (filter.value === 'all' ? true : v.status === filter.value))
)

const published = computed(() => withStatus.value.filter((v) => v.status === 'published'))
const monthDone = computed(() => published.value.filter((v) => v.publishedAt.startsWith(month)).length)
const totalViews = computed(() => published.value.reduce((s, v) => s + v.views, 0))
const next = computed(() => withStatus.value.find((v) => v.status !== 'published'))

const grouped = computed(() =>
  VIDEO_STEPS.map((s) => ({ ...s, count: withStatus.value.filter((v) => v.status === s.key).length }))
)

const currentStatus = computed(() => active.value && videoStatus(active.value.id, active.value.status))

const STEP_ICON: Record<VideoStatus, string> = {
  script: '✍️',
  record: '🎥',
  edit: '✂️',
  published: '🚀',
}

const STEP_LABEL: Record<VideoStatus, string> = {
  script: '脚本',
  record: '录制',
  edit: '剪辑',
  published: '发布',
}
</script>

<template>
  <div>
    <PageHead kicker="创作线 · 技术短视频" title="创作" sub="视频不是学习的总结，是学习本身。先写第一句话，剩下的都顺了。">
      <template #actions>
        <div class="segmented">
          <button :class="{ active: filter === 'all' }" @click="filter = 'all'">全部</button>
          <button
            v-for="s in VIDEO_STEPS"
            :key="s.key"
            :class="{ active: filter === s.key }"
            @click="filter = s.key"
          >
            {{ s.label }}
          </button>
        </div>
      </template>
    </PageHead>

    <div class="creator-top">
      <section class="card fade-up month-card">
        <ProgressRing :value="(monthDone / config.videoMonthlyGoal) * 100" :size="132" tone="fire">
          <b>{{ monthDone }}<em>/{{ config.videoMonthlyGoal }}</em></b>
          <span class="ring-cap">本月已发</span>
        </ProgressRing>
        <div class="col grow" style="gap: 10px">
          <span class="tiny muted">本月目标 · {{ month }}</span>
          <b class="month-title">再发 {{ Math.max(0, config.videoMonthlyGoal - monthDone) }} 条就达标</b>
          <ProgressBar :value="(monthDone / config.videoMonthlyGoal) * 100" tone="fire" :height="7" />
          <div class="row wrap" style="gap: 8px">
            <span class="pill">累计发布 {{ published.length }} 条</span>
            <span class="pill">总播放 {{ totalViews.toLocaleString('zh-CN') }}</span>
          </div>
        </div>
      </section>

      <section class="card fade-up next-card">
        <div class="card-head">
          <h2 class="card-title"><span class="ico">👉</span> 下一条做什么</h2>
        </div>
        <template v-if="next">
          <b class="next-title">{{ next.title }}</b>
          <p class="tiny muted mt-8">{{ next.hook }}</p>
          <div class="row wrap mt-12" style="gap: 6px">
            <span class="pill info">{{ next.topic }}</span>
            <span class="pill">{{ STEP_ICON[next?.status ?? 'script'] }} {{ STEP_LABEL[next?.status ?? 'script'] }}</span>
          </div>
          <button class="btn primary sm mt-16" @click="active = next">
            打开口播稿
            <AppIcon name="arrow" :size="14" />
          </button>
        </template>
        <p v-else class="tiny muted">全部发完了，该想新选题了。</p>
      </section>
    </div>

    <div class="grid grid-4 mt-20">
      <div v-for="g in grouped" :key="g.key" class="card tile fade-up">
        <div class="row between">
          <span class="tiny muted">{{ g.label }}</span>
          <span class="tiny">{{ STEP_ICON[g.key] }}</span>
        </div>
        <b class="num">{{ g.count }}<em>条</em></b>
      </div>
    </div>

    <div class="grid grid-2 mt-20">
      <article
        v-for="v in list"
        :key="v.id"
        class="card interactive video fade-up"
        @click="active = v"
      >
        <div class="row between">
          <div class="row" style="gap: 10px; min-width: 0">
            <span class="v-no">{{ String(v.no).padStart(2, '0') }}</span>
            <div class="col" style="min-width: 0">
              <b class="v-title">{{ v.title }}</b>
              <span class="tiny muted truncate">{{ v.hook }}</span>
            </div>
          </div>
        </div>

        <!-- 状态流水线 -->
        <div class="steps" @click.stop>
          <button
            v-for="(s, i) in VIDEO_STEPS"
            :key="s.key"
            class="step"
            :class="{ on: v.status === s.key, passed: VIDEO_STEPS.findIndex((x) => x.key === v.status) >= i }"
            @click="setVideoStatus(v.id, s.key)"
          >
            <span class="step-dot">{{ STEP_ICON[s.key] }}</span>
            <span class="step-label">{{ s.label }}</span>
          </button>
        </div>

        <div class="v-foot">
          <div class="row wrap" style="gap: 6px">
            <span class="pill violet">{{ v.topic }}</span>
            <span v-if="v.publishedAt" class="pill ok">{{ v.publishedAt }} 已发</span>
            <span v-if="v.views" class="pill">{{ v.views.toLocaleString('zh-CN') }} 播放</span>
          </div>
          <span class="tiny muted">看口播稿 →</span>
        </div>
      </article>
    </div>

    <SideSheet
      :open="!!active"
      :kicker="active ? `${active.topic} · ${active.platform}` : ''"
      :title="active?.title"
      @close="active = undefined"
    >
      <template v-if="active">
        <div class="steps steps-sheet">
          <button
            v-for="(s, i) in VIDEO_STEPS"
            :key="s.key"
            class="step"
            :class="{ on: currentStatus === s.key, passed: VIDEO_STEPS.findIndex((x) => x.key === currentStatus) >= i }"
            @click="setVideoStatus(active.id, s.key)"
          >
            <span class="step-dot">{{ STEP_ICON[s.key] }}</span>
            <span class="step-label">{{ s.label }}</span>
          </button>
        </div>
        <div class="hr" />
        <MarkdownView :source="active.body" />
      </template>
    </SideSheet>
  </div>
</template>

<style scoped>
.creator-top {
  display: grid;
  grid-template-columns: 1.35fr 1fr;
  gap: 20px;
}

.month-card {
  display: flex;
  align-items: center;
  gap: 26px;
}

.ring-cap {
  font-size: 11.5px;
  color: var(--text-3);
  margin-top: 2px;
}

.month-title {
  font-size: 19px;
  letter-spacing: -0.025em;
}

.next-card {
  display: flex;
  flex-direction: column;
}

.next-title {
  font-size: 15.5px;
  font-weight: 640;
  letter-spacing: -0.02em;
  line-height: 1.4;
}

.tile {
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.num {
  font-size: 26px;
  font-weight: 680;
  letter-spacing: -0.035em;
}

.num em {
  font-style: normal;
  font-size: 12.5px;
  color: var(--text-3);
  font-weight: 550;
  margin-left: 3px;
}

.video {
  display: flex;
  flex-direction: column;
  gap: 16px;
  cursor: pointer;
}

.v-no {
  width: 36px;
  height: 36px;
  flex: none;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 660;
  font-family: 'SF Mono', Menlo, monospace;
  background: var(--surface-2);
  border: 1px solid var(--line);
  color: var(--text-2);
}

.v-title {
  font-size: 15px;
  font-weight: 640;
  letter-spacing: -0.02em;
  line-height: 1.4;
}

.steps {
  display: flex;
  gap: 0;
  padding: 4px;
  border-radius: var(--r-pill);
  background: var(--surface-2);
  border: 1px solid var(--line);
}

.steps-sheet {
  margin-bottom: 4px;
}

.step {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 6px;
  border-radius: var(--r-pill);
  font-size: 12.5px;
  font-weight: 550;
  color: var(--text-3);
  transition: all 0.25s var(--ease);
  white-space: nowrap;
}

.step.passed {
  color: var(--text-2);
}

.step.on {
  background: var(--surface-solid);
  color: var(--accent);
  box-shadow: var(--shadow-sm);
}

.step-dot {
  font-size: 13px;
  line-height: 1;
}

.v-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: auto;
}

@media (max-width: 1100px) {
  .creator-top {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .month-card {
    flex-direction: column;
    align-items: flex-start;
  }
  .step-label {
    display: none;
  }
}
</style>
