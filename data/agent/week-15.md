---
week: 15
stage: 3
stageTitle: 阶段 3 · 多步 Agent · LangGraph
title: 手搓 ReAct Agent 循环（不用 AgentExecutor）
focus: 不用框架，亲手写一遍 ReAct，才算真的懂 Agent
status: todo
progress: 0
hours: 24
deliverable: react_loop.py
---

# 第 15 周 · 手搓 ReAct Agent 循环（不用 AgentExecutor）

> 不用框架，亲手写一遍 ReAct，才算真的懂 Agent

**说明**：原版 Week11-15，补齐 checkpoint 持久化；拆分项目，延后视频录制。

## 每日安排

- Day1：ReAct 概念：Thought / Action / Observation / FinalAnswer
- Day2：手写 while 循环；自己完成整套：模型输出工具调用 → 执行工具 → 把观察结果回填消息列表
- Day3：打印每一步思考轨迹；观察 Agent 思考过程
- Day4：增加最大迭代次数，防止死循环
- Day5：调试循环中各种异常
- Day6：交付：`react_loop.py`

## 交付物

- react_loop.py：手写 ReAct 循环（不依赖 AgentExecutor）
- 可打印的每一步思考轨迹

## 本周三件事

- [ ] 手写 while 循环完成 Thought / Action / Observation
- [ ] 打印每步思考轨迹，观察 Agent 思考过程
- [ ] 加最大迭代次数，防止死循环
