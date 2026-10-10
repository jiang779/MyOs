<script setup lang="ts">
defineProps<{ kicker?: string; title: string; sub?: string }>()
</script>

<template>
  <header class="page-head fade-up">
    <span v-if="kicker" class="page-kicker">
      <slot name="kicker">{{ kicker }}</slot>
    </span>
    <div class="row between wrap" style="gap: 18px">
      <div class="col">
        <h1 class="page-title">{{ title }}</h1>
        <p v-if="sub" class="page-sub">{{ sub }}</p>
      </div>
      <div class="row wrap" style="gap: 10px">
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>
