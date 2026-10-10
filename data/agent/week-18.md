---
week: 18
stage: 3
stageTitle: 阶段 3 · 多步 Agent · LangGraph
title: 多工具协同 & MCP 协议入门
focus: 多工具协同，并第一次让工具「走出进程」——用 MCP
status: todo
progress: 0
hours: 24
deliverable: multi_tool.py、mcp_notes_server.py
---

# 第 18 周 · 多工具协同 & MCP 协议入门

> 多工具协同，并第一次让工具「走出进程」——用 MCP

**说明**：MCP 前置，原版放在部署阶段，不合理。

## 每日安排

- Day1：多个工具协同调用；不同模型分工：贵模型做计划，廉价模型做摘要，控制 token 成本
- Day2：统计每轮 token 消耗；输出成本日志
- Day3：MCP 概念：什么是 MCP Server、MCP Tool 协议
- Day4：写简单 MCP Server：封装搜索笔记、读取 md 文件能力
- Day5：LangGraph Agent 连接 MCP 服务调用工具，不再硬 import 工具函数
- Day6：交付：`multi_tool.py`、简易 `mcp_notes_server.py`

## 交付物

- multi_tool.py：多工具协同 + 贵 / 廉价模型分工
- mcp_notes_server.py：MCP Server 封装笔记 / md 读取

## 本周三件事

- [ ] 实现多工具协同 + 贵 / 廉价模型分工
- [ ] 统计每轮 token 消耗并输出成本日志
- [ ] 写简易 MCP Server，让 Agent 连上调用
