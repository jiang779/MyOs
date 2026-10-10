<script setup lang="ts">
import { useRoute } from 'vue-router'
import AppIcon from './AppIcon.vue'
import { config } from '@/lib/data'
import { state, toggleTheme } from '@/lib/store'

const nav = [
  { to: '/', label: '看板', icon: 'grid' },
  { to: '/agent', label: 'Agent', icon: 'route' },
  { to: '/projects', label: '项目', icon: 'cube' },
  { to: '/creator', label: '创作', icon: 'video' },
  { to: '/health', label: '健康', icon: 'heart' },
  { to: '/notes', label: '日志', icon: 'book' },
]

const route = useRoute()
const isActive = (to: string) => (to === '/' ? route.path === '/' : route.path.startsWith(to))
</script>

<template>
  <aside class="rail" :class="{ expanded: state.sidebarOpen }">
    <!-- 顶部：品牌 + 展开/收起按钮（移动端整块隐藏） -->
    <div class="rail-top">
      <div class="logo">🪐</div>
      <div class="brand-text">
        <b>My OS</b>
        <span>个人工作台</span>
      </div>
      <button
        class="toggle"
        :title="state.sidebarOpen ? '收起侧栏' : '展开侧栏'"
        :aria-label="state.sidebarOpen ? '收起侧栏' : '展开侧栏'"
        :aria-expanded="state.sidebarOpen"
        @click="state.sidebarOpen = !state.sidebarOpen"
      >
        <AppIcon :name="state.sidebarOpen ? 'close' : 'menu'" :size="18" />
      </button>
    </div>

    <nav class="nav">
      <RouterLink
        v-for="item in nav"
        :key="item.to"
        :to="item.to"
        class="nav-item"
        :class="{ active: isActive(item.to) }"
        :title="item.label"
      >
        <AppIcon :name="item.icon" :size="21" />
        <span class="nav-label">{{ item.label }}</span>
      </RouterLink>
    </nav>

    <div class="rail-bottom">
      <button
        class="nav-item as-btn"
        :title="state.theme === 'light' ? '切到深色' : '切到浅色'"
        @click="toggleTheme"
      >
        <AppIcon :name="state.theme === 'light' ? 'moon' : 'sun'" :size="20" />
        <span class="nav-label">{{ state.theme === 'light' ? '深色模式' : '浅色模式' }}</span>
      </button>
      <div class="avatar" :title="config.owner">{{ config.owner.slice(0, 1).toUpperCase() }}</div>
    </div>
  </aside>
</template>

<style scoped>
/* ---------------- 桌面：迷你导轨，宽度由「按钮」切换，不跟随鼠标 ---------------- */
.rail {
  position: sticky;
  top: 0;
  align-self: flex-start;
  height: 100vh;
  width: 88px;
  flex: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 20px 10px 18px;
  background: var(--surface);
  backdrop-filter: saturate(180%) blur(24px);
  -webkit-backdrop-filter: saturate(180%) blur(24px);
  border-right: 1px solid var(--line);
  transition: width 0.32s var(--ease);
  z-index: 20;
}

.rail.expanded {
  width: 226px;
}

.rail-top {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding-bottom: 8px;
}

.rail.expanded .rail-top {
  flex-direction: row;
  justify-content: flex-start;
}

.logo {
  width: 40px;
  height: 40px;
  flex: none;
  display: grid;
  place-items: center;
  font-size: 20px;
  border-radius: 13px;
  background: var(--grad-blue);
  box-shadow: 0 6px 18px rgba(10, 132, 255, 0.32);
}

.brand-text {
  display: none;
  flex-direction: column;
  line-height: 1.25;
  min-width: 0;
  flex: 1;
}

.rail.expanded .brand-text {
  display: flex;
}

.brand-text b {
  font-size: 14px;
  letter-spacing: -0.02em;
}

.brand-text span {
  font-size: 11.5px;
  color: var(--text-3);
}

.toggle {
  width: 38px;
  height: 38px;
  flex: none;
  display: grid;
  place-items: center;
  border-radius: 12px;
  color: var(--text-2);
  background: var(--surface-2);
  border: 1px solid var(--line);
  transition: all 0.22s var(--ease);
}

.toggle:hover {
  color: var(--text);
  background: var(--surface-hover);
}

.toggle:active {
  transform: scale(0.94);
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 11px;
  border-radius: 14px;
  color: var(--text-3);
  font-size: 14px;
  font-weight: 550;
  justify-content: center;
  transition: background 0.22s var(--ease), color 0.22s var(--ease);
}

.nav-label {
  display: none;
  white-space: nowrap;
}

.rail.expanded .nav-item {
  justify-content: flex-start;
}

.rail.expanded .nav-label {
  display: block;
}

.nav-item:hover {
  background: var(--surface-2);
  color: var(--text);
}

.nav-item.active {
  background: var(--accent-soft);
  color: var(--accent);
  box-shadow: inset 0 0 0 1px rgba(10, 132, 255, 0.18);
}

.rail-bottom {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.rail.expanded .rail-bottom {
  align-items: flex-start;
}

.as-btn {
  cursor: pointer;
}

.avatar {
  width: 38px;
  height: 38px;
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

/* ---------------- 移动端：底部导航，恒定满宽 ---------------- */
@media (max-width: 900px) {
  .rail,
  .rail.expanded {
    position: fixed;
    top: auto;
    right: 0;
    bottom: 0;
    left: 0;
    width: 100% !important;
    height: auto;
    max-width: 100%;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 0;
    padding: 6px 8px calc(6px + env(safe-area-inset-bottom));
    border-right: 0;
    border-top: 1px solid var(--line);
    box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.08);
    transition: none;
  }

  .rail-top,
  .avatar {
    display: none;
  }

  .nav {
    flex: 1;
    flex-direction: row;
    justify-content: space-around;
    gap: 0;
  }

  .nav-item {
    flex: 1;
    flex-direction: column;
    gap: 3px;
    padding: 6px 2px;
    font-size: 10.5px;
    max-width: 92px;
  }

  .rail.expanded .nav-item {
    justify-content: center;
  }

  .nav-label,
  .rail.expanded .nav-label {
    display: block;
  }

  .rail-bottom {
    margin: 0;
    width: auto;
    flex: none;
    flex-direction: row;
  }

  .rail-bottom .nav-item {
    width: 46px;
    flex: none;
  }

  .rail-bottom .nav-label {
    display: none;
  }
}
</style>
