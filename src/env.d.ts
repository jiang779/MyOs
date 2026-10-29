/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** direct = 浏览器直连模型；http = POST /api/chat/send */
  readonly VITE_CHAT_MODE?: 'direct' | 'http'
  /** 1 = 使用本地 mock 流（不消耗额度，用来验证解析器与三种内容块） */
  readonly VITE_CHAT_MOCK?: string
  readonly VITE_ARK_BASE_URL?: string
  readonly VITE_ARK_MODEL?: string
  readonly VITE_ARK_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module '*.md?raw' {
  const content: string
  export default content
}
