# AI 助手模块

通用对话模块。**代码不绑定任何业务领域**，领域内容全部通过 [`config.ts`](./config.ts) 注入。

## 入口

`App.vue` 挂载 `<Assistant />`：右下角粒子球（静态是圆球，悬浮膨胀成不规则团簇），点击展开对话面板。

## 配置注入

```ts
// src/ai/config.ts
export const assistantConfig: ChatConfig = {
  systemPrompt: '...',   // 系统提示词
  greeting: '...',       // 空态开场白
  suggestions: ['...'],  // 空态 3 条预设问题
  knowledge: ['...'],    // 知识库：每段纯文本，会拼进 system 消息
  temperature: 0.6,
}
```

换场景只改这个文件；组件、传输层、解析器都不用动。

## 环境变量

复制 `.env.example` 为 `.env.local`（已 gitignore）：

```
VITE_CHAT_MODE=direct      # direct：浏览器直连；http：POST /api/chat/send
VITE_CHAT_MOCK=0           # 1：本地 mock 流，不消耗额度
VITE_ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
VITE_ARK_MODEL=...
VITE_ARK_API_KEY=...
```

缺少 Key 时自动退回 mock，界面仍然可用。

> 直连模式会把 Key 打进前端 bundle；公开部署请改用 `VITE_CHAT_MODE=http`，由代理持有 Key。

## 传输层

`ChatTransport.open()` 统一返回一个 `text/event-stream` 的 `Response`，UI 永远：

```ts
const res = await transport.open(req)
const reader = res.body!.getReader()
// 逐片 decode + ChatStreamParser
```

- `DirectTransport`：`fetch` 方舟 `/chat/completions`，把上游 SSE 翻译成统一帧，再包成新的 SSE `Response`
- `HttpTransport`：`POST /api/chat/send`；`stop()` 会 `POST /api/chat/stop`
- `MockTransport`：本地模拟 think / tool / markdown，验证 UI 和解析器

## 事件契约

```
data: {"type":"INIT_REQUEST_ID","requestId":"srv-123"}
data: {"type":"THINKING","delta":"...","seq":1}
data: {"type":"MESSAGE","delta":"...","seq":2}
data: {"type":"TOOL_CALL","id":"c1","name":"...","arguments":"...","status":"running","seq":3}
data: {"type":"TOOL_RESULT","id":"c1","content":"...","status":"success","durationMs":420,"seq":4}
data: {"type":"REFERENCE","references":[{"id":"c1","title":"文档.md","snippet":"摘要","content":"原文片段","score":0.82}]}
data: {"type":"DONE","seq":5}
data: {"type":"ERROR","message":"..."}
```

- `INIT_REQUEST_ID`：服务端分配的流 id，客户端落 localStorage，用于 `GET /api/chat/receive/{requestId}`
- `THINKING`（兼容旧名 `THINK`）：思考增量，前端合并成一个可折叠块并记录耗时
- `TOOL_RESULT.status`：`success | error`；`durationMs` 可选，缺省用客户端计时
- `seq` 可选；有 seq 时续传按 seq 严格去重，没有时按文本公共前缀合并
- `REFERENCE`：一次可以带多条引用；也兼容单条 `reference` / 扁平字段

方舟映射：`delta.content → MESSAGE`，`delta.reasoning_content → THINKING`，`delta.tool_calls → TOOL_CALL`，`[DONE] → DONE`。

## 知识库与引用（P3）

**管理页**：`/knowledge`（桌面导航「知识库」；移动端 Tab 只保留 6 个，可从助手设置里的「管理知识库」进入）。

- 新建 / 删除知识库；上传 txt / md / pdf / docx（单文件 ≤ 10MB，可多选/拖拽）
- 解析：txt/md 直读，pdf 用 `pdfjs-dist`（worker 由 Vite 打包），docx 用 `jszip` + `word/document.xml`
- 文档列表显示格式、大小、片段数、日期、预览；删除文档/知识库都有二次确认
- 切块：约 480 字、60 重叠、每文档最多 40 片
- 检索：中文 bigram + 拉丁词的 TF-IDF 余弦，取 top 4，纯本地、无需向量模型

**绑定**：知识库页每个库有「绑定」勾选；助手设置里也能多选。绑定关系存在
`myos.ai.settings.v1` 的 `knowledgeBaseIds`。

**引用**：直连/mock 模式由客户端检索并注入 system，再以 `REFERENCE` 帧写入回答；
http 模式把 `knowledgeBaseIds` 交给服务端，由服务端返回 `REFERENCE`。
前端在回答下方渲染引用列表（标题 + 摘要 + 相似度），点击展开原文片段；
引用随消息一起持久化，刷新后仍在。

## 配置面板

助手头部齿轮 →「设置」：

- 模型：可输入任意模型 ID，留空用 `.env` 的 `VITE_ARK_MODEL`
- 温度：0–2，步进 0.1
- 最大 token：256–8192
- 知识库多选绑定

修改即自动保存（`localStorage` 的 `myos.ai.settings.v1`），下一次请求生效；
直连请求会带上 `model` / `max_tokens`，http 请求还会带 `knowledgeBaseIds`。

## MCP 工具（P4）

**注册页**：`/tools`（桌面导航「工具」；移动端可从助手设置的「管理工具」进入）。

