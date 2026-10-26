import { onBeforeUnmount, ref } from 'vue'

/** 响应式媒体查询（SPA 内使用，首帧就同步取值，避免移动端闪一下桌面布局） */
export function useMediaQuery(query: string) {
  const matches = ref(typeof window !== 'undefined' ? window.matchMedia(query).matches : false)

  if (typeof window === 'undefined') return matches

  const mql = window.matchMedia(query)
  const update = () => (matches.value = mql.matches)
  mql.addEventListener('change', update)
  onBeforeUnmount(() => mql.removeEventListener('change', update))

  return matches
}
