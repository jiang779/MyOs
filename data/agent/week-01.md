---
week: 1
stage: 0
stageTitle: 阶段 0 · Python 工程与后端基础
title: Python 工程夯实
focus: 把环境、IO、异常、同步异步这些工程肌肉练出来，后面接大模型全靠它
status: todo
progress: 0
hours: 24
deliverable: env_parser.py、csv_clean.py 两个脚本
---

# 第 1 周 · Python 工程夯实

> 把环境、IO、异常、同步异步这些工程肌肉练出来，后面接大模型全靠它

## 每日安排

- Day1：venv 虚拟环境、requirements.txt、模块导入；Path 文件操作；csv 读写
- Day2：`.env` 原理，**手写 .env 解析函数（不依赖 python-dotenv）**；异常捕获 try-except；基础重试逻辑
- Day3：httpx 同步请求；理解响应对象；网络异常、超时处理
- Day4：asyncio 基础概念；`await`；区分同步 / 异步；简单 aiohttp 请求 demo
- Day5：练习：写脚本读取 csv，做简单文本清洗，捕获文件、编码异常
- Day6：整理代码，交付 `env_parser.py`、`csv_clean.py`

## 交付物

- env_parser.py：手写 .env 解析，不依赖 python-dotenv
- csv_clean.py：读 csv + 文本清洗 + 编码异常兜底
- 掌握虚拟环境、异常、基础 IO、同步 / 异步概念

## 本周三件事

- [ ] 手写 .env 解析函数并跑通
- [ ] 用 httpx 完成一次请求 + 超时处理
- [ ] 交付 env_parser.py 与 csv_clean.py
