<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MarkdownView from '@/components/MarkdownView.vue'
import AppIcon from '@/components/AppIcon.vue'
import { renderMarkdownDoc } from '@/lib/md'
import { noteBySlug, weekByNo } from '@/lib/data'

const route = useRoute()
const router = useRouter()

const week = computed(() => Number(route.params.week))
const slug = computed(() => String(route.params.slug))
const note = computed(() => noteBySlug(week.value, slug.value))
const plan = computed(() => weekByNo(week.value))

/* ---------------- 正文 + 目录 ---------------- */

const doc = computed(() => renderMarkdownDoc(note.value?.body ?? ''))
const outline = computed(() => doc.value.outline)

/* ---------------- 折叠（窄屏默认收起，桌面默认展开） ---------------- */

const isNarrow = () => window.matchMedia('(max-width: 1200px)').matches
const tocOpen = ref(!isNarrow())

/* ---------------- 点击跳转 ---------------- */

const activeId = ref('')

function jump(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  // 页面真实滚动容器是 .main（overflow-y:auto），用 scrollIntoView 才能触发其滚动
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  activeId.value = id
  if (isNarrow()) tocOpen.value = false
}

/* ---------------- 滚动高亮当前章节（scroll spy） ---------------- */

let ticking = false

function spy() {
  if (ticking) return
  ticking = true
  requestAnimationFrame(() => {
    ticking = false
    const items = outline.value
    if (!items.length) return
    let current = items[0].id
    for (const it of items) {
      const el = document.getElementById(it.id)
      if (!el) continue
      // 顶部留 120px 余量：标题刚滚过视口上方就算「当前」
      if (el.getBoundingClientRect().top - 120 <= 0) current = it.id
      else break
    }
    if (current !== activeId.value) {
      activeId.value = current
      revealActive()
    }
  })
}

/** 目录很长时，让高亮项保持可见 */
function revealActive() {
  const box = listEl.value
  if (!box) return
  const el = box.querySelector<HTMLElement>(`[data-id="${CSS.escape(activeId.value)}"]`)
  if (!el) return
  const top = el.offsetTop
  const bottom = top + el.offsetHeight
  if (top < box.scrollTop || bottom > box.scrollTop + box.clientHeight) {
    box.scrollTop = top - box.clientHeight / 2 + el.offsetHeight / 2
  }
}

const listEl = ref<HTMLElement | null>(null)

/** 内容滚动容器是 App.vue 里的 <main class="main">，scroll 事件发生在它身上而非 window */
let scroller: HTMLElement | null = null

onMounted(() => {
  scroller = document.querySelector<HTMLElement>('main.main')
  scroller?.addEventListener('scroll', spy, { passive: true })
  window.addEventListener('resize', spy)
  spy()
})

onBeforeUnmount(() => {
  scroller?.removeEventListener('scroll', spy)
  window.removeEventListener('resize', spy)
})

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

      <div class="note-layout">
        <div class="note-main">
          <article class="card note-body fade-up">
            <MarkdownView :html="doc.html" />
          </article>

          <div class="row mt-16">
            <RouterLink to="/agent" class="btn ghost sm">
              <AppIcon name="route" :size="15" />
              回到 Agent 路线
            </RouterLink>
            <RouterLink to="/notes" class="btn ghost sm">
              <AppIcon name="note" :size="15" />
              所有笔记
            </RouterLink>
          </div>
        </div>

        <!-- 目录：桌面端吸附在右侧，窄屏折到正文上方 -->
        <aside v-if="outline.length" class="toc-wrap fade-up">
          <nav class="card toc">
            <button class="toc-head" :aria-expanded="tocOpen" @click="tocOpen = !tocOpen">
              <AppIcon name="note" :size="14" class="toc-ico" />
              <span class="toc-title">目录</span>
              <span class="tiny muted toc-count">{{ outline.length }} 节</span>
              <AppIcon name="chevron" :size="15" class="toc-arrow" :class="{ closed: !tocOpen }" />
            </button>

            <ul v-show="tocOpen" ref="listEl" class="toc-list">
              <li v-for="it in outline" :key="it.id">
                <button
                  class="toc-item"
                  :class="{ active: activeId === it.id }"
                  :data-id="it.id"
                  :style="{ paddingLeft: 12 + it.depth * 14 + 'px' }"
                  :title="it.text"
                  @click="jump(it.id)"
                >
                  {{ it.text }}
                </button>
              </li>
            </ul>
          </nav>
        </aside>
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

/* ---------------- 两栏：正文 + 目录 ---------------- */

.note-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 214px;
  gap: 20px;
  align-items: start;
  margin-top: 16px;
}

.note-body {
  padding: 26px 28px 34px;
}

/* ---------------- 目录 ---------------- */

.toc-wrap {
  position: sticky;
  top: 24px;
  max-height: calc(100vh - 48px);
  display: flex;
  z-index: 1;
}

.toc {
  padding: 10px;
  width: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-sm);
}

.toc-head {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 8px;
  border-radius: 10px;
  transition: background 0.2s var(--ease);
}

.toc-head:hover {
  background: var(--surface-2);
}

.toc-ico {
  color: var(--text-3);
  flex: none;
}

.toc-title {
  font-size: 13px;
  font-weight: 620;
}

.toc-count {
  margin-left: auto;
}

.toc-arrow {
  color: var(--text-3);
  flex: none;
  transition: transform 0.25s var(--ease);
}

.toc-arrow.closed {
  transform: rotate(-90deg);
}

.toc-list {
  margin-top: 6px;
  overflow-y: auto;
  min-height: 0;
  /* 定位上下文：让子项 offsetTop 相对本容器，滚动定位才准 */
  position: relative;
  scrollbar-width: thin;
}

.toc-item {
  display: block;
  width: 100%;
  padding: 5px 10px;
  border-radius: 9px;
  text-align: left;
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--text-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.2s var(--ease), background 0.2s var(--ease);
}

.toc-item:hover {
  color: var(--text);
  background: var(--surface-2);
}

.toc-item.active {
  color: var(--accent);
  background: var(--accent-soft);
  font-weight: 620;
}

/* ---------------- 窄屏：目录折到正文上方 ---------------- */

@media (max-width: 1200px) {
  .note-layout {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
  }

  .toc-wrap {
    position: static;
    order: -1;
    max-height: none;
  }

  .toc-list {
    max-height: 42vh;
  }
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
