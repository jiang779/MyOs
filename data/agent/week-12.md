---
week: 12
stage: 2
stageTitle: 阶段 2 · RAG 检索增强生成
title: RAG 进阶：分数过滤、Rerank、引文溯源
focus: 从「能答」到「答得准、有出处」
status: todo
progress: 0
hours: 24
deliverable: rag_sources.py
---

# 第 12 周 · RAG 进阶：分数过滤、Rerank、引文溯源

> 从「能答」到「答得准、有出处」

## 每日安排

- Day1：相似度 score 过滤，低分片段直接丢弃
- Day2：rerank 重排序模型作用；接入简单 rerank
- Day3：实现回答附带来源，记录来自哪一个 md 文档片段
- Day4：把检索片段暴露给前端返回
- Day5：RAG 简单评估：哪些问题回答正确、哪些产生幻觉
- Day6：交付：`rag_sources.py`

## 交付物

- rag_sources.py：分数过滤 + rerank + 引文溯源
- 一份 RAG 评估记录（答对 / 幻觉各是什么）

## 本周三件事

- [ ] 加相似度 score 过滤，丢弃低分片段
- [ ] 接入简单 rerank 重排序
- [ ] 实现回答附带来源 + 检索片段回传前端
