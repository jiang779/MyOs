# AI Chat 流式协议

版本 **1.0** · 适用于 `src/ai` 的 `HttpTransport` / `DirectTransport` / `MockTransport`

这份文档描述前端与聊天服务之间的 HTTP + SSE 契约，以及客户端如何解析、渲染、停止和续传。
直连模式（浏览器 → 模型）会在客户端把上游 OpenAI 兼容流翻译成同一套事件，所以 UI 只认这一套协议。

---

## 1. 端点

| 方法 | 路径 | 用途 |
|---|---|---|
| `POST` | `/api/chat/send` | 发起对话，返回 `text/event-stream` |
| `GET` | `/api/chat/receive/{requestId}` | 断线续传，返回同一路流（可重放） |
| `POST` | `/api/chat/stop` | 停止生成，body `{ "requestId": "..." }` |

要求：

- `send` / `receive` 返回 `200`，`Content-Type: text/event-stream; charset=utf-8`
- 不要加缓冲：`Cache-Control: no-cache, no-transform`
- 停止/失败时返回 JSON 也可以，前端会读取错误文本并展示

---

## 2. 请求体（send）

```json
{
  "requestId": "client-generated-uuid",
  "conversationId": "conversation-uuid",
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "temperature": 0.6,
  "model": "deepseek-v4-pro-ga-260813",
  "maxTokens": 2048,
  "knowledgeBaseIds": ["kb-uuid"],
  "toolIds": ["mcp-server-uuid:echo_text"]
}
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `requestId` | string | 是 | 客户端生成；服务端可用自己的 id 覆盖（见 `INIT_REQUEST_ID`） |
| `conversationId` | string | 是 | 会话 id，服务端可用于限流/审计 |
| `messages` | array | 是 | OpenAI 兼容的 `role/content` 列表；最后一条是用户问题 |
| `temperature` | number | 否 | 0–2，默认 0.6 |
| `model` | string | 否 | 留空用服务端默认模型 |
| `maxTokens` | number | 否 | 256–8192 |
| `knowledgeBaseIds` | string[] | 否 | 需要参与 RAG 的知识库；客户端在直连/mock 模式下会自己检索并注入 system |
| `toolIds` | string[] | 否 | 当前会话暴露给模型的 MCP 工具，格式 `${serverId}:${toolName}` |

`toolIds` 由工具页按会话勾选并写入 `localStorage`（`myos.ai.toolSelection.v1`）。
服务端解析后应把对应 MCP 工具暴露给模型，工具执行结果用下面的 `TOOL_CALL` / `TOOL_RESULT` 事件返回。

---

## 3. SSE 帧格式

每个事件一行或多行 `data:`，以空行结束：

```
data: {"type":"MESSAGE","delta":"你好"}