- 新增 MCP 服务，三种 transport：
  - `http`：直接 `POST tools/list`
  - `sse`：MCP SSE 握手（GET 拿 endpoint → POST initialize/tools/list → 从流里收响应）
  - `command`：浏览器不能起进程，转发到本地 bridge（见下）
- 同步工具列表（`syncServer` / `sync`），保留已有工具的启用状态
- 启用/停用服务、启用/停用单个工具
- 勾选「当前会话」要暴露的工具，自动 `saveTools(conversationId, ids)` 到
  `localStorage` 的 `myos.ai.toolSelection.v1`
- 发起对话时把 `toolIds` 一并提交（格式 `${serverId}:${toolName}`）
- 工具调用/结果直接复用第 11 条的工具卡片（参数折叠、结果折叠、失败重试）

**command bridge**（仅本地开发）：

```bash
node scripts/mcp-bridge.mjs        # 127.0.0.1:5198，执行 command 并转发 JSON-RPC
node scripts/mock-mcp-server.mjs   # bridge 会 spawn 这个 mock stdio 服务
```

bridge 同时提供 mock 的 `/mcp/http` 和 `/mcp/sse`，方便联调三种 transport。
⚠️ bridge 会在本机执行前端传来的命令，只在本机开发使用，不要暴露到公网。

存储：服务/工具在 IndexedDB `myos-mcp`；会话选择在 `localStorage`。

## 协议文档（P5）

完整的事件类型、字段、续传/停止/错误约定见
[`docs/ai-chat-protocol.md`](../../docs/ai-chat-protocol.md)。

SSE 解析器为 `parseSSE`（即 `ChatStreamParser`），单测覆盖事件跨分片、多行 data、
UTF-8 中文被切断、坏 JSON 后恢复等场景。

## 思考与工具（P2）

- 思考块：`details` 折叠，summary 显示 `思考过程 · 368ms`；流式中显示「思考中…」和实时耗时
- 工具卡：`TOOL_CALL` 立即插入，显示工具名 + 状态 + 耗时；参数可折叠
- `TOOL_RESULT` 填充结果（成功/失败、耗时），结果可折叠；失败且是最后一条回答时显示「重试」
- 重试会移除失败的那条回答，用同一轮用户消息重新请求，不会重复插入用户消息

## 断线续传（P2）

1. 收到 `INIT_REQUEST_ID` 后把 `{requestId, conversationId, messageId, lastSeq}` 写入 `localStorage`
2. 流式过程中每 ~900ms 把当前 `streaming` 消息快照写入 IndexedDB
3. 刷新后 `loadActive()` 发现 pending + streaming 快照，恢复流式消息并自动调用
   `GET /api/chat/receive/{requestId}`
4. 网络恢复时（`window.online`）也会自动续传；失败时面板显示「连接中断 · 继续接收」
5. 去重：先按 `seq` 跳过已应用帧；没有 seq 时，把新 delta 与已有文本做公共前缀合并，
   服务端从头重放也不会重复

> 直连模式（`VITE_CHAT_MODE=direct`）没有服务端缓冲，`supportsResume=false`：
> 刷新后把未完成的回答标记为「已停止」，不会显示无效的续传按钮。
> 续传能力在 `VITE_CHAT_MODE=http`（或 mock）下生效。

## 打开面板时的布局

桌面 ≥1200px 时，给 `html` 加 `ai-open`，`.shell` 从单列网格切成
`1fr + 444px`，中间内容自动左移并收窄，右侧 404px 面板不再压住内容。
<1200px 时面板保持浮层/全屏，不挤压布局。

## 解析器规则（[`sse.ts`](./sse.ts)）

- `TextDecoder('utf-8')` + `decode(value, { stream: true })`，结束时 `decode()` 冲刷残余字节
- 以 `\n\n` 为事件边界，最后一段不完整内容留在 buffer
- 多行 `data:` 用 `\n` 拼接后整体 `JSON.parse`
- `JSON.parse` 失败进入 deferred，不丢弃、不猜；流结束仍失败才发错误帧
- 兼容标准 SSE `event:` 名（如 `event: INIT_REQUEST_ID`），data 里没有 `type` 也能识别
- 单测：`pnpm test`（8 条：多字节切分、CRLF 跨界、多行 data、尾段保留、坏 JSON、工具帧、INIT/THINKING、REFERENCE）

## 流式渲染

- 收到的 delta 先进非响应式缓冲，`requestAnimationFrame` 每帧 flush
- 流式回答放在 `chatState.streaming`，不进入 `messages` 数组 → **只重渲染最后一条**
- Markdown 渲染前补全未闭合代码围栏；`markdown-it` 关闭 raw HTML；结果再过 DOMPurify

## 持久化

- 会话元数据：`localStorage` 的 `myos.ai.meta.v1`
- 消息体：IndexedDB `myos-ai` / `messages`（索引 `conversationId`）
- 刷新时残留的 `streaming` 消息会转成 `stopped`

## 停止

`AbortController.abort()` 中止读取；直连模式即中止上游请求。已收内容保留，消息标记「已停止」。HTTP 模式会额外 `POST /api/chat/stop`。

## 开发验证脚本

```bash
pnpm dev --port 5199
node scripts/ai-shots.mjs        # 粒子球 / 面板 / 流式截图
node scripts/ai-functional.mjs   # 停止、持久化、重命名、删除、移动端
```

mock 模式：`VITE_CHAT_MOCK=1 pnpm dev --port 5200`。
