---
week: 2
stage: 0
stageTitle: 阶段 0 · Python 工程与后端基础
title: LLM 裸调用，第一次跑通大模型 API
focus: 不套框架，先用 httpx 原生把大模型 API 摸透
status: todo
progress: 0
hours: 24
deliverable: llm_raw_chat.py（原生 httpx 调用）
---

# 第 2 周 · LLM 裸调用，第一次跑通大模型 API

> 不套框架，先用 httpx 原生把大模型 API 摸透

## 每日安排

- Day1：概念：token、message 角色、system / user / assistant、api-key 安全规范
- Day2：httpx **原生调用 OpenAI 兼容接口**；终端对话 demo；密钥 .env 管理
- Day3：练习：捕获鉴权失败、超时、限流异常；简单 token 消耗统计
- Day4：理解返回结构；区分流式 chunk 与完整返回；手写简单流式打印
- Day5：拓展：**不用任何 LangChain，原生手写一轮完整 Function-Calling 闭环**（非常重要，原版缺失）
- Day6：整合，交付 `llm_raw_chat.py`（原生 httpx，不带任何 LangChain）

## 交付物

- llm_raw_chat.py：原生 httpx 调用脚本，不依赖任何 LangChain
- 一份可运行的原生 Function-Calling 闭环
- 完成原生手写工具调用闭环

## 本周三件事

- [ ] 用 httpx 跑通终端对话 demo
- [ ] 手写流式 chunk 解析与打印
- [ ] 原生手写一轮 Function-Calling 闭环
