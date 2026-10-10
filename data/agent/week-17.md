---
week: 17
stage: 3
stageTitle: 阶段 3 · 多步 Agent · LangGraph
title: Human-in-loop 人工介入 & Checkpoint 持久化
focus: 让 Agent 能暂停、能恢复，状态存在数据库里
status: todo
progress: 0
hours: 24
deliverable: human_in_loop.py
---

# 第 17 周 · Human-in-loop 人工介入 & Checkpoint 持久化

> 让 Agent 能暂停、能恢复，状态存在数据库里

**说明**：原版只讲内存 checkpoint，补齐持久化到 SQLite（原版缺失）。

## 每日安排

- Day1：human-in-loop：Agent 不确定的时候暂停，等待人工输入
- Day2：checkpoint 检查点原理；内存保存状态
- Day3：实现 **Checkpoint 持久化到 SQLite 数据库，重启程序状态不丢失**
- Day4：fallback 兜底策略，工具调用失败的降级；max_iterations 防死循环
- Day5：完整可中断 Agent Demo
- Day6：交付：`human_in_loop.py`

## 交付物

- human_in_loop.py：可暂停 / 恢复的 Agent
- Checkpoint 持久化到 SQLite，重启不丢状态

## 本周三件事

- [ ] 实现 Agent 暂停等待人工输入
- [ ] Checkpoint 持久化到 SQLite
- [ ] 加 fallback 兜底 + max_iterations 防死循环
