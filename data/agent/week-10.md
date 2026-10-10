---
week: 10
stage: 2
stageTitle: 阶段 2 · RAG 检索增强生成
title: 文档加载、文本切分、Embedding 向量
focus: 先把「脏文本 → 干净向量」这条链路走通
status: todo
progress: 0
hours: 24
deliverable: rag_loader.py
---

# 第 10 周 · 文档加载、文本切分、Embedding 向量

> 先把「脏文本 → 干净向量」这条链路走通

**说明**：原版 Week7-10，补齐 FAISS 持久化、脏文档清洗。

## 每日安排

- Day1：Loader 文档加载；处理脏 markdown 文本，过滤无效内容（原版缺失）
- Day2：Splitter；chunk、chunk_overlap；不同切分策略对比
- Day3：Embedding 模型；向量维度概念
- Day4：FAISS 向量库；**重点：FAISS 本地持久化保存 / 加载，解决重启丢失向量坑（原版缺失）**
- Day5：完整流程：读取 md 笔记 → 切分 → 向量化 → 存入本地 faiss 文件
- Day6：交付：`rag_loader.py`

## 交付物

- rag_loader.py：读取 md → 切分 → 向量化 → 存 faiss
- 可持久化保存 / 加载的 FAISS 索引（重启不丢）

## 本周三件事

- [ ] Loader 清洗脏 markdown 文本
- [ ] 调 Splitter 的 chunk / chunk_overlap 策略
- [ ] FAISS 本地持久化存 / 取，解决重启丢失
