<script setup lang="ts">
import { computed } from 'vue'
import { renderMarkdown } from '@/lib/md'

const props = defineProps<{ source: string }>()
const html = computed(() => renderMarkdown(props.source))
</script>

<template>
  <!-- 内容来源是本地 md 文件（可信来源），非用户输入 -->
  <div class="prose" v-html="html" />
</template>
