---
week: 11
stage: 2
stageTitle: 阶段 2 · RAG 检索增强生成
title: Retriever 检索链路，基础 RAG 问答
focus: 让模型基于文档回答，而不是凭记忆胡说
status: todo
progress: 0
hours: 24
deliverable: rag_retrieve.py
---

# 第 11 周 · Retriever 检索链路，基础 RAG 问答

> 让模型基于文档回答，而不是凭记忆胡说

## 每日安排

- Day1：Retriever 概念；检索出来的上下文怎么拼入 Prompt；幻觉产生根源
- Day2：实现基础 RAG：提问 → 检索片段 → 组装 prompt → 大模型回答
- Day3：对照实验：关闭 RAG 看模型胡说；开启 RAG 使用文档内容回答
- Day4：调参：top-k，检索数量对回答的影响
- Day5：异常处理：检索不到文档时候的兜底回答
- Day6：交付：`rag_retrieve.py`

## 交付物

- rag_retrieve.py：基础 RAG 问答闭环
- 一份开 / 关 RAG 的对照实验记录

## 本周三件事

- [ ] 实现提问 → 检索 → 组装 prompt → 回答
- [ ] 做开关 RAG 的对照实验
- [ ] 调 top-k 并处理检索不到文档的兜底
