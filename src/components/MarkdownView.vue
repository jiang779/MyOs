<script setup lang="ts">
import { computed } from 'vue'
import { renderMarkdown } from '@/lib/md'

/** html 优先：调用方若已用 renderMarkdownDoc 渲染过，直接传进来避免解析两次 */
const props = defineProps<{ source?: string; html?: string }>()
const out = computed(() => props.html ?? renderMarkdown(props.source ?? ''))
</script>

<template>
  <!-- 内容来源是本地 md 文件（可信来源），非用户输入 -->
  <div class="prose" v-html="out" />
</template>
