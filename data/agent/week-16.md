---
week: 16
stage: 3
stageTitle: 阶段 3 · 多步 Agent · LangGraph
title: LangGraph 基础：状态、节点、边、条件分支
focus: 从「一条流水线」升级到「可分支、可循环的状态图」
status: todo
progress: 0
hours: 24
deliverable: langgraph_plan.py
---

# 第 16 周 · LangGraph 基础：状态、节点、边、条件分支

> 从「一条流水线」升级到「可分支、可循环的状态图」

## 每日安排

- Day1：State 状态定义；Node 节点；Edge 普通边；ConditionalEdge 条件分支
- Day2：实现简单计划 - 执行 - 收敛的图：计划节点、工具执行节点、总结节点
- Day3：理解：Chain 是单行流水线；Graph 是状态流转，可以分支、循环
- Day4：调试图执行流程，观察 state 变化
- Day5：基础图 demo 练习
- Day6：交付：`langgraph_plan.py`

## 交付物

- langgraph_plan.py：计划 → 执行 → 收敛的状态图
- 一份 Chain vs Graph 的理解笔记

## 本周三件事

- [ ] 定义 State / Node / Edge / ConditionalEdge
- [ ] 实现计划 - 执行 - 总结三节点图
- [ ] 调试图流程并观察 state 变化
