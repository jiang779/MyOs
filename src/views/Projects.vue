<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHead from '@/components/PageHead.vue'
import ProgressBar from '@/components/ProgressBar.vue'
import MarkdownView from '@/components/MarkdownView.vue'
import SideSheet from '@/components/SideSheet.vue'
import AppIcon from '@/components/AppIcon.vue'
import { projects, type Project } from '@/lib/data'

const active = ref<Project | null>(null)

const avg = computed(() =>
  projects.length ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length) : 0
)
const shipped = computed(() => projects.filter((p) => p.status.includes('上线')).length)
const stacking = computed(() => new Set(projects.flatMap((p) => p.stack)).size)

function pillClass(status: string) {
  if (status.includes('上线')) return 'ok'
  if (status.includes('未开始') || status.includes('规划')) return 'mute'
  return 'info'
}
</script>

<template>
  <div>
    <PageHead
      kicker="作品线"
      title="项目"
      sub="每个项目都得能被讲出来：解决什么问题、用了什么、还缺什么。简历上写的是这些。"
    />

    <div class="grid grid-4">
      <div class="card tile fade-up">
        <span class="tiny muted">自研项目</span>
        <b class="num">{{ projects.length }}<em>个</em></b>
        <p class="tiny muted">按完成度排序</p>
      </div>
      <div class="card tile fade-up">
        <span class="tiny muted">平均完成度</span>
        <b class="num">{{ avg }}<em>%</em></b>
        <ProgressBar :value="avg" :height="6" />
      </div>
      <div class="card tile fade-up">
        <span class="tiny muted">已上线</span>
        <b class="num">{{ shipped }}<em>个</em></b>
        <p class="tiny muted">能被别人访问到</p>
      </div>
      <div class="card tile fade-up">
        <span class="tiny muted">技术栈覆盖</span>
        <b class="num">{{ stacking }}<em>项</em></b>
        <p class="tiny muted">跨项目去重</p>
      </div>
    </div>

    <div class="grid grid-2 mt-20">
      <article
        v-for="p in projects"
        :key="p.slug"
        class="card interactive proj fade-up"
        @click="active = p"
      >
        <div class="row between">
          <div class="row" style="gap: 12px; min-width: 0">
            <span class="proj-emoji">{{ p.emoji }}</span>
            <div class="col" style="min-width: 0">
              <b class="proj-title truncate">{{ p.title }}</b>
              <span class="tiny muted">{{ p.period }}</span>
            </div>
          </div>
          <span class="pill" :class="pillClass(p.status)">{{ p.status }}</span>
        </div>

        <p class="proj-pitch">{{ p.pitch }}</p>

        <div class="row wrap" style="gap: 6px">
          <span v-for="s in p.stack" :key="s" class="pill">{{ s }}</span>
        </div>

        <div class="missing">
          <AppIcon name="target" :size="14" />
          <span><b>缺</b> {{ p.missing }}</span>
        </div>

        <div class="proj-foot">
          <ProgressBar :value="p.progress" :height="7" :tone="p.progress >= 80 ? 'green' : ''" />
          <div class="row between mt-8">
            <span class="tiny muted">完成度 {{ p.progress }}%</span>
            <span class="tiny muted">看 README →</span>
          </div>
        </div>
      </article>
    </div>

    <SideSheet
      :open="!!active"
      :kicker="active?.status"
      :title="active?.title"
      @close="active = null"
    >
      <div v-if="active" class="col" style="gap: 14px">
        <div class="meta-row">
          <div class="col">
            <span class="tiny muted">技术栈</span>
            <div class="row wrap mt-8" style="gap: 6px">
              <span v-for="s in active.stack" :key="s" class="pill">{{ s }}</span>
            </div>
          </div>
        </div>
        <div class="meta-row">
          <div class="col">
            <span class="tiny muted">还能补什么</span>
            <p class="dim" style="font-size: 14px; margin-top: 6px">{{ active.missing }}</p>
          </div>
        </div>
        <div>
          <div class="row between mb-12">
            <span class="tiny muted">完成度</span>
            <span class="tiny muted">{{ active.progress }}%</span>
          </div>
          <ProgressBar :value="active.progress" />
        </div>
        <div class="hr" />
        <MarkdownView :source="active.body" />
      </div>
    </SideSheet>
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

.proj {
  display: flex;
  flex-direction: column;
  gap: 14px;
  cursor: pointer;
}

.proj-emoji {
  width: 44px;
  height: 44px;
  flex: none;
  border-radius: 14px;
  display: grid;
  place-items: center;
  font-size: 21px;
  background: var(--surface-2);
  border: 1px solid var(--line);
}

.proj-title {
  font-size: 15.5px;
  font-weight: 650;
  letter-spacing: -0.02em;
}

.proj-pitch {
  font-size: 14px;
  color: var(--text-2);
  line-height: 1.65;
  flex: 1;
}

.missing {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 13px;
  border-radius: var(--r-sm);
  background: rgba(255, 159, 10, 0.09);
  border: 1px solid rgba(255, 159, 10, 0.2);
  font-size: 12.5px;
  color: var(--text-2);
  line-height: 1.55;
}

.missing svg {
  color: var(--warn);
  flex: none;
  margin-top: 2px;
}

.missing b {
  color: var(--text);
}

.proj-foot {
  margin-top: auto;
}

.meta-row {
  padding: 14px 16px;
  border-radius: var(--r-md);
  background: var(--surface-2);
  border: 1px solid var(--line);
}
</style>
