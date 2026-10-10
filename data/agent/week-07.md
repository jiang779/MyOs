---
week: 7
stage: 1
stageTitle: 阶段 1 · 单 Agent 与工具调用
title: Agent 记忆机制 Memory
focus: 记忆不是模型能力，是你把历史消息塞回 prompt 的动作
status: todo
progress: 0
hours: 24
deliverable: memory_chat.py（多轮对话 + 自动窗口裁剪）
---

# 第 7 周 · Agent 记忆机制 Memory

> 记忆不是模型能力，是你把历史消息塞回 prompt 的动作

**说明**：核心理解：记忆本质只是把历史消息塞回 prompt，模型本身没有存储记忆。

## 每日安排

- Day1：概念：BufferMemory、WindowBufferMemory、SummaryMemory
- Day2：消息列表膨胀问题；上下文窗口超限风险（原版缺失重点）
- Day3：实现窗口记忆，自动裁剪旧消息；模拟长对话
- Day4：练习：观察消息越来越长，打印总 token 数量
- Day5：多轮对话完整 demo；处理消息过长告警
- Day6：交付：`memory_chat.py`，多轮对话 + 自动窗口裁剪

## 交付物

- memory_chat.py：多轮对话 + 窗口记忆自动裁剪
- 一段消息膨胀到自动裁剪的演示

## 本周三件事

- [ ] 实现窗口记忆并自动裁剪旧消息
- [ ] 打印每轮消息的总 token 数
- [ ] 模拟长对话，处理消息过长告警
