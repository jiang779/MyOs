/**
 * 通用 AI 助手的类型定义
 * 这里只有「对话 / 消息 / 帧」这些通用概念，不包含任何领域词汇。
 */

export type Role = 'user' | 'assistant'

export type MessageStatus = 'streaming' | 'done' | 'stopped' | 'error'

export interface TextBlock {
  kind: 'text'
  text: string
}

export interface ThinkBlock {
  kind: 'think'
  text: string
  startedAt?: number
  endedAt?: number
  durationMs?: number
}

export interface ToolBlock {
  kind: 'tool'
  id: string
  name: string
  args: string
  result?: string
  status: 'running' | 'done' | 'error'
  startedAt?: number
  endedAt?: number
  durationMs?: number
}

export type Block = TextBlock | ThinkBlock | ToolBlock

export interface Reference {
  id: string
  title: string
  snippet: string
  content: string
  score: number
  docId?: string
}

export interface ChatMessage {
  id: string
  conversationId: string
  role: Role
  blocks: Block[]
  status: MessageStatus
  createdAt: number
  /** 出错时的可读信息 */
  error?: string
  /** 回答引用的知识片段 */
  references?: Reference[]
}

export interface ConversationMeta {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messageCount: number
}

export interface ChatMeta {
  activeId: string | null
  items: ConversationMeta[]
}

/** 唯一的知识注入点：领域内容全部通过它进入，代码里不写 */
export interface ChatConfig {
  systemPrompt: string
  greeting: string
  suggestions: string[]
  knowledge?: string[]
  temperature?: number
}

/** 服务端事件（/api/chat/send 或本地直连适配层输出的统一帧） */
export type Frame =
  | { type: 'MESSAGE'; delta: string; seq?: number }
  | { type: 'THINKING'; delta: string; seq?: number }
  /** 兼容旧命名 */
  | { type: 'THINK'; delta: string; seq?: number }
  | {
      type: 'TOOL_CALL'
      id: string
      name?: string
      arguments?: string
      status?: 'running' | 'done' | 'error'
      seq?: number
    }
  | {
      type: 'TOOL_RESULT'
      id: string
      content: string
      status?: 'success' | 'error' | 'done'
      durationMs?: number
      seq?: number
    }
  | { type: 'INIT_REQUEST_ID'; requestId: string }
  | { type: 'REFERENCE'; references: Reference[]; seq?: number }
  | { type: 'DONE'; seq?: number }
  | { type: 'ERROR'; message: string; seq?: number }
