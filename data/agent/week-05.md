---
week: 5
stage: 1
stageTitle: 阶段 1 · 单 Agent 与工具调用
title: LCEL 管道编程
focus: 学会管道式编排，同时把「解析失败」当一等公民处理
status: todo
progress: 0
hours: 24
deliverable: lcel_chain.py（终端稳定输出 JSON）
---

# 第 5 周 · LCEL 管道编程

> 学会管道式编排，同时把「解析失败」当一等公民处理

**说明**：对应原版 Week3-Week6，降低跳跃，补齐解析容错。

## 每日安排

- Day1：LangChain 核心概念：PromptTemplate、ChatModel、Runnable 协议
- Day2：OutputParser；重点练习：**解析失败的降级、重试逻辑（原版缺失）**
- Day3：管道语法 `prompt | model | parser`；输出固定 JSON 结构
- Day4：调试 Runnable；`.invoke()` / `.batch()`；config 基础配置
- Day5：对比：原生调用 VS LCEL 封装的区别
- Day6：交付：`lcel_chain.py` 终端稳定输出 JSON，解析出错会降级处理

## 交付物

- lcel_chain.py：prompt | model | parser 管道，终端稳定输出 JSON
- 解析失败自动降级 + 重试，不崩掉

## 本周三件事

- [ ] 搭起 PromptTemplate | ChatModel | OutputParser
- [ ] 写 JSON 解析失败的降级与重试
- [ ] 对比原生调用与 LCEL 的差别
