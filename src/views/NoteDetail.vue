<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MarkdownView from '@/components/MarkdownView.vue'
import AppIcon from '@/components/AppIcon.vue'
import { noteBySlug, weekByNo } from '@/lib/data'

const route = useRoute()
const router = useRouter()

const week = computed(() => Number(route.params.week))
const slug = computed(() => String(route.params.slug))
const note = computed(() => noteBySlug(week.value, slug.value))
const plan = computed(() => weekByNo(week.value))

function back() {
  if (window.history.length > 1) router.back()
  else router.push('/agent')
}
</script>

<template>
  <div>
    <button class="btn ghost sm back" @click="back">
      <AppIcon name="arrow" :size="15" class="flip" />
      返回
    </button>

    <template v-if="note">
      <header class="card note-head fade-up">
        <span class="page-kicker">第 {{ week }} 周 · {{ plan?.title ?? 'Agent 路线' }}</span>
        <h1 class="note-title">{{ note.title }}</h1>
        <div v-if="note.date || note.tags.length" class="row wrap meta">
          <span v-if="note.date" class="pill mute">{{ note.date }}</span>
          <span v-for="t in note.tags" :key="t" class="pill">{{ t }}</span>
        </div>
      </header>

      <article class="card note-body fade-up">
        <MarkdownView :source="note.body" />
      </article>

      <div class="row mt-16">
        <RouterLink to="/agent" class="btn ghost sm">
          <AppIcon name="route" :size="15" />
          回到 Agent 路线
        </RouterLink>
      </div>
    </template>

    <div v-else class="card empty fade-up">
      <p>没有找到这篇笔记，可能文件被移动或改名了。</p>
      <RouterLink to="/agent" class="btn ghost sm" style="margin-top: 14px">
        回到 Agent 路线
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
.back {
  margin-bottom: 16px;
}

.flip {
  transform: scaleX(-1);
}

.note-head {
  padding: 24px 26px;
}

.note-title {
  font-size: 24px;
  font-weight: 680;
  letter-spacing: -0.03em;
  line-height: 1.3;
  margin-top: 6px;
}

.meta {
  gap: 8px;
  margin-top: 12px;
}

.note-body {
  margin-top: 16px;
  padding: 26px 28px 34px;
}

@media (max-width: 720px) {
  .note-head {
    padding: 20px;
  }
  .note-title {
    font-size: 20px;
  }
  .note-body {
    padding: 20px 18px 26px;
  }
}
</style>
