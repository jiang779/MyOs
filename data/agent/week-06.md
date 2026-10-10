---
week: 6
stage: 1
stageTitle: 阶段 1 · 单 Agent 与工具调用
title: Function-Calling 工具开发
focus: 工具描述写得好，模型才用得对
status: todo
progress: 0
hours: 24
deliverable: tool_calc.py、search_notes.py
---

# 第 6 周 · Function-Calling 工具开发

> 工具描述写得好，模型才用得对

## 每日安排

- Day1：Tool 概念；tool description 的重要性；参数校验；什么时候模型会拒绝调用工具
- Day2：实现工具 1：calculator 计算器；工具 2：search_notes 读取本地 md 笔记
- Day3：LangChain 工具调用；观察 tool_calls / invalid_tool_calls 返回字段
- Day4：调试：description 写坏观察模型不调用工具的现象；排错
- Day5：测试多工具选择，Agent 自主判断调用哪个工具
- Day6：交付：`tool_calc.py`、`search_notes.py`

## 交付物

- calculator 计算器工具
- search_notes：读取本地 md 笔记的工具

## 本周三件事

- [ ] 实现 calculator 与 search_notes 两个工具
- [ ] 观察 tool_calls / invalid_tool_calls 字段
- [ ] 故意写坏 description，记录模型不调用工具的现象
