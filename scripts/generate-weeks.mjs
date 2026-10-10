/**
 * 生成 data/agent/week-01.md ... week-36.md
 * ------------------------------------------------------------
 * 内容来源：C:\Users\Administrator\Desktop\1.md（36 周新版计划）
 * 用法：node scripts/generate-weeks.mjs
 *
 * 说明：脚本只是「一次性铺好 36 周骨架」，之后所有修改直接改 md 即可。
 */
import { mkdirSync, rmSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'data', 'agent')

const STAGES = {
  0: '阶段 0 · Python 工程与后端基础',
  1: '阶段 1 · 单 Agent 与工具调用',
  2: '阶段 2 · RAG 检索增强生成',
  3: '阶段 3 · 多步 Agent · LangGraph',
  4: '阶段 4 · 工程化、安全与部署',
  5: '阶段 5 · 作品集 · 面试 · 简历',
}

const H = 24 // 每周 24h，每日 4h

const PLAN = [
  /* ======================= 阶段 0 · Week1-4 ======================= */
  {
    no: 1, stage: 0, title: 'Python 工程夯实', hours: H,
    focus: '把环境、IO、异常、同步异步这些工程肌肉练出来，后面接大模型全靠它',
    deliverable: 'env_parser.py、csv_clean.py 两个脚本',
    days: [
      ['Day1', 'venv 虚拟环境、requirements.txt、模块导入；Path 文件操作；csv 读写'],
      ['Day2', '`.env` 原理，**手写 .env 解析函数（不依赖 python-dotenv）**；异常捕获 try-except；基础重试逻辑'],
      ['Day3', 'httpx 同步请求；理解响应对象；网络异常、超时处理'],
      ['Day4', 'asyncio 基础概念；`await`；区分同步 / 异步；简单 aiohttp 请求 demo'],
      ['Day5', '练习：写脚本读取 csv，做简单文本清洗，捕获文件、编码异常'],
      ['Day6', '整理代码，交付 `env_parser.py`、`csv_clean.py`'],
    ],
    deliver: [
      'env_parser.py：手写 .env 解析，不依赖 python-dotenv',
      'csv_clean.py：读 csv + 文本清洗 + 编码异常兜底',
      '掌握虚拟环境、异常、基础 IO、同步 / 异步概念',
    ],
    tasks: ['手写 .env 解析函数并跑通', '用 httpx 完成一次请求 + 超时处理', '交付 env_parser.py 与 csv_clean.py'],
  },
  {
    no: 2, stage: 0, title: 'LLM 裸调用，第一次跑通大模型 API', hours: H,
    focus: '不套框架，先用 httpx 原生把大模型 API 摸透',
    deliverable: 'llm_raw_chat.py（原生 httpx 调用）',
    days: [
      ['Day1', '概念：token、message 角色、system / user / assistant、api-key 安全规范'],
      ['Day2', 'httpx **原生调用 OpenAI 兼容接口**；终端对话 demo；密钥 .env 管理'],
      ['Day3', '练习：捕获鉴权失败、超时、限流异常；简单 token 消耗统计'],
      ['Day4', '理解返回结构；区分流式 chunk 与完整返回；手写简单流式打印'],
      ['Day5', '拓展：**不用任何 LangChain，原生手写一轮完整 Function-Calling 闭环**（非常重要，原版缺失）'],
      ['Day6', '整合，交付 `llm_raw_chat.py`（原生 httpx，不带任何 LangChain）'],
    ],
    deliver: [
      'llm_raw_chat.py：原生 httpx 调用脚本，不依赖任何 LangChain',
      '一份可运行的原生 Function-Calling 闭环',
      '完成原生手写工具调用闭环',
    ],
    tasks: ['用 httpx 跑通终端对话 demo', '手写流式 chunk 解析与打印', '原生手写一轮 Function-Calling 闭环'],
  },
  {
    no: 3, stage: 0, title: 'FastAPI 基础，后端接口开发', hours: H,
    focus: '先吃透后端，接口能跑通再谈前端（原版 Week2 拆分而来）',
    note: '原版 Week2 直接 Vue + FastAPI 联调，现在拆分，先吃透后端，不急于前端。',
    deliverable: '纯后端 FastAPI 项目（Postman 可调聊天接口）',
    days: [
      ['Day1', 'FastAPI 路由、GET / POST；Pydantic 模型、请求体；状态码'],
      ['Day2', '跨域 CORS 中间件；全局异常处理器；统一返回体格式 `{code,msg,data}`'],
      ['Day3', '写接口：`POST /api/chat`，调用大模型，返回 reply、tokens；增加接口日志'],
      ['Day4', '学习 StreamingResponse；SSE 基础原理；实现普通非流式接口'],
      ['Day5', '接口测试，Postman 调试；处理接口各种报错场景'],
      ['Day6', '交付：后端项目，可 Postman 调用聊天接口'],
    ],
    deliver: [
      '纯后端 FastAPI 项目，暂不做 Vue 前端',
      'POST /api/chat 接口，返回 reply + tokens',
    ],
    tasks: ['搭 FastAPI 骨架 + 统一返回体 {code,msg,data}', '写 POST /api/chat 并加接口日志', 'Postman 跑通各种报错场景'],
  },
  {
    no: 4, stage: 0, title: '【缓冲周 1】', hours: H,
    focus: '不学新东西，把前三周没写完的代码和报错全部填平',
    deliverable: '补齐的代码 + 一个本地 git 仓库',
    deliver: [
      '补齐前 3 周未完成的代码，修复环境与依赖报错',
      '一个包含全部前期代码的本地 git 仓库（提交完成）',
    ],
    tasks: ['补齐没写完的代码、修复环境与依赖报错', '复习 Python 异步 / LLM 原生调用 / FastAPI', '整理成一个 git 仓库并做好提交'],
  },

  /* ======================= 阶段 1 · Week5-9 ======================= */
  {
    no: 5, stage: 1, title: 'LCEL 管道编程', hours: H,
    focus: '学会管道式编排，同时把「解析失败」当一等公民处理',
    note: '对应原版 Week3-Week6，降低跳跃，补齐解析容错。',
    deliverable: 'lcel_chain.py（终端稳定输出 JSON）',
    days: [
      ['Day1', 'LangChain 核心概念：PromptTemplate、ChatModel、Runnable 协议'],
      ['Day2', 'OutputParser；重点练习：**解析失败的降级、重试逻辑（原版缺失）**'],
      ['Day3', '管道语法 `prompt | model | parser`；输出固定 JSON 结构'],
      ['Day4', '调试 Runnable；`.invoke()` / `.batch()`；config 基础配置'],
      ['Day5', '对比：原生调用 VS LCEL 封装的区别'],
      ['Day6', '交付：`lcel_chain.py` 终端稳定输出 JSON，解析出错会降级处理'],
    ],
    deliver: [
      'lcel_chain.py：prompt | model | parser 管道，终端稳定输出 JSON',
      '解析失败自动降级 + 重试，不崩掉',
    ],
    tasks: ['搭起 PromptTemplate | ChatModel | OutputParser', '写 JSON 解析失败的降级与重试', '对比原生调用与 LCEL 的差别'],
  },
  {
    no: 6, stage: 1, title: 'Function-Calling 工具开发', hours: H,
    focus: '工具描述写得好，模型才用得对',
    deliverable: 'tool_calc.py、search_notes.py',
    days: [
      ['Day1', 'Tool 概念；tool description 的重要性；参数校验；什么时候模型会拒绝调用工具'],
      ['Day2', '实现工具 1：calculator 计算器；工具 2：search_notes 读取本地 md 笔记'],
      ['Day3', 'LangChain 工具调用；观察 tool_calls / invalid_tool_calls 返回字段'],
      ['Day4', '调试：description 写坏观察模型不调用工具的现象；排错'],
      ['Day5', '测试多工具选择，Agent 自主判断调用哪个工具'],
      ['Day6', '交付：`tool_calc.py`、`search_notes.py`'],
    ],
    deliver: [
      'calculator 计算器工具',
      'search_notes：读取本地 md 笔记的工具',
    ],
    tasks: ['实现 calculator 与 search_notes 两个工具', '观察 tool_calls / invalid_tool_calls 字段', '故意写坏 description，记录模型不调用工具的现象'],
  },
  {
    no: 7, stage: 1, title: 'Agent 记忆机制 Memory', hours: H,
    focus: '记忆不是模型能力，是你把历史消息塞回 prompt 的动作',
    note: '核心理解：记忆本质只是把历史消息塞回 prompt，模型本身没有存储记忆。',
    deliverable: 'memory_chat.py（多轮对话 + 自动窗口裁剪）',
    days: [
      ['Day1', '概念：BufferMemory、WindowBufferMemory、SummaryMemory'],
      ['Day2', '消息列表膨胀问题；上下文窗口超限风险（原版缺失重点）'],
      ['Day3', '实现窗口记忆，自动裁剪旧消息；模拟长对话'],
      ['Day4', '练习：观察消息越来越长，打印总 token 数量'],
      ['Day5', '多轮对话完整 demo；处理消息过长告警'],
      ['Day6', '交付：`memory_chat.py`，多轮对话 + 自动窗口裁剪'],
    ],
    deliver: [
      'memory_chat.py：多轮对话 + 窗口记忆自动裁剪',
      '一段消息膨胀到自动裁剪的演示',
    ],
    tasks: ['实现窗口记忆并自动裁剪旧消息', '打印每轮消息的总 token 数', '模拟长对话，处理消息过长告警'],
  },
  {
    no: 8, stage: 1, title: '项目一：Vue 报错自助 Agent', hours: H,
    focus: '第一个完整项目：把报错喂进去，把修复建议吐回来',
    note: '原版 Week6：去掉当周录制视频，视频 / 架构图放到作品集阶段 Week28-30。',
    deliverable: 'vue-error-agent 完整可运行仓库',
    days: [
      ['Day1', '梳理需求：接收报错文本、检索本地笔记、给出修复建议；梳理消息上下文'],
      ['Day2', 'FastAPI 后端集成 AgentExecutor；接入之前写好的 2 个工具'],
      ['Day3', '编写接口接收报错，返回 Agent 回答；增加异常捕获'],
      ['Day4', '简单 Vue 输入框页面，对接后端接口，完成基础联调'],
      ['Day5', '整体端到端测试：粘贴报错，跑完整链路；修复 bug'],
      ['Day6', '交付：`vue-error-agent` 完整可运行仓库；架构图、60s 视频延后，本周不做'],
    ],
    deliver: [
      'vue-error-agent 仓库（前后端可跑通）',
      '架构图、60s 视频留到作品集阶段再做',
    ],
    tasks: ['FastAPI 集成 AgentExecutor + 接入 2 个工具', '写报错接口 + Vue 输入框页面对接', '端到端跑通并修复 bug'],
  },
  {
    no: 9, stage: 1, title: '【缓冲周 2】', hours: H,
    focus: '复习 Agent 整套链路，把项目一打磨稳',
    deliverable: '优化后的 vue-error-agent + 复习笔记',
    deliver: [
      '优化后的 vue-error-agent（清理 bug）',
      '一份 Agent 链路复习笔记',
    ],
    tasks: ['复习 Agent 整套链路', '优化 vue-error-agent 代码、清理 bug', '整理 Agent 阶段的学习笔记'],
  },

  /* ======================= 阶段 2 · Week10-14 ======================= */
  {
    no: 10, stage: 2, title: '文档加载、文本切分、Embedding 向量', hours: H,
    focus: '先把「脏文本 → 干净向量」这条链路走通',
    note: '原版 Week7-10，补齐 FAISS 持久化、脏文档清洗。',
    deliverable: 'rag_loader.py',
    days: [
      ['Day1', 'Loader 文档加载；处理脏 markdown 文本，过滤无效内容（原版缺失）'],
      ['Day2', 'Splitter；chunk、chunk_overlap；不同切分策略对比'],
      ['Day3', 'Embedding 模型；向量维度概念'],
      ['Day4', 'FAISS 向量库；**重点：FAISS 本地持久化保存 / 加载，解决重启丢失向量坑（原版缺失）**'],
      ['Day5', '完整流程：读取 md 笔记 → 切分 → 向量化 → 存入本地 faiss 文件'],
      ['Day6', '交付：`rag_loader.py`'],
    ],
    deliver: [
      'rag_loader.py：读取 md → 切分 → 向量化 → 存 faiss',
      '可持久化保存 / 加载的 FAISS 索引（重启不丢）',
    ],
    tasks: ['Loader 清洗脏 markdown 文本', '调 Splitter 的 chunk / chunk_overlap 策略', 'FAISS 本地持久化存 / 取，解决重启丢失'],
  },
  {
    no: 11, stage: 2, title: 'Retriever 检索链路，基础 RAG 问答', hours: H,
    focus: '让模型基于文档回答，而不是凭记忆胡说',
    deliverable: 'rag_retrieve.py',
    days: [
      ['Day1', 'Retriever 概念；检索出来的上下文怎么拼入 Prompt；幻觉产生根源'],
      ['Day2', '实现基础 RAG：提问 → 检索片段 → 组装 prompt → 大模型回答'],
      ['Day3', '对照实验：关闭 RAG 看模型胡说；开启 RAG 使用文档内容回答'],
      ['Day4', '调参：top-k，检索数量对回答的影响'],
      ['Day5', '异常处理：检索不到文档时候的兜底回答'],
      ['Day6', '交付：`rag_retrieve.py`'],
    ],
    deliver: [
      'rag_retrieve.py：基础 RAG 问答闭环',
      '一份开 / 关 RAG 的对照实验记录',
    ],
    tasks: ['实现提问 → 检索 → 组装 prompt → 回答', '做开关 RAG 的对照实验', '调 top-k 并处理检索不到文档的兜底'],
  },
  {
    no: 12, stage: 2, title: 'RAG 进阶：分数过滤、Rerank、引文溯源', hours: H,
    focus: '从「能答」到「答得准、有出处」',
    deliverable: 'rag_sources.py',
    days: [
      ['Day1', '相似度 score 过滤，低分片段直接丢弃'],
      ['Day2', 'rerank 重排序模型作用；接入简单 rerank'],
      ['Day3', '实现回答附带来源，记录来自哪一个 md 文档片段'],
      ['Day4', '把检索片段暴露给前端返回'],
      ['Day5', 'RAG 简单评估：哪些问题回答正确、哪些产生幻觉'],
      ['Day6', '交付：`rag_sources.py`'],
    ],
    deliver: [
      'rag_sources.py：分数过滤 + rerank + 引文溯源',
      '一份 RAG 评估记录（答对 / 幻觉各是什么）',
    ],
    tasks: ['加相似度 score 过滤，丢弃低分片段', '接入简单 rerank 重排序', '实现回答附带来源 + 检索片段回传前端'],
  },
  {
    no: 13, stage: 2, title: '项目二：前端面试知识库 Agent', hours: H,
    focus: '第二个完整项目：把笔记变成会出题的面试官',
    note: '原版 Week10，架构图、文档、视频全部后置到作品集阶段。',
    deliverable: 'interview-rag-agent 仓库',
    days: [
      ['Day1', '投喂 JS / Vue / TS 笔记文档；构建持久化向量库'],
      ['Day2', 'RAG 应用开发；实现生成选择题、场景面试题'],
      ['Day3', '约束知识边界：笔记没有的知识，模型禁止编造，输出「知识库无相关内容」'],
      ['Day4', 'FastAPI 封装 RAG 接口；简单 Vue 页面交互'],
      ['Day5', '端到端全流程测试；修复幻觉、检索不准的问题'],
      ['Day6', '交付：`interview-rag-agent` 仓库'],
    ],
    deliver: [
      'interview-rag-agent 仓库（RAG 问答 + 出题）',
      '知识边界约束：笔记没有的禁止编造',
    ],
    tasks: ['投喂 JS / Vue / TS 笔记并建持久化向量库', '实现生成选择题 / 场景面试题', '约束知识边界 + 修复幻觉问题'],
  },
  {
    no: 14, stage: 2, title: '【缓冲周 3】', hours: H,
    focus: '缓冲周：把 RAG 链路和项目二一起收尾',
    deliverable: '优化后的 interview-rag-agent + 复习笔记',
    deliver: [
      '优化后的 interview-rag-agent',
      '一份 RAG 全链路复习笔记',
    ],
    tasks: ['复习 RAG 全链路（Loader / Embedding / Retriever / Rerank）', '优化面试知识库代码', '修复检索、幻觉相关 bug'],
  },

  /* ======================= 阶段 3 · Week15-21 ======================= */
  {
    no: 15, stage: 3, title: '手搓 ReAct Agent 循环（不用 AgentExecutor）', hours: H,
    focus: '不用框架，亲手写一遍 ReAct，才算真的懂 Agent',
    note: '原版 Week11-15，补齐 checkpoint 持久化；拆分项目，延后视频录制。',
    deliverable: 'react_loop.py',
    days: [
      ['Day1', 'ReAct 概念：Thought / Action / Observation / FinalAnswer'],
      ['Day2', '手写 while 循环；自己完成整套：模型输出工具调用 → 执行工具 → 把观察结果回填消息列表'],
      ['Day3', '打印每一步思考轨迹；观察 Agent 思考过程'],
      ['Day4', '增加最大迭代次数，防止死循环'],
      ['Day5', '调试循环中各种异常'],
      ['Day6', '交付：`react_loop.py`'],
    ],
    deliver: [
      'react_loop.py：手写 ReAct 循环（不依赖 AgentExecutor）',
      '可打印的每一步思考轨迹',
    ],
    tasks: ['手写 while 循环完成 Thought / Action / Observation', '打印每步思考轨迹，观察 Agent 思考过程', '加最大迭代次数，防止死循环'],
  },
  {
    no: 16, stage: 3, title: 'LangGraph 基础：状态、节点、边、条件分支', hours: H,
    focus: '从「一条流水线」升级到「可分支、可循环的状态图」',
    deliverable: 'langgraph_plan.py',
    days: [
      ['Day1', 'State 状态定义；Node 节点；Edge 普通边；ConditionalEdge 条件分支'],
      ['Day2', '实现简单计划 - 执行 - 收敛的图：计划节点、工具执行节点、总结节点'],
      ['Day3', '理解：Chain 是单行流水线；Graph 是状态流转，可以分支、循环'],
      ['Day4', '调试图执行流程，观察 state 变化'],
      ['Day5', '基础图 demo 练习'],
      ['Day6', '交付：`langgraph_plan.py`'],
    ],
    deliver: [
      'langgraph_plan.py：计划 → 执行 → 收敛的状态图',
      '一份 Chain vs Graph 的理解笔记',
    ],
    tasks: ['定义 State / Node / Edge / ConditionalEdge', '实现计划 - 执行 - 总结三节点图', '调试图流程并观察 state 变化'],
  },
  {
    no: 17, stage: 3, title: 'Human-in-loop 人工介入 & Checkpoint 持久化', hours: H,
    focus: '让 Agent 能暂停、能恢复，状态存在数据库里',
    note: '原版只讲内存 checkpoint，补齐持久化到 SQLite（原版缺失）。',
    deliverable: 'human_in_loop.py',
    days: [
      ['Day1', 'human-in-loop：Agent 不确定的时候暂停，等待人工输入'],
      ['Day2', 'checkpoint 检查点原理；内存保存状态'],
      ['Day3', '实现 **Checkpoint 持久化到 SQLite 数据库，重启程序状态不丢失**'],
      ['Day4', 'fallback 兜底策略，工具调用失败的降级；max_iterations 防死循环'],
      ['Day5', '完整可中断 Agent Demo'],
      ['Day6', '交付：`human_in_loop.py`'],
    ],
    deliver: [
      'human_in_loop.py：可暂停 / 恢复的 Agent',
      'Checkpoint 持久化到 SQLite，重启不丢状态',
    ],
    tasks: ['实现 Agent 暂停等待人工输入', 'Checkpoint 持久化到 SQLite', '加 fallback 兜底 + max_iterations 防死循环'],
  },
  {
    no: 18, stage: 3, title: '多工具协同 & MCP 协议入门', hours: H,
    focus: '多工具协同，并第一次让工具「走出进程」——用 MCP',
    note: 'MCP 前置，原版放在部署阶段，不合理。',
    deliverable: 'multi_tool.py、mcp_notes_server.py',
    days: [
      ['Day1', '多个工具协同调用；不同模型分工：贵模型做计划，廉价模型做摘要，控制 token 成本'],
      ['Day2', '统计每轮 token 消耗；输出成本日志'],
      ['Day3', 'MCP 概念：什么是 MCP Server、MCP Tool 协议'],
      ['Day4', '写简单 MCP Server：封装搜索笔记、读取 md 文件能力'],
      ['Day5', 'LangGraph Agent 连接 MCP 服务调用工具，不再硬 import 工具函数'],
      ['Day6', '交付：`multi_tool.py`、简易 `mcp_notes_server.py`'],
    ],
    deliver: [
      'multi_tool.py：多工具协同 + 贵 / 廉价模型分工',
      'mcp_notes_server.py：MCP Server 封装笔记 / md 读取',
    ],
    tasks: ['实现多工具协同 + 贵 / 廉价模型分工', '统计每轮 token 消耗并输出成本日志', '写简易 MCP Server，让 Agent 连上调用'],
  },
  {
    no: 19, stage: 3, title: '项目三：每日复盘 Agent', hours: H,
    focus: '第三个完整项目：把一天的工作喂进去，吐出一份复盘',
    note: '原版 Week15；架构图、视频后置。',
    deliverable: 'daily-review-agent 完整仓库',
    days: [
      ['Day1', '需求：输入今日工作内容，输出技术点、踩坑记录、明日计划、周报、短视频文案'],
      ['Day2', 'LangGraph 状态机设计；多节点流转；支持人工确认中间结果'],
      ['Day3', 'FastAPI 封装后端接口；简单 Vue 页面交互'],
      ['Day4', '全流程测试；修复循环、工具调用异常'],
      ['Day5', '优化输出格式；增加 token 消耗日志'],
      ['Day6', '交付：`daily-review-agent` 完整仓库'],
    ],
    deliver: [
      'daily-review-agent 仓库（状态机 + 人工确认）',
      '架构图、视频留到作品集阶段再做',
    ],
    tasks: ['设计 LangGraph 状态机（多节点 + 人工确认）', 'FastAPI 封装接口 + Vue 页面交互', '全流程测试并修复循环 / 工具调用异常'],
  },
  {
    no: 20, stage: 3, title: '【缓冲周 4】复习与优化', hours: H,
    focus: '缓冲周：复习 LangGraph 整套，优化项目三',
    deliverable: '优化后的 daily-review-agent',
    deliver: [
      '优化后的 daily-review-agent（处理 bug）',
      '一份 LangGraph 复习笔记',
    ],
    tasks: ['复习 LangGraph 整套（State / Node / Edge / Checkpoint）', '优化 daily-review-agent 代码', '处理 daily-review-agent 的 bug'],
  },
  {
    no: 21, stage: 3, title: '【缓冲周 4】阶段大复盘', hours: H,
    focus: '把 Agent、RAG、LangGraph 三条线拉通复盘',
    deliverable: '阶段大复盘笔记',
    deliver: [
      '一份三阶段核心概念的知识笔记',
      '一张拉通 Agent / RAG / LangGraph 的知识地图',
    ],
    tasks: ['回顾 Agent 全部核心概念', '回顾 RAG 全部核心概念', '回顾 LangGraph 全部核心概念并整理知识笔记'],
  },

  /* ======================= 阶段 4 · Week22-27 ======================= */
  {
    no: 22, stage: 4, title: 'SSE 流式输出，前端打字机效果', hours: H,
    focus: '让用户等的时候有反馈：token 一个一个往外冒',
    note: '原版 Week16-20；降低公网部署理想化；部署设为可选。',
    deliverable: '流式聊天前后端完整 demo',
    days: [
      ['Day1', 'SSE 协议；FastAPI StreamingResponse；异步 astream'],
      ['Day2', '后端接口改造为流式接口；支持 token 逐块推送'],
      ['Day3', 'Vue 前端实现打字机渲染效果'],
      ['Day4', '实现停止中断生成功能'],
      ['Day5', '完整联调测试'],
      ['Day6', '交付：流式聊天前后端完整 demo'],
    ],
    deliver: [
      '后端 SSE 流式接口（token 逐块推送）',
      'Vue 打字机效果 + 停止中断生成',
    ],
    tasks: ['后端改造为 StreamingResponse 流式接口', 'Vue 实现打字机渲染', '实现停止中断生成 + 完整联调'],
  },
  {
    no: 23, stage: 4, title: 'Agent 可观测、日志、Trace 追踪', hours: H,
    focus: '看不见的过程没法优化，先把 trace 打出来',
    deliverable: 'agent_trace.py',
    days: [
      ['Day1', 'logging 模块；区分不同级别日志；Agent 每一步思考、工具调用打日志'],
      ['Day2', 'LangSmith 接入；追踪每一次调用，定位 Agent 卡在哪里'],
      ['Day3', '记录 thought log，回放 Agent 思考轨迹'],
      ['Day4', '替换 print 调试，全部用日志系统'],
      ['Day5', 'demo，复现异常看 trace 日志'],
      ['Day6', '交付：`agent_trace.py`'],
    ],
    deliver: [
      'agent_trace.py：结构化日志 + trace 追踪',
      '一份可回放的 Agent 思考轨迹记录',
    ],
    tasks: ['用 logging 分级记录每步思考 / 工具调用', '接入 LangSmith 追踪调用', '记录 thought log 并复现异常看 trace'],
  },
  {
    no: 24, stage: 4, title: 'Agent 安全：Prompt 注入、权限最小化', hours: H,
    focus: '先知道怎么被攻击，才知道怎么防',
    note: '原版只有现象，缺少策略；本周补齐防护策略。',
    deliverable: 'prompt_injection.py（含防护策略注释）',
    days: [
      ['Day1', '复现 prompt 注入攻击案例，看现象'],
      ['Day2', '学习防护策略：输入过滤、工具最小权限、禁止前端直接传递 prompt 模板（原版只有现象，缺少策略）'],
      ['Day3', '密钥安全：key 只保存在后端，前端永远不能接触密钥'],
      ['Day4', '工具权限管控：限制文件读写范围，防止越权读取文件'],
      ['Day5', '测试注入案例，验证防护效果'],
      ['Day6', '交付：`prompt_injection.py`，附带防护策略注释'],
    ],
    deliver: [
      'prompt_injection.py：复现注入 + 防护策略',
      '一份工具权限最小化清单',
    ],
    tasks: ['复现 prompt 注入攻击案例', '实现输入过滤 + 工具最小权限', '密钥只留后端 + 限制文件读写范围'],
  },
  {
    no: 25, stage: 4, title: '部署（分优先级，降低理想化）', hours: H,
    focus: '重点放本地容器化，公网部署不强求',
    note: '公网平台 Render / Railway / Vercel 国内访问坑很多，不作为硬性交付。',
    deliverable: 'Dockerfile + 本地可部署包（公网链接可选）',
    days: [
      ['Day1', '项目环境配置：`.env`、requirements、依赖锁定；本地 docker 打包（优先掌握）'],
      ['Day2', '本地容器运行三个 Agent 项目'],
      ['Day3', '【可选】尝试公网托管部署；遇到网络问题可以跳过，不要死磕'],
      ['Day4', '静态前端打包；区分开发环境、生产环境配置'],
      ['Day5', '处理部署常见报错'],
      ['Day6', '交付：Dockerfile，本地可部署包；公网链接可选'],
    ],
    deliver: [
      'Dockerfile 与本地可运行的容器',
      '开发 / 生产环境配置分离',
    ],
    tasks: ['写 Dockerfile，本地 docker 打包三个项目', '静态前端打包 + 区分开发 / 生产配置', '处理部署常见报错（公网部署可选）'],
  },
  {
    no: 26, stage: 4, title: '【缓冲周 5】工程化复习与修 bug', hours: H,
    focus: '缓冲周：把工程化阶段的账清一清',
    deliverable: '修完 bug 的三个项目',
    deliver: [
      '三个项目的 bug 修复',
      '一份工程化阶段复习笔记',
    ],
    tasks: ['工程化全阶段复习（SSE / 日志 / 安全 / 部署）', '修复三个项目的 bug', '整理工程化阶段的踩坑记录'],
  },
  {
    no: 27, stage: 4, title: '【缓冲周 5】补架构图与 README', hours: H,
    focus: '把架构图从「以后再说」变成「现在就画」',
    deliverable: '三个项目的架构图 + 基础 README',
    deliver: [
      '三个项目的架构图',
      '完善的基础 README',
    ],
    tasks: ['给三个项目补充架构图', '完善基础 README', '检查文档与代码是否一致'],
  },

  /* ======================= 阶段 5 · Week28-36 ======================= */
  {
    no: 28, stage: 5, title: '项目 1 深度打磨 vue-error-agent', hours: H,
    focus: '把项目一讲到能上简历',
    note: '对应原版 Week21-26，把录制视频全部放在这个阶段，不再穿插技术学习周。',
    deliverable: '完善的项目 1 README.md',
    days: [
      ['Day1', '重写 README：架构图、技术选型决策记录：为什么用 LangGraph，哪些是框架能力，哪些是自己写的'],
      ['Day2', '写踩坑清单；项目局限性；未来可以扩展点'],
      ['Day3', '梳理简历描述话术'],
      ['Day4-6', '交付：完善的项目 1 README.md'],
    ],
    deliver: [
      '项目 1 完整 README（架构图 + 选型决策 + 踩坑清单）',
      '一段可用于简历的项目描述',
    ],
    tasks: ['重写 README：架构图 + 技术选型决策', '写踩坑清单、局限性与扩展点', '梳理简历描述话术'],
  },
  {
    no: 29, stage: 5, title: '项目 2 & 项目 3 打磨', hours: H,
    focus: '三个项目的 README 全部收口',
    deliverable: '3 个项目完整 README',
    days: [
      ['Day1-3', '完善 interview-rag-agent README，写 RAG 局限性、幻觉问题、重排策略'],
      ['Day4-6', '完善 daily-review-agent README，状态机说明、人工介入逻辑'],
    ],
    deliver: [
      'interview-rag-agent README（RAG 局限 / 幻觉 / 重排策略）',
      'daily-review-agent README（状态机 / 人工介入）',
      '三个项目 README 全部完成',
    ],
    tasks: ['完善 interview-rag-agent README', '完善 daily-review-agent README', '三个项目 README 全部收口'],
  },
  {
    no: 30, stage: 5, title: '产出演示素材（录屏、脚本）', hours: H,
    focus: '素材先攒出来，精美剪辑是后话',
    note: '原计划分散到各个项目周，现在集中到本周。',
    deliverable: '4 份脚本 + 原始录屏素材',
    days: [
      ['Day1-3', '写 4 条短视频脚本（60s 级别），侧重前端转 Agent 视角，翻车案例、RAG 误区、Tool-calling 讲解'],
      ['Day4-6', '录制演示录屏（不需要剪辑精美，能展示项目运行效果即可）'],
    ],
    deliver: [
      '4 条 60s 短视频脚本',
      '三个项目的原始演示录屏',
    ],
    tasks: ['写 4 条 60s 短视频脚本', '录制三个项目的演示录屏', '整理素材备用（剪辑留到后面）'],
  },
  {
    no: 31, stage: 5, title: '整理面试题库，模拟面试', hours: H,
    focus: '把学到的东西翻译成面试官听得懂的答案',
    deliverable: 'mock-interview.md',
    days: [
      ['Day1-4', '整理 20 道高频面试题：Agent vs Workflow、幻觉、memory 原理、RAG 缺陷、token、上下文窗口、prompt 注入、LangGraph 状态机。每一题用通俗语言写出答案'],
      ['Day5-6', '自我模拟面试'],
    ],
    deliver: [
      '20 道高频面试题 + 通俗答案',
      '一次自我模拟面试记录',
    ],
    tasks: ['整理 20 道高频面试题（Agent / 幻觉 / memory / RAG / token / 上下文 / 注入 / 状态机）', '每题用通俗语言写答案', '自我模拟面试一次'],
  },
  {
    no: 32, stage: 5, title: '简历、GitHub 主页优化', hours: H,
    focus: '真实 > 华丽，边界写清楚反而加分',
    deliverable: 'resume.md + GitHub Profile',
    days: [
      ['Day1', '简历撰写，禁止写「精通 LLM」；写真实项目：FastAPI + LangGraph 做 Agent，RAG 知识库项目，写明职责、技术栈、项目限制'],
      ['Day2', '美化 GitHub 首页 README；放项目链接、技术栈'],
      ['Day3-6', '交付：`resume.md` + GitHub Profile 配置完成'],
    ],
    deliver: [
      '一页真实且克制的简历',
      '美化后的 GitHub 主页（项目链接 + 技术栈）',
    ],
    tasks: ['写简历（真实项目 + 边界，不吹「精通 LLM」）', '美化 GitHub 首页 README', '整理作品集链接'],
  },
  {
    no: 33, stage: 5, title: '最终缓冲：查漏补缺', hours: H,
    focus: '查漏补缺，把松的地方拧紧',
    deliverable: '补齐的知识点清单',
    deliver: [
      '一份薄弱知识点清单',
      '针对薄弱点的补充笔记',
    ],
    tasks: ['回看整个路线的薄弱知识点', '针对薄弱点补笔记 / 补代码', '更新知识地图'],
  },
  {
    no: 34, stage: 5, title: '收官短视频（可选）', hours: H,
    focus: '可选：给整条路线录一条收官视频',
    deliverable: '1 条收官技术短视频',
    deliver: [
      '1 条收官技术短视频（可选）',
      '发布记录',
    ],
    tasks: ['选题：整条路线的一个总结点', '录制并发布 1 条收官短视频', '沉淀发布记录与反馈'],
  },
  {
    no: 35, stage: 5, title: '整体复盘', hours: H,
    focus: '整体复盘，为求职做准备',
    deliverable: '整条路线的复盘笔记',
    deliver: [
      '一份整条路线的复盘笔记',
      '下阶段的计划草案',
    ],
    tasks: ['复盘 36 周：做成了什么 / 卡在哪', '复习薄弱模块', '写下一步计划'],
  },
  {
    no: 36, stage: 5, title: '求职准备收尾', hours: H,
    focus: '预留时间用于求职准备',
    deliverable: '求职准备包（简历 + 作品集 + 题库）',
    deliver: [
      '求职材料最终版',
      '模拟面试与岗位投递计划',
    ],
    tasks: ['复习薄弱模块', '整理求职材料（简历 / 作品集 / 题库）', '制定投递计划'],
  },
]