data: {"type":"THINKING","delta":"先看问题"}
data: {"type":"TOOL_CALL","id":"c1","name":"search","arguments":"{\"q\":\"x\"}"}
```

规则：

- 一个事件的数据可以拆成多行 `data:`；客户端用 `\n` 拼接后再 `JSON.parse`
- `event:` 名可选；如果 data 里没有 `type`，客户端会用 `event:` 名作为类型
- `id:` 字段保留给 SSE 标准，当前客户端不依赖
- 事件之间用 `\n\n` 分隔；最后不完整的一段必须留在 buffer 等下一片
- `\r\n` 和 `\n` 都接受
- `data: [DONE]` 可作为结束标记，`DONE` 事件同样有效

---

## 4. 事件类型

| `type` | 方向 | 字段 | 说明 |
|---|---|---|---|
| `INIT_REQUEST_ID` | 服务端 → 客户端 | `requestId` | 服务端分配的流 id；客户端存 localStorage 用于续传 |
| `MESSAGE` | 服务端 → 客户端 | `delta`, `seq?` | 正文增量 |
| `THINKING` | 服务端 → 客户端 | `delta`, `seq?` | 思考增量；旧名 `THINK` 也接受 |
| `TOOL_CALL` | 服务端 → 客户端 | `id`, `name?`, `arguments?`, `status?`, `seq?` | 工具调用开始/参数增量 |
| `TOOL_RESULT` | 服务端 → 客户端 | `id`, `content`, `status?`, `durationMs?`, `seq?` | 工具结果 |
| `REFERENCE` | 服务端 → 客户端 | `references[]`, `seq?` | 引用列表 |
| `DONE` | 服务端 → 客户端 | `seq?` | 本轮结束 |
| `ERROR` | 服务端 → 客户端 | `message`, `seq?` | 业务/生成错误 |

### INIT_REQUEST_ID

```json
{ "type": "INIT_REQUEST_ID", "requestId": "srv-abc123" }
```

- 客户端收到后把 `{requestId, conversationId, messageId, lastSeq}` 写入 `localStorage`
- 后续用这个 id 调 `GET /api/chat/receive/{requestId}`
- 如果服务端不返回，客户端只能用自己生成的 `requestId` 调 stop，无法续传

### MESSAGE

```json
{ "type": "MESSAGE", "delta": "第一段", "seq": 1 }
```

- `delta` 是增量，不是全量
- `seq` 可选；有 seq 时客户端按 seq 去重

### THINKING / THINK

```json
{ "type": "THINKING", "delta": "先拆一下问题", "seq": 2 }
```

- 客户端合并成一个可折叠块，并记录 `startedAt/endedAt`
- 第一个非思考事件（MESSAGE / TOOL_CALL / DONE）会结束计时

### TOOL_CALL

```json
{
  "type": "TOOL_CALL",
  "id": "call-1",
  "name": "search_notes",
  "arguments": "{\"query\":\"复盘\"}",
  "status": "running",
  "seq": 3
}
```

| 字段 | 说明 |
|---|---|
| `id` | 工具调用 id；同一次调用的参数增量必须复用同一个 id |
| `name` | 工具名；第一次出现时必填，后续可省略 |
| `arguments` | JSON 字符串；允许分片增量，客户端累加 |
| `status` | `running` / `done` / `error`，可选 |

- 客户端收到即插入工具卡片（工具名 + 参数可折叠）
- 参数增量会持续追加

### TOOL_RESULT

```json
{
  "type": "TOOL_RESULT",
  "id": "call-1",
  "content": "找到 3 条笔记",
  "status": "success",
  "durationMs": 420,
  "seq": 4
}
```

| 字段 | 说明 |
|---|---|
| `id` | 对应 `TOOL_CALL.id` |
| `content` | 结果文本；客户端用 `<pre>` 纯文本渲染，不执行 HTML |
| `status` | `success` / `error`（兼容 `done` / `failed`） |
| `durationMs` | 可选；缺省用客户端计时 |

- 失败时工具卡片显示「重试」；重试会移除该条回答并用同一轮用户消息重新请求
- 工具卡片与第 11 条共用同一套渲染

### REFERENCE

```json
{
  "type": "REFERENCE",
  "references": [
    {
      "id": "chunk-1",
      "docId": "doc-1",
      "title": "周复盘.md",
      "snippet": "每周复盘时，先列出三件最重要的事……",
      "content": "完整的原文片段……",
      "score": 0.82
    }
  ],
  "seq": 5
}
```

| 字段 | 说明 |
|---|---|
| `id` | 片段唯一 id；客户端按 id 去重 |
| `docId` | 文档 id，可选 |
| `title` | 文档标题 |
| `snippet` | 摘要，列表里展示 |
| `content` | 原文片段，点击展开 |
| `score` | 相似度，0–1 或 0–100，客户端会归一化展示 |

- 也兼容单条 `reference` 对象，或直接把字段放在事件根上
- 最多保留 8 条
- 直连/mock 模式下由客户端本地检索产生；http 模式由服务端返回

### DONE

```json
{ "type": "DONE", "seq": 6 }
```

- 本轮正常结束；客户端把流式消息落库
- 即使没有 DONE，流关闭也会按正常结束处理

### ERROR

```json
{ "type": "ERROR", "message": "模型返回错误" }
```

- 客户端保留已收内容，消息标记为出错，并展示错误文本
- 与 HTTP 非 200、网络错误区分：后者在建立连接阶段就会抛出

---

## 5. 客户端解析规则

实现见 [`src/ai/sse.ts`](../src/ai/sse.ts)，测试见 [`src/ai/__tests__/sse.spec.ts`](../src/ai/__tests__/sse.spec.ts)。

1. `TextDecoder('utf-8')`，每片用 `decode(value, { stream: true })`，结束时 `decode()` 冲刷残余字节
2. 以 `\n\n` 切事件；最后不完整的一段留在 buffer，等下一片
3. 多行 `data:` 用 `\n` 拼接后整体 `JSON.parse`
4. **JSON.parse 失败不丢弃**：事件进入 deferred，下次 push 继续尝试；流结束仍失败才发 `ERROR`
5. 不使用「是否以 `}` 结尾」之类的启发式
6. 未知 `type` 忽略，不报错
7. 支持标准 SSE `event:` 名（如 `event: INIT_REQUEST_ID`），data 中没有 `type` 也能识别

测试覆盖：

- 事件跨分片
- 多行 `data:`
- UTF-8 中文被切断
- 坏 JSON 后恢复
- `\r\n` 跨分片、尾段保留、工具帧、`INIT`/`THINKING`、`REFERENCE`

---

## 6. 停止

客户端：

1. `AbortController.abort()` 中止读取
2. `POST /api/chat/stop`，body `{ requestId }`（直连模式没有服务端，stop 为空操作）
3. 保留已收内容，消息 `status = stopped`
4. 清除 localStorage 的 pending 记录

服务端应停止生成并释放该 `requestId` 的缓冲。

---

## 7. 断线续传

1. 收到 `INIT_REQUEST_ID` 后，客户端写 pending：
   ```json
   { "requestId": "...", "conversationId": "...", "messageId": "...", "lastSeq": 6 }
   ```
2. 流式过程中每 ~900ms 把当前回答快照写入 IndexedDB（含 blocks/references）
3. 刷新后恢复快照，自动 `GET /api/chat/receive/{requestId}`
4. 网络恢复（`window.online`）也会自动续传；失败时显示「继续接收」
5. 去重：
   - 有 `seq`：跳过 `seq <= lastSeq`
   - 无 `seq`：把新 delta 与已有文本做公共前缀合并，服务端从头重放也不会重复
   - 工具/引用按 `id` 去重

服务端可以：

- 从头重放整段流（客户端去重）
- 或从 `lastSeq` 之后继续发送（更省流量）

**注意**：直连模式没有服务端缓冲，`supportsResume = false`；刷新后未完成回答会标记为「已停止」。
续传能力在 `VITE_CHAT_MODE=http` 或 mock 模式下生效。

---

## 8. 方舟（OpenAI 兼容）映射

直连适配层把上游 `chat/completions` 的 SSE 翻译成统一事件：

| 上游 | 统一事件 |
|---|---|
| `choices[0].delta.content` | `MESSAGE` |
| `choices[0].delta.reasoning_content` | `THINKING` |
| `choices[0].delta.tool_calls[]` | `TOOL_CALL` |
| `[DONE]` | `DONE` |
| 上游 `error` | `ERROR` |

直连层会先发一条 `INIT_REQUEST_ID`（使用客户端 requestId），并为每个事件补 `seq`。
工具真正的执行需要服务端或本地 MCP 编排；前端只负责展示 `TOOL_CALL` / `TOOL_RESULT`。

---

## 9. 完整示例

```
data: {"type":"INIT_REQUEST_ID","requestId":"srv-1"}

