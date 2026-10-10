<script setup lang="ts">
import { computed } from 'vue'
import PageHead from '@/components/PageHead.vue'
import AppIcon from '@/components/AppIcon.vue'
import { notes, weekByNo } from '@/lib/data'

/** 按周分组，周号升序；组内保持 data.ts 里按文件名排好的顺序 */
const groups = computed(() => {
  const map = new Map<number, typeof notes>()
  for (const n of notes) {
    const list = map.get(n.week)
    if (list) list.push(n)
    else map.set(n.week, [n])
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([week, list]) => ({
      week,
      title: weekByNo(week)?.title ?? '',
      dir: `data/notes/week-${String(week).padStart(2, '0')}/`,
      notes: list,
    }))
})

const total = computed(() => notes.length)
</script>

<template>
  <div>
    <PageHead
      kicker="沉淀线"
      title="笔记"
      sub="学习笔记全部集中在这里，按周归位。加笔记就往 data/notes/week-XX/ 里放 md 文件，没有格式要求。"
    >
      <template #actions>
        <span class="pill">{{ total }} 篇</span>
      </template>
    </PageHead>

    <!-- 分组列表 -->
    <template v-if="groups.length">
      <section v-for="g in groups" :key="g.week" class="card group fade-up">
        <header class="group-head">
          <span class="week-no">{{ g.week }}</span>
          <div class="col grow" style="min-width: 0">
            <b class="group-title">第 {{ g.week }} 周 · {{ g.title }}</b>
            <span class="tiny muted">{{ g.dir }}</span>
          </div>
          <span class="pill mute">{{ g.notes.length }} 篇</span>
        </header>

        <ul class="note-list">
          <li v-for="n in g.notes" :key="n.slug">
            <RouterLink class="note-item" :to="{ name: 'note', params: { week: g.week, slug: n.slug } }">
              <span class="note-ico"><AppIcon name="note" :size="15" /></span>
              <span class="col grow" style="min-width: 0; gap: 3px">
                <b class="note-name">{{ n.title }}</b>
                <span class="tiny muted">
                  {{ n.date || '未标日期' }}{{ n.tags.length ? ' · ' + n.tags.join(' / ') : '' }}
                </span>
              </span>
              <AppIcon name="arrow" :size="15" class="note-go" />
            </RouterLink>
          </li>
        </ul>
      </section>
    </template>

    <!-- 空状态 -->
    <div v-else class="card empty-card fade-up">
      <span class="empty-ico"><AppIcon name="note" :size="28" /></span>
      <b>还没有笔记</b>
      <p class="tiny muted">
        在项目的 <code>data/notes/week-01/</code> 这类目录下新建一个 <code>.md</code> 文件就行 ——
        目录名就是周号，文件名就是标题，内容随便写。
      </p>
      <RouterLink to="/agent" class="btn ghost sm">
        <AppIcon name="route" :size="15" />
        去 Agent 路线看看每周学什么
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
.group {
  margin-top: 20px;
  padding: 20px 22px 22px;
}

.group-head {
  display: flex;
  align-items: center;
  gap: 14px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--line);
}

.week-no {
  width: 38px;
  height: 38px;
  flex: none;
  border-radius: 13px;
  display: grid;
  place-items: center;
  font-size: 16px;
  font-weight: 680;
  color: #fff;
  background: var(--grad-blue);
  box-shadow: 0 6px 16px rgba(10, 132, 255, 0.26);
}

.group-title {
  font-size: 15.5px;
  font-weight: 650;
  letter-spacing: -0.02em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 14px;
}

.note-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 15px;
  border-radius: var(--r-lg);
  background: var(--surface-solid);
  border: 1px solid var(--line);
  box-shadow: var(--shadow-sm);
  transition: transform 0.25s var(--ease), border-color 0.25s var(--ease),
    box-shadow 0.25s var(--ease);
}

.note-item:hover {
  transform: translateY(-2px);
  border-color: var(--line-strong);
  box-shadow: var(--shadow);
}

.note-ico {
  flex: none;
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  color: var(--accent);
  background: var(--accent-soft);
}

.note-name {
  font-size: 14.5px;
  font-weight: 620;
  letter-spacing: -0.01em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note-go {
  flex: none;
  color: var(--text-3);
}

/* 空状态 */
.empty-card {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
  padding: 54px 24px;
}

.empty-ico {
  width: 56px;
  height: 56px;
  display: grid;
  place-items: center;
  border-radius: 18px;
  color: var(--text-3);
  background: var(--surface-2);
  border: 1px solid var(--line);
  margin-bottom: 4px;
}

.empty-card p {
  max-width: 420px;
  line-height: 1.75;
}

.empty-card code {
  padding: 1px 5px;
  border-radius: 5px;
  font-size: 12.5px;
  background: var(--surface-2);
  border: 1px solid var(--line);
}

.empty-card .btn {
  margin-top: 8px;
}

@media (max-width: 720px) {
  .group {
    padding: 16px 14px 18px;
  }
  .week-no {
    width: 34px;
    height: 34px;
    border-radius: 11px;
    font-size: 15px;
  }
  .group-title {
    font-size: 14px;
  }
}
</style>
