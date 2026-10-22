<script setup lang="ts">
import { useRoute } from 'vue-router'
import AppIcon from './AppIcon.vue'
import { config } from '@/lib/data'
import { state, toggleTheme } from '@/lib/store'

const nav = [
  { to: '/', label: '看板', icon: 'grid' },
  { to: '/agent', label: 'Agent', icon: 'route' },
  { to: '/projects', label: '项目', icon: 'cube' },
  { to: '/interview', label: '面试题', icon: 'book' },
  { to: '/health', label: '健康', icon: 'heart' },
  { to: '/notes', label: '笔记', icon: 'note' },
]

const route = useRoute()
const isActive = (to: string) => (to === '/' ? route.path === '/' : route.path.startsWith(to))
</script>

<template>
  <!-- 桌面：顶部固定 Header -->
  <header class="header">
    <div class="header-inner">
      <RouterLink class="brand" to="/" title="返回首页">
        <span class="brand-logo">🪐</span>
        <span class="brand-text">
          <b>My OS</b>
          <span class="brand-sub">个人工作台</span>
        </span>
      </RouterLink>

      <nav class="nav" aria-label="主导航">
        <RouterLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="nav-item"
          :class="{ active: isActive(item.to) }"
          :title="item.label"
        >
          <AppIcon :name="item.icon" :size="18" />
          <span class="nav-label">{{ item.label }}</span>
        </RouterLink>
      </nav>

      <div class="header-right">
        <button
          class="icon-btn"
          type="button"
          :title="state.theme === 'light' ? '切到深色' : '切到浅色'"
          :aria-label="state.theme === 'light' ? '切到深色' : '切到浅色'"
          @click="toggleTheme"
        >
          <AppIcon :name="state.theme === 'light' ? 'moon' : 'sun'" :size="18" />
        </button>
        <div class="avatar" :title="config.owner">{{ config.owner.slice(0, 1).toUpperCase() }}</div>
      </div>
    </div>
  </header>

  <!-- 移动端：顶部栏 -->
  <header class="mheader">
    <RouterLink class="brand" to="/" title="返回首页">
      <span class="brand-logo">🪐</span>
      <span class="brand-text">
        <b>My OS</b>
        <span class="brand-sub">个人工作台</span>
      </span>
    </RouterLink>
    <div class="header-right">
      <button
        class="icon-btn"
        type="button"
        :title="state.theme === 'light' ? '切到深色' : '切到浅色'"
        :aria-label="state.theme === 'light' ? '切到深色' : '切到浅色'"
        @click="toggleTheme"
      >
        <AppIcon :name="state.theme === 'light' ? 'moon' : 'sun'" :size="18" />
      </button>
      <div class="avatar" :title="config.owner">{{ config.owner.slice(0, 1).toUpperCase() }}</div>
    </div>
  </header>

  <!-- 移动端：底部 Tab -->
  <nav class="tabbar" aria-label="底部导航">
    <RouterLink
      v-for="item in nav"
      :key="item.to"
      :to="item.to"
      class="tab-item"
      :class="{ active: isActive(item.to) }"
      :title="item.label"
    >
      <AppIcon :name="item.icon" :size="20" />
      <span class="tab-label">{{ item.label }}</span>
    </RouterLink>
    <button
      class="tab-item"
      type="button"
      :title="state.theme === 'light' ? '切到深色' : '切到浅色'"
      @click="toggleTheme"
    >
      <AppIcon :name="state.theme === 'light' ? 'moon' : 'sun'" :size="20" />
      <span class="tab-label">主题</span>
    </button>
  </nav>
</template>

<style scoped>
.header {
  flex: none;
  height: var(--header-h);
  z-index: 20;
  background: var(--surface);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border-bottom: 1px solid var(--line);
}

.header-inner {
  height: 100%;
  max-width: 1240px;
  margin: 0 auto;
  padding: 0 44px;
  display: flex;
  align-items: center;
  gap: 22px;
}

.brand {
  flex: none;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text);
}

.brand-logo {
  width: 36px;
  height: 36px;
  flex: none;
  display: grid;
  place-items: center;
  font-size: 19px;
  border-radius: 11px;
  background: var(--accent-soft);
}

.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}

.brand-text b {
  font-size: 14px;
  letter-spacing: -0.02em;
}

.brand-sub {
  font-size: 11px;
  color: var(--text-3);
}

.nav {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  overflow: hidden;
}

.nav-item {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 13px;
  border-radius: var(--r-pill);
  color: var(--text-2);
  font-size: 13.5px;
  font-weight: 550;
  white-space: nowrap;
  transition: background 0.22s var(--ease), color 0.22s var(--ease);
}

.nav-item:hover {
  color: var(--text);
  background: var(--surface-2);
}

.nav-item:active {
  transform: scale(0.97);
}

.nav-item.active {
  color: var(--accent);
  background: var(--accent-soft);
}

.header-right {
  flex: none;
  display: flex;
  align-items: center;
  gap: 10px;
}

.icon-btn {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: 11px;
  color: var(--text-2);
  background: var(--surface-2);
  border: 1px solid var(--line);
  transition: all 0.22s var(--ease);
}

.icon-btn:hover {
  color: var(--text);
  background: var(--surface-hover);
}

.icon-btn:active {
  transform: scale(0.93);
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 14px;
  font-weight: 650;
  color: #fff;
  background: var(--grad-violet);
  box-shadow: var(--shadow-sm);
  flex: none;
}

/* ---------------- 移动端：顶部栏 / 底部 Tab ---------------- */
.mheader {
  display: none;
}

.tabbar {
  display: none;
}

@media (max-width: 900px) {
  .header {
    display: none;
  }

  .mheader {
    display: flex;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 20;
    height: var(--mheader-h);
    align-items: center;
    justify-content: space-between;
    padding: 0 14px;
    background: var(--surface);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    border-bottom: 1px solid var(--line);
  }

  .mheader .brand {
    gap: 8px;
  }
  .mheader .brand-logo {
    width: 30px;
    height: 30px;
    font-size: 16px;
    border-radius: 9px;
  }
  .mheader .brand-text b {
    font-size: 13px;
  }
  .mheader .brand-sub {
    font-size: 10.5px;
  }
  .mheader .icon-btn {
    width: 32px;
    height: 32px;
    border-radius: 9px;
  }
  .mheader .avatar {
    width: 32px;
    height: 32px;
    font-size: 13px;
  }

  .tabbar {
    display: flex;
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 20;
    align-items: stretch;
    justify-content: space-around;
    background: var(--surface);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    border-top: 1px solid var(--line);
    box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.06);
    padding: 6px 6px calc(6px + env(safe-area-inset-bottom));
  }

  .tab-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    padding: 6px 2px;
    font-size: 10.5px;
    color: var(--text-3);
    border-radius: 10px;
    transition: color 0.22s var(--ease);
  }

  .tab-item:active {
    transform: scale(0.96);
  }

  .tab-item.active {
    color: var(--accent);
  }

  .tab-label {
    line-height: 1;
    white-space: nowrap;
  }
}
</style>