data: {"type":"REFERENCE","references":[{"id":"c1","title":"周复盘.md","snippet":"每周复盘时……","content":"每周复盘时，先列出三件最重要的事……","score":0.82}],"seq":1}

data: {"type":"THINKING","delta":"先确认用户要的是复盘方法。","seq":2}

data: {"type":"TOOL_CALL","id":"call-1","name":"search_notes","arguments":"{\"query\":\"复盘\"}","status":"running","seq":3}

data: {"type":"TOOL_RESULT","id":"call-1","content":"找到 3 条笔记","status":"success","durationMs":420,"seq":4}

data: {"type":"MESSAGE","delta":"## 每周复盘\n\n1. 列出三件最重要的事……","seq":5}

data: {"type":"DONE","seq":6}
```

---

## 10. 错误处理约定

| 场景 | 客户端行为 |
|---|---|
| `send` 非 200 | 抛错，消息标记出错，显示 HTTP 状态和响应片段 |
| `receive` 非 200 | 保留 pending，显示「继续接收」；可重试 |
| SSE 中出现 `ERROR` | 保留已收内容，标记出错，显示 message |
| 坏 JSON | 暂存等待；流结束仍坏才报错 |
| 流提前关闭（无 DONE） | 按正常结束处理 |
| 网络中断（已收到 INIT） | 保留 pending，等待 `online` 或手动续传 |

鉴权：当前前端不附带 token，真实服务端应使用同源 Cookie / 反向代理鉴权；
如果是跨域部署，需要配置 CORS 并允许 `Content-Type`。

---

## 11. 版本

| 版本 | 变更 |
|---|---|
| 1.0 | `INIT_REQUEST_ID`、`THINKING`、`TOOL_CALL/TOOL_RESULT` 状态与耗时、`REFERENCE`、`seq` 去重、续传 |
