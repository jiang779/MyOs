<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch } from 'vue'
import { assistant } from './store'
import AssistantPanel from './components/AssistantPanel.vue'
import ParticleOrb from './components/ParticleOrb.vue'

const syncLayout = (open: boolean) => {
  document.documentElement.classList.toggle('ai-open', open)
}

watch(() => assistant.state.panelOpen, syncLayout, { immediate: true })

onMounted(() => {
  void assistant.init()
})

onBeforeUnmount(() => {
  document.documentElement.classList.remove('ai-open')
})
</script>

<template>
  <ParticleOrb :open="assistant.state.panelOpen" @toggle="assistant.togglePanel()" />

  <Transition name="ai-panel">
    <AssistantPanel v-if="assistant.state.panelOpen" @close="assistant.togglePanel(false)" />
  </Transition>
</template>
