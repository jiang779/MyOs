import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'dashboard', component: () => import('@/views/Dashboard.vue'), meta: { title: '看板' } },
  { path: '/agent', name: 'agent', component: () => import('@/views/AgentRoadmap.vue'), meta: { title: 'Agent 路线' } },
  { path: '/projects', name: 'projects', component: () => import('@/views/Projects.vue'), meta: { title: '项目' } },
  { path: '/interview', name: 'interview', component: () => import('@/views/Interview.vue'), meta: { title: '面试题' } },
  { path: '/health', name: 'health', component: () => import('@/views/Health.vue'), meta: { title: '健康' } },
  { path: '/notes', name: 'notes', component: () => import('@/views/Notes.vue'), meta: { title: '笔记' } },
  {
    path: '/note/:week/:slug',
    name: 'note',
    component: () => import('@/views/NoteDetail.vue'),
    meta: { title: '笔记' },
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ el: '.main', top: 0 }),
})

router.afterEach((to) => {
  const t = (to.meta?.title as string) || ''
  document.title = t ? `${t} · My OS` : 'My OS · 个人工作台'
})

export default router