function render(w) {
  const lines = []
  lines.push('---')
  lines.push(`week: ${w.no}`)
  lines.push(`stage: ${w.stage}`)
  lines.push(`stageTitle: ${STAGES[w.stage]}`)
  lines.push(`title: ${w.title}`)
  lines.push(`focus: ${w.focus}`)
  lines.push('status: todo')
  lines.push('progress: 0')
  lines.push(`hours: ${w.hours}`)
  lines.push(`deliverable: ${w.deliverable}`)
  lines.push('---')
  lines.push('')
  lines.push(`# 第 ${w.no} 周 · ${w.title}`)
  lines.push('')
  lines.push(`> ${w.focus}`)
  if (w.note) {
    lines.push('')
    lines.push(`**说明**：${w.note}`)
  }
  if (w.days && w.days.length) {
    lines.push('')
    lines.push('## 每日安排')
    lines.push('')
    w.days.forEach(([label, text]) => lines.push(`- ${label}：${text}`))
  }
  lines.push('')
  lines.push('## 交付物')
  lines.push('')
  w.deliver.forEach((d) => lines.push(`- ${d}`))
  lines.push('')
  lines.push('## 本周三件事')
  lines.push('')
  w.tasks.forEach((t) => lines.push(`- [ ] ${t}`))
  lines.push('')
  return lines.join('\n')
}

mkdirSync(OUT, { recursive: true })

// 清掉旧的周计划文件，避免计划缩短后留下孤儿文件
for (const f of readdirSync(OUT)) {
  if (/^week-\d+\.md$/.test(f)) rmSync(join(OUT, f))
}

PLAN.forEach((w) => {
  const file = join(OUT, `week-${String(w.no).padStart(2, '0')}.md`)
  writeFileSync(file, render(w), 'utf8')
})

const stages = Object.keys(STAGES).map((k) => {
  const list = PLAN.filter((w) => w.stage === Number(k))
  return `  阶段 ${k}：第 ${list[0].no}-${list[list.length - 1].no} 周（${list.length} 周）`
})
console.log(`✅ 已生成 ${PLAN.length} 个周计划文件（全部 0 进度）→ ${OUT}`)
console.log(stages.join('\n'))
