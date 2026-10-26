<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import type { InterviewQuestion } from '@/lib/data'
import { isInterviewDone, toggleInterviewDone } from '@/lib/store'

const props = defineProps<{ open: boolean; questions: InterviewQuestion[] }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const index = ref(0)
const finished = ref(false)
const elapsed = ref('00:00')
let startedAt = 0

const current = computed(() => props.questions[index.value])

watch(
  () => props.open,
  (open) => {
    if (!open) return
    index.value = 0
    finished.value = false
    elapsed.value = '00:00'
    startedAt = Date.now()
  }
)

function next() {
  const q = current.value
  if (q && !isInterviewDone(q.id)) {
    toggleInterviewDone(q.id)
  }
  if (index.value < props.questions.length - 1) index.value++
  else finish()
}

function prev() {
  if (index.value > 0) index.value--
}

function finish() {
  finished.value = true
  const s = Math.max(0, Math.round((Date.now() - startedAt) / 1000))
  elapsed.value = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function onKey(e: KeyboardEvent) {
  if (!props.open) return
  if (e.key === 'Escape') {
    emit('close')
  } else if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault()
    if (finished.value) emit('close')
    else next()
  } else if (e.key === 'ArrowRight') {
    next()
  } else if (e.key === 'ArrowLeft') {
    prev()
  }
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <Transition name="drill">
      <div v-if="open" class="drill" role="dialog" aria-modal="true" aria-label="今日 5 题">
        <div class="scrim" @click="$emit('close')" />

        <section class="panel">
          <header class="bar">
            <span class="kicker">今日 5 题 · 面试</span>
            <div class="dots" aria-hidden="true">
              <i
                v-for="(q, i) in questions"
                :key="q.id"
                :class="{ passed: i < index || finished, now: i === index && !finished, done: isInterviewDone(q.id) }"
              />
            </div>
            <button class="x" type="button" aria-label="关闭" @click="$emit('close')">
              <AppIcon name="close" :size="16" />
            </button>
          </header>

          <div v-if="!finished" class="body">
            <span class="type">{{ current?.type }}</span>
            <h2 class="q">{{ current?.text }}</h2>
            <p class="hint">空格 / 回车 标记「会了」，← → 切换，Esc 退出</p>
          </div>

          <div v-else class="body done">
            <span class="badge">完成</span>
            <h2 class="q">{{ questions.length }} 题过完了</h2>
            <p class="hint">用时 {{ elapsed }}。想继续就去题库挑下一类。</p>
          </div>

          <footer class="foot">
            <button class="btn ghost sm" type="button" :disabled="index === 0 || finished" @click="prev">
              上一题
            </button>
            <span class="count num">{{ finished ? questions.length : index + 1 }} / {{ questions.length }}</span>
            <button v-if="!finished" class="btn primary sm" type="button" @click="next">会了，下一题</button>
            <button v-else class="btn primary sm" type="button" @click="$emit('close')">收工</button>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.drill {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: grid;
  place-items: center;
  padding: 18px;
}

.scrim {
  position: absolute;
  inset: 0;
  background: rgba(6, 7, 12, 0.62);
  backdrop-filter: blur(12px) saturate(120%);
  -webkit-backdrop-filter: blur(12px) saturate(120%);
}

html[data-theme='light'] .scrim {
  background: rgba(18, 20, 32, 0.42);
}

.panel {
  position: relative;
  width: min(720px, 100%);
  max-height: min(78vh, 600px);
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px 22px 18px;
  border-radius: var(--r-2xl);
  background: var(--surface-solid);
  border: 1px solid var(--line-strong);
  box-shadow: var(--shadow-lg);
}

.bar {
  display: flex;
  align-items: center;
  gap: 14px;
}

.kicker {
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--text-3);
  flex: none;
}

.dots {
  display: flex;
  gap: 5px;
  margin-left: auto;
}

.dots i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--line-strong);
  transition: all var(--dur-2) var(--ease-out);
}

.dots i.passed {
  background: var(--accent);
}

.dots i.now {
  background: var(--accent-2);
  box-shadow: 0 0 10px var(--accent-2);
  transform: scale(1.25);
}

.x {
  flex: none;
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  color: var(--text-3);
  background: var(--surface-2);
  border: 1px solid var(--line);
  transition: all var(--dur-2) var(--ease-out);
}

.x:hover {
  color: var(--text);
  background: var(--surface-hover);
}

.body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 190px;
  justify-content: center;
  padding: 6px 2px;
}

.type {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--accent);
}

.q {
  font-size: clamp(19px, 2.4vw, 27px);
  line-height: 1.5;
  letter-spacing: -0.025em;
  font-weight: 620;
}

.hint {
  font-size: 11.5px;
  color: var(--text-3);
}

.done {
  align-items: flex-start;
}

.badge {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--ok);
  background: rgba(52, 199, 89, 0.12);
  border: 1px solid rgba(52, 199, 89, 0.28);
  padding: 2px 9px;
  border-radius: 999px;
}

.foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
}

.count {
  font-size: 11.5px;
  color: var(--text-3);
}

.btn:disabled {
  opacity: 0.38;
  cursor: not-allowed;
  transform: none;
}

.drill-enter-active,
.drill-leave-active {
  transition: opacity 0.28s var(--ease);
}

.drill-enter-active .panel,
.drill-leave-active .panel {
  transition: transform 0.34s var(--ease-out), opacity 0.24s var(--ease);
}

.drill-enter-from,
.drill-leave-to {
  opacity: 0;
}

.drill-enter-from .panel,
.drill-leave-to .panel {
  opacity: 0;
  transform: translateY(10px) scale(0.985);
}

@media (max-width: 720px) {
  .panel {
    padding: 16px 16px 14px;
    gap: 14px;
    max-height: 82vh;
  }
  .body {
    min-height: 150px;
  }
  .hint {
    display: none;
  }
}
</style>
