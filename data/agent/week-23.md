---
week: 23
stage: 4
stageTitle: 阶段 4 · 工程化、安全与部署
title: Agent 可观测、日志、Trace 追踪
focus: 看不见的过程没法优化，先把 trace 打出来
status: todo
progress: 0
hours: 24
deliverable: agent_trace.py
---

# 第 23 周 · Agent 可观测、日志、Trace 追踪

> 看不见的过程没法优化，先把 trace 打出来

## 每日安排

- Day1：logging 模块；区分不同级别日志；Agent 每一步思考、工具调用打日志
- Day2：LangSmith 接入；追踪每一次调用，定位 Agent 卡在哪里
- Day3：记录 thought log，回放 Agent 思考轨迹
- Day4：替换 print 调试，全部用日志系统
- Day5：demo，复现异常看 trace 日志
- Day6：交付：`agent_trace.py`

## 交付物

- agent_trace.py：结构化日志 + trace 追踪
- 一份可回放的 Agent 思考轨迹记录

## 本周三件事

- [ ] 用 logging 分级记录每步思考 / 工具调用
- [ ] 接入 LangSmith 追踪调用
- [ ] 记录 thought log 并复现异常看 trace
