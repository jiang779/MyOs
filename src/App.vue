<script setup lang="ts">
import AppSidebar from '@/components/AppSidebar.vue'
import AmbientBackdrop from '@/components/AmbientBackdrop.vue'
</script>

<template>
  <div class="shell">
    <AmbientBackdrop />
    <AppSidebar />
    <main class="main">
      <RouterView v-slot="{ Component, route }">
        <Transition name="page" mode="out-in">
          <component :is="Component" :key="route.path" />
        </Transition>
      </RouterView>
    </main>
  </div>
</template>

<style>
.page-enter-active,
.page-leave-active {
  transition: opacity 0.26s var(--ease), transform 0.26s var(--ease);
}
.page-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.page-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